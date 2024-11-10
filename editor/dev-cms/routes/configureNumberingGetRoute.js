'use strict';

const generate = require('./numbering-summary/generateNumberingSummary');

function configureNumberingGetRoute() {
	return (req, res) => {
		const {
			documentId,
			context: { editSessionToken },
			isStructureChunk,
		} = req.query;

		req.cms.load(
			documentId,
			editSessionToken,
			async function (error, content) {
				if (error) {
					res.status(404).end();
					return;
				}

				const numberingSummary = await generate(
					content,
					async (chunkDocumentId, callback) => {
						try {
							return await req.cms.load(
								chunkDocumentId,
								editSessionToken,
								callback
							);
						} catch (e) {
							console.log('CANNOT LOAD', chunkDocumentId);
							throw e;
						}
					},
					isStructureChunk === 'true',
					documentId
				);

				if (
					!numberingSummary ||
					!Object.keys(numberingSummary).length
				) {
					res.status(500).send(
						'The numbering summary could not be generated'
					);
					return;
				}
				res.status(200)
					.set('content-type', 'application/json; charset=utf-8')
					.send(
						JSON.stringify(
							{
								numbering: numberingSummary,
							},
							null,
							'\t'
						)
					);
			}
		);
	};
}

module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/numbering')
		.get(configureNumberingGetRoute());

	return router;
};
