// backend/routes/events.routes.js
const express = require('express');
const router = express.Router();
const { listGuestsByEvent, getGuestFilterOptions } = require('../controllers/guests.controller');

// GET /events/:eventId/guests/{optional params}
router.get('/:eventId/guests', listGuestsByEvent);

//GET /events/:eventID/guest-filters
router.get('/:eventId/guest-filters', getGuestFilterOptions);

module.exports = router;
