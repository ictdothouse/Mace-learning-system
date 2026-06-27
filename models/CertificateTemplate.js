// models/CertificateTemplate.js - Model untuk konfigurasi template sijil
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
    // Text Content
    title: {
        type: String,
        default: 'SIJIL PENGHARGAAN'
    },
    subtitle: {
        type: String,
        default: 'KURSUS eLEARNING ATLET SUKMA'
    },
    courseName: {
        type: String,
        default: 'KURSUS eLEARNING ATLET SUKMA'
    },
    description: {
        type: String,
        default: 'Adalah dengan ini diperakui bahawa'
    },
    // Signatory
    signatoryName: {
        type: String,
        default: 'PENGARAH'
    },
    signatoryTitle: {
        type: String,
        default: 'Majlis Sukan Negara'
    },
    // Styling
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
    fontFamily: {
        type: String,
        default: 'Helvetica',
        enum: ['Helvetica', 'Times-Roman', 'Courier', 'Helvetica-Bold', 'Times-Bold']
    },
    // Options
    showBorder: {
        type: Boolean,
        default: true
    },
    showLogo: {
        type: Boolean,
        default: false
    },
    logoUrl: {
        type: String,
        default: ''
    },
    fontSize: {
        title: { type: Number, default: 36 },
        name: { type: Number, default: 42 },
        body: { type: Number, default: 16 }
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
