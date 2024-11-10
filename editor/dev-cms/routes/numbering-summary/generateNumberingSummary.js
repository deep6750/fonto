'use strict';

const { sync } = require('slimdom-sax-parser');
const {
	evaluateXPathToBoolean,
	evaluateXPathToFirstNode,
	evaluateXPathToNodes,
	evaluateXPathToString,
	evaluateXPathToStrings,
} = require('fontoxpath');

const asNamespace = 'http://niso-sts-authoring-solution/authoring-schema';
const xmlnsNamespace = 'http://www.w3.org/2000/xmlns/';

/**
 * DUPLICATED FOR CLIENT-SIDE IN generateNumberingSummaryForChunk.js
 */
const numberingNodeTests = [
	'self::disp-formula',
	'self::fig-group',
	'self::fig',
	'self::fn',
	'self::non-normative-example',
	'self::non-normative-note',
	'self::table-wrap',
	'self::xref',
	'self::ref',
	'self::list[@list-type=("alpha-lower", "arabic", "roman-lower")]',
	'self::list-item[parent::list[@list-type=("alpha-lower", "arabic", "roman-lower")]]',
	'self::std[not(parent::ref)]',
	'self::std-id[parent::std[not(parent::ref)]]',
	'self::std-ref[parent::std[not(parent::ref)]]',
	'self::mixed-citation[not(parent::ref)]',
];

const relevantAttributeTests = [
	'name() = "id"',
	'(parent::xref and local-name() = ("ref-type", "rid"))',
	'(parent::std-id and local-name() = "std-id-type")',
	'(parent::sec and local-name() = "sec-type")',
	'(parent::app and local-name() = "content-type")',
	'(parent::list and local-name() = "list-type")',
];

function getNumberingOverride(node) {
	const numbering = {};

	const labelNode = evaluateXPathToFirstNode('child::label', node);
	if (labelNode) {
		const namedContentNode = evaluateXPathToFirstNode(
			'child::named-content',
			labelNode
		);

		if (namedContentNode) {
			numbering.overrideType = evaluateXPathToString(
				'./@content-type/string()',
				namedContentNode
			);

			const numNodeValues = evaluateXPathToStrings(
				'child::num/string()',
				namedContentNode
			);

			if (numNodeValues.length) {
				// Structured numbering override
				numbering.overrideValue = numNodeValues;
			} else {
				// Unstructured numbering override
				numbering.overrideValue = evaluateXPathToString(
					'./string()',
					namedContentNode
				);
			}
		}
	}

	return Object.keys(numbering).length ? numbering : undefined;
}

function createNodeObject(node) {
	const showNodeValue = evaluateXPathToBoolean(
		'name() = ("std-id", "std-ref", "mixed-citation")',
		node
	);

	return {
		nodeName: evaluateXPathToString('name()', node),
		...(showNodeValue
			? { nodeValue: evaluateXPathToString('./string()', node) }
			: {}),
		attributes: evaluateXPathToNodes('@*', node).reduce(
			(attributes, attributeNode) => {
				if (
					evaluateXPathToBoolean(
						relevantAttributeTests.join(' or '),
						attributeNode
					)
				) {
					attributes[evaluateXPathToString('name()', attributeNode)] =
						evaluateXPathToString('.', attributeNode);
				}

				return attributes;
			},
			{}
		),
		children: evaluateXPathToNodes('child::*', node).reduce(
			reduceChildren,
			[]
		),
		numbering: getNumberingOverride(node),
	};
}

function reduceChildren(children, childNode) {
	if (evaluateXPathToBoolean(numberingNodeTests.join(' or '), childNode)) {
		children.push(createNodeObject(childNode));
		return children;
	}

	children = children.concat(
		evaluateXPathToNodes('child::*', childNode).reduce(reduceChildren, [])
	);
	return children;
}
/**
 * End of duplicated code
 */

module.exports = (
	chunkString,
	loadFileCallback,
	isStructureChunk,
	chunkDocumentId
) => {
	if (isStructureChunk) {
		// Parse the assembled XML
		const assembledDom = sync(chunkString);

		const allChunkRefNodes = evaluateXPathToNodes(
			`//*[namespace-uri() = '${asNamespace}' and ends-with(local-name(), '-ref') and string(@Q{${asNamespace}}href)]`,
			assembledDom
		);

		const promises = allChunkRefNodes.map(function (chunkRefNode) {
			const chunkReference = evaluateXPathToString(
				`@Q{${asNamespace}}href`,
				chunkRefNode
			);
			return new Promise(
				function (documentId, resolve, reject) {
					loadFileCallback(documentId, function (err, data) {
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
				(numberingSummary, { chunkReference, xmlString }) => {
					if (!xmlString) {
						return numberingSummary;
					}
					const chunkDom = sync(xmlString);
					const rootNode = evaluateXPathToFirstNode('/*', chunkDom);

					numberingSummary[chunkReference] =
						createNodeObject(rootNode);
					return numberingSummary;
				},
				{}
			);
		});
	}

	const chunkDom = sync(chunkString);
	const rootNode = evaluateXPathToFirstNode('/*', chunkDom);

	const numberingSummary = {};
	numberingSummary[chunkDocumentId] = createNodeObject(rootNode);

	return numberingSummary;
};
