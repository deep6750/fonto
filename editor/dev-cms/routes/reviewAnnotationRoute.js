"use strict";

const preferencesJson = require("./preferences.json");

const processStageId = preferencesJson.preferences.processStages.find(
	(processStage) => processStage.isCurrentStage
).id;

let commentNumber = 0;

function generateUUID() {
	let now = typeof Date.now === "function" ? Date.now() : new Date().getTime();

	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		const r = (now + Math.random() * 16) % 16 | 0;
		now = Math.floor(now / 16);
		return (c === "x" ? r : (r & 0x7) | 0x8).toString(16);
	});
}

const author = {
	id: "NL",
	displayName: "NL",
};

module.exports = (router) => {
	router
		.route("/connectors/cms/standard/review/annotation")
		.post((req, res, next) => {
			if (!req.body.annotation.metadata.commentNumber) {
				commentNumber++;
				req.body.annotation.metadata.commentNumber = commentNumber;
			}

			req.body.annotation.metadata.processStageId = processStageId;

			const saveMode = req.cms._saveMode;

			// Ensures that the national comments are always being saved
			const editSessionToken =
				saveMode === "disk"
					? generateUUID()
					: req.body.context.editSessionToken;

			if (req.body.annotation.metadata.isNational) {
				req.getFontoSession = () => ({
					editSessionToken,
					user: author,
				});
			}

			if (req.body.annotation.author) {
				req.getFontoSession = () => ({
					editSessionToken: req.body.context.editSessionToken,
					user: req.body.annotation.author,
				});
			}

			delete req.body.annotation.metadata.changeAction;

			next();
		});

	router
		.route("/connectors/cms/standard/review/annotation/reply")
		.post((req, res, next) => {
			if (req.body.author) {
				req.getFontoSession = () => ({
					editSessionToken: req.body.context.editSessionToken,
					user: req.body.author,
				});
			}

			delete req.body.reply.metadata.changeAction;

			next();
		});

	// This endpoint is also used in standards-review/routes/resolutionsRoute.js.
	// The goal here is to add the prcessStageId in resolvedMetadata once it is resolved.
	router
		.route("/connectors/cms/standard/review/annotation")
		.put((req, res, next) => {
			if (req.body.annotations[0].status === "ANNOTATION_STATUS_RESOLVED") {
				req.body.annotations[0].resolvedMetadata.processStageId =
					processStageId;
			}

			if (
				req.body.annotations[0]?.resolvedMetadata?.resolution ===
				"made-national"
			) {
				req.body.annotations[0].author = author;
				req.body.annotations[0].resolvedAuthor = author;
			}

			next();
		});

	return router;
};
