'use strict';
const fs = require('fs');
const path = require('path');

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/asset/metadata').get((req, res) => {
		const id = req.query.id;

		// Get request from correct multipart
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		if (id && id.indexOf('..') !== -1) {
			res.status(403).end();
			return;
		}

		const filePath = req.cms.getPath(
			id,
			JSON.parse(req.query.context).editSessionToken
		);

		if (filePath) {
			const editSessionToken =
				request.context && request.context.editSessionToken;
			const currentSession = req.getFontoSession(editSessionToken);

			req.cms.load('metadata.json', currentSession, (err, data) => {
				if (!err && data) {
					const parsedJSON = JSON.parse(data);
					const retrievedMetadata = parsedJSON[id];

					if (retrievedMetadata) {
						retrievedMetadata['linkToBackend'] =
							'https://stm32-base.org/';
						res.status(200)
							.set(
								'content-type',
								'application/json; charset=utf-8'
							)
							.json({
								metadata: retrievedMetadata,
							});
					} else {
						res.status(404).end();
					}
				} else {
					res.status(412)
						.set('content-type', 'application/json; charset=utf-8')
						.send(
							JSON.stringify({
								message: 'Metadata json was not found',
							})
						);
				}
			});
		} else {
			res.status(404).end();
		}
	});

	return router;
};
