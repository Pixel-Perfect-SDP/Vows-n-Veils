// backend/routes/events.routes.js
const express = require('express');
const router = express.Router();
const { listGuestsByEvent } = require('../controllers/guests.controller');

// GET /api/events/:eventId/guests
router.get('/:eventId/guests', listGuestsByEvent);

module.exports = router;
