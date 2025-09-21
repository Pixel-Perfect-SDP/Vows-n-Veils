const express = require('express');
const router = express.Router();
const {
  listGuestsByEvent,
  getGuestFilterOptions,
  createGuestForEvent,
  deleteGuestForEvent
} = require('../controllers/guests.controller');

// GET /api/events/:eventId/guests
router.get('/:eventId/guests', listGuestsByEvent);

// GET /api/events/:eventId/guest-filters
router.get('/:eventId/guest-filters', getGuestFilterOptions);

// POST /api/events/:eventId/guests
router.post('/:eventId/guests', createGuestForEvent);

// DELETE /api/events/:eventId/guests/:guestId
router.delete('/:eventId/guests/:guestId', deleteGuestForEvent);

module.exports = router;
