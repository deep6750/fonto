'use strict';

const { sync } = require('slimdom-sax-parser');
const {
	evaluateXPathToBoolean,
	evaluateXPathToNodes,
	evaluateXPathToString,
} = require('fontoxpath');

const asNamespace = 'http://niso-sts-authoring-solution/authoring-schema';

module.exports = (
	structureChunkString,
	loadFile,
	referenceType,
	referenceId
) => {
	// Parse the assembled XML
	const assembledDom = sync(structureChunkString);

	const chunkRefs = [];
	if (referenceType === 'normative' || !referenceType) {
		chunkRefs.push('sec-ref');
	}
	if (referenceType === 'informative' || !referenceType) {
		chunkRefs.push('ref-list-ref');
	}
	const relevantChunkRefNodes = evaluateXPathToNodes(
		`//*[namespace-uri() = '${asNamespace}' and local-name() = ('${chunkRefs.join(
			"', '"
		)}')]`,
		assembledDom
	);

	const promises = relevantChunkRefNodes.map(function (chunkRefNode) {
		const chunkReference = evaluateXPathToString(
			`@Q{${asNamespace}}href`,
			chunkRefNode
		);
		return new Promise(
			function (documentId, resolve, reject) {
				loadFile(documentId, function (err, data) {
					if (err) {
						resolve({ chunkReference }); // following the same code flow
						console.log(err);
					} else {
						resolve({ chunkReference, xmlString: data });
					}
				});
			}.bind(this, chunkReference)
		);
	});

	return Promise.all(promises).then(function (results) {
		const referenceListDocument = results.find(
			({ chunkReference, xmlString }) => {
				if (!xmlString) {
					return false;
				}
				const chunkDom = sync(xmlString);

				let isCorrectRefList = false;
				if (referenceType === 'normative' || !referenceType) {
					isCorrectRefList = evaluateXPathToBoolean(
						referenceId
							? `/sec[@sec-type="norm-refs"][descendant::ref/@id = "${referenceId}"]`
							: '/sec[@sec-type="norm-refs"][descendant::ref-list]',
						chunkDom
					);
					if (!referenceType && isCorrectRefList) {
						referenceType = 'normative';
					}
				}
				if (
					!isCorrectRefList &&
					(referenceType === 'informative' || !referenceType)
				) {
					isCorrectRefList = evaluateXPathToBoolean(
						`/ref-list[@content-type="bibl"]${
							referenceId
								? `[descendant::ref/@id = "${referenceId}"]`
								: ''
						}`,
						chunkDom
					);
					if (!referenceType && isCorrectRefList) {
						referenceType = 'informative';
					}
				}
				return isCorrectRefList;
			}
		);
		return { referenceType, ...referenceListDocument };
	});
};
