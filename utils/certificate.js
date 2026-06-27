const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const CertificateTemplate = require('../models/CertificateTemplate');

async function generateCertificate(athlete, res, templateId = null) {
    const doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `inline; filename=Sijil_${athlete.fullName.replace(/\s+/g, '_')}.pdf`);
    
    doc.pipe(res);

    // Get template or use default
    let template = null;
    if (templateId) {
        template = await CertificateTemplate.findById(templateId);
    }
    if (!template) {
        template = await CertificateTemplate.findOne({ isActive: true });
    }

    // Default template values
    const config = template || {
        title: 'SIJIL PENGHARGAAN',
        subtitle: 'KURSUS eLEARNING ATLET SUKMA',
        courseName: 'KURSUS eLEARNING ATLET SUKMA',
        description: 'Adalah dengan ini diperakui bahawa',
        signatoryName: 'PENGARAH',
        signatoryTitle: 'Majlis Sukan Negara',
        primaryColor: '#004aad',
        secondaryColor: '#333333',
        accentColor: '#fbbf24',
        fontFamily: 'Helvetica',
        showBorder: true,
        fontSize: { title: 36, name: 42, body: 16 }
    };

    const primaryColor = config.primaryColor || '#004aad';
    const secondaryColor = config.secondaryColor || '#333333';

    // Border luar (double border effect)
    if (config.showBorder) {
        doc.lineWidth(3);
        doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).stroke(primaryColor);
        
        // Border dalam
        doc.lineWidth(1);
        doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke(primaryColor);

        // Hiasan sudut
        const cornerSize = 30;
        doc.lineCap('square');
        // Sudut kiri atas
        doc.moveTo(35, 55).lineTo(35, 35).lineTo(55, 35).stroke(primaryColor);
        // Sudut kanan atas
        doc.moveTo(doc.page.width - 55, 35).lineTo(doc.page.width - 35, 35).lineTo(doc.page.width - 35, 55).stroke(primaryColor);
        // Sudut kiri bawah
        doc.moveTo(35, doc.page.height - 55).lineTo(35, doc.page.height - 35).lineTo(55, doc.page.height - 35).stroke(primaryColor);
        // Sudut kanan bawah
        doc.moveTo(doc.page.width - 55, doc.page.height - 35).lineTo(doc.page.width - 35, doc.page.height - 35).lineTo(doc.page.width - 35, doc.page.height - 55).stroke(primaryColor);
    }

    // Header - Tajuk Utama
    doc.fontSize(config.fontSize?.title || 36).font('Helvetica-Bold').fillColor(primaryColor).text(config.title || 'SIJIL PENGHARGAAN', { align: 'center' });
    doc.moveDown(0.5);
    
    // Subtitle
    doc.fontSize(14).font('Helvetica').fillColor(secondaryColor).text(config.subtitle || 'KURSUS eLEARNING ATLET SUKMA', { align: 'center' });
    doc.moveDown(2);

    // Intro text
    doc.fontSize(config.fontSize?.body || 16).font('Helvetica').fillColor('#000000').text(config.description || 'Adalah dengan ini diperakui bahawa', { align: 'center' });
    doc.moveDown(1.5);

    // Nama Atlet - Highlighted
    const athleteName = athlete.fullName || 'NAMA TIDAK DIKETAHUI';
    doc.fontSize(config.fontSize?.name || 42).font('Helvetica-Bold').fillColor(primaryColor).text(athleteName.toUpperCase(), { align: 'center', underline: true });
    doc.moveDown(1.5);

    // Negeri Wakil
    const negeri = athlete.negeriWakil || 'NEGERI TIDAK DIKETAHUI';
    doc.fontSize(18).font('Helvetica').fillColor('#000000').text(`Mewakili Negeri: ${negeri.toUpperCase()}`, { align: 'center' });
    doc.moveDown(2);

    // Body text
    doc.fontSize(config.fontSize?.body || 16).font('Helvetica').fillColor('#000000').text('Telah berjaya menyelesaikan semua modul dalam', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor).text(config.courseName || 'KURSUS eLEARNING ATLET SUKMA', { align: 'center' });
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
    doc.fontSize(12).font('Helvetica-Bold').text(config.signatoryName || 'PENGARAH', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(config.signatoryTitle || 'Majlis Sukan Negara', { align: 'left' });
    
    // Lajur Kanan - Tarikh & Cop
    doc.x = doc.page.width - 150;
    doc.y = footerY;
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666666').text('Sijil ini dijana secara elektronik', { align: 'right' });
    doc.moveDown(0.5);
    doc.text('Tidak memerlukan cop rasmi', { align: 'right' });

    doc.end();
}

module.exports = { generateCertificate };