const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateCertificate(athlete, res) {
    const doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `inline; filename=Sijil_${athlete.fullName.replace(/\s+/g, '_')}.pdf`);
    
    doc.pipe(res);

    // Border luar (double border effect)
    doc.lineWidth(3);
    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).stroke('#004aad');
    
    // Border dalam
    doc.lineWidth(1);
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke('#004aad');

    // Hiasan sudut
    const cornerSize = 30;
    doc.lineCap('square');
    // Sudut kiri atas
    doc.moveTo(35, 55).lineTo(35, 35).lineTo(55, 35).stroke('#004aad');
    // Sudut kanan atas
    doc.moveTo(doc.page.width - 55, 35).lineTo(doc.page.width - 35, 35).lineTo(doc.page.width - 35, 55).stroke('#004aad');
    // Sudut kiri bawah
    doc.moveTo(35, doc.page.height - 55).lineTo(35, doc.page.height - 35).lineTo(55, doc.page.height - 35).stroke('#004aad');
    // Sudut kanan bawah
    doc.moveTo(doc.page.width - 55, doc.page.height - 35).lineTo(doc.page.width - 35, doc.page.height - 35).lineTo(doc.page.width - 35, doc.page.height - 55).stroke('#004aad');

    // Header - Tajuk Utama
    doc.fontSize(36).font('Helvetica-Bold').fillColor('#004aad').text('SIJIL PENGHARGAAN', { align: 'center' });
    doc.moveDown(0.5);
    
    // Subtitle
    doc.fontSize(14).font('Helvetica').fillColor('#333333').text('KURSUS eLEARNING ATLET SUKMA', { align: 'center' });
    doc.moveDown(2);

    // Intro text
    doc.fontSize(16).font('Helvetica').fillColor('#000000').text('Adalah dengan ini diperakui bahawa', { align: 'center' });
    doc.moveDown(1.5);

    // Nama Atlet - Highlighted
    const athleteName = athlete.fullName || 'NAMA TIDAK DIKETAHUI';
    doc.fontSize(42).font('Helvetica-Bold').fillColor('#004aad').text(athleteName.toUpperCase(), { align: 'center', underline: true });
    doc.moveDown(1.5);

    // Negeri Wakil
    const negeri = athlete.negeriWakil || 'NEGERI TIDAK DIKETAHUI';
    doc.fontSize(18).font('Helvetica').fillColor('#000000').text(`Mewakili Negeri: ${negeri.toUpperCase()}`, { align: 'center' });
    doc.moveDown(2);

    // Body text
    doc.fontSize(16).font('Helvetica').fillColor('#000000').text('Telah berjaya menyelesaikan semua modul dalam', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#004aad').text('KURSUS eLEARNING ATLET SUKMA', { align: 'center' });
    doc.moveDown(2);

    // Tarikh
    const dateStr = new Date().toLocaleDateString('ms-MY', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    doc.fontSize(14).font('Helvetica').fillColor('#000000').text(`Diberikan pada: ${dateStr}`, { align: 'center' });
    doc.moveDown(2.5);

    // Footer - Tandatangan
    const footerY = doc.y;
    
    // Lajur Kiri - Pengarah
    doc.fontSize(12).font('Helvetica-Bold').text('PENGARAH', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text('Majlis Sukan Negara', { align: 'left' });
    
    // Lajur Kanan - Tarikh & Cop
    doc.x = doc.page.width - 150;
    doc.y = footerY;
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666666').text('Sijil ini dijana secara elektronik', { align: 'right' });
    doc.moveDown(0.5);
    doc.text('Tidak memerlukan cop rasmi', { align: 'right' });

    doc.end();
}

module.exports = { generateCertificate };