const all = [];
const recent = [];

function prependItem(array, item) {
	array.reverse();
	array.push(item);
	array.reverse();
}

module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/review/resolutions')
		.get((req, res) => {
			const context =
				req.query && req.query.context && JSON.parse(req.query.context);

			if (!context || !context.documentId) {
				res.status(500).send(
					new Error('Internal Server Error, missing documentId')
				);
				return;
			}

			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					resolutions: all,
					recent,
				});
		});

	// This endpoint is also used in standards-review/routes/reviewAnnotationRoute.js
	// The goal here is to save the resolutions comment once it is resolved.
	router
		.route('/connectors/cms/standard/review/annotation')
		.put((req, _res, next) => {
			if (
				req.body?.annotations[0]?.status ===
				'ANNOTATION_STATUS_RESOLVED'
			) {
				const resolutionComment =
					req.body.annotations[0]?.resolvedMetadata
						?.resolutionComment;

				if (!all.includes(resolutionComment)) {
					prependItem(all, resolutionComment);
				}

				if (!recent.includes(resolutionComment)) {
					// If the resolution does not exist in recent, remove last item and push the new one
					if (recent.length === 3) {
						recent.pop();
					}
					prependItem(recent, resolutionComment);
				} else {
					// If the resolution already exist in recent, just shift from its position to the first position
					recent.splice(recent.indexOf(resolutionComment), 1);
					prependItem(recent, resolutionComment);
				}
			}
			next();
		});

	return router;
};
