module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/document/title')
		.put((req, res) => res.end());

	return router;
};
