// backend/controllers/guests.controller.js
const { db } = require('../firebase');

exports.listGuestsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // OPTION A: top-level "Guests" collection with EventID field
    const snap = await db.collection('Guests')
      .where('EventID', '==', eventId)
      .get();

    // If you actually store guests in a subcollection:
    // const snap = await db.collection('Events').doc(eventId).collection('Guests').get();

    const guests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(guests);
  } catch (err) {
    console.error('Error fetching guests:', err);
    return res.status(500).json({ message: 'Failed to fetch guests', error: err.message });
  }
};
