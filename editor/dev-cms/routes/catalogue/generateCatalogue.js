'use strict';

const { sync } = require('slimdom-sax-parser');
const {
	evaluateXPathToBoolean,
	evaluateXPathToNodes,
	evaluateXPathToString,
} = require('fontoxpath');

const asNamespace = 'http://niso-sts-authoring-solution/authoring-schema';

function createObjectForRef(node) {
	return {
		id: evaluateXPathToString('./std/std-id', node),
		label: '',
		type: 'reference',
		metadata: {
			number: evaluateXPathToString(
				'if (contains(./std[1]/std-ref[1]/string(), ":")) then substring-before(./std[1]/std-ref[1]/string(), ":") else ./std[1]/std-ref[1]',
				node
			),
			date: evaluateXPathToBoolean(
				'contains(./std[1]/std-ref[1]/string(), ":")',
				node
			)
				? evaluateXPathToString(
						'substring-after(./std[1]/std-ref[1]/string(), ":")',
						node
				  )
				: null,
			title: evaluateXPathToString('./std/title', node),
		},
	};
}

module.exports = (structureChunkString, loadFile) => {
	// Parse the assembled XML
	const assembledDom = sync(structureChunkString);

	const relevantChunkRefNodes = evaluateXPathToNodes(
		`//*[namespace-uri() = '${asNamespace}' and (local-name() = "sec-ref" or local-name() = "ref-list-ref")]`,
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
		return results.reduce((references, { chunkReference, xmlString }) => {
			if (!xmlString) {
				return references;
			}
			const chunkDom = sync(xmlString);
			const refNodes = evaluateXPathToNodes(
				'/*[self::sec[@sec-type="norm-refs"] or self::ref-list[@content-type="bibl"]]/descendant::ref[@id and ./std/std-id]',
				chunkDom
			);

			references = references.concat(refNodes.map(createObjectForRef));
			return references;
		}, []);
	});
};
