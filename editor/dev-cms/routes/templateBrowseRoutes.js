'use strict';

const templateIdsByName = {
	INTRODUCTION: 'intro.template',
	SECTION: 'sec.template',
	TERM_DEFINITION: 'term-sec.template',
	ANNEX_INFORMATIVE: 'app-inform.template',
	ANNEX_NORMATIVE: 'app-normative.template',
	ANNEX_Z: 'app-z.template',
	NUMBERED_PARAGRAPH: 'numbered-paragraph.template',
};

function filterItemsForRequest(files, assetTypes, resultTypes) {
	// Filter files/folders
	const results = files.filter(function (item) {
		if (item.type === 'folder') {
			return resultTypes.indexOf('folder') !== -1;
		}

		// Item is a file
		if (resultTypes.indexOf('file') === -1) {
			return false;
		}

		return assetTypes.indexOf(item.type) !== -1;
	});

	// Sort by filename
	results.sort(function (a, b) {
		return a.label.localeCompare(b.label);
	});

	return results;
}

module.exports = (router) => {
	router.route('/connectors/cms/standard/browse').post((req, res, next) => {
		const assetTypes = req.body.assetTypes || [];

		if (assetTypes.includes('document-template')) {
			const resultTypes = req.body.resultTypes;
			const folderId = req.body.folderId;
			const query = req.body.query;

			// Protect development/staging server from exposing non asset folders
			// Needs improvements, '..'' is not an watertight check
			if (folderId && folderId.indexOf('..') !== -1) {
				res.status(403).end();
				return;
			}

			let files = req.cms.listSync(
				folderId,
				req.body.context.editSessionToken
			);
			if (!files) {
				// The requested folder did not exist
				res.status(404).end();
				return;
			}

			// Filter requested types
			files = filterItemsForRequest(files, assetTypes, resultTypes);

			// Filter by query.templateId
			if (query) {
				files = files.filter(function (item) {
					// If templateId is provided, filter the items by templateId
					if (query.templateId) {
						return item.id === templateIdsByName[query.templateId];
					}
					return true;
				});
			}

			const totalItemCount = files.length;

			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					totalItemCount,
					items: files,
				});
		} else {
			next();
		}
	});

	return router;
};
