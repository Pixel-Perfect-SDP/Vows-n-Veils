//returns guests based on event and/or filter
const { db } = require('../firebase');

exports.listGuestsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { dietary, allergy, rsvp } = req.query;

    //get all guests
    let snap = await db.collection('Guests').where('EventID', '==', eventId).get();
    let guests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    //optional filters (if client sends strings)
    if (dietary) {
      guests = guests.filter(g => (g.Dietary ?? '').trim().toLowerCase() === dietary.trim().toLowerCase());
    }
    if (allergy) {
      guests = guests.filter(g => (g.Allergies ?? '').trim().toLowerCase() === allergy.trim().toLowerCase());
    }
    if (typeof rsvp !== 'undefined') {
      const target = String(rsvp).toLowerCase() === 'true';
      guests = guests.filter(g => g.RSVPstatus === target);
    }
    return res.json(guests);
  } catch (err) {
    console.error('Error fetching guests:', err);
    return res.status(500).json({ message: 'Failed to fetch guests', error: err.message });
  }
};

//returns distinct options for Dietary and Allergies (strings)
exports.getGuestFilterOptions = async (req, res) => {
  try {
    const { eventId } = req.params;

    const snap = await db.collection('Guests').where('EventID', '==', eventId).get();
    const dietarySet = new Set();
    const allergiesSet = new Set();

    snap.forEach(doc => {
      const d = doc.data();
      if (d?.Dietary && String(d.Dietary).trim()) dietarySet.add(String(d.Dietary).trim());
      if (d?.Allergies && String(d.Allergies).trim()) allergiesSet.add(String(d.Allergies).trim());
    });

    return res.json({
      dietary: Array.from(dietarySet).sort((a, b) => a.localeCompare(b)),
      allergies: Array.from(allergiesSet).sort((a, b) => a.localeCompare(b)),
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    return res.status(500).json({ message: 'Failed to fetch filter options' });
  }
};