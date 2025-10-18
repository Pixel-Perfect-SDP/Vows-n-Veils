const express = require('express');
const router = express.Router();
const trailsController = require('../controllers/trails.controller');

/**
 * GET /trails/near
 * Query params: latitude, longitude, maxDistance, page, limit
 */
router.get('/near', trailsController.getTrailsNear);

module.exports = router;
