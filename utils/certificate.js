const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateCertificate(athlete, res) {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'inline; filename=Sijil_SUKMA.pdf');
    
    doc.pipe(res);

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke();

    // Header
    doc.fontSize(30).font('Helvetica-Bold').text('SIJIL PENGHARGAAN', { align: 'center' });
    doc.moveDown();
    doc.fontSize(15).font('Helvetica').text('Adalah dengan ini diperakui bahawa', { align: 'center' });
    doc.moveDown(2);

    // Nama Atlet
    doc.fontSize(40).font('Helvetica-Bold').fillColor('#004aad').text(athlete.fullName.toUpperCase(), { align: 'center' });
    doc.moveDown();

    // Butiran
    doc.fontSize(16).font('Helvetica').fillColor('#000000').text(`Negeri Wakil: ${athlete.negeriWakil}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text('Telah berjaya menyelesaikan kursus eLearning Atlet SUKMA', { align: 'center' });
    doc.moveDown(2);

    // Tarikh
    const dateStr = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.fontSize(14).text(`Tarikh: ${dateStr}`, { align: 'center' });

    // Footer
    doc.fontSize(10).text('Majlis Sukan Negara', { align: 'center' });

    doc.end();
}

module.exports = { generateCertificate };