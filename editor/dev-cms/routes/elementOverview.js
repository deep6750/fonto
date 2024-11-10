const { sync } = require('slimdom-sax-parser');
const { evaluateXPathToStrings, evaluateXPath } = require('fontoxpath');

const overviewTypes = {
	fig: {
		elementQuery: '//(fig|fig-group)[@id]',
		textPreviewQuery: 'string(./caption/title)',
	},
	'table-wrap': {
		elementQuery: '//table-wrap[@id]',
		textPreviewQuery: 'string(./caption/title)',
	},
	'disp-formula': {
		elementQuery: '//disp-formula[@id]',
		textPreviewQuery: '()',
	},
	fn: {
		elementQuery: '//fn[@id][preceding-sibling::xref[@ref-type="fn"]]',
		textPreviewQuery: 'string(.)',
	},
};

function configureElementsRoute() {
	return async (req, res) => {
		const { context, elementType } = req.query;
		const { editSessionToken, documentId } = JSON.parse(context);

		async function loadChunk(chunkDocumentId) {
			return new Promise((resolve, reject) =>
				req.cms.load(chunkDocumentId, editSessionToken, (err, data) =>
					err ? reject(err) : resolve(sync(data))
				)
			);
		}

		const overviewType = overviewTypes[elementType];
		if (!overviewType) {
			throw new Error(`Unknown element type '${elementType}'`);
		}
		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.send(
				JSON.stringify(
					{
						items: await evaluateXPathToStrings(
							`//Q{http://niso-sts-authoring-solution/authoring-schema}*[
								self::element() and
								ends-with(name(), '-ref') and
								@Q{http://niso-sts-authoring-solution/authoring-schema}href
							]/@Q{http://niso-sts-authoring-solution/authoring-schema}href`,
							await loadChunk(documentId)
						).reduce(
							async (all, chunkId) =>
								Object.assign(await all, {
									[chunkId]: evaluateXPath(
										`
										array {
							${overviewType.elementQuery}/map {
								'id': string(@id),
								'textPreview': ${overviewType.textPreviewQuery}
							}
						}`,
										await loadChunk(chunkId)
									),
								}),
							{}
						),
					},
					null,
					'\t'
				)
			);
	};
}

module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/elements')
		.get(configureElementsRoute());

	return router;
};
