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
			context.readlineInterface.on( 'close', () => {
				context.open = false;
				if( !context.pending )
					context.on.close( that );
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
							context.on.close( that );
					} )
					.catch( context.reject );
			} );
		}
		return {
			close: ( onFulfilled ) => ( ( context.on.close = onFulfilled ), that ),
			line: ( listener ) => ( ( context.on.line = listener ), that )
		};
	}
	pause() {
		this.context.paused = true;
		this.context.readlineInterface.pause();
	};
	resume() {
		this.context.paused = false;
		this.context.readlineInterface.resume();
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
	time( milliseconds = 1000 ) {
		return new Promise( resolve => {
			setTimeout( ( ts, processedbytes ) => {
				const processedbytespermillisecond = ( this.context.processedbytes - processedbytes ) / milliseconds;
				console.log( milliseconds, processedbytespermillisecond );
				resolve( this.context.size / processedbytespermillisecond );
			}, milliseconds, Date.now(), this.context.processedbytes );
		} );
	}
	get status() {
		return {
			absolutepath: this.context.absolutepath,
			filename: this.context.absolutepath ? require( 'path' ).basename( this.context.absolutepath ) : undefined,
			size: this.context.size,
			processedbytes: this.context.processedbytes,
			processed: this.context.processed,
			completed: this.context.processedbytes / this.context.size,
			open: this.context.open,
			pending: this.context.pending,
			paused: this.context.paused
		};
	}
};
