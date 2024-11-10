'use strict';

const fs = require('fs');
const path = require('path');

function configureIframeRouter(config) {
	return (req, res) => {
		// Set scope query parameter if not set
		if (config.scope && !req.query.scope) {
			res.redirect(`?scope=${JSON.stringify(config.scope)}`);
			return;
		}
		const scopeString = JSON.stringify(
			`${encodeURIComponent(
				req.query.scope
			)}#/editor?documentIds=${JSON.stringify(config.scope.documentIds)}`
		);

		// Do not use res.render() because the production mode does not configure a view renderer.
		fs.readFile(
			path.join(__dirname, 'iframeIndex.html'),
			'utf-8',
			(err, indexFileContents) => {
				if (err) {
					res.status(500).end();
					throw err;
				}

				indexFileContents = indexFileContents.replace(
					"'${SCOPE_STRING}'",
					scopeString
				);
				res.status(200).type('.html').send(indexFileContents);
			}
		);
	};
}

module.exports = (router, config) => {
	console.log(
		`  !!! iFrame mode enabled at http://localhost:${config.port}/iframe)`
	);

	router.route('/iframe').get(configureIframeRouter(config));
	return router;
};
