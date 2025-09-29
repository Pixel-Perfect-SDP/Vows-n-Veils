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

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: API endpoints for managing vendors and their data
 */

/**
 * @swagger
 * /vendors/company/{companyID}:
 *   get:
 *     summary: Get vendors by company ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: companyID
 *         schema:
 *           type: string
 *         required: true
 *         description: The company ID to filter vendors by
 *     responses:
 *       200:
 *         description: List of vendors for the given company
 *       500:
 *         description: Error fetching vendors
 */

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


/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors
 *     tags: [Vendors]
 *     responses:
 *       200:
 *         description: List of all vendors
 *       500:
 *         description: Error fetching vendors
 */

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

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get a vendor by ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor document ID
 *     responses:
 *       200:
 *         description: Vendor found
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Error fetching vendor
 */
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

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, companyID, email, phonenumber]
 *             properties:
 *               name:
 *                 type: string
 *               serviceName:
 *                 type: string
 *               type:
 *                 type: string
 *               companyID:
 *                 type: string
 *               email:
 *                 type: string
 *               phonenumber:
 *                 type: string
 *               price:
 *                 type: number
 *               capacity:
 *                 type: integer
 *               description:
 *                 type: string
 *               bookingNotes:
 *                 type: string
 *               status:
 *                 type: string
 *             example:
 *               name: "DJ Mike"
 *               type: "Entertainment"
 *               companyID: "12345"
 *               email: "dj@example.com"
 *               phonenumber: "+27111234567"
 *               price: 5000
 *               capacity: 200
 *               description: "DJ for weddings and events"
 *               bookingNotes: "Requires 2 hours setup"
 *               status: "active"
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *       400:
 *         description: Missing required fields or invalid phone number
 *       500:
 *         description: Error creating vendor
 */
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

/**
 * @swagger
 * /vendors/{id}:
 *   put:
 *     summary: Update an existing vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       400:
 *         description: Invalid phone number format
 *       500:
 *         description: Error updating vendor
 */
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

/**
 * @swagger
 * /vendors/{id}/phone:
 *   patch:
 *     summary: Update vendor phone number by ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phonenumber:
 *                 type: string
 *             example:
 *               phonenumber: "+27117654321"
 *     responses:
 *       200:
 *         description: Phone number updated successfully
 *       400:
 *         description: Invalid phone number format
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Error updating phone number
 */
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

/**
 * @swagger
 * /vendors/company/{companyID}/phone:
 *   patch:
 *     summary: Bulk update vendor phone numbers by company ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: companyID
 *         schema:
 *           type: string
 *         required: true
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phonenumber:
 *                 type: string
 *             example:
 *               phonenumber: "+27119876543"
 *     responses:
 *       200:
 *         description: Phone numbers updated for all vendors in the company
 *       400:
 *         description: Invalid phone number format
 *       500:
 *         description: Error updating phone numbers
 */
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

/**
 * @swagger
 * /vendors/{id}:
 *   delete:
 *     summary: Delete a vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Error deleting vendor
 */
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
