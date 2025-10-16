//returns guests based on event and/or filter
const { db } = require('../firebase');
const PDFDocument = require('pdfkit');

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

//adds guest to db
exports.createGuestForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { Name, Email, Dietary, Allergies, RSVPstatus, Song } = req.body || {};

    if (!Name || !Email) {
      return res.status(400).json({ message: 'Name and Email are required.' });
    }

    // normalize types
    const rsvpBool =
      typeof RSVPstatus === 'boolean'
        ? RSVPstatus
        : String(RSVPstatus).toLowerCase() === 'true';

    const payload = {
      Name: String(Name).trim(),
      Email: String(Email).trim(),
      Dietary: Dietary ? String(Dietary).trim() : '',
      Allergies: Allergies ? String(Allergies).trim() : '',
      RSVPstatus: rsvpBool,
      Song: Song ? String(Song).trim() : '',
      EventID: eventId
    };

    const ref = await db.collection('Guests').add(payload);

    const saved = await ref.get();
    return res.status(201).json({ id: ref.id, ...saved.data() });
  } catch (err) {
    console.error('Error creating guest:', err);
    return res.status(500).json({ message: 'Failed to create guest' });
  }
};

//deletes guest
exports.deleteGuestForEvent = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;

    const ref = db.collection('Guests').doc(guestId);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    const data = snap.data();
    // Guard: ensure this guest belongs to this event
    if (data.EventID !== eventId) {
      return res.status(403).json({ message: 'Guest does not belong to this event' });
    }

    await ref.delete();
    return res.status(200).json({ message: 'Guest deleted', id: guestId });
  } catch (err) {
    console.error('Error deleting guest:', err);
    return res.status(500).json({ message: 'Failed to delete guest' });
  }
};

/* ---- shared fetch with filters (same rules as your list endpoint) ---- */
async function fetchGuestsForEvent(eventId, { dietary, allergy, rsvp }) {
  let snap = await db.collection('Guests').where('EventID', '==', eventId).get();
  let guests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
  return guests;
}

function makeFilename(base, ext, { dietary, allergy, rsvp }) {
  const parts = [base];
  if (dietary) parts.push(`diet_${dietary}`);
  if (allergy) parts.push(`allergy_${allergy}`);
  if (typeof rsvp !== 'undefined') parts.push(`rsvp_${String(rsvp).toLowerCase()}`);
  return `${parts.join('-')}.${ext}`;
}

// Export CSV file
exports.exportGuestsCsv = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { dietary, allergy, rsvp } = req.query;

    const guests = await fetchGuestsForEvent(eventId, { dietary, allergy, rsvp });
    const filename = makeFilename('guest-list', 'csv', { dietary, allergy, rsvp });

    // RFC 4180-ish CSV (double-quote fields, escape quotes)
    const headers = ['Name', 'Email', 'Dietary', 'Allergies', 'RSVPstatus', 'Song'];
    const escape = (v = '') => `"${String(v).replace(/"/g, '""')}"`;
    const rows = guests.map(g => [
      escape(g.Name),
      escape(g.Email),
      escape(g.Dietary),
      escape(g.Allergies),
      escape(g.RSVPstatus ? 'true' : 'false'),
      escape(g.Song)
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('CSV export failed:', err);
    return res.status(500).json({ message: 'Failed to export CSV' });
  }
};

// Export PDF file
exports.exportGuestsPdf = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { dietary, allergy, rsvp } = req.query;

    const guests = await fetchGuestsForEvent(eventId, { dietary, allergy, rsvp });

    // filename
    const nameParts = ['guest-list'];
    if (dietary) nameParts.push(`diet_${dietary}`);
    if (allergy) nameParts.push(`allergy_${allergy}`);
    if (typeof rsvp !== 'undefined') nameParts.push(`rsvp_${String(rsvp).toLowerCase()}`);
    const filename = `${nameParts.join('-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 }); // more width
    doc.pipe(res);

    // Column schema (fractions of usable width)
    const columns = [
      { key: 'Name',       label: 'Name',      frac: 0.16, align: 'left' },
      { key: 'Email',      label: 'Email',     frac: 0.24, align: 'left' },
      { key: 'Dietary',    label: 'Dietary',   frac: 0.12, align: 'left' },
      { key: 'Allergies',  label: 'Allergies', frac: 0.12, align: 'left' },
      { key: 'RSVPstatus', label: 'RSVP',      frac: 0.08, align: 'center' },
      { key: 'Song',       label: 'Song',      frac: 0.28, align: 'left' },
    ];

    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colW = columns.map(c => Math.floor(c.frac * usableW));
    const lineH = 16;              // base line height / padding
    const headerH = 22;
    const rowPadV = 6;
    const tableTopInitial = 90;    // initial table Y (below title/filters)
    let tableTop = tableTopInitial;

    // Title + filters
    doc.font('Helvetica-Bold').fontSize(22).text('Guest List', { align: 'left' });
    const filterLine = [
      dietary && `Dietary: ${dietary}`,
      allergy && `Allergy: ${allergy}`,
      typeof rsvp !== 'undefined' && `RSVP: ${String(rsvp).toLowerCase()}`
    ].filter(Boolean).join('   |   ');
    if (filterLine) {
      doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#555')
         .text(filterLine, { align: 'left' })
         .fillColor('#000');
    }

    // Draw table header
    function drawHeader() {
      doc.save();
      doc.font('Helvetica-Bold').fontSize(11);
      let x = doc.page.margins.left;
      let y = tableTop;
      columns.forEach((c, i) => {
        doc.text(c.label, x + 4, y + (headerH - lineH) / 2, {
          width: colW[i] - 8,
          align: c.align
        });
        x += colW[i];
      });
      // header rule
      doc.moveTo(doc.page.margins.left, y + headerH)
         .lineTo(doc.page.margins.left + usableW, y + headerH)
         .strokeColor('#CCCCCC')
         .lineWidth(0.5)
         .stroke()
         .strokeColor('#000000')
         .lineWidth(1);
      doc.restore();
    }

    // New page + header when needed
    function ensureSpace(rowHeightNeeded) {
      const bottomY = doc.page.height - doc.page.margins.bottom;
      if (tableTop + headerH + rowHeightNeeded + 12 > bottomY) {
        doc.addPage();
        tableTop = 36; // top margin already applied; push a bit for aesthetics
        drawHeader();
        tableTop += headerH + 2;
      }
    }

    // First header
    drawHeader();
    tableTop += headerH + 2;

    // Draw one row (auto-wrap each cell; equal height per row)
    function drawRow(rowObj, zebra) {
      doc.font('Helvetica').fontSize(10);

      // Values (map RSVP boolean to Yes/No)
      const values = [
        rowObj.Name ?? '',
        rowObj.Email ?? '',
        rowObj.Dietary ?? '',
        rowObj.Allergies ?? '',
        rowObj.RSVPstatus ? 'Yes' : 'No',
        rowObj.Song ?? ''
      ];

      // Calculate cell heights
      let heights = [];
      for (let i = 0, x = doc.page.margins.left; i < columns.length; i++) {
        const textW = colW[i] - 8; // left/right padding 4px each
        const h = doc.heightOfString(String(values[i]), { width: textW, align: columns[i].align });
        heights.push(h);
      }
      const rowH = Math.max(...heights) + rowPadV * 2;

      // page break if needed
      ensureSpace(rowH);

      // zebra background
      if (zebra) {
        doc.save();
        doc.rect(doc.page.margins.left, tableTop, usableW, rowH).fill('#FAF7F5').restore();
      }

      // draw texts
      let x = doc.page.margins.left;
      for (let i = 0; i < columns.length; i++) {
        doc.text(String(values[i]), x + 4, tableTop + rowPadV, {
          width: colW[i] - 8,
          align: columns[i].align
        });
        x += colW[i];
      }

      // row separator
      doc.moveTo(doc.page.margins.left, tableTop + rowH)
         .lineTo(doc.page.margins.left + usableW, tableTop + rowH)
         .strokeColor('#EEEEEE')
         .lineWidth(0.5)
         .stroke()
         .strokeColor('#000000')
         .lineWidth(1);

      tableTop += rowH;
    }

    // Render rows
    guests.forEach((g, idx) => drawRow(g, idx % 2 === 1));

    doc.end();
  } catch (err) {
    console.error('PDF export failed:', err);
    res.status(500).json({ message: 'Failed to export PDF' });
  }
};

// UPDATE a guest (partial update)
exports.updateGuestForEvent = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const { Name, Email, Dietary, Allergies, RSVPstatus, Song } = req.body || {};

    // Load doc and validate belongs to event
    const ref = db.collection('Guests').doc(guestId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Guest not found' });

    const data = snap.data();
    if (data.EventID !== eventId) {
      return res.status(403).json({ message: 'Guest does not belong to this event' });
    }

    // Build a SAFE update payload (ignore unknown fields & EventID)
    const update = {};
    if (typeof Name !== 'undefined') update.Name = String(Name).trim();
    if (typeof Email !== 'undefined') update.Email = String(Email).trim();
    if (typeof Dietary !== 'undefined') update.Dietary = String(Dietary ?? '').trim();
    if (typeof Allergies !== 'undefined') update.Allergies = String(Allergies ?? '').trim();
    if (typeof Song !== 'undefined') update.Song = String(Song ?? '').trim();

    if (typeof RSVPstatus !== 'undefined') {
      update.RSVPstatus = typeof RSVPstatus === 'boolean'
        ? RSVPstatus
        : String(RSVPstatus).toLowerCase() === 'true';
    }

    // Nothing to update?
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    await ref.update(update);
    const updated = await ref.get();
    return res.status(200).json({ id: guestId, ...updated.data() });
  } catch (err) {
    console.error('Error updating guest:', err);
    return res.status(500).json({ message: 'Failed to update guest' });
  }
};
