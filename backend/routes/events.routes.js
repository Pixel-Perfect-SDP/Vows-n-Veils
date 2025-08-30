// backend/routes/events.routes.js
const express = require('express');
const router = express.Router();
const { listGuestsByEvent, getGuestFilterOptions, createGuestForEvent } = require('../controllers/guests.controller');

// GET /events/:eventId/guests/{optional params}
router.get('/:eventId/guests', listGuestsByEvent);

//GET /events/:eventID/guest-filters
router.get('/:eventId/guest-filters', getGuestFilterOptions);

//POST /api/events/:eventId/guests
router.post('/:eventId/guests', createGuestForEvent);

module.exports = router;
