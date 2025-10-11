const express = require('express');
const router = express.Router();
const mapController = require('../controllers/map.controller');

/**
 * @swagger
 * tags:
 *   name: Maps
 *   description: Map services for geocoding, reverse geocoding, and nearby places
 */

// GET map data (geocoding or reverse geocoding)
// ?address=123 Main St, City, Country OR ?lat=40.7128&lon=-74.0060
/**
 * @swagger
 * /maps:
 *   get:
 *     summary: Get map data (geocoding or reverse geocoding)
 *     tags: [Maps]
 *     description: >
 *       Fetch geolocation data either by address (geocoding) or by latitude/longitude (reverse geocoding).
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Address string to convert into coordinates
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for reverse geocoding
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *         description: Longitude for reverse geocoding
 *     responses:
 *       200:
 *         description: Successfully retrieved map data
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: No results found
 *       500:
 *         description: Error fetching map data
 */
router.get('/', mapController.getMapData);

// GET nearby places (restaurants, cafes, hotels, parking)
// ?lat=40.7128&lon=-74.0060&radius=1000
/**
 * @swagger
 * /maps/nearby:
 *   get:
 *     summary: Get nearby venues and places
 *     tags: [Maps]
 *     description: >
 *       Fetches nearby venues (event spaces, hotels, churches, gardens, etc.) around the provided coordinates.
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         required: true
 *         description: Latitude of the search location
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *         required: true
 *         description: Longitude of the search location
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           default: 2000
 *         description: Search radius in meters
 *     responses:
 *       200:
 *         description: List of nearby venues
 *       400:
 *         description: Missing lat/lon parameters
 *       500:
 *         description: Error fetching nearby venues
 */
router.get('/nearby', mapController.getNearbyPlaces);

module.exports = router;
