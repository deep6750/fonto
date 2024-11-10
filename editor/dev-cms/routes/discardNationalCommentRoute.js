'use strict';

const DATABASE_FILE_NAME = 'review-annotations-database.json';

const author = {
	id: 'NL',
	displayName: 'NL',
};

module.exports = (router) => {
	router
		.route('/connectors/cms/standard/review/unnationalize')
		.post((req, res) => {
			const context = req.body.context;

			if (!context || !context.documentId) {
				res.status(500).send(
					new Error('Internal Server Error: missing documentId.')
				);
				return;
			}

			const annotation = req.body && req.body.annotation;
			if (!annotation) {
				res.status(500).send(
					new Error('Internal Server Error: missing annotation.')
				);
				return;
			}

			const discardMotivation = annotation?.discardMotivation;
			const nationalAnnotationId = annotation?.nationalAnnotationId;

			if (
				!req.cms.existsSync(
					DATABASE_FILE_NAME,
					context.editSessionToken
				)
			) {
				res.status(500).send(
					new Error(
						'Internal Server Error: unable to find annotations database.'
					)
				);
				return;
			}

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

					let annotationsDatabase = JSON.parse(string);

					// Find the national comment associated with the nationalAnnotationId
					let nationalComment =
						annotationsDatabase.annotations &&
						annotationsDatabase.annotations.find(
							(annotation) =>
								annotation.id === nationalAnnotationId
						);

					// If for some reason the national comment was not found throw an error
					if (!nationalComment) {
						res.status(500).send(
							new Error(
								'Internal Server Error: missing national comment.'
							)
						);
						return;
					}

					// If a national comment is found, which should always be the case, then set its status to 'ANNOTATION_STATUS_ARCHIVED'
					if (nationalComment) {
						nationalComment = {
							...nationalComment,
							status: 'ANNOTATION_STATUS_ARCHIVED',
						};
					}

					// Find (if exists) the related national contribution associated with the nationalAnnotationId
					let nationalContribution =
						annotationsDatabase.annotations &&
						annotationsDatabase.annotations.find(
							(annotation) =>
								annotation.resolvedMetadata &&
								annotation.resolvedMetadata
									.nationalAnnotationId &&
								annotation.resolvedMetadata
									.nationalAnnotationId ===
									nationalAnnotationId
						);

					// If a national contribution is found then modify it
					if (nationalContribution) {
						const updatedNationalContribution = {
							...nationalContribution,
							author: {
								id: nationalContribution.resolvedAuthor.id,
								displayName:
									nationalContribution.resolvedAuthor
										.displayName,
							},
							resolvedAuthor: author,
							resolvedMetadata: {
								...nationalContribution.resolvedMetadata,
								resolutionComment: discardMotivation,
								resolution: 'discarded',
							},
						};

						nationalContribution = updatedNationalContribution;
					}

					// Update the annotation database with the new changes
					annotationsDatabase = {
						annotations: annotationsDatabase.annotations.map(
							(annotation) => {
								if (
									nationalContribution &&
									annotation.id === nationalContribution.id
								) {
									return nationalContribution;
								}

								if (
									nationalComment &&
									annotation.id === nationalComment.id
								) {
									return nationalComment;
								}

								return annotation;
							}
						),
					};

					// Save the updated annotation database
					req.cms.saveToStore(
						DATABASE_FILE_NAME,
						JSON.stringify(annotationsDatabase, null, '\t'),
						context.editSessionToken,
						(error, _documentId) => {
							if (error) {
								res.status(500).send(
									new Error(`Internal Server Error: ${error}`)
								);
								return;
							}

							res.send(200);
						}
					);
				}
			);
		});

	return router;
};
