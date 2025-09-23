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
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ppep-2651c.appspot.com"
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function safeGetImageUrls(prefix) {
  try {
    const [files] = await bucket.getFiles({ prefix });
    if (!files || !files.length) return [];
    const urls = await Promise.all(
      files.map(async (file) => {
        try {
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
          });
          return url;
        } catch {
          return null;
        }
      })
    );
    return urls.filter(Boolean);
  } catch {
    return [];
  }
}

function isValidPhone(p) {
  return typeof p === 'string' && /^[0-9+()\-\s]{7,20}$/.test(p.trim());
}

router.get('/company/:companyID', async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const snap = await db.collection('Vendors').where('companyID', '==', companyID).get();
    if (snap.empty) return res.json([]);
    const vendors = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const images = await safeGetImageUrls(`vendors/${docSnap.id}/`);
        return { ...data, images };
      })
    );
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const snap = await db.collection('Vendors').get();
    const vendors = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const images = await safeGetImageUrls(`vendors/${docSnap.id}/`);
        return { ...data, images };
      })
    );
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ref = db.collection('Vendors').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    const images = await safeGetImageUrls(`vendors/${req.params.id}/`);
    res.json({ id: doc.id, ...doc.data(), images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const v = req.body;
    const name = v.name || v.serviceName;
    if (!name || !v.type || !v.companyID || !v.email || !v.phonenumber) {
      return res.status(400).json({ error: 'Missing required fields (name, type, companyID, email, phonenumber)' });
    }
    if (!isValidPhone(String(v.phonenumber))) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    const payload = {
      name,
      serviceName: v.serviceName ?? name,
      type: String(v.type || ''),
      companyID: String(v.companyID || ''),
      email: String(v.email || ''),
      phonenumber: String(v.phonenumber || ''),
      price: typeof v.price === 'number' ? v.price : (v.price ? Number(v.price) : 0),
      capacity: v.capacity != null ? Number(v.capacity) : null,
      description: v.description ?? '',
      bookingNotes: v.bookingNotes ?? '',
      status: v.status ?? 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('Vendors').add(payload);
    res.status(201).json({ id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.phonenumber && !isValidPhone(String(updates.phonenumber))) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    if (updates.name && !updates.serviceName) updates.serviceName = updates.name;
    if (updates.serviceName && !updates.name) updates.name = updates.serviceName;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('Vendors').doc(req.params.id).update(updates);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/phone', async (req, res) => {
  try {
    const { phonenumber } = req.body || {};
    if (!isValidPhone(phonenumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    const ref = db.collection('Vendors').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Vendor not found' });
    await ref.update({ phonenumber: String(phonenumber), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/company/:companyID/phone', async (req, res) => {
  try {
    const { phonenumber } = req.body || {};
    if (!isValidPhone(phonenumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    const companyID = req.params.companyID;
    const snap = await db.collection('Vendors').where('companyID', '==', companyID).get();
    if (snap.empty) return res.json({ ok: true, updated: 0 });
    const batch = db.batch();
    snap.docs.forEach(d => {
      batch.update(d.ref, { phonenumber: String(phonenumber), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    res.json({ ok: true, updated: snap.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ref = db.collection('Vendors').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Vendor not found' });
    const images = await safeGetImageUrls(`vendors/${req.params.id}/`);
    if (images.length) {
      try {
        const [files] = await bucket.getFiles({ prefix: `vendors/${req.params.id}/` });
        await Promise.all(files.map(file => file.delete()));
      } catch {}
    }
    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
