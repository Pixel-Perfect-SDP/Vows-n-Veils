const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { specs } = require('./swagger-config'); 
const app = express();

const allowedOrigins = [
  'http://localhost:4200', // for local dev
  'https://mango-mushroom-00c4ce01e.2.azurestaticapps.net', // production frontend
  'https://event-flow-6514.onrender.com' // external API
];


const vendorsRoutes = require('./routes/vendors.routes'); //add in for vendor API
const storyRoutes = require('./routes/story.routes');

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: Allowing origin: ${origin}`);
      return callback(null, true);
    }
    console.log(`CORS: Blocking origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));
app.use(express.json());

app.use('/vendors', vendorsRoutes);  //added in for vendor API
app.use('/story', storyRoutes);

// Swagger UI with CORS-friendly configuration
app.use('/api-docs', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}), swaggerUi.serve, swaggerUi.setup(specs, { 
  explorer: true,
  swaggerOptions: {
    requestInterceptor: (request) => {
      // Ensure CORS headers are properly handled
      request.headers['Accept'] = 'application/json';
      return request;
    }
  }
}));

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

// Map API
const mapRoutes = require('./routes/map.routes');
app.use('/map', mapRoutes);




app.get('/', (req, res) => {
  res.send('Backend is up ');
});

const chatbotRoutes = require('./routes/chatbot'); 
app.use('/chatbot', chatbotRoutes);

module.exports = app;

