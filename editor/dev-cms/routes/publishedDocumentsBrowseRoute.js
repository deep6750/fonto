'use strict';

function filterAndMapItemsForRequest(files, folderId) {
	// Only return the iso and iec folder, and only the files that are directly in those folders

	// Filter files/folders
	const results = files.reduce(function (items, item) {
		if (item.type === 'folder') {
			if (['iec', 'iso'].includes(item.id)) {
				items.push(item);
			}
			return items;
		}

		// Item is a file
		if (['iec', 'iso'].includes(folderId)) {
			const idParts = item.id.split('/');
			items.push({
				id: `urn:${idParts[0]}:${idParts[1].split('.xml')[0]}`,
				label: item.label,
				type: 'published-document',
			});
		}
		return items;
	}, []);

	// Sort by filename
	results.sort(function (a, b) {
		return a.label.localeCompare(b.label);
	});

	return results;
}

module.exports = (router) => {
	router.route('/connectors/cms/standard/browse').post((req, res, next) => {
		const assetTypes = req.body.assetTypes || [];

		if (assetTypes.includes('published-document')) {
			const folderId = req.body.folderId;
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
			files = filterAndMapItemsForRequest(files, folderId);

			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					totalItemCount: files.length,
					items: files,
				});
		} else {
			next();
		}
	});

	return router;
};
