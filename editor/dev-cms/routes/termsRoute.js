'use strict';

const fs = require('fs-extra');
const path = require('path');

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/terms').get((req, res) => {
		fs.readFile(
			path.join(__dirname, 'dictionary.json'),
			'utf-8',
			(error, content) => {
				if (error) {
					res.status(500).send(error);
				}

				res.status(200)
					.set('content-type', 'application/json; charset=utf-8')
					.send(content);
			}
		);
	});

	return router;
};
