const admin = require('firebase-admin');

// Use ADC or a service account JSON via GOOGLE_APPLICATION_CREDENTIALS
// export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
module.exports = { admin, db };
