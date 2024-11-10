'use strict';

const getReferenceList = require('./getReferenceList.js');
const stubbedCatalogue = require('./data/stubbedCatalogue.json');

function hasOrganisation(stdNumber, organisations) {
	const stdNumberOrganisations = stdNumber
		.replace(/(\s|\u202F|\u00A0)/g, ' ')
		.split(' ')[0]
		.split('/');
	return stdNumberOrganisations.some((organisation) =>
		organisations.includes(organisation)
	);
}

module.exports = (router) => {
	router.route('/connectors/cms/standard/browse').post((req, res, next) => {
		const assetTypes = req.body.assetTypes || [];
		const documentId = req.body.context.documentId;

		if (assetTypes.includes('existing-reference')) {
			if (!documentId) {
				res.status(500).json({
					status: 500,
					message: 'Internal Server Error',
				});
				return;
			}

			const query = req.body.query;

			req.cms.load(
				documentId,
				req.body.context.editSessionToken,
				async function (error, content) {
					if (error) {
						res.status(500).json({
							status: 500,
							message: 'Internal Server Error',
						});
						return;
					}

					let references = await getReferenceList(
						content,
						async (chunkDocumentId, callback) => {
							try {
								return await req.cms.load(
									chunkDocumentId,
									req.body.context.editSessionToken,
									callback
								);
							} catch (e) {
								console.log('CANNOT LOAD', chunkDocumentId);
								throw e;
							}
						},
						query.referenceType
					);

					// Filter by query
					if (query && query.fulltext) {
						references = references.filter(function (item) {
							// If fulltext is provided, filter by properties in metadata
							if (query.fulltext) {
								return (
									Object.values({
										...item.metadata,
										...(item.metadata.number &&
											item.metadata.date && {
												fullNumber: `${item.metadata.number}:${item.metadata.date}`,
											}),
									})
										.join(' ')
										.toLowerCase()
										.indexOf(
											query.fulltext.toLowerCase()
										) !== -1
								);
							}
							return true;
						});
					}

					const totalItemCount = references.length;

					// Pagination
					let offset = req.body.offset;
					if (offset) {
						offset = parseInt(offset, 10);
						references = references.slice(offset);
					}

					let limit = req.body.limit;
					if (limit) {
						limit = parseInt(limit, 10);
						references = references.slice(0, limit);
					}

					res.status(200)
						.set('content-type', 'application/json; charset=utf-8')
						.json({
							totalItemCount,
							items: references,
						});
				}
			);
		} else {
			next();
		}
	});

	router.route('/connectors/cms/standard/browse').post((req, res, next) => {
		const assetTypes = req.body.assetTypes || [];

		if (assetTypes.includes('catalogue-reference')) {
			const query = req.body.query;

			let references = stubbedCatalogue;

			const organisations = query.organisations
				? query.organisations.map((organisation) => {
						if (organisation === 'cenelec') {
							return 'CLC';
						}
						return organisation.toUpperCase();
				  })
				: null;

			// Filter by query
			if (
				query &&
				(query.fulltext ||
					organisations ||
					query.catalogueTypes ||
					query.statuses)
			) {
				references = references.filter(function (item) {
					// If organisations is provided, filter by organisation based on the number
					if (
						organisations &&
						!hasOrganisation(item.metadata.number, organisations)
					) {
						return false;
					}

					// If status is provided, filter by properties in metadata
					if (query.statuses?.length) {
						if (!query.statuses.includes(item.metadata.status)) {
							return false;
						}
					}

					// If type is provided, filter by properties in metadata
					if (query.catalogueTypes?.length) {
						if (
							!query.catalogueTypes.includes(
								item.metadata.catalogueType
							)
						) {
							return false;
						}
					}

					// If fulltext is provided, filter by properties in metadata
					if (query.fulltext) {
						const searchString = `${
							item.metadata.number +
							(item.metadata.date ? `:${item.metadata.date}` : '')
						} ${item.metadata.title}`;
						return (
							searchString
								.replace(/(\s|\u202F|\u00A0)/g, ' ')
								.replace(/(–|-|‑)/g, '-')
								.toLowerCase()
								.indexOf(
									query.fulltext
										.replace(/(\s|\u202F|\u00A0)/g, ' ')
										.replace(/(–|-|‑)/g, '-')
										.toLowerCase()
								) !== -1
						);
					}

					return true;
				});
			}

			const totalItemCount = references.length;

			// Pagination
			let offset = req.body.offset;
			if (offset) {
				offset = parseInt(offset, 10);
				references = references.slice(offset);
			}

			let limit = req.body.limit;
			if (limit) {
				limit = parseInt(limit, 10);
				references = references.slice(0, limit);
			}

			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					totalItemCount,
					items: references,
				});

			return;
		}

		next();
	});

	return router;
};
