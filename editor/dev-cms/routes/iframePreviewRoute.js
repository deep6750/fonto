const fs = require('fs');
const path = require('path');
const { sync } = require('slimdom-sax-parser');
const { evaluateXPathToString } = require('fontoxpath');

module.exports = (router, _config) => {
	router.route('/iframe/preview.html').get((req, res) => {
		let html = fs
			.readFileSync(path.join(__dirname, 'preview.html'))
			.toString();

		const urnParts = req.query.documentUrn.split(':');

		req.cms.load(
			`${urnParts[1]}/${urnParts[2]}/0001-front.xml`,
			'shared-memory-store-id',
			async function (error, content) {
				if (error) {
					res.status(404).json({
						status: 404,
						message: 'Document could not be found',
					});
					return;
				}

				const frontChunkDom = sync(content);

				const documentTitle = evaluateXPathToString(
					'./front/*/title-wrap[1]/full',
					frontChunkDom
				);

				html = html.replace(
					'<!-- {{ title }} -->',
					documentTitle || 'Title of the document'
				);

				res.send(html);
			}
		);
	});

	return router;
};
