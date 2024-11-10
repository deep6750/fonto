const authors = [
	{
		displayName: 'Deann Desai',
		id: '571844',
	},
	{
		displayName: 'Test user',
		id: 'test-user',
	},
	{
		displayName: 'Ashley Murray',
		id: 'ashley-murray',
	},
	{
		displayName: 'S.R. Lohokare',
		id: '652254',
	},
	{
		displayName: 'Mariusz Sangórski',
		id: '7620507',
	},
];

const tenants = [
	{
		displayName: 'NL',
		id: 'NL',
	},
	{
		displayName: 'FR',
		id: 'FR',
	},
	{
		displayName: 'ES',
		id: 'ES',
	},
	{
		displayName: 'GB',
		id: 'GB',
	},
	{
		displayName: 'IT',
		id: 'IT',
	},
];

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/review/authors').get((req, res) => {
		const context =
			req.query && req.query.context && JSON.parse(req.query.context);

		if (!context || !context.documentId) {
			res.status(500).send(
				new Error('Internal Server Error, missing documentId')
			);
			return;
		}

		if (!authors.length) {
			res.status(404).json({
				status: 404,
				message: 'The list of authors does not exist',
			});
		}

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({
				authors,
			});
	});

	router.route('/connectors/cms/standard/review/tenants').get((req, res) => {
		const context =
			req.query && req.query.context && JSON.parse(req.query.context);

		if (!context || !context.documentId) {
			res.status(500).send(
				new Error('Internal Server Error, missing documentId')
			);
			return;
		}

		if (!tenants.length) {
			res.status(404).json({
				status: 404,
				message: 'The list of tenants does not exist',
			});
		}

		res.status(200)
			.set('content-type', 'application/json; charset=utf-8')
			.json({
				tenants,
			});
	});

	return router;
};
