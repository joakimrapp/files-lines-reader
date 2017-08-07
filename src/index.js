module.exports = ( maxThroughput ) => {
	const promiseThrottler = require( '@jrapp/promise-throttler' );
	const path = require( 'path' );
	const Current = require( './Current.js' );
	const throttler = maxThroughput > 0 ? promiseThrottler( maxThroughput, 1000 ) : promiseThrottler( 1, 1000 ).disable();
	let totalbytes = 0;
	let processedbytes = 0;
	const queue = [];
	let paused = false;
	let current = new Current();
	let file = () => {}, filter = () => true, map = ( item ) => item, each = () => {}, error = ( ( { line, error } ) => Promise.reject( error ) );
	const run = () => {
		if( ( current.resolved ) && ( !!queue.length ) ) {
			current = new Current( queue.sort( ( { absolutepath: p1 }, { absolutepath: p2 } ) =>
		 		path.basename( p1 ) < path.basename( p2 ) ? -1 : 1 ).shift() )
				.on.line( ( line ) => Promise.resolve( line )
			 		.then( filter )
				 	.then( ( valid ) => {
						if( valid ) {
							if( !current.paused && ( throttler.queued > throttler.maxThroughput ) )
								current.pause();
							return Promise.resolve( line )
								.then( throttler.throttle )
								.then( map )
								.then( each )
								.then( () => {
									if( current.paused && ( throttler.queued < throttler.maxThroughput ) )
										current.resume();
									return true;
								} );
						}
						else
							return false;
					} )
					.catch( ( err ) => error( { error: err, line } ) ) )
				.on.close( () => {
					processedbytes += current.size;
					current.resolve()
						.then( () => {
							if( !paused )
								run();
						} );
				} );
			file( current.status );
		}
	};
	const { fs } = require( '@jrapp/callbacks-to-promises' );
	const pub = {
		process: ( absolutepath ) => new Promise( ( resolve, reject ) => fs.stat( absolutepath )
			.then( ( { size } ) => ( ( totalbytes += size ), queue.push( { absolutepath, resolve, reject, size } ), run() ) ) ),
		file: ( fn ) => ( ( file = fn ), pub ),
		filter: ( fn ) => ( ( filter = fn ), pub ),
		map: ( fn ) => ( ( map = fn ), pub ),
		each: ( fn ) => ( ( each = fn ), pub ),
		error: ( fn ) => ( ( error = fn ), pub ),
		status: () => ( {
			queued: queue.length,
			completed: ( processedbytes + current.processedbytes ) / totalbytes,
			throughput: throttler.throughput,
			current: current.status
		} ),
		estimatedStatus: ( milliseconds ) => {
			const parsed = parseInt( milliseconds, 10 );
			return current.estimate( isNaN( parsed ) || parsed < 0 ? 1000 : parsed )
				.then( milliseconds => ( {
					queued: queue.length,
					completed: ( processedbytes + current.processedbytes ) / totalbytes,
					throughput: throttler.throughput,
					current: Object.assign( { milliseconds }, current.status )
				} ) );
		},
		pause: () => ( paused = true ),
		resume: () => ( ( paused = false ), run() ),
		maxThroughput: ( maxThroughput ) =>
			( ( throttler.enable().maxThroughput = maxThroughput ), pub )
	};
	return pub;
};
