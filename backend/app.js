const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
const venueRoutes = require('./routes/venues.routes');
app.use('/api/venues', venueRoutes);

module.exports = app;

