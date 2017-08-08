const readable = require( './readable.js' );
module.exports = class Current {
	constructor( { resolve, reject, absolutepath, size = 0 } = {} ) {
		this.context = {
			resolve,
			reject,
			absolutepath,
			size,
			processedbytes: 0,
			open: false,
			paused: false,
			processed: 0,
			pending: 0,
			resolved: true,
			history: {
				processedBytes: [],
				intervalObject: undefined
			},
			on: {
				close: () => {},
				line: () => {}
			}
		};
	}
	get on() {
		const that = this;
		const context = that.context;
		if( !context.readlineInterface ) {
			context.readlineInterface = require( 'readline' ).createInterface( { input: require( 'fs' ).createReadStream( context.absolutepath ) } );
			context.open = true;
			context.resolved = false;
			const onClose = () => {
				that.stopSampleMetrics();
				context.on.close( that );
			};
			context.readlineInterface.on( 'close', () => {
				context.open = false;
				if( !context.pending )
					onClose();
			} );
			context.readlineInterface.on( 'line', ( line ) => {
				context.pending++;
				Promise.resolve( line )
					.then( context.on.line )
					.then( ( processed ) => {
						if( processed )
							context.processed++;
						context.pending--;
						context.processedbytes += line.length + 1;
						if( ( !context.pending ) && ( !context.open ) )
							onClose();
					} )
					.catch( context.reject );
			} );
			that.startSampleMetrics();
		}
		return {
			close: ( onFulfilled ) => ( ( context.on.close = onFulfilled ), that ),
			line: ( listener ) => ( ( context.on.line = listener ), that )
		};
	}
	startSampleMetrics() {
		const that = this;
		this.context.history.intervalObject = setInterval( () => that.sampleMetric(), 1000 );
	}
	stopSampleMetrics() {
		clearInterval( this.context.history.intervalObject );
		this.context.history.processedBytes = [];
	}
	sampleMetric() {
		const context = this.context;
		context.history.processedBytes.unshift( [ Date.now(), context.processedbytes ] );
		while( context.history.processedBytes.length > 10 )
			context.history.processedBytes.pop();
	}
	estimate() {
		const now = Date.now();
		const { processedbytes, size } = this.context;
		const bytesLeft = size - processedbytes;
		return this.context.history.processedBytes
			.map( ( [ timestamp, processedBytesThen ] ) =>
				Math.round( ( bytesLeft ) / ( ( processedbytes - processedBytesThen ) / ( now - timestamp ) ) ) )
			.filter( ( milliseconds ) => milliseconds > 0 )
			.map( ( milliseconds ) => ( {
				milliseconds,
				time: ( new Date( milliseconds ) ).toISOString().slice( 11, 23 )
			} ) );
	}
	pause() {
		if( !this.context.paused ) {
			this.context.paused = true;
			this.context.readlineInterface.pause();
		}
	};
	resume() {
		if( this.context.paused ) {
			this.context.paused = false;
			this.context.readlineInterface.resume();
		}
	};
	resolve() {
		this.context.resolved = true;
		const { resolve, absolutepath, processed } = this.context;
		return Promise.resolve( { absolutepath, processed } )
			.then( resolve );
	}
	get resolved() { return this.context.resolved; }
	get absolutepath() { return this.context.absolutepath; }
	get size() { return this.context.size; }
	get processedbytes() { return this.context.processedbytes; }
	get paused() { return this.context.paused; }
	get processed() { return this.context.processed; }
	get pending() { return this.context.pending; }
	get status() {
		return {
			absolutepath: this.context.absolutepath,
			filename: this.context.absolutepath ? require( 'path' ).basename( this.context.absolutepath ) : undefined,
			size: readable.bytes( this.context.size ),
			processedbytes: readable.bytes( this.context.processedbytes ),
			processed: this.context.processed,
			completed: readable.percent( this.context.processedbytes / this.context.size ),
			open: this.context.open,
			pending: this.context.pending,
			paused: this.context.paused,
			estimate: this.estimate()
		};
	}
};
