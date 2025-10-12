const PDFDocument = require('pdfkit');
const { db } = require('../firebase');
const axios = require('axios');

//for image upload
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { initializeApp } = require('firebase/app');
const { firebaseConfig } = require('../firebase/firebase-config');

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

exports.uploadStoryImage = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const storageRef = ref(storage, `storyImages/${userId}/${file.originalname}`);
    await uploadBytes(storageRef, file.buffer);
    const downloadURL = await getDownloadURL(storageRef);

    // Save photoURL to Firestore
    await db.collection('Story').doc(userId).set({ photoURL: downloadURL }, { merge: true });

    res.status(200).json({ photoURL: downloadURL });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};



// Export story PDF for a user
exports.exportStoryPdf = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch story from Firestore
    const docRef = db.collection('Story').doc(userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).send('Story not found');
    }

    const story = docSnap.data();

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=story.pdf');

    doc.pipe(res);

    // // Title
    // doc.fontSize(24).text('Our Story', { align: 'center' });
    // doc.moveDown(1.5);

    // // How we met
    // doc.fontSize(16).fillColor('#000').text('How we met:', { underline: true });
    // doc.moveDown(0.5);
    // doc.fontSize(14).fillColor('#333').text(story.howWeMet || 'N/A');
    // doc.moveDown(1);

    // // Proposal
    // doc.fontSize(16).fillColor('#000').text('Our Proposal:', { underline: true });
    // doc.moveDown(0.5);
    // doc.fontSize(14).fillColor('#333').text(story.proposal || 'N/A');
    // doc.moveDown(1.5);

    // // Optional photo
    // if (story.photoURL) {
    //   try {
    //     const imageResponse = await axios.get(story.photoURL, { responseType: 'arraybuffer' });
    //     const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    //     // Fit image nicely on page
    //     const pageWidth = doc.page.width - doc.options.margin * 2;
    //     const pageHeight = doc.page.height - doc.y - doc.options.margin; // remaining height

    //     doc.image(imageBuffer, doc.options.margin, doc.y, {
    //       fit: [pageWidth, pageHeight],
    //       align: 'center',
    //       valign: 'center'
    //     });

    //     doc.moveDown(1);
    //   } catch (imgErr) {
    //     console.warn('Could not load image:', imgErr.message);
    //   }
    // }



// --- HEADER ---
doc
  .fillColor('#e75480')
  .fontSize(28)
  .font('Times-BoldItalic')
  .text('Our Story', { align: 'center' });


doc
  .moveDown(0.5);

// --- GOLD LINE DIVIDER ---
const pageWidth = doc.page.width;
const margin = doc.options.margin;
const lineWidth = pageWidth - margin * 2;
const centerX = margin;
doc
  .moveTo(centerX, doc.y)
  .lineTo(centerX + lineWidth, doc.y)
  .strokeColor('#d4af37')
  .lineWidth(1.5)
  .stroke();
doc.moveDown(2);

// --- HOW WE MET ---
doc
  .fillColor('#000')
  .font('Helvetica-Bold')
  .fontSize(16)
  .text('How We Met', { underline: false });
doc
  .moveDown(0.5)
  .font('Helvetica')
  .fontSize(13)
  .fillColor('#333')
  .text(story.howWeMet || 'N/A', {
    align: 'justify',
    lineGap: 4
  });

doc.moveDown(1.5);

// --- OUR PROPOSAL ---
doc
  .fillColor('#000')
  .font('Helvetica-Bold')
  .fontSize(16)
  .text('The Proposal', { underline: false });
doc
  .moveDown(0.5)
  .font('Helvetica')
  .fontSize(13)
  .fillColor('#333')
  .text(story.proposal || 'N/A', {
    align: 'justify',
    lineGap: 4
  });

doc.moveDown(2);

// --- TIMELINE MILESTONES ---
if (story.timeline && Array.isArray(story.timeline) && story.timeline.length > 0) {
  doc
    .fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('Our Milestones', { underline: false });

  doc.moveDown(0.5);

  story.timeline.forEach((entry, index) => {
    // Small title for each milestone
    doc
      .font('Helvetica-BoldOblique')
      .fontSize(14)
      .fillColor('#e75480')
      .text(`${index + 1}. ${entry.title || 'Untitled Milestone'}`, { continued: false });

    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(13)
      .fillColor('#333')
      .text(entry.description || 'No description', {
        align: 'justify',
        lineGap: 4
      });

    // Add a soft separator line between milestones
    if (index < story.timeline.length - 1) {
      doc.moveDown(0.3);
      const lineStartX = doc.page.margins.left;
      const lineEndX = doc.page.width - doc.page.margins.right;
      doc
        .moveTo(lineStartX, doc.y)
        .lineTo(lineEndX, doc.y)
        .strokeColor('#d4af37')
        .lineWidth(0.7)
        .stroke();
      doc.moveDown(0.5);
    } else {
      doc.moveDown(1);
    }
  });

  doc.moveDown(1);
}


// --- PHOTO (if exists) ---
if (story.photoURL) {
  try {
    const imageResponse = await axios.get(story.photoURL, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    const imageMaxWidth = pageWidth - margin * 2;
    const imageMaxHeight = 250;

    doc.image(imageBuffer, {
      fit: [imageMaxWidth, imageMaxHeight],
      align: 'center',
      valign: 'center'
    });

    doc.moveDown(1);
  } catch (error) {
    console.log('Could not load image:', error);
  }
}

// --- FOOTER ---
doc.moveDown(2);
doc
  .fontSize(10)
  .fillColor('#999')
  .text('Vows & Veils', { align: 'center' });




    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
};


