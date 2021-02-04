const express = require('express');
const multer = require('multer');
const FileService = require('./FileService');
const FileSizeException = require('./FileSizeException');

const router = express.Router();

const FIVE_MB = 5 * 1024 * 1024;
const uploadFile = multer({ limits: { fileSize: FIVE_MB } }).single('file');

router.post('/api/1.0/hoaxes/attachments', (req, res, next) => {
  uploadFile(req, res, async (err) => {
    if (err) {
      return next(new FileSizeException());
    }
    // upload.single('file') ==> 'file' comes from attachment name, see uploadFile function in FileUpload.spec.js
    const attachment = await FileService.saveAttachment(req.file);
    res.status(200).send(attachment);
  });
});

module.exports = router;
