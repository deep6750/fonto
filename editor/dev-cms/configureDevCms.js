const routes = [
	require("./routes/deleteAsset"),
	require("./routes/nisoAssetPost"),
	require("./routes/nisoAssetPut"),
	require("./routes/nisoMetadataGet"),
	require("./routes/elementOverview"),
	require("./routes/configureNumberingGetRoute"),
	require("./routes/iframeParentRoute"),
	require("./routes/preferencesLayer"),
	require("./routes/customTags"),
	require("./routes/discardNationalCommentRoute"),
	require("./routes/retrieveAuthors"),
	require("./routes/nisoReferenceRoutes"),
	require("./routes/referenceBrowseRoutes"),
	require("./routes/templateBrowseRoutes"),
	require("./routes/chunksRoutes"),
	require("./routes/getCrossDocumentReferencePreviewRoute"),
	require("./routes/iframePreviewRoute"),
	require("./routes/publishedDocumentsBrowseRoute"),
	require("./routes/putDocumentTitle"),
	require("./routes/reviewAnnotationRoute"),
	require("./routes/resolutionsRoute"),
	require("./routes/statisticsRoute"),
	require("./routes/topicsRoutes"),
	require("./routes/termsRoute"),
	require("./routes/obsoleteAnnotationsRoute"),
	require("./routes/milestonesRoute"),
];

const matchAnnotationToCurrentFilter = require("./matchAnnotationToCurrentFilter");

module.exports = (router, config) => {
	return {
		reviewAnnotationFilter: matchAnnotationToCurrentFilter,
		routes: routes.map((route) => route(router, config)),
	};
};
