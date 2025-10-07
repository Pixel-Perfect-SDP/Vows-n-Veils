const express = require('express');
const router = express.Router();
const storyController = require('../controllers/story.controller');

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

//allow user to upload image
router.post('/:userId/photo', upload.single('file'), storyController.uploadStoryPhoto);

//allow user to export story as pdf
router.get('/:userId/export.pdf', storyController.exportStoryPdf);



module.exports = router;
