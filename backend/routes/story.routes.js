const express = require('express');
const router = express.Router();
const storyController = require('../controllers/story.controller');


//allow user to export story as pdf
router.get('/:userId/export.pdf', storyController.exportStoryPdf);



module.exports = router;
