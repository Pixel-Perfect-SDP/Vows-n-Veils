const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    storageBucket: "ppep-2651c.firebasestorage.app"
    

  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('Venues').get();

    const venues = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = { id: doc.id, ...doc.data() };

        const [files] = await bucket.getFiles({ prefix: `venues/${doc.id}/`, maxResults: 1 });

        if (files.length > 0) {
          const [url] = await files[0].getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
          });
          data.image = url; 
        } else {
          data.image = null; 
        }

        return data;
      })
    );

    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('Venues').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const [files] = await bucket.getFiles({ prefix: `venues/${req.params.id}/` });
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000,
        });
        return url;
      })
    );

    res.json({ id: doc.id, ...doc.data(), images: imageUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', async (req, res) => {
  try {
    const venue = req.body;
    if (!venue.venuename || !venue.address || !venue.capacity ||
      !venue.companyID || !venue.description || !venue.email ||
      !venue.phonenumber || !venue.price) {
      return res.status(400).json({ error: 'Some fields are missing' });
    }
    const ref = await db.collection('Venues').add(venue);
    res.status(201).json({ id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await db.collection('Venues').doc(req.params.id).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.collection('Venues').doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
