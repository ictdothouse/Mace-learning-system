const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
    siteName: { type: String, default: 'eLearning Atlit SUKMA' },
    tagline: { type: String, default: 'Majlis Sukan Negara Malaysia' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#2563eb' },
    dashboardTitle: { type: String, default: 'DASHBOARD ATLET' },
    dashboardSubtitle: { type: String, default: 'Pantau kemajuan pembelajaran anda di sini.' }
}, { timestamps: true });

module.exports = mongoose.model('Branding', brandingSchema);
