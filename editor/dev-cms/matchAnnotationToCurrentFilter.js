const fs = require("fs-extra");
const path = require("path");

module.exports = function matchAnnotationToCurrentFilter(
	filterFormValueByName,
	annotation
) {
	const preferencesContent = fs.readFileSync(
		path.join(__dirname, "routes", "preferences.json"),
		"utf-8"
	);

	const parsedPreferences = JSON.parse(preferencesContent);

	const hideCommentAnnotations =
		!!parsedPreferences?.preferences?.hideAnnotationTypes?.comments;
	const hideGlobalCommentAnnotations =
		!!parsedPreferences?.preferences?.hideAnnotationTypes?.publicationComments;
	const hideProposalAnnotations =
		!!parsedPreferences?.preferences?.hideAnnotationTypes?.proposals;

	// This function filters annotations on type AND resolution.

	const metadata = annotation.metadata || {};

	const isTypeComment =
		["comment", "object-comment"].includes(annotation.type) ||
		(annotation.type === "comment-proposal" &&
			!metadata?.proposedChange &&
			metadata?.proposedChange !== "") ||
		(annotation.type === "image-comment-proposal" &&
			!metadata?.proposedImage) ||
		(annotation.type === "formula-comment-proposal" &&
			!metadata?.proposedFormula);
	const isTypePublicationComment = annotation.type === "publication-comment";
	const isTypeProposal =
		["proposal", "object-formula-proposal", "object-image-proposal"].includes(
			annotation.type
		) ||
		(annotation.type === "comment-proposal" &&
			(metadata?.proposedChange || metadata?.proposedChange === "")) ||
		(annotation.type === "image-comment-proposal" && metadata?.proposedImage) ||
		(annotation.type === "formula-comment-proposal" &&
			metadata?.proposedFormula);

	if (
		(isTypeComment && hideCommentAnnotations) ||
		(isTypePublicationComment && hideGlobalCommentAnnotations) ||
		(isTypeProposal && hideProposalAnnotations)
	) {
		return false;
	}

	const isResolved = annotation.status === "ANNOTATION_STATUS_RESOLVED";
	const isResolvedAndAccepted =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "accepted";
	const isResolvedAndPartiallyAccepted =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "partially-accepted";
	const isResolvedAndNotAccepted =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "rejected";
	const isResolvedAndNoted =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "noted";
	const isResolvedAndDeferred =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "deferred";
	const isResolvedAndDiscarded =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "discarded";
	const isNational = annotation.metadata && annotation.metadata.isNational;
	const isUnresolved = !isResolved;
	const isResolvedAndMadeNational =
		isResolved &&
		annotation.resolvedMetadata &&
		annotation.resolvedMetadata.resolution === "made-national";

	const isDraftResolvedResolution =
		annotation.metadata && annotation.metadata.draftResolvedMetadata;
	const isDraftResolutionNational =
		annotation.metadata &&
		annotation.metadata.draftResolvedMetadata &&
		annotation.metadata.draftResolvedMetadata.resolution === "made-national";
	const isDraftResolutionDiscarded =
		annotation.metadata &&
		annotation.metadata.draftResolvedMetadata &&
		annotation.metadata.draftResolvedMetadata.resolution === "discarded";

	const matchesType =
		(filterFormValueByName.typeComment && isTypeComment) ||
		(filterFormValueByName.typePublicationComment &&
			isTypePublicationComment) ||
		(filterFormValueByName.typeProposal && isTypeProposal) ||
		//
		(!filterFormValueByName.typeComment &&
			!filterFormValueByName.typePublicationComment &&
			!filterFormValueByName.typeProposal);

	const matchesSubtype =
		(filterFormValueByName.typeGeneral && metadata.commentType === "general") ||
		(filterFormValueByName.typeEditorial &&
			metadata.commentType === "editorial") ||
		(filterFormValueByName.typeTechnical &&
			metadata.commentType === "technical") ||
		//
		(!filterFormValueByName.typeGeneral &&
			!filterFormValueByName.typeEditorial &&
			!filterFormValueByName.typeTechnical);

	const matchesInternationalResolution =
		(filterFormValueByName.resolutionResolved && isResolved) ||
		(filterFormValueByName.resolutionResolvedAccepted &&
			isResolvedAndAccepted) ||
		(filterFormValueByName.resolutionResolvedPartiallyAccepted &&
			isResolvedAndPartiallyAccepted) ||
		(filterFormValueByName.resolutionResolvedRejected &&
			isResolvedAndNotAccepted) ||
		(filterFormValueByName.resolutionResolvedNoted && isResolvedAndNoted) ||
		(filterFormValueByName.resolutionResolvedDeferred &&
			isResolvedAndDeferred) ||
		(filterFormValueByName.resolutionUnresolved && isUnresolved) ||
		(!filterFormValueByName.resolutionResolved &&
			!filterFormValueByName.resolutionResolvedAccepted &&
			!filterFormValueByName.resolutionResolvedPartiallyAccepted &&
			!filterFormValueByName.resolutionResolvedRejected &&
			!filterFormValueByName.resolutionResolvedNoted &&
			!filterFormValueByName.resolutionResolvedDeferred &&
			!filterFormValueByName.resolutionUnresolved);

	const matchesNationalResolution =
		(filterFormValueByName.resolutionResolved && isResolved) ||
		(filterFormValueByName.resolutionResolvedNational && isNational) ||
		(filterFormValueByName.resolutionResolvedNational &&
			isResolvedAndMadeNational) ||
		(filterFormValueByName.resolutionResolvedDiscarded &&
			isResolvedAndDiscarded) ||
		(filterFormValueByName.resolutionUnresolved &&
			isUnresolved &&
			!isNational) ||
		(!filterFormValueByName.resolutionResolved &&
			!filterFormValueByName.resolutionResolvedNational &&
			!filterFormValueByName.resolutionResolvedDiscarded &&
			!filterFormValueByName.resolutionUnresolved);

	const matchesResolution =
		parsedPreferences?.preferences?.nationalCommentResolutionType ===
		"international"
			? matchesInternationalResolution
			: matchesNationalResolution;

	const matchesDraftResolvedInternationalResolution =
		(filterFormValueByName.draftResolution && isDraftResolvedResolution) ||
		!filterFormValueByName.draftResolution;

	const matchesDraftResolvedNationalResolution =
		(isDraftResolvedResolution &&
			((filterFormValueByName.draftResolutionNational &&
				isDraftResolutionNational) ||
				(filterFormValueByName.draftResolutionDiscarded &&
					isDraftResolutionDiscarded))) ||
		(!filterFormValueByName.draftResolution &&
			!filterFormValueByName.draftResolutionNational &&
			!filterFormValueByName.draftResolutionDiscarded);

	const matchesDraftResolution =
		parsedPreferences?.preferences?.nationalCommentResolutionType ===
		"international"
			? matchesDraftResolvedInternationalResolution
			: matchesDraftResolvedNationalResolution;

	const matchesProcessStageIds =
		(filterFormValueByName.processStageIds || []).length > 0 &&
		metadata.processStageId
			? filterFormValueByName.processStageIds.includes(metadata.processStageId)
			: true;

	const matchesTopic = filterFormValueByName.topicId
		? metadata.topicId === filterFormValueByName.topicId
		: true;

	const matchesTag =
		(filterFormValueByName.tags || []).length > 0
			? (metadata.tags || []).length > 0 &&
			  metadata.tags.find((tag) => filterFormValueByName.tags.includes(tag))
			: true;

	const matchesSearchText = filterFormValueByName.searchText
		? (metadata.comment &&
				metadata.comment
					.toLowerCase()
					.includes(filterFormValueByName.searchText.toLowerCase())) ||
		  (metadata.proposedChange &&
				metadata.proposedChange
					.toLowerCase()
					.includes(filterFormValueByName.searchText.toLowerCase())) ||
		  (filterFormValueByName.includeRepliesAndResolutionsForSearchText &&
				((annotation.resolvedMetadata &&
					annotation.resolvedMetadata.resolutionComment &&
					annotation.resolvedMetadata.resolutionComment
						.toLowerCase()
						.includes(filterFormValueByName.searchText.toLowerCase())) ||
					(annotation.replies &&
						annotation.replies.some(
							(reply) =>
								reply.metadata &&
								reply.metadata.reply &&
								reply.metadata.reply
									.toLowerCase()
									.includes(filterFormValueByName.searchText.toLowerCase())
						))))
		: true;

	const matchesAuthors =
		(filterFormValueByName.authors || []).length > 0
			? (annotation.author &&
					filterFormValueByName.authors.some(
						(author) => author.id === annotation.author.id
					)) ||
			  (filterFormValueByName.includeRepliesAndResolutionsForAuthors &&
					((annotation.replies &&
						filterFormValueByName.authors.some((author) =>
							annotation.replies
								.map((reply) => reply.author.id)
								.includes(author.id)
						)) ||
						(annotation.resolvedAuthor &&
							filterFormValueByName.authors.some(
								(author) => author.id === annotation.resolvedAuthor.id
							))))
			: true;

	const matchesTenants =
		(filterFormValueByName.tenants || []).length > 0
			? annotation.author &&
			  filterFormValueByName.tenants.some(
					(author) => author.id === annotation.author.id
			  )
			: true;

	const annotationJSDate = new Date(annotation.timestamp);
	const utcDate = new Date(
		Date.UTC(
			annotationJSDate.getFullYear(),
			annotationJSDate.getMonth(),
			annotationJSDate.getDate(),
			0,
			0,
			0
		)
	);
	const annotationTimestamp = utcDate.toISOString();

	const endDateMatch = filterFormValueByName.endTimestamp
		? filterFormValueByName.endTimestamp >= annotationTimestamp
		: true;
	const startDateMatch = filterFormValueByName.startTimestamp
		? filterFormValueByName.startTimestamp <= annotationTimestamp
		: true;

	const matchesDateCreated = endDateMatch && startDateMatch;

	const matchesElement =
		(filterFormValueByName.createdOnTable &&
			metadata.createdOnElement === "table") ||
		(filterFormValueByName.createdOnFigure &&
			metadata.createdOnElement === "figure") ||
		(filterFormValueByName.createdOnFormula &&
			metadata.createdOnElement === "formula") ||
		//
		(!filterFormValueByName.createdOnTable &&
			!filterFormValueByName.createdOnFigure &&
			!filterFormValueByName.createdOnFormula);

	return (
		matchesType &&
		matchesSubtype &&
		matchesDraftResolution &&
		matchesResolution &&
		matchesProcessStageIds &&
		matchesTopic &&
		matchesTag &&
		matchesSearchText &&
		matchesAuthors &&
		matchesTenants &&
		matchesDateCreated &&
		matchesElement
	);
};
