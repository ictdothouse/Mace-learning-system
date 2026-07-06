// models/CertificateTemplate.js - Model untuk konfigurasi template sijil (ENHANCED)
const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    // Background
    backgroundImageType: {
        type: String,
        enum: ['none', 'url', 'r2'],
        default: 'none'
    },
    backgroundImageUrl: {
        type: String,
        default: ''
    },
    backgroundR2Key: {
        type: String,
        default: ''
    },
    backgroundOpacity: {
        type: Number,
        default: 1,
        min: 0,
        max: 1
    },
    // Text Content with visibility toggles
    title: {
        type: String,
        default: 'SIJIL PENGHARGAAN'
    },
    showTitle: {
        type: Boolean,
        default: true
    },
    subtitle: {
        type: String,
        default: 'KURSUS eLEARNING ATLET MACE'
    },
    showSubtitle: {
        type: Boolean,
        default: true
    },
    courseName: {
        type: String,
        default: 'KURSUS eLEARNING ATLET MACE'
    },
    showCourseName: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        default: 'Adalah dengan ini diperakui bahawa'
    },
    showDescription: {
        type: Boolean,
        default: true
    },
    showAthleteName: {
        type: Boolean,
        default: true
    },
    showIcNumber: {
        type: Boolean,
        default: false
    },
    showNegeri: {
        type: Boolean,
        default: true
    },
    showSukan: {
        type: Boolean,
        default: false
    },
    showDate: {
        type: Boolean,
        default: true
    },
    // Signatory
    signatoryName: {
        type: String,
        default: 'PENGARAH'
    },
    showSignatory: {
        type: Boolean,
        default: true
    },
    signatoryTitle: {
        type: String,
        default: 'Majlis Sukan Negara'
    },
    // Colors
    primaryColor: {
        type: String,
        default: '#004aad'
    },
    secondaryColor: {
        type: String,
        default: '#333333'
    },
    accentColor: {
        type: String,
        default: '#fbbf24'
    },
    backgroundColor: {
        type: String,
        default: '#ffffff'
    },
    // Typography - Global
    fontFamily: {
        type: String,
        default: 'Helvetica',
        enum: ['Helvetica', 'Times-Roman', 'Courier', 'Helvetica-Bold', 'Times-Bold', 'Courier-Bold']
    },
    athleteNameFont: {
        type: String,
        default: 'Great Vibes'
    },
    // Typography - Per Element (position & style)
    elements: {
        title: {
            fontSize: { type: Number, default: 36 },
            color: { type: String, default: '#004aad' },
            lineHeight: { type: Number, default: 1.2 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'bold' },
            align: { type: String, default: 'center', enum: ['left', 'center', 'right'] },
            positionX: { type: Number, default: 50 }, // percentage
            positionY: { type: Number, default: 10 }  // percentage from top
        },
        subtitle: {
            fontSize: { type: Number, default: 18 },
            color: { type: String, default: '#333333' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 1 },
            fontWeight: { type: String, default: 'normal' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 18 }
        },
        description: {
            fontSize: { type: Number, default: 16 },
            color: { type: String, default: '#000000' },
            lineHeight: { type: Number, default: 1.4 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'normal' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 28 }
        },
        athleteName: {
            fontSize: { type: Number, default: 42 },
            color: { type: String, default: '#004aad' },
            lineHeight: { type: Number, default: 1.2 },
            letterSpacing: { type: Number, default: 2 },
            fontWeight: { type: String, default: 'bold' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 38 }
        },
        icNumber: {
            fontSize: { type: Number, default: 14 },
            color: { type: String, default: '#666666' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 1 },
            fontWeight: { type: String, default: 'normal' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 48 }
        },
        negeri: {
            fontSize: { type: Number, default: 16 },
            color: { type: String, default: '#000000' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'normal' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 52 }
        },
        sukan: {
            fontSize: { type: Number, default: 16 },
            color: { type: String, default: '#004aad' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'bold' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 56 }
        },
        courseName: {
            fontSize: { type: Number, default: 20 },
            color: { type: String, default: '#004aad' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'bold' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 60 }
        },
        date: {
            fontSize: { type: Number, default: 14 },
            color: { type: String, default: '#000000' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'normal' },
            align: { type: String, default: 'center' },
            positionX: { type: Number, default: 50 },
            positionY: { type: Number, default: 68 }
        },
        signatory: {
            fontSize: { type: Number, default: 14 },
            color: { type: String, default: '#000000' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'bold' },
            align: { type: String, default: 'left' },
            positionX: { type: Number, default: 20 },
            positionY: { type: Number, default: 80 }
        },
        signatoryTitle: {
            fontSize: { type: Number, default: 12 },
            color: { type: String, default: '#666666' },
            lineHeight: { type: Number, default: 1.3 },
            letterSpacing: { type: Number, default: 0 },
            fontWeight: { type: String, default: 'normal' },
            align: { type: String, default: 'left' },
            positionX: { type: Number, default: 20 },
            positionY: { type: Number, default: 85 }
        }
    },
    // Options
    showBorder: {
        type: Boolean,
        default: true
    },
    showFooter: {
        type: Boolean,
        default: true
    },
    footerLine1: {
        type: String,
        default: 'Sijil ini dijana secara elektronik'
    },
    footerLine2: {
        type: String,
        default: 'Tidak memerlukan cop rasmi'
    },
    showLogo: {
        type: Boolean,
        default: false
    },
    logoUrl: {
        type: String,
        default: ''
    },
    logoPosition: {
        type: String,
        default: 'top-center',
        enum: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']
    },
    logoSize: {
        width: { type: Number, default: 80 },
        height: { type: Number, default: 80 }
    },
    borderStyle: {
        type: String,
        default: 'double',
        enum: ['single', 'double', 'ornate']
    },
    borderColor: {
        type: String,
        default: '#004aad'
    },
    borderWidth: {
        type: Number,
        default: 3
    },
    orientation: {
        type: String,
        enum: ['landscape', 'portrait'],
        default: 'landscape'
    }
}, {
    timestamps: true
});

// Ensure only one active template at a time
certificateTemplateSchema.statics.setActiveTemplate = async function(templateId) {
    await this.updateMany({}, { isActive: false });
    return this.findByIdAndUpdate(templateId, { isActive: true }, { new: true });
};

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
