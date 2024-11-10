module.exports = () => {
	const localHost = 'localhost';

	let proxyContentQualityHostname = localHost;
	let proxyContentQualityPort = 6000;
	if (process.env.PROXY_CONTENT_QUALITY_HOSTNAME) {
		proxyContentQualityHostname =
			process.env.PROXY_CONTENT_QUALITY_HOSTNAME;
	}
	if (process.env.PROXY_CONTENT_QUALITY_PORT) {
		proxyContentQualityPort = process.env.PROXY_CONTENT_QUALITY_PORT;
	}

	let proxyReviewHostname = localHost;
	let proxyReviewPort = 6020;
	if (process.env.PROXY_REVIEW_HOSTNAME) {
		proxyReviewHostname = process.env.PROXY_REVIEW_HOSTNAME;
	}
	if (process.env.PROXY_REVIEW_PORT) {
		proxyReviewPort = process.env.PROXY_REVIEW_PORT;
	}

	let proxyDocumentHistoryHostname = localHost;
	let proxyDocumentHistoryPort = 6030;
	if (process.env.PROXY_DOCUMENT_HISTORY_HOSTNAME) {
		proxyDocumentHistoryHostname =
			process.env.PROXY_DOCUMENT_HISTORY_HOSTNAME;
	}
	if (process.env.PROXY_DOCUMENT_HISTORY_PORT) {
		proxyDocumentHistoryPort = process.env.PROXY_DOCUMENT_HISTORY_PORT;
	}

	return {
		additionalDocuments: {
			'iso/C063480e.xml': [],
		},
		scope: {
			xPathProfiling: false,
			measurePerformance: false,
			documentIds: ['52-81286.xml'],
			user: {
				displayName: 'Test user',
				email: 'test@email.org',
				id: 'test-user',
				roleId: 'test-user',
			},
		},
		findAndReplacePresearch: {
			blockLevelElementTest: "self::*[name() = ('p', 'code', 'title')]",
			outOfOrderElementTest: 'self::fn',
			ignoredElementTest: 'self::notes',
		},
		alwaysRegenerateSessionToken: true,
		proxy: {
			'content-quality': `http://${proxyContentQualityHostname}:${proxyContentQualityPort}/`,
			review: `http://${proxyReviewHostname}:${proxyReviewPort}/`,
			'document-history': `http://${proxyDocumentHistoryHostname}:${proxyDocumentHistoryPort}/`,
		},
		documentLoadLockOverrides: {
			'chunks/id-317b9713-f9a2-4932-b17a-1b04b4d78a98.xml': {
				isLockAcquired: false,
				isLockAvailable: false,
			},
			'chunks/id-6bbb6cd7-e534-476a-a6ea-8caa037ab037.xml': {
				isLockAcquired: false,
				isLockAvailable: false,
			},
		},
	};
};
