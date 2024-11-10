const { sync, slimdom } = require('slimdom-sax-parser');
const {
	evaluateXPathToBoolean,
	evaluateXPathToFirstNode,
	evaluateXPathToString,
} = require('fontoxpath');

const getLinkIdsByChunkDocumentId = require('./getLinkIdsByChunkDocumentId');
const getReferenceListDocumentId = require('./getReferenceListDocumentId');

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

function addOrUpdateReference(
	req,
	res,
	isNew,
	isReferenceId,
	updateReferenceCallback
) {
	let request;
	if (req.body.request) {
		request = req.body.request;
	} else {
		request = req.body;
	}

	if (typeof request === 'string') {
		request = JSON.parse(request);
	}

	let reference = request.reference;

	if (isReferenceId && request.referenceId) {
		reference = { id: request.referenceId };
	}

	if (!reference) {
		res.status(400).end();
		return;
	}

	// check whether the context contains the ref
	const context = request.context;
	if (!context || !context.documentId) {
		res.status(400).send(
			new Error('Internal Server Error, missing documentId')
		);
		return;
	}

	const editSessionToken =
		request.context && request.context.editSessionToken;

	req.cms.load(
		context.documentId,
		editSessionToken,
		async function (error, content) {
			if (error) {
				res.status(500).end();
				return;
			}

			const referenceListDocument = await getReferenceListDocumentId(
				content,
				async (chunkDocumentId, callback) => {
					try {
						return await req.cms.load(
							chunkDocumentId,
							req.body.context.editSessionToken,
							callback
						);
					} catch (e) {
						console.log('CANNOT LOAD', chunkDocumentId);
						throw e;
					}
				},
				reference.referenceType,
				isNew ? null : reference.id
			);

			if (!referenceListDocument.chunkReference) {
				res.status(404).end();
				return;
			}

			const chunkDom = sync(referenceListDocument.xmlString);

			const idValue = updateReferenceCallback(chunkDom, reference);

			const xml = slimdom.serializeToWellFormedString(chunkDom);

			const currentSession = req.getFontoSession(editSessionToken);

			req.cms.save(
				referenceListDocument.chunkReference,
				xml,
				currentSession,
				function (error) {
					if (error) {
						res.status(500).send(error);
						return;
					}

					res.status(isNew ? 201 : 200)
						.set('content-type', 'application/json; charset=utf-8')
						.json({
							documentId: referenceListDocument.chunkReference,
							referenceId: idValue,
						});
				}
			);
		}
	);
}

module.exports = (router, _config) => {
	router.route('/connectors/cms/standard/nisoreference').post((req, res) => {
		addOrUpdateReference(req, res, true, false, (chunkDom, reference) => {
			const referenceListNode = evaluateXPathToFirstNode(
				'descendant::ref-list[1]',
				chunkDom
			);

			const newRef = referenceListNode.ownerDocument.createElementNS(
				null,
				'ref'
			);
			const newIdValue = `ref-${generateUUID()}`;
			newRef.setAttribute('id', newIdValue);

			let newContentContainer;

			if (reference.number) {
				newContentContainer =
					referenceListNode.ownerDocument.createElementNS(
						null,
						'std'
					);

				if (reference.standardId) {
					const newStdId =
						referenceListNode.ownerDocument.createElementNS(
							null,
							'std-id'
						);
					newStdId.setAttribute('std-id-link-type', 'urn');
					newStdId.setAttribute(
						'std-id-type',
						reference.date ? 'dated' : 'undated'
					);
					const newStdIdTextNode =
						referenceListNode.ownerDocument.createTextNode(
							reference.standardId
						);
					newStdId.appendChild(newStdIdTextNode);
					newContentContainer.appendChild(newStdId);
				}

				const newStdRef =
					referenceListNode.ownerDocument.createElementNS(
						null,
						'std-ref'
					);
				const newStdRefTextNode =
					referenceListNode.ownerDocument.createTextNode(
						reference.number +
							(reference.date ? `:${reference.date}` : '')
					);
				newStdRef.appendChild(newStdRefTextNode);
				newContentContainer.appendChild(newStdRef);

				if (reference.title) {
					const newTitle =
						referenceListNode.ownerDocument.createElementNS(
							null,
							'title'
						);
					const newTitleTextNode =
						referenceListNode.ownerDocument.createTextNode(
							reference.title
						);
					newTitle.appendChild(newTitleTextNode);
					newContentContainer.appendChild(newTitle);
				}
			} else {
				if (reference.label) {
					const newLabel =
						referenceListNode.ownerDocument.createElementNS(
							null,
							'label'
						);
					const newLabelTextNode =
						referenceListNode.ownerDocument.createTextNode(
							reference.label
						);
					newLabel.appendChild(newLabelTextNode);
					newRef.appendChild(newLabel);
				}
				newContentContainer =
					referenceListNode.ownerDocument.createElementNS(
						null,
						'mixed-citation'
					);

				if (reference.title) {
					const newMixedCitationTextNode =
						referenceListNode.ownerDocument.createTextNode(
							reference.title
						);
					newContentContainer.appendChild(newMixedCitationTextNode);
				}
			}

			newRef.appendChild(newContentContainer);

			referenceListNode.appendChild(newRef);

			return newIdValue;
		});
	});

	router.route('/connectors/cms/standard/nisoreference').put((req, res) => {
		addOrUpdateReference(req, res, false, false, (chunkDom, reference) => {
			const refNode = evaluateXPathToFirstNode(
				`descendant::ref[@id = "${reference.id}"]`,
				chunkDom
			);

			if (evaluateXPathToBoolean(`child::std`, refNode)) {
				if (
					evaluateXPathToBoolean(
						`./std[1]/std-ref[1][substring-after(./string(), ":") != '${reference.date}']`,
						refNode
					)
				) {
					const stdRef = evaluateXPathToFirstNode(
						'child::std[1]/std-ref[1]',
						refNode
					);
					stdRef.childNodes.forEach((childNode) =>
						stdRef.removeChild(childNode)
					);

					const newStdRefTextNode =
						refNode.ownerDocument.createTextNode(
							reference.number +
								(reference.date ? `:${reference.date}` : '')
						);
					stdRef.appendChild(newStdRefTextNode);
				}

				if (
					evaluateXPathToBoolean(
						`./std/title[1]/string() != '${reference.title}'`,
						refNode
					)
				) {
					const title = evaluateXPathToFirstNode(
						'child::std[1]/title[1]',
						refNode
					);
					title.childNodes.forEach((childNode) =>
						title.removeChild(childNode)
					);

					const newTitleTextNode =
						refNode.ownerDocument.createTextNode(reference.title);
					title.appendChild(newTitleTextNode);
				}
			} else {
				if (
					reference.label &&
					evaluateXPathToBoolean(
						`./label != '${reference.label}'`,
						refNode
					)
				) {
					const label = evaluateXPathToFirstNode(
						'child::label',
						refNode
					);
					label.childNodes.forEach((childNode) =>
						label.removeChild(childNode)
					);

					const newLabelTextNode =
						refNode.ownerDocument.createTextNode(reference.label);
					label.appendChild(newLabelTextNode);
				}

				if (
					evaluateXPathToBoolean(
						`./mixed-citation[1]/string() != '${reference.title}'`,
						refNode
					)
				) {
					const mixedCitation = evaluateXPathToFirstNode(
						'./mixed-citation',
						refNode
					);
					mixedCitation.childNodes = [];

					const newTitleTextNode =
						refNode.ownerDocument.createTextNode(reference.title);
					mixedCitation.appendChild(newTitleTextNode);
				}
			}

			return reference.id;
		});
	});

	router
		.route('/connectors/cms/standard/nisoreference')
		.delete((req, res) => {
			let request;
			if (req.body.request) {
				request = req.body.request;
			} else {
				request = req.body;
			}

			if (typeof request === 'string') {
				request = JSON.parse(request);
			}

			// check whether the context contains the ref
			const context = request.context;
			if (!context || !context.documentId) {
				res.status(400).send(
					new Error('Internal Server Error, missing documentId')
				);
				return;
			}

			req.cms.load(
				context.documentId,
				context.editSessionToken,
				async function (error, content) {
					if (error) {
						res.status(500).json({
							status: 500,
							message: 'Internal Server Error',
						});
						return;
					}

					const referenceListDocument =
						await getReferenceListDocumentId(
							content,
							async (chunkDocumentId, callback) => {
								try {
									return await req.cms.load(
										chunkDocumentId,
										context.editSessionToken,
										callback
									);
								} catch (e) {
									console.log('CANNOT LOAD', chunkDocumentId);
									throw e;
								}
							},
							null,
							request.referenceId
						);

					if (!referenceListDocument.chunkReference) {
						res.status(404).end();
						return;
					}

					const referenceListDom = sync(
						referenceListDocument.xmlString
					);

					const refNode = evaluateXPathToFirstNode(
						`descendant::ref[@id = "${request.referenceId}"]`,
						referenceListDom
					);

					const reference = {
						id: request.referenceId,
						type: referenceListDocument.referenceType,
					};

					if (evaluateXPathToBoolean(`child::std`, refNode)) {
						reference.label = evaluateXPathToString(
							'child::std[1]/std-ref[1]',
							refNode
						);
						reference.catalogueId = evaluateXPathToString(
							'child::std[1]/std-id[1]',
							refNode
						);
					} else if (reference.type === 'normative') {
						reference.label = evaluateXPathToString(
							'child::label',
							refNode
						);
					}

					const linkIdsByChunkDocumentId =
						await getLinkIdsByChunkDocumentId(
							content,
							async (chunkDocumentId, callback) => {
								try {
									return await req.cms.load(
										chunkDocumentId,
										context.editSessionToken,
										callback
									);
								} catch (e) {
									console.log('CANNOT LOAD', chunkDocumentId);
									throw e;
								}
							},
							reference
						);

					if (Object.keys(linkIdsByChunkDocumentId).length > 0) {
						// test 409 response
						res.status(409).json({
							status: 409,
							message:
								'Not all links to this reference are removed yet',
							linkIdsByChunkDocumentId,
						});
						return;
					}

					addOrUpdateReference(
						req,
						res,
						false,
						true,
						(chunkDom, reference) => {
							const refNode = evaluateXPathToFirstNode(
								`descendant::ref[@id = "${reference.id}"]`,
								chunkDom
							);

							const refListNode = evaluateXPathToFirstNode(
								'parent::ref-list',
								refNode
							);

							refListNode.removeChild(refNode);

							return reference.id;
						}
					);
				}
			);
		});

	return router;
};
