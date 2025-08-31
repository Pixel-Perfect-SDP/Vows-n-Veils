const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = [
  'http://localhost:4200', // for local dev
  'https://mango-mushroom-00c4ce01e.2.azurestaticapps.net' // production frontend
];


// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());


// API Routes
const venueRoutes = require('./routes/venues.routes');
app.use('/venues', venueRoutes);

console.log("Loading eventRoutes");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
const eventsRoutes = require('./routes/events.routes');
app.use('/events', eventsRoutes);

app.get('/', (req, res) => {
  res.send('Backend is up 🚀');
});

module.exports = app;

