const express = require('express');
const router = express.Router();
const storyController = require('../controllers/story.controller');

//for image upload
const multer = require('multer');
const {uploadStoryImage} = require('../controllers/story.controller');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/:userId/upload', upload.single('photo'), uploadStoryImage);



//allow user to export story as pdf
router.get('/:userId/export.pdf', storyController.exportStoryPdf);



module.exports = router;
