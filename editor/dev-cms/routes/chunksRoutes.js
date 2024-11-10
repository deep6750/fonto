'use strict';

const DATABASE_FILE_NAME = 'review-annotations-database.json';

module.exports = (router) => {
	router.route('/connectors/cms/standard/chunks').post((req, res) => {
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		if (typeof request === 'string') {
			request = JSON.parse(request);
		}

		if (!request.context) {
			res.status(500).send(
				new Error('Internal Server Error: missing context')
			);
			return;
		}

		if (
			!req.cms.existsSync(
				DATABASE_FILE_NAME,
				request.context.editSessionToken
			)
		) {
			res.status(500).send(
				new Error(
					'Internal Server Error: unable to find annotations database.'
				)
			);
			return;
		}

		if (!request.chunks) {
			res.status(400)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					status: 400,
					message: 'chunks is missing',
				});
			return;
		}

		req.cms.load(
			DATABASE_FILE_NAME,
			request.context.editSessionToken,
			(error, string) => {
				if (error) {
					res.status(500).send(
						new Error(`Internal Server Error: ${error}`)
					);
					return;
				}

				let annotationsDatabase = JSON.parse(string);

				// Update the annotation database
				annotationsDatabase = {
					annotations: annotationsDatabase.annotations.map(
						(annotation) => {
							request.chunks.forEach((chunk) => {
								if (
									annotation.documentId ===
										chunk.documentId &&
									annotation.status ===
										'ANNOTATION_STATUS_RESOLVED'
								) {
									annotation.metadata.OBE = true;
								}
							});

							return annotation;
						}
					),
				};

				// Save the updated annotation database
				req.cms.saveToStore(
					DATABASE_FILE_NAME,
					JSON.stringify(annotationsDatabase, null, '\t'),
					request.context.editSessionToken,
					(error, _documentId) => {
						if (error) {
							res.status(500).send(
								new Error(`Internal Server Error: ${error}`)
							);
							return;
						}

						res.status(200)
							.set(
								'content-type',
								'application/json; charset=utf-8'
							)
							.json({});
					}
				);
			}
		);
	});

	return router;
};
