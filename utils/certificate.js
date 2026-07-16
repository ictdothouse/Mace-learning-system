const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const CertificateTemplate = require('../models/CertificateTemplate');
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 Client for background images
const r2Client = new S3Client({
    region: 'auto',
    forcePathStyle: true,
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const getSecureImageUrl = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'modulmace',
            Key: key
        });
        return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    } catch (err) {
        console.error('❌ Gagal generate signed URL untuk image:', err.message);
        return null;
    }
};

// Helper function to fetch image buffers (supports local paths and remote URLs)
async function getImageBuffer(imgUrl) {
    if (!imgUrl) return null;
    
    // Local path starts with /uploads
    if (imgUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', imgUrl);
        if (fs.existsSync(localPath)) {
            return fs.readFileSync(localPath);
        }
    }
    
    // Relative file path on disk
    if (fs.existsSync(imgUrl)) {
        return fs.readFileSync(imgUrl);
    }
    
    // Remote URL
    if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
        try {
            const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (err) {
            console.error(`❌ Gagal mendownload imej dari URL (${imgUrl}):`, err.message);
            return null;
        }
    }
    
    return null;
}

async function generateCertificate(athlete, res, templateId = null) {
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
        subtitle: 'KURSUS eLEARNING ATLET MACE',
        courseName: 'KURSUS eLEARNING ATLET MACE',
        description: 'Adalah dengan ini diperakui bahawa',
        signatoryName: 'PENGARAH',
        signatoryTitle: 'Majlis Sukan Negara',
        primaryColor: '#004aad',
        secondaryColor: '#333333',
        accentColor: '#fbbf24',
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
        showBorder: true,
        showTitle: true,
        showSubtitle: true,
        showCourseName: true,
        showDescription: true,
        showAthleteName: true,
        showIcNumber: false,
        showNegeri: true,
        showDate: true,
        showSignatory: true,
        backgroundImageType: 'none',
        orientation: 'landscape',
        elements: {
            title: { fontSize: 36, color: '#004aad', align: 'center', positionX: 50, positionY: 10 },
            athleteName: { fontSize: 42, color: '#004aad', align: 'center', positionX: 50, positionY: 38 }
        }
    };

    // Force A4 dimensions and disable autoPageBreak
    const doc = new PDFDocument({ 
        size: 'A4', 
        layout: config.orientation || 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoPageBreak: false // Force exactly 1 page
    });
    
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `inline; filename=Sijil_${athlete.fullName.replace(/\s+/g, '_')}.pdf`);
    
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Draw background
    if (config.backgroundImageType === 'none' || !config.backgroundImageType) {
        // Solid color background
        doc.rect(0, 0, pageWidth, pageHeight).fill(config.backgroundColor || '#ffffff');
    } else {
        let bgBuffer = null;
        if (config.backgroundImageType === 'url' && config.backgroundImageUrl) {
            bgBuffer = await getImageBuffer(config.backgroundImageUrl);
        } else if (config.backgroundImageType === 'r2' && config.backgroundR2Key) {
            const imageUrl = await getSecureImageUrl(config.backgroundR2Key);
            if (imageUrl) {
                bgBuffer = await getImageBuffer(imageUrl);
            }
        }
        
        if (bgBuffer) {
            try {
                doc.opacity(config.backgroundOpacity || 1);
                doc.image(bgBuffer, 0, 0, { width: pageWidth, height: pageHeight });
                doc.opacity(1);
            } catch (err) {
                console.error('Error drawing background image:', err.message);
                doc.rect(0, 0, pageWidth, pageHeight).fill(config.backgroundColor || '#ffffff');
            }
        } else {
            doc.rect(0, 0, pageWidth, pageHeight).fill(config.backgroundColor || '#ffffff');
        }
    }

    // Helper function to get text alignment offset
    const getTextX = (align, positionX, text, fontSize) => {
        const textWidth = doc.widthOfString(text, { size: fontSize });
        if (align === 'center') {
            return (pageWidth * positionX / 100) - (textWidth / 2);
        } else if (align === 'right') {
            return (pageWidth * positionX / 100) - textWidth;
        }
        return pageWidth * positionX / 100;
    };

    // Helper function to draw text with custom styling
    const drawStyledText = (elementKey, text, options = {}) => {
        const element = config.elements?.[elementKey] || {};
        const fontSize = options.fontSize || element.fontSize || 16;
        const color = options.color || element.color || '#000000';
        const align = options.align || element.align || 'center';
        const positionX = options.positionX !== undefined ? options.positionX : (element.positionX || 50);
        const positionY = options.positionY !== undefined ? options.positionY : (element.positionY || 50);
        const lineHeight = element.lineHeight || 1.3;
        const letterSpacing = element.letterSpacing || 0;
        const fontWeight = element.fontWeight || 'normal';
        
        // Determine font
        let fontName = config.fontFamily || 'Helvetica';
        if (fontWeight === 'bold' && !fontName.includes('Bold')) {
            fontName = fontName + '-Bold';
        }
        
        doc.fontSize(fontSize)
           .font(fontName)
           .fillColor(color);
        
        const x = getTextX(align, positionX, text, fontSize);
        const y = pageHeight * positionY / 100;
        
        doc.text(text, x, y, {
            align: align,
            lineHeight: lineHeight,
            characterSpacing: letterSpacing
        });
    };

    // Draw border
    if (config.showBorder) {
        const borderStyle = config.borderStyle || 'double';
        const borderColor = config.borderColor || config.primaryColor || '#004aad';
        const borderWidth = config.borderWidth || 3;
        
        if (borderStyle === 'single') {
            doc.lineWidth(borderWidth);
            doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke(borderColor);
        } else if (borderStyle === 'double') {
            doc.lineWidth(borderWidth);
            doc.rect(15, 15, pageWidth - 30, pageHeight - 30).stroke(borderColor);
            doc.lineWidth(1);
            doc.rect(25, 25, pageWidth - 50, pageHeight - 50).stroke(borderColor);
            
            // Ornamental corners
            doc.lineCap('square');
            doc.moveTo(35, 55).lineTo(35, 35).lineTo(55, 35).stroke(borderColor);
            doc.moveTo(pageWidth - 55, 35).lineTo(pageWidth - 35, 35).lineTo(pageWidth - 35, 55).stroke(borderColor);
            doc.moveTo(35, pageHeight - 55).lineTo(35, pageHeight - 35).lineTo(55, pageHeight - 35).stroke(borderColor);
            doc.moveTo(pageWidth - 55, pageHeight - 35).lineTo(pageWidth - 35, pageHeight - 35).lineTo(pageWidth - 35, pageHeight - 55).stroke(borderColor);
        } else if (borderStyle === 'ornate') {
            doc.lineWidth(5);
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20).stroke(borderColor);
            doc.lineWidth(2);
            doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke(borderColor);
            doc.lineWidth(1);
            doc.rect(28, 28, pageWidth - 56, pageHeight - 56).stroke(borderColor);
        }
    }

    // Draw logo
    if (config.showLogo && config.logoUrl) {
        try {
            const logoBuffer = await getImageBuffer(config.logoUrl);
            if (logoBuffer) {
                const logoPosition = config.logoPosition || 'top-center';
                const logoSize = config.logoSize || { width: 80, height: 80 };
                let logoX, logoY;
                
                switch (logoPosition) {
                    case 'top-left':
                        logoX = 40;
                        logoY = 30;
                        break;
                    case 'top-right':
                        logoX = pageWidth - logoSize.width - 40;
                        logoY = 30;
                        break;
                    case 'bottom-left':
                        logoX = 40;
                        logoY = pageHeight - logoSize.height - 40;
                        break;
                    case 'bottom-center':
                        logoX = (pageWidth - logoSize.width) / 2;
                        logoY = pageHeight - logoSize.height - 40;
                        break;
                    case 'bottom-right':
                        logoX = pageWidth - logoSize.width - 40;
                        logoY = pageHeight - logoSize.height - 40;
                        break;
                    case 'top-center':
                    default:
                        logoX = (pageWidth - logoSize.width) / 2;
                        logoY = 30;
                }
                
                doc.image(logoBuffer, logoX, logoY, { width: logoSize.width, height: logoSize.height });
            }
        } catch (err) {
            console.error('Error drawing logo:', err.message);
        }
    }

    // Draw text elements based on template configuration
    const elements = config.elements || {};

    // Title
    if (config.showTitle && config.title) {
        drawStyledText('title', config.title);
    }

    // Subtitle
    if (config.showSubtitle && config.subtitle) {
        drawStyledText('subtitle', config.subtitle);
    }

    // Description
    if (config.showDescription && config.description) {
        drawStyledText('description', config.description);
    }

    // Athlete Name
    if (config.showAthleteName && athlete.fullName) {
        drawStyledText('athleteName', athlete.fullName.toUpperCase());
    }

    // IC Number
    if (config.showIcNumber && athlete.icNumber) {
        drawStyledText('icNumber', `No. IC: ${athlete.icNumber}`);
    }

    // Negeri
    if (config.showNegeri && athlete.negeriWakil) {
        drawStyledText('negeri', `Mewakili Negeri: ${athlete.negeriWakil.toUpperCase()}`);
    }

    // Sukan
    if (config.showSukan && athlete.sukan) {
        drawStyledText('sukan', `Sukan: ${athlete.sukan.toUpperCase()}`);
    }

    // Course Name
    if (config.showCourseName && config.courseName) {
        drawStyledText('courseName', config.courseName);
    }

    // Date
    if (config.showDate) {
        const dateStr = new Date().toLocaleDateString('ms-MY', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        drawStyledText('date', `Diberikan pada: ${dateStr}`);
    }

    // Signatory
    if (config.showSignatory) {
        drawStyledText('signatory', config.signatoryName || 'PENGARAH');
        drawStyledText('signatoryTitle', config.signatoryTitle || 'Majlis Sukan Negara');
    }

    // Electronic signature note
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .fillColor('#666666')
       .text('Sijil ini dijana secara elektronik', pageWidth - 150, pageHeight - 60, { align: 'right' });
    doc.text('Tidak memerlukan cop rasmi', pageWidth - 150, pageHeight - 45, { align: 'right' });

    doc.end();
}

module.exports = { generateCertificate };