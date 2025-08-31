const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
const venueRoutes = require('./routes/venues.routes');
app.use('/venues', venueRoutes);

console.log("Loading eventRoutes");
const eventsRoutes = require('./routes/events.routes');
app.use('/events', eventsRoutes);

module.exports = app;

