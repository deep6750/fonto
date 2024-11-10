'use strict';

module.exports = (router, _config) => {
	router
		.route('/connectors/cms/standard/history/milestones')
		.get((req, res) => {
			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.send({
					milestones: [
						{
							date: '2023-05-20T11:50:00.243Z',
							label: '20.00 Version 1',
							author: 'Rober',
							description: 'This is a test version',
						},
						{
							date: '2023-05-21T11:50:00.243Z',
							label: '30.00 Version 1',
							author: 'Marloes',
							description: 'This is a second test version',
						},
						{
							date: '2023-05-22T11:50:00.243Z',
							label: '30.10 Version 1',
							author: 'Tom',
							description: 'This is a third test version',
						},
						{
							date: '2023-05-24T11:50:00.243Z',
							label: '30.10 Version 2',
							author: 'Patrice',
							description: 'This is a fourth test version',
							isMajorVersion: true,
						},
					],
				});
		});

	return router;
};
