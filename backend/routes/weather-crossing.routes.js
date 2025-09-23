const express = require('express');
const router = express.Router();
const weatherCrossingController = require('../controllers/weather-crossing.controller');

// Example: GET all weather crossings
router.get('/', weatherCrossingController.getAllWeatherCrossings);

// Example: GET a single weather crossing by ID
router.get('/:id', weatherCrossingController.getWeatherCrossingById);

// Example: POST a new weather crossing
router.post('/', weatherCrossingController.createWeatherCrossing);

// Example: PUT update a weather crossing
router.put('/:id', weatherCrossingController.updateWeatherCrossing);

// Example: DELETE a weather crossing
router.delete('/:id', weatherCrossingController.deleteWeatherCrossing);

module.exports = router;
