require( '@jrapp/node-project-setup' ).testing.file( './test' )( ( index ) => ( {
	asset1: true
} ) )
	.describe( 'index.function1' )
		.it( 'should do something', ( assert, index, { asset1 } ) => new Promise( resolve => {
			resolve();
		} ) )
		.done()
	.describe( 'index.function2' )
		.it( 'should do something', ( assert, index, { asset1 } ) => new Promise( resolve => {
			resolve();
		} ) )
		.done()
	.done();
