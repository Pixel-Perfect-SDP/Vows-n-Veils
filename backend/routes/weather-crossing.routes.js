const express = require('express');
const router = express.Router();
const weatherCrossingController = require('../controllers/weather-crossing.controller');

/**
 * @swagger
 * tags:
 *   name: WeatherCrossings
 *   description: API endpoints for managing weather crossings and fetching Visual Crossing data
 */

// Example: GET all weather crossings
/**
 * @swagger
 * /weather-crossings:
 *   get:
 *     summary: Get weather data from Visual Crossing API
 *     description: Fetch weather data for a given location and optional date. Defaults to New York if no location is provided.
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: City and country (e.g., "Johannesburg,ZA").
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format.
 *     responses:
 *       200:
 *         description: Weather data retrieved successfully
 *       500:
 *         description: Error fetching weather data
 */
router.get('/', weatherCrossingController.getAllWeatherCrossings);

// Example: GET a single weather crossing by ID
/**
 * @swagger
 * /weather-crossings/{id}:
 *   get:
 *     summary: Get a single weather crossing by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Weather Crossing ID
 *     responses:
 *       200:
 *         description: Weather crossing found
 *       404:
 *         description: Weather crossing not found
 */
router.get('/:id', weatherCrossingController.getWeatherCrossingById);

// Example: POST a new weather crossing
/**
 * @swagger
 * /weather-crossings:
 *   post:
 *     summary: Create a new weather crossing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               location: "Johannesburg,ZA"
 *               date: "2025-09-29"
 *     responses:
 *       201:
 *         description: Weather crossing created successfully
 */
router.post('/', weatherCrossingController.createWeatherCrossing);

// Example: PUT update a weather crossing
/**
 * @swagger
 * /weather-crossings/{id}:
 *   put:
 *     summary: Update an existing weather crossing
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Weather Crossing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               location: "Cape Town,ZA"
 *               date: "2025-09-30"
 *     responses:
 *       200:
 *         description: Weather crossing updated successfully
 *       404:
 *         description: Weather crossing not found
 */
router.put('/:id', weatherCrossingController.updateWeatherCrossing);

// Example: DELETE a weather crossing
/**
 * @swagger
 * /weather-crossings/{id}:
 *   delete:
 *     summary: Delete a weather crossing
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Weather Crossing ID
 *     responses:
 *       200:
 *         description: Weather crossing deleted successfully
 *       404:
 *         description: Weather crossing not found
 */
router.delete('/:id', weatherCrossingController.deleteWeatherCrossing);

module.exports = router;
