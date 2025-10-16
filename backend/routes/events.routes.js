const express = require('express');
const router = express.Router();
const {
  listGuestsByEvent,
  getGuestFilterOptions,
  createGuestForEvent,
  deleteGuestForEvent,
  exportGuestsCsv,
  exportGuestsPdf,
  updateGuestForEvent,
} = require('../controllers/guests.controller');
/**
 * @swagger
 * tags:
 *   name: Guests
 *   description: Manage event guests, filter lists, and export as CSV/PDF
 */

// GET /events/:eventId/guests
/**
 * @swagger
 * /events/{eventId}/guests:
 *   get:
 *     summary: List guests for an event (with optional filters)
 *     tags: [Guests]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: dietary
 *         schema:
 *           type: string
 *         description: Exact dietary requirement to filter by (case-insensitive)
 *       - in: query
 *         name: allergy
 *         schema:
 *           type: string
 *         description: Exact allergy to filter by (case-insensitive)
 *       - in: query
 *         name: rsvp
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by RSVP status ("true" or "false")
 *     responses:
 *       200:
 *         description: Array of guests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   Name: { type: string }
 *                   Email: { type: string }
 *                   Dietary: { type: string }
 *                   Allergies: { type: string }
 *                   RSVPstatus: { type: boolean }
 *                   Song: { type: string }
 *                   EventID: { type: string }
 *       500:
 *         description: Failed to fetch guests
 */
router.get('/:eventId/guests', listGuestsByEvent);

// GET /events/:eventId/guest-filters
/**
 * @swagger
 * /events/{eventId}/guest-filters:
 *   get:
 *     summary: Get distinct filter options for an event's guests
 *     tags: [Guests]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Distinct dietary and allergy values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dietary:
 *                   type: array
 *                   items: { type: string }
 *                 allergies:
 *                   type: array
 *                   items: { type: string }
 *       500:
 *         description: Failed to fetch filter options
 */
router.get('/:eventId/guest-filters', getGuestFilterOptions);

// POST /events/:eventId/guests
/**
 * @swagger
 * /events/{eventId}/guests:
 *   post:
 *     summary: Create a guest for an event
 *     tags: [Guests]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Name, Email]
 *             properties:
 *               Name: { type: string }
 *               Email: { type: string }
 *               Dietary: { type: string }
 *               Allergies: { type: string }
 *               RSVPstatus: { type: boolean, description: "true or false" }
 *               Song: { type: string }
 *           example:
 *             Name: "Thandi Nkosi"
 *             Email: "thandi@example.com"
 *             Dietary: "Vegetarian"
 *             Allergies: "Peanuts"
 *             RSVPstatus: true
 *             Song: "John Legend - All of Me"
 *     responses:
 *       201:
 *         description: Guest created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 Name: { type: string }
 *                 Email: { type: string }
 *                 Dietary: { type: string }
 *                 Allergies: { type: string }
 *                 RSVPstatus: { type: boolean }
 *                 Song: { type: string }
 *                 EventID: { type: string }
 *       400:
 *         description: Name and Email are required
 *       500:
 *         description: Failed to create guest
 */
router.post('/:eventId/guests', createGuestForEvent);

// DELETE /events/:eventId/guests/:guestId
/**
 * @swagger
 * /events/{eventId}/guests/{guestId}:
 *   delete:
 *     summary: Delete a guest from an event
 *     tags: [Guests]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: guestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest ID
 *     responses:
 *       200:
 *         description: Guest deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 id: { type: string }
 *       403:
 *         description: Guest does not belong to this event
 *       404:
 *         description: Guest not found
 *       500:
 *         description: Failed to delete guest
 */
router.delete('/:eventId/guests/:guestId', deleteGuestForEvent);

// CSV: GET /events/:eventId/guests/export.csv
/**
 * @swagger
 * /events/{eventId}/guests/export.csv:
 *   get:
 *     summary: Export guest list as CSV
 *     tags: [Guests]
 *     produces:
 *       - text/csv
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: dietary
 *         schema: { type: string }
 *         description: Filter by dietary
 *       - in: query
 *         name: allergy
 *         schema: { type: string }
 *         description: Filter by allergy
 *       - in: query
 *         name: rsvp
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by RSVP status
 *     responses:
 *       200:
 *         description: CSV file (attachment)
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Failed to export CSV
 */
router.get('/:eventId/guests/export.csv', exportGuestsCsv);

// PDF: GET /events/:eventId/guests/export.pdf
/**
 * @swagger
 * /events/{eventId}/guests/export.pdf:
 *   get:
 *     summary: Export guest list as PDF
 *     tags: [Guests]
 *     produces:
 *       - application/pdf
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: dietary
 *         schema: { type: string }
 *         description: Filter by dietary
 *       - in: query
 *         name: allergy
 *         schema: { type: string }
 *         description: Filter by allergy
 *       - in: query
 *         name: rsvp
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by RSVP status
 *     responses:
 *       200:
 *         description: PDF file (attachment)
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Failed to export PDF
 */
router.get('/:eventId/guests/export.pdf', exportGuestsPdf);

// PUT /events/:eventId/guests/:guestId
/**
 * @swagger
 * /events/{eventId}/guests/{guestId}:
 *   put:
 *     summary: Update a guest (partial update)
 *     tags: [Guests]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: guestId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Name: { type: string }
 *               Email: { type: string }
 *               Dietary: { type: string }
 *               Allergies: { type: string }
 *               RSVPstatus: { type: boolean }
 *               Song: { type: string }
 *     responses:
 *       200: { description: Guest updated }
 *       403: { description: Guest does not belong to this event }
 *       404: { description: Guest not found }
 *       500: { description: Failed to update guest }
 */
router.put('/:eventId/guests/:guestId', updateGuestForEvent);


module.exports = router;
