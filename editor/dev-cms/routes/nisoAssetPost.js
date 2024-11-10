'use strict';
const fs = require('fs-extra');
const path = require('path');

module.exports = (router, config) => {
	router.route('/connectors/cms/standard/assets').post((req, res) => {
		// Get request from correct multipart
		let request;
		if (req.body.request) {
			request = req.body.request;
		} else {
			request = req.body;
		}

		// Might not be parsed yet due to missing Content-Type: application/json request header
		if (typeof request === 'string') {
			request = JSON.parse(request);
		}

		const type = request['type'];
		const folderId = request.folderId || '';
		const metadata = request.metadata || {};

		const metadataContent = request.metadata || null;

		// There should always be one file
		const files = req.files;
		if (files.length === 0) {
			res.status(400).end();
			return;
		}

		// Check for wrong file types, hardcoded to txt
		const errors = [];
		files.forEach((file) => {
			const fileExtension = path.extname(file.originalname);
			if (fileExtension === '.txt') {
				errors.push({
					fieldName: file.fieldname,
					errorMessage: 'Wrong file type supplied!',
				});
			}
		});

		// Send back error message(s), if any
		if (errors.length !== 0) {
			res.status(200)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					status: 400,
					body: {
						fieldErrors: errors,
					},
				});
			return;
		}

		let filename = '';
		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (!file.size) {
				fs.unlink(file.path);
				res.status(400).end();
				return;
			}

			const fileExtension = path.extname(file.originalname);
			const originalName = path.basename(
				file.originalname,
				fileExtension
			);

			const uniqueFileName = `${originalName}-${new Date().getTime()}${fileExtension}`;
			if (i === 0) {
				filename = uniqueFileName;
			}
			let filePath = path.join(folderId, uniqueFileName);
			const destinationFolder = path.join(
				config.root,
				'dev-cms',
				'uploads',
				folderId
			);
			const absoluteFilePath = path.join(
				config.root,
				'dev-cms',
				'uploads',
				filePath
			);

			if (path.sep === '\\') {
				filePath = filePath.replace(/\\/g, '/');
			}

			if (folderId && folderId.indexOf('..') !== -1) {
				res.status(403).end();
				return;
			}

			metadata.isCmsUpload = true;

			// Make sure destination folder is created
			fs.mkdirs(destinationFolder, function (error) {
				if (error) {
					res.status(500).send(error);
					return;
				}

				fs.move(file.path, absoluteFilePath, function (error) {
					if (error) {
						res.status(500).send(error);
						return;
					}

					if (i === 0) {
						res.status(201)
							.set(
								'content-type',
								'application/json; charset=utf-8'
							)
							.json({
								status: 200,
								body: {
									id: filePath,
									type,
									label: originalName,
									metadata,
								},
							});
					}
				});
			});
		}

		if (metadataContent !== null) {
			const editSessionToken =
				request.context && request.context.editSessionToken;
			const currentSession = req.getFontoSession(editSessionToken);

			if (filename === '') {
				filename = metadataContent.files[0];
			}

			req.cms.load('metadata.json', currentSession, (err, data) => {
				const metadata = !err ? JSON.parse(data) : {};
				metadata[filename] = {
					files: metadataContent.files,
					assetMetadata: metadataContent.assetMetadata,
				};

				if (!err) {
					req.cms.save(
						'metadata.json',
						JSON.stringify(metadata, null, 2),
						currentSession,
						(err) => {
							console.log(err);
						}
					);
				} else {
					req.cms.createNew(
						'metadata.json',
						JSON.stringify(metadata, null, 2),
						currentSession,
						(err) => {
							console.log(err);
						}
					);
				}
			});
		}
	});

	return router;
};
