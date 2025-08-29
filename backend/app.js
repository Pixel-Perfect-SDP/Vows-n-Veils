const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const venueRoutes = require('./routes/venues.routes');
app.use('/venues', venueRoutes);

module.exports = app;

