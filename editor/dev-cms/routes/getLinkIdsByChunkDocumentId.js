'use strict';

const { sync } = require('slimdom-sax-parser');
const {
	evaluateXPathToNodes,
	evaluateXPathToString,
	evaluateXPathToStrings,
} = require('fontoxpath');

const asNamespace = 'http://niso-sts-authoring-solution/authoring-schema';

module.exports = (structureChunkString, loadFile, reference) => {
	// Parse the assembled XML
	const assembledDom = sync(structureChunkString);

	const allChunkReferences = evaluateXPathToStrings(
		`//*[namespace-uri() = '${asNamespace}']/@Q{${asNamespace}}href`,
		assembledDom
	);

	const promises = allChunkReferences.map(function (chunkReference) {
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
		return results.reduce(
			(linkIdsByChunkDocumentId, { chunkReference, xmlString }) => {
				if (!xmlString) {
					return linkIdsByChunkDocumentId;
				}

				const chunkDom = sync(xmlString);
				const refNodes =
					reference.type === 'normative'
						? evaluateXPathToNodes(
								`descendant::*[
								not(parent::ref) and (
									(self::std and ((child::std-id and child::std-id = $catalogueId) or child::std-ref = $referenceLabel)) or
									(self::mixed-citation and string() = $referenceLabel))]`,
								chunkDom,
								undefined,
								{
									catalogueId: reference.catalogueId || '',
									referenceLabel: reference.label,
								}
						  )
						: evaluateXPathToNodes(
								`descendant::xref[@ref-type="bibr" and substring-after(@Q{${asNamespace}}rid, '#') = $id]`,
								chunkDom,
								undefined,
								{ id: reference.id }
						  );
				if (refNodes.length > 0) {
					linkIdsByChunkDocumentId[chunkReference] = refNodes.map(
						(node) => evaluateXPathToString('@id', node)
					);
				}

				return linkIdsByChunkDocumentId;
			},
			{}
		);
	});
};
