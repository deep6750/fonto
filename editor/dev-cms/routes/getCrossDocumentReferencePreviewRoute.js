const { sync } = require('slimdom-sax-parser');
const { evaluateXPathToString } = require('fontoxpath');

const elementIdsStub = {
	tab_1: 'Table 1',
	sec_1: 'Clause 1',
	'sec_1.1': '1.1',
};

module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/cross-document-reference/preview')
		.get((req, res) => {
			const request = req.query && req.query;
			const context = request.context && JSON.parse(request.context);

			if (!context || !request.documentUrn) {
				res.status(500).send(new Error('Internal Server Error'));
				return;
			}

			const urnParts = request.documentUrn.split(':');

			req.cms.load(
				`${urnParts[1]}/${urnParts[2]}/0001-front.xml`,
				context.editSessionToken,
				async function (error, content) {
					if (error) {
						res.status(404).json({
							status: 404,
							message: 'Document could not be found',
						});
						return;
					}

					const frontChunkDom = sync(content);

					const documentName = evaluateXPathToString(
						'descendant::std-ref[@type="dated"][1]',
						frontChunkDom
					);
					if (!documentName) {
						res.status(404).json({
							status: 404,
							message: 'Document could not be found',
						});
					}

					let previewText = documentName;
					if (request.elementId) {
						previewText += `, ${elementIdsStub[request.elementId]}`;
					}

					res.status(200)
						.set('content-type', 'application/json; charset=utf-8')
						.json({
							previewText,
						});
				}
			);
		});

	return router;
};
