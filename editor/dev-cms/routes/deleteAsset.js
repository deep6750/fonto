function configureDeleteAssetRoute() {
	return async (_req, res) => {
		const randomResponse = Math.random();

		if (randomResponse <= 0.3) {
			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.send(JSON.stringify({ ok: true }, null, '\t'));
			return;
		}

		if (randomResponse <= 0.6) {
			res.status(500)
				.set('content-type', 'application/json; charset=utf-8')
				.send({});
			return;
		}

		res.status(412)
			.set('content-type', 'application/json; charset=utf-8')
			.send(
				JSON.stringify({
					message:
						'Removing images from this demo environment is not supported.',
				})
			);
	};
}

module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/asset')
		.delete(configureDeleteAssetRoute());

	return router;
};
