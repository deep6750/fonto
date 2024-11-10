const fs = require('fs-extra');
const generate = require('./generateCatalogue');

const outputFileName = (process.argv[2] || '').replace(/\\/g, '/');

((stream, callback) => {
	let data = '';
	stream.resume();
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => (data += chunk));
	stream.on('end', () => callback(data));
})(process.stdin, async (input) => {
	const references = await generate(input, (filePath, callback) =>
		fs.readFile(filePath, 'utf8', callback)
	);

	if (outputFileName) {
		fs.readFile(outputFileName, 'utf8', function (err, data) {
			if (err) {
				console.log(err);
				return;
			}

			const catalogue = JSON.parse(data) || [];

			fs.outputFile(
				outputFileName,
				JSON.stringify(
					catalogue
						.concat(references)
						.reduce((unique, item) => {
							if (unique.find((item2) => item2.id === item.id)) {
								return unique;
							}

							unique.push(item);
							return unique;
						}, [])
						/* Add three extra, for testing the filters. */
						.concat([
							{
								id: 'urn:clc:std:50481::::',
								label: '',
								type: 'reference',
								metadata: {
									number: 'CLC/TR 50481',
									date: null,
									title: 'Recommendations on filters for shielded enclosures',
								},
							},
							{
								id: 'urn:clc:std:50484::::',
								label: '',
								type: 'reference',
								metadata: {
									number: 'CLC/TR 50484',
									date: null,
									title: 'Recommendations for shielded enclosures',
								},
							},
							{
								id: 'urn:cen:std:1234::::',
								label: '',
								type: 'reference',
								metadata: {
									number: 'CEN 1234',
									date: null,
									title: 'A random title',
								},
							},
						])
				),
				'utf8'
			);
		});

		console.log('FILENAME', outputFileName);
	} else {
		console.log('new catalogue items', references);
	}
});
