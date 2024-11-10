const fs = require('fs-extra');
const path = require('path');

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/preferences').post((req, res) => {
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		if (typeof request === 'string') {
			request = JSON.parse(request);
		}

		const context = request.context;
		if (!context || !context.documentId) {
			res.status(400).send(
				new Error('Internal Server Error, missing documentId')
			);

			return;
		}

		fs.readFile(
			path.join(__dirname, 'preferences.json'),
			'utf-8',
			(error, content) => {
				if (error) {
					res.status(500).send(error);
				}

				res.status(201)
					.set('content-type', 'application/json; charset=utf-8')
					.send(content);
			}
		);
	});

	return router;
};
