const fs = require('fs-extra');
const generate = require('../../editor/dev-cms/routes/generateNumberingSummary');

const outputFileName = (process.argv[2] || '').replace(/\\/g, '/');

((stream, callback) => {
	let data = '';
	stream.resume();
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => (data += chunk));
	stream.on('end', () => callback(data));
})(process.stdin, async (input) => {
	const numberingSummary = await generate(input, (filePath, callback) =>
		fs.readFile(filePath, 'utf8', callback)
	);

	if (outputFileName) {
		fs.outputFile(outputFileName, JSON.stringify(numberingSummary), 'utf8');
		console.log('FILENAME', outputFileName);
	} else {
		console.log('Numbering-summary', numberingSummary);
	}
});
