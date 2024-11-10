const customTags = ['High priority', 'Low priority', 'To discuss'];

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/review/tags').get((req, res) => {
		const context =
			req.query && req.query.context && JSON.parse(req.query.context);

		if (!context || !context.documentId) {
			res.status(500).send(
				new Error('Internal Server Error, missing documentId')
			);
			return;
		}

		customTags.sort();

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({
				tags: customTags,
			});
	});

	router.route('/connectors/cms/standard/review/tag').post((req, res) => {
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		if (typeof request === 'string') {
			request = JSON.parse(request);
		}

		const context = request.context;
		if (!context || !context.documentId) {
			res.status(400).send(
				new Error('Internal Server Error, missing documentId')
			);

			return;
		}

		customTags.push(request.tag);

		res.status(201)
			.set('content-type', 'application/json; charset=utf-8')
			.json({});
	});

	router.route('/connectors/cms/standard/review/tag').delete((req, res) => {
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		if (typeof request === 'string') {
			request = JSON.parse(request);
		}

		const context = request.context;
		if (!context || !context.documentId) {
			res.status(500).send(
				new Error('Internal Server Error, missing documentId')
			);
			return;
		}

		// In the dev-cms we will not actually remove the tags from the annotations.
		if (
			request.tag === 'High priority' &&
			!request.alsoDeleteInAnnotations
		) {
			res.status(409).json({
				status: 409,
				message: 'This tag is still being used in some annotations',
				annotationCount: 3,
			});
			return;
		}

		const index = customTags.indexOf(request.tag);
		if (index > -1) {
			customTags.splice(index, 1);
		}

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({});
	});

	router.route('/connectors/cms/standard/review/tag').put((req, res) => {
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		if (typeof request === 'string') {
			request = JSON.parse(request);
		}

		const context = request.context;
		if (!context || !context.documentId) {
			res.status(400).send(
				new Error('Internal Server Error, missing documentId')
			);

			return;
		}

		// In the dev-cms we will not actually remove the tags from the annotations.
		if (
			request.originalTag === 'High priority' &&
			!request.alsoEditInAnnotations
		) {
			res.status(409).json({
				status: 409,
				message: 'This tag is still being used in some annotations',
				annotationCount: 3,
			});
			return;
		}

		const index = customTags.indexOf(request.originalTag);
		if (index > -1) {
			customTags[index] = request.newTag;
		}

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({});
	});

	return router;
};
