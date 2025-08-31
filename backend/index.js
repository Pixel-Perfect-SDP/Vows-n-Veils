require('dotenv').config();

const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log("Firebase Key Loaded?", !!process.env.FIREBASE_PRIVATE_KEY);