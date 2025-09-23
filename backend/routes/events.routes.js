const express = require('express');
const router = express.Router();
const {
  listGuestsByEvent,
  getGuestFilterOptions,
  createGuestForEvent,
  deleteGuestForEvent,
  exportGuestsCsv,
  exportGuestsPdf
} = require('../controllers/guests.controller');

// GET /api/events/:eventId/guests
router.get('/:eventId/guests', listGuestsByEvent);

// GET /api/events/:eventId/guest-filters
router.get('/:eventId/guest-filters', getGuestFilterOptions);

// POST /api/events/:eventId/guests
router.post('/:eventId/guests', createGuestForEvent);

// DELETE /api/events/:eventId/guests/:guestId
router.delete('/:eventId/guests/:guestId', deleteGuestForEvent);

// CSV: GET /events/:eventId/guests/export.csv
router.get('/:eventId/guests/export.csv', exportGuestsCsv);

// PDF: GET /events/:eventId/guests/export.pdf
router.get('/:eventId/guests/export.pdf', exportGuestsPdf);

module.exports = router;
