const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { specs } = require('./swagger-config'); 
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


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// API Routes
const venueRoutes = require('./routes/venues.routes');
app.use('/venues', venueRoutes);

console.log("Loading eventRoutes");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
const eventsRoutes = require('./routes/events.routes');
app.use('/events', eventsRoutes);

// Weather Crossing API
const weatherCrossingRoutes = require('./routes/weather-crossing.routes');
app.use('/weather-crossing', weatherCrossingRoutes);

app.get('/', (req, res) => {
  res.send('Backend is up ');
});

// --- DEBUG: list mounted routes
app.get('/__routes', (req, res) => {
  const out = [];
  app._router.stack.forEach((m) => {
    if (m.route?.path) {
      const method = Object.keys(m.route.methods)[0]?.toUpperCase();
      out.push({ method, path: m.route.path });
    } else if (m.name === 'router' && m.handle?.stack) {
      const base = (m.regexp?.source || '')
        .replace('^\\', '/')
        .split('\\/?')[0];
      m.handle.stack.forEach((h) => {
        if (h.route?.path) {
          const method = Object.keys(h.route.methods)[0]?.toUpperCase();
          out.push({ method, path: `${base}${h.route.path}` });
        }
      });
    }
  });
  res.json(out);
});

// --- DEBUG: inspect the filesystem
const fs = require('fs');
app.get('/__inspect', (req, res) => {
  try {
    const cwd = process.cwd();
    const hasRoutesDir = fs.existsSync('./routes');
    const files = hasRoutesDir ? fs.readdirSync('./routes') : [];
    const hasWxRoutes = fs.existsSync('./routes/weather-crossing.routes.js');
    res.json({ cwd, hasRoutesDir, files, hasWxRoutes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = app;

