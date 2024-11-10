const fs = require('fs-extra');
const path = require('path');
const { sync } = require('slimdom-sax-parser');
const { evaluateXPathToStrings } = require('fontoxpath');

const { getTopics } = require('./topicsHelper');

const asNamespace = 'http://niso-sts-authoring-solution/authoring-schema';

const counts = [698, 245, 89, 54, 34, 33, 30, 28, 26, 23, 22, 21, 20, 18];

const topicCounts = [
	21, 133, 205, 11, 56, 75, 31, 29, 16, 37, 48, 101, 4, 18, 35, 9, 23, 12, 88,
];

const topCountryList = [
	{
		id: 'Netherlands (NL)',
		count: 625,
	},
	{
		id: 'France (FR)',
		count: 300,
	},
	{
		id: 'Spain (ES)',
		count: 125,
	},
	{
		id: 'Great Britain (GB)',
		count: 82,
	},
	{
		id: 'Italy (IT)',
		count: 68,
	},
	{
		id: 'Germany (DE)',
		count: 66,
	},
	{
		id: 'Sweden (SV)',
		count: 65,
	},
	{
		id: 'Belgium (BE)',
		count: 60,
	},
	{
		id: 'Denmark (DK)',
		count: 57,
	},
	{
		id: 'Norway (NO)',
		count: 54,
	},
];

module.exports = (router) => {
	router
		.route('/connectors/cms/standard/review/statistics')
		.post((req, res) => {
			const context =
				req.query && req.query.context && JSON.parse(req.query.context);

			const documentId = context.documentId;

			if (!documentId) {
				res.status(500).json({
					status: 500,
					message: 'Internal Server Error, no document id.',
				});
				return;
			}

			req.cms.load(
				documentId,
				context.editSessionToken,
				async function (error, content) {
					if (error) {
						res.status(500).json({
							status: 500,
							message:
								'Internal Server Error, document not found.',
						});
						return;
					}

					const structureChunkDom = sync(content);

					const chunkDocumentIds = evaluateXPathToStrings(
						`//*[namespace-uri() = '${asNamespace}' and local-name() = 'sec-ref']/@Q{${asNamespace}}href`,
						structureChunkDom
					);

					const shuffledChunkedDocumentIds = chunkDocumentIds
						.map((value) => ({ value, sort: Math.random() }))
						.sort((a, b) => a.sort - b.sort)
						.map(({ value }) => value);

					const topClauseList = [];
					let i = 0;
					while (
						shuffledChunkedDocumentIds.length > i &&
						i < counts.length
					) {
						topClauseList.push({
							documentId: shuffledChunkedDocumentIds[i],
							count: counts[i],
						});
						i++;
					}

					const unresolvedAnnotationsTopicList = [];
					const topics = getTopics();
					let j = 0;
					while (topics.length > j && j < topicCounts.length) {
						unresolvedAnnotationsTopicList.push({
							topicId: topics[j].id,
							count: topicCounts[j],
						});
						j++;
					}

					// Hardcoded statistics, should eventually probably be based on the actual annotation database.
					const draftStatistics = {
						totalAnnotationCount: 1200,
						resolvedAnnotationCount: 200,
						unresolvedAnnotationCount: 1000,
						editorialSubtypeAnnotationCount: 400,
						generalSubtypeAnnotationCount: 200,
						technicalSubtypeAnnotationCount: 600,
						topClauseList,
						unresolvedAnnotationsTopicList,
					};

					fs.readFile(
						path.join(
							__dirname,
							'..',
							'..',
							'standards-preferences-layer',
							'routes',
							'preferences.json'
						),
						'utf-8',
						(error, preferencesContent) => {
							if (error) {
								res.status(500).send(error);
							}

							const parsedPreferences =
								JSON.parse(preferencesContent);
							const isNationalResolving =
								!!parsedPreferences.preferences
									.isNationalResolutionTypeEnabled;
							const topCountriesVisible =
								!!parsedPreferences.preferences
									.isCountriesWithMostCommentsVisible;

							const statistics = isNationalResolving
								? {
										...draftStatistics,
										...{
											discardedNationalAnnotationCount: 125,
											madeNationalAnnotationCount: 250,
											unresolvedNationalContributionCount: 825,
										},
								  }
								: !isNationalResolving && topCountriesVisible
								? {
										...draftStatistics,
										topCountryList,
								  }
								: draftStatistics;

							res.status(200)
								.set(
									'content-type',
									'application/json; charset=utf-8'
								)
								.json({
									statistics,
								});
						}
					);
				}
			);
		});

	return router;
};
