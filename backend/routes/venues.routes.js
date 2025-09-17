const multer = require('multer');
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

/**
 * @swagger
 * /venues:
 *   get:
 *     summary: Get all venues
 *     responses:
 *       200:
 *         description: List of venues with image URLs
 */

router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('Venues').get();

    const venues = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = { id: doc.id, ...doc.data() };

        const [files] = await bucket.getFiles({ prefix: `venues/${doc.id}/` });

        const imageUrls = await Promise.all(
          files.map(async (file) => {
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 60 * 60 * 1000,
            });
            return url;
          })
        );

        data.images = imageUrls;
        return data;

      })
    );

    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /venues/{id}:
 *   get:
 *     summary: Get a single venue by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Venue ID
 *     responses:
 *       200:
 *         description: Venue data with images
 *       404:
 *  */
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

/**
 * @swagger
 * /venues:
 *   post:
 *     summary: Create a new venue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - venuename
 *               - address
 *               - capacity
 *               - companyID
 *               - description
 *               - email
 *               - phonenumber
 *               - price
 *             properties:
 *               venuename:
 *                 type: string
 *               address:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               companyID:
 *                 type: string
 *               description:
 *                 type: string
 *               email:
 *                 type: string
 *               phonenumber:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Venue created successfully
 *       400:
 *         description: Missing required fields
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/', upload.array('images', 6), async (req, res) => {
  try {
    console.log('req.body:', req.body); 
    console.log('req.files:', req.files); 
    const venue = JSON.parse(req.body.venue); 

    if (!venue.venuename || !venue.address || !venue.capacity ||
        !venue.companyID || !venue.description || !venue.email ||
        !venue.phonenumber || !venue.price || !venue.status) {
      return res.status(400).json({ error: 'Some fields are missing' });
    }
    const ref = await db.collection('Venues').add(venue);
    if (req.files && req.files.length > 0) {
      await Promise.all(req.files.map((file, idx) => {
        const fileName = `venues/${ref.id}/${Date.now()}_${idx}_${file.originalname}`;
        const blob = bucket.file(fileName);
        return blob.save(file.buffer, {
          metadata: { contentType: file.mimetype }
        });
      }));
    }
    res.status(201).json({ id: ref.id, message: 'Venue created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /venues/{id}:
 *   put:
 *     summary: Update an existing venue
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Venue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Venue updated successfully
 */

router.put('/:id', async (req, res) => {
  try {
    await db.collection('Venues').doc(req.params.id).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /venues/{id}:
 *   delete:
 *     summary: Delete a venue
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Venue ID
 *     responses:
 *       200:
 *         description: Venue deleted successfully
 */

router.delete('/:id', async (req, res) => {
  try {
    const venueRef = db.collection('Venues').doc(req.params.id);
    const doc = await venueRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Venue not found' });

    const [files] = await bucket.getFiles({ prefix: `venues/${req.params.id}/` });
    if (files.length > 0) {
      await Promise.all(files.map(file => file.delete()));
    }

    await venueRef.delete();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /venues/company/{companyid}:
 *   delete:
 *     summary: Fetches all the venues of a Company
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: company ID
 *     responses:
 *       200:
 *         description: Venue data with images
 */


router.get('/company/:companyID', async (req, res) => {
  try {
    const companyID = req.params.companyID;

    const snap = await db.collection('Venues').where('companyID', '==', companyID).get();
    if (snap.empty) {
      return res.status(404).json({ error: 'No venues found for this companyID' });
    }
    const venues = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = { id: doc.id, ...doc.data() };

        const [files] = await bucket.getFiles({ prefix: `venues/${doc.id}/` });
        const imageUrls = await Promise.all(
          files.map(async (file) => {
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 60 * 60 * 1000, 
            });
            return url;
          })
        );

        data.images = imageUrls;
        return data;
      })
    );

    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * @swagger
 * /venues/{id}/images:
 *   put:
 *     summary: Update venue images (delete old ones, add new ones)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Venue ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               deleteImages:
 *                 type: array
 *                 items:
 *                   type: string
 *               newImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Images updated successfully
 */
const multerUpdate = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.put('/:id/images', multerUpdate.array('newImages', 6), async (req, res) => {
  try {
    const venueId = req.params.id;
    
    const deleteImages = req.body.deleteImages ? JSON.parse(req.body.deleteImages) : [];

    if (deleteImages.length > 0) {
      await Promise.all(
        deleteImages.map(async (imgUrl) => {
          const filePath = decodeURIComponent(imgUrl.split('/o/')[1].split('?')[0]);
          const file = bucket.file(filePath);
          await file.delete();
        })
      );
    }

    const newImageUrls = [];
    if (req.files && req.files.length > 0) {
      await Promise.all(
        req.files.map(async (file, idx) => {
          const fileName = `venues/${venueId}/${Date.now()}_${idx}_${file.originalname}`;
          const blob = bucket.file(fileName);
          await blob.save(file.buffer, { metadata: { contentType: file.mimetype } });
          const [url] = await blob.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
          newImageUrls.push(url);
        })
      );
    }

    // Fetch existing venue
    const venueRef = db.collection('Venues').doc(venueId);
    const docSnap = await venueRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Venue not found' });

    // Combine existing images with new images, remove deleted ones
    const existingImages = docSnap.data().images || [];
    const updatedImages = existingImages.filter(img => !deleteImages.includes(img)).concat(newImageUrls);

    // Parse venueData from request and update Firestore
    const venueData = req.body.venueData ? JSON.parse(req.body.venueData) : {};
    await venueRef.update({ ...venueData, images: updatedImages });

    res.json({ ok: true, images: updatedImages });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
