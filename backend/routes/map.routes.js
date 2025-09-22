const express = require('express');
const router = express.Router();
const mapController = require('../controllers/map.controller');

// GET map data (geocoding or reverse geocoding)
// ?address=123 Main St, City, Country OR ?lat=40.7128&lon=-74.0060
router.get('/', mapController.getMapData);

// GET nearby places (restaurants, cafes, hotels, parking)
// ?lat=40.7128&lon=-74.0060&radius=1000
router.get('/nearby', mapController.getNearbyPlaces);

module.exports = router;
