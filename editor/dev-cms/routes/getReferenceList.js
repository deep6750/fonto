'use strict';

const { sync } = require('slimdom-sax-parser');
const {
	evaluateXPathToBoolean,
	evaluateXPathToNodes,
	evaluateXPathToString,
} = require('fontoxpath');
const stubbedCatalogue = require('./data/stubbedCatalogue.json');

const asNamespace = 'http://niso-sts-authoring-solution/authoring-schema';

function createObjectForRef(node, documentId) {
	const standardId = evaluateXPathToString('./std/std-id', node);

	const dataFromCatalogue = stubbedCatalogue.find(
		(reference) => reference.id === standardId
	);

	return {
		id: evaluateXPathToString('@id', node),
		label: '',
		type: 'reference',
		metadata: evaluateXPathToBoolean('child::std', node)
			? {
					standardId,
					documentId,
					number: evaluateXPathToString(
						`let $stdRef := ./std[1]/std-ref[1]
						return if (contains($stdRef/string(), ":"))
						then
							let $splitSequence := $stdRef => tokenize(':')
							return string-join(remove($splitSequence, count($splitSequence)), ':')
						else $stdRef`,
						node
					),
					date: evaluateXPathToBoolean(
						'contains(./std[1]/std-ref[1]/string(), ":")',
						node
					)
						? evaluateXPathToString(
								"let $splitSequence := ./std[1]/std-ref[1] => tokenize(':') return $splitSequence[last()]",
								node
						  )
						: null,
					title: evaluateXPathToString('./std/title', node),
					...(dataFromCatalogue &&
						dataFromCatalogue.metadata &&
						dataFromCatalogue.metadata.status && {
							status: dataFromCatalogue.metadata.status,
						}),
			  }
			: {
					documentId,
					title: evaluateXPathToString(
						'./mixed-citation/string()',
						node
					),
					label: evaluateXPathToString('./label', node),
			  },
	};
}

module.exports = (structureChunkString, loadFile, referenceType) => {
	// Parse the assembled XML
	const assembledDom = sync(structureChunkString);

	const relevantChunkRefNodes = evaluateXPathToNodes(
		`//*[namespace-uri() = '${asNamespace}' and local-name() = '${
			referenceType === 'normative' ? 'sec-ref' : 'ref-list-ref'
		}']`,
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
		return results.reduce(
			(referenceList, { chunkReference, xmlString }) => {
				if (!xmlString) {
					return referenceList;
				}
				const chunkDom = sync(xmlString);
				const refNodes =
					referenceType === 'normative'
						? evaluateXPathToNodes(
								'/sec[@sec-type="norm-refs"]/descendant::ref[@id and (child::std or child::mixed-citation)]',
								chunkDom
						  )
						: evaluateXPathToNodes(
								'/ref-list[@content-type="bibl"]/descendant::ref[@id and (child::std or child::mixed-citation)]',
								chunkDom
						  );

				referenceList = referenceList.concat(
					refNodes.map((node) =>
						createObjectForRef(node, chunkReference)
					)
				);
				return referenceList;
			},
			[]
		);
	});
};
