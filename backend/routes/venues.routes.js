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
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ppep-2651c.firebasestorage.app"
  
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
            return { url, name: file.name };
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
        return {url, name: file.name };
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
            return { url, name: file.name };
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

router.put('/:id/images', upload.array('images'), async (req, res) => {
  try {
    const venueId = req.params.id;
    const files = req.files;

    const [existingFiles] = await bucket.getFiles({ prefix: `venues/${venueId}/` });
    let existingFileNames = existingFiles.map(f => f.name); 

    const deleteImages = req.body.deleteImages ? JSON.parse(req.body.deleteImages) : [];

    if (deleteImages.length > 0) {
      await Promise.all(deleteImages.map(fileName => bucket.file(fileName).delete()));
      existingFileNames = existingFileNames.filter(f => !deleteImages.includes(f));
    }

    if (files && files.length > 0) {
      await Promise.all(
        files.map(file => {
          const blob = bucket.file(`venues/${venueId}/${file.originalname}`);
          return blob.save(file.buffer, {
            contentType: file.mimetype,
            public: false
          });
        })
      );
      const [updatedFiles] = await bucket.getFiles({ prefix: `venues/${venueId}/` });
      existingFileNames = updatedFiles.map(f => f.name);
    }

    const signedUrls = await Promise.all(
      existingFileNames.map(async (fileName) => {
        const [url] = await bucket.file(fileName).getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, 
        });
        return { url, name: fileName };
      })
    );

    res.json({ ok: true, images: signedUrls });
  } catch (error) {
    console.error('Error updating venue images:', error);
    res.status(500).json({ error: 'Error updating venue images' });
  }
});

/**
 * @swagger
 * /venues/confirm-order:
 *   post:
 *     summary: Confirm a venue order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerID
 *               - venueID
 *               - companyID
 *               - startAt
 *               - endAt
 *               - eventID
 *             properties:
 *               customerID:
 *                 type: string
 *               venueID:
 *                 type: string
 *               companyID:
 *                 type: string
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *               eventID:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Venue order created
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to confirm venue
 */

router.post('/confirm-order', async (req, res) => {
  try {
    const { customerID, venueID, companyID, startAt, endAt, eventID, note } = req.body;

    if (!customerID || !venueID || !companyID || !startAt || !endAt || !eventID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ordersRef = db.collection('VenuesOrders');

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const existingOrdersSnap = await ordersRef.where('venueID', '==', venueID).get();
    let conflict = false;

    existingOrdersSnap.forEach(doc => {
      const order = doc.data();

      const existingStart = order.startAt?.seconds ? new Date(order.startAt.seconds * 1000) : new Date(order.startAt);
      const existingEnd   = order.endAt?.seconds   ? new Date(order.endAt.seconds * 1000)   : new Date(order.endAt);

      if (
        (startDate >= new Date(existingStart.getTime() - 24*60*60*1000) && startDate <= new Date(existingEnd.getTime() + 24*60*60*1000)) ||
        (endDate   >= new Date(existingStart.getTime() - 24*60*60*1000) && endDate   <= new Date(existingEnd.getTime() + 24*60*60*1000))
      ) {
        conflict = true;
      }
    });

    if (conflict) {
      return res.status(400).json({ error: 'Sorry, this venue is not available on your wedding date ±1 day. Choose a different date or venue.' });
    }

    const orderDoc = await ordersRef.add({
      companyID,
      createdAt: new Date(),
      customerID,
      endAt: endDate,
      eventID,
      note: note || "",
      startAt: startDate,
      status: "pending",
      venueID
    });

    res.json({ ok: true, orderID: orderDoc.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/company/:companyID', async (req, res) => {
  try {
    const companyID = req.params.companyID;

    const snap = await db.collection('VenuesOrders').where('companyID', '==', companyID).get();
    if (snap.empty) return res.status(404).json({ error: 'No orders found' });

    const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    orders.sort((a, b) => {
      const orderStatus = { pending: 0, accepted: 1, rejected: 2 };
      return orderStatus[a.status] - orderStatus[b.status];
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:orderID/status', async (req, res) => {
  try {
    const { orderID } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.collection('VenuesOrders').doc(orderID).update({ status });

    res.json({ ok: true, orderID, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;