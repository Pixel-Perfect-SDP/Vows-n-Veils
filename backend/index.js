require('dotenv').config();

const app = require('./app');
const PORT = process.env.PORT || 3000;

try {
  require('dotenv').config();
  const app = require('./app');

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
} catch (err) {
  console.error("❌ App crashed on startup:", err);
}

console.log("Firebase Key Loaded?", !!process.env.FIREBASE_PRIVATE_KEY);