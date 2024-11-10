'use strict';
const fs = require('fs-extra');
const path = require('path');

module.exports = (router, config) => {
	router.route('/connectors/cms/standard/assets').put((req, res) => {
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

		const imageId = metadata.imageId;

		let originalDisplayFileName = imageId;

		// We store the submitted display file in the sent metadata so we can track it when we transfer the files.
		const submittedDisplayFileName = metadataContent.files['displayFile'];

		const editSessionToken =
			request.context && request.context.editSessionToken;
		const currentSession = req.getFontoSession(editSessionToken);

		// We look for the original display file name in the previous metadata and store it
		req.cms.load('metadata.json', currentSession, (err, data) => {
			const metadata = !err ? JSON.parse(data) : {};
			originalDisplayFileName = metadata[imageId].files['displayFile'];
		});

		const files = req.files;

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

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (!file.size) {
				fs.unlink(file.path);
				res.status(400).end();
				return;
			}

			const overrideDisplayFile =
				file.originalname === submittedDisplayFileName;

			const fileExtension = path.extname(file.originalname);
			const originalName = path.basename(
				overrideDisplayFile
					? originalDisplayFileName
					: file.originalname,
				fileExtension
			);

			const uniqueFileName = `${originalName}${fileExtension}`;
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

				fs.move(
					file.path,
					absoluteFilePath,
					{ overwrite: overrideDisplayFile },
					function (error) {
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
					}
				);
			});
		}

		if (files.length === 0) {
			res.status(201)
				.set('content-type', 'application/json; charset=utf-8')
				.json({
					status: 200,
					body: {
						id: imageId,
						type,
						label: '',
						metadata,
					},
				});
		}

		if (metadataContent !== null) {
			const editSessionToken =
				request.context && request.context.editSessionToken;
			const currentSession = req.getFontoSession(editSessionToken);

			req.cms.load('metadata.json', currentSession, (err, data) => {
				const metadata = !err ? JSON.parse(data) : {};
				// We don't want to change the display file value, so we keep it
				const originalDisplayFileName =
					metadata[imageId].files.displayFile;

				metadata[imageId] = {
					files: metadataContent.files,
					assetMetadata: metadataContent.assetMetadata,
				};

				metadata[imageId].files.displayFile = originalDisplayFileName;

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
