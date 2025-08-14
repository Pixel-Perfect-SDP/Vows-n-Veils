const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
const exampleRoutes = require('./routes/example.routes');
app.use('/api/example', exampleRoutes);

module.exports = app;
