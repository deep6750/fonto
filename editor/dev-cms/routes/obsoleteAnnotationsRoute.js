const DATABASE_FILE_NAME = 'review-annotations-database.json';

module.exports = (router) => {
	router
		.route('/connectors/cms/standard/review/obsolete-annotations')
		.get((req, res) => {
			const context = req.query.context;

			// Load the annotations database from our dev server
			req.cms.load(
				DATABASE_FILE_NAME,
				context.editSessionToken,
				(error, string) => {
					if (error) {
						res.status(500).send(
							new Error(`Internal Server Error: ${error}`)
						);
						return;
					}

					const annotationsDatabase = JSON.parse(string);

					const obeAnnotations =
						annotationsDatabase.annotations.filter(
							(candidate) => candidate.metadata.OBE
						);
					const obeAnnotationsPerDocumentId = obeAnnotations.reduce(
						(accumulator, candidate) => {
							if (accumulator[candidate.documentId]) {
								accumulator[candidate.documentId].push(
									candidate
								);
							} else {
								accumulator[candidate.documentId] = [candidate];
							}
							return accumulator;
						},
						{}
					);

					const annotationsResponse = Object.keys(
						obeAnnotationsPerDocumentId
					).map((documentId) => {
						return {
							annotations:
								obeAnnotationsPerDocumentId[documentId],
							titlePreview: `title coming from CMS here for ${documentId}`,
							remoteDocumentId: documentId,
						};
					});

					res.status(200)
						.set('content-type', 'application/json; charset=utf-8')
						.json(annotationsResponse);
				}
			);
		});

	return router;
};
