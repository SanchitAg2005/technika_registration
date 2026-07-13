const PDFDocument = require('pdfkit');

/**
 * Generate a styled registration receipt PDF
 * @param {Object} user - Participant user details
 * @param {string} plainPassword - Plaintext password entered by the user
 * @param {Array<Object>} selectedEvents - List of events registered
 * @returns {Promise<Buffer>} Buffer containing the PDF data
 */
const generateReceipt = (user, plainPassword, selectedEvents) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Primary Accent Colors: Violet (#6366f1) and Navy
      const primaryColor = '#4f46e5';
      const secondaryColor = '#0f172a';
      const accentColor = '#06b6d4';
      const textColor = '#334155';
      const lightBg = '#f8fafc';

      // --- Header Header Banner ---
      doc.rect(0, 0, doc.page.width, 140).fill(secondaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('TECHNICA 2026', 50, 40);

      doc.fillColor(accentColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('OFFICIAL REGISTRATION RECEIPT', 50, 75);

      doc.fillColor('#94a3b8')
         .fontSize(9)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleString()}`, 50, 95);

      // Unique Registration ID Badge
      doc.rect(420, 35, 140, 70).fill(primaryColor);
      doc.fillColor('#ffffff')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('REGISTRATION ID', 430, 45, { align: 'center', width: 120 });
      
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .text(user.registrationId, 430, 65, { align: 'center', width: 120 });

      // --- Participant Details Section ---
      doc.fillColor(secondaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Participant Profile', 50, 170);

      // Draw a line separator
      doc.moveTo(50, 190).lineTo(562, 190).strokeColor('#e2e8f0').lineWidth(1).stroke();

      let y = 205;
      const drawDetailRow = (label, value, isHighlighted = false) => {
        doc.fillColor('#64748b')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(label, 50, y);
        
        doc.fillColor(isHighlighted ? primaryColor : textColor)
           .fontSize(10)
           .font(isHighlighted ? 'Helvetica-Bold' : 'Helvetica')
           .text(value, 200, y);
        y += 20;
      };

      drawDetailRow('Full Name:', user.name);
      drawDetailRow('Email Address:', user.email);
      drawDetailRow('WhatsApp Number:', user.whatsapp);
      drawDetailRow('Institution:', user.institution);
      drawDetailRow('Course & Semester:', `${user.course} - Sem ${user.semester}`);
      drawDetailRow('Age / Gender:', `${user.age} / ${user.gender}`);
      drawDetailRow('Payment UTR:', user.paymentUTR, true);
      
      // Plaintext password for user memory
      drawDetailRow('Account Password:', plainPassword, true);

      // --- Selected Events Section ---
      doc.fillColor(secondaryColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Registered Events', 50, y + 20);

      doc.moveTo(50, y + 38).lineTo(562, y + 38).strokeColor('#e2e8f0').lineWidth(1).stroke();

      y += 50;

      if (selectedEvents.length === 0) {
        doc.fillColor('#94a3b8')
           .fontSize(10)
           .font('Helvetica-Oblique')
           .text('No events registered yet.', 50, y);
      } else {
        // Table Header
        doc.rect(50, y, 512, 20).fill('#f1f5f9');
        doc.fillColor(secondaryColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Event ID', 60, y + 5)
           .text('Event Name', 150, y + 5)
           .text('Category', 350, y + 5)
           .text('Type', 470, y + 5);

        y += 20;

        selectedEvents.forEach((event, index) => {
          // Zebra striping
          if (index % 2 === 1) {
            doc.rect(50, y, 512, 20).fill(lightBg);
          }

          doc.fillColor(textColor)
             .fontSize(9)
             .font('Helvetica')
             .text(event.eventId, 60, y + 5)
             .text(event.name, 150, y + 5)
             .text(event.category, 350, y + 5)
             .text(event.teamAllowed ? 'Team' : 'Individual', 470, y + 5);
          
          y += 20;
        });
      }

      // --- Footer Section ---
      doc.rect(0, 730, doc.page.width, 62).fill('#0f172a');
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('This is an automatically generated receipt. Please keep it safe.', 50, 745, { align: 'center', width: 512 })
         .text('For queries, contact the Technica Core Team.', 50, 760, { align: 'center', width: 512 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReceipt };
