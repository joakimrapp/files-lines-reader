const sizes = [ 'B', 'KB', 'MB', 'GB', 'TB' , 'PB'];
module.exports = {
	time: ( milliseconds ) => ( new Date( milliseconds ) ).toISOString().slice( 11, 23 ),
	bytes: ( bytes ) => {
		let index = 0;
		while( bytes >= 1024 ) {
			bytes = bytes / 1024;
			index++;
		}
		return `${bytes.toFixed( 2 )} ${sizes[index]}`;
	},
	percent: ( part ) => `${(part * 100).toFixed( 2 )}%`
};
