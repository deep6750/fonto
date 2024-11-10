const {
	getTopics,
	getTopicCounter,
	addTopic,
	updateTopic,
	removeTopic,
} = require('./topicsHelper');

function generateUUID() {
	// copied from angular.uuid()
	let now =
		typeof Date.now === 'function' ? Date.now() : new Date().getTime();

	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
		/[xy]/g,
		function (c) {
			const r = (now + Math.random() * 16) % 16 | 0;
			now = Math.floor(now / 16);
			return (c === 'x' ? r : (r & 0x7) | 0x8).toString(16);
		}
	);
}

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/review/topics').get((req, res) => {
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
				topics: getTopics(),
			});
	});

	router.route('/connectors/cms/standard/review/topic').post((req, res) => {
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
		const topicRequest = request.topic;
		if (
			!context ||
			!context.documentId ||
			!topicRequest ||
			!topicRequest.label
		) {
			res.status(400).send(
				new Error(
					'Internal Server Error, invalid or insufficient data provided'
				)
			);
			return;
		}

		const topics = getTopics();

		if (topics.find((topic) => topic.label === topicRequest.label)) {
			res.status(409).send(new Error('Topic already exists'));
			return;
		}

		const newTopic = {
			id: `id-${generateUUID()}`,
			number: `${getTopicCounter()}`,
			label: topicRequest.label,
			...(topicRequest.information
				? { information: topicRequest.information }
				: {}),
		};

		addTopic(newTopic);

		res.status(201)
			.set('content-type', 'application/json; charset=utf-8')
			.json({ topic: newTopic });
	});

	router.route('/connectors/cms/standard/review/topic').put((req, res) => {
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
		const topicRequest = request.topic;
		if (
			!context ||
			!context.documentId ||
			!topicRequest ||
			!topicRequest.id
		) {
			res.status(400).send(
				new Error(
					'Internal Server Error, invalid or insufficient data provided'
				)
			);
			return;
		}

		const topics = getTopics();

		const topicIndex = topics.findIndex(
			(topic) => topic.id === topicRequest.id
		);

		if (topicIndex === -1) {
			res.status(404).send(new Error('Topic does not exist'));
			return;
		}

		const updatedTopic = { ...topics[topicIndex], ...topicRequest };

		updateTopic(topicIndex, updatedTopic);

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({ topic: updatedTopic });
	});

	router.route('/connectors/cms/standard/review/topic').delete((req, res) => {
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
		const topicId = request.topicId;
		if (!context || !context.documentId || !topicId) {
			res.status(400).send(
				new Error(
					'Internal Server Error, invalid or insufficient data provided'
				)
			);
			return;
		}

		const topics = getTopics();

		const topicIndex = topics.findIndex((topic) => topic.id === topicId);
		if (topicIndex > -1) {
			removeTopic(topicIndex);
		}

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({});
	});

	return router;
};
