const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
    siteName: { type: String, default: 'eLearning Atlit MACE' },
    tagline: { type: String, default: 'Majlis Sukan Negara Malaysia' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#2563eb' },
    dashboardTitle: { type: String, default: 'DASHBOARD ATLET' },
    dashboardSubtitle: { type: String, default: 'Pantau kemajuan pembelajaran anda di sini.' },
    allowModuleSelectionInEnrollment: { type: Boolean, default: false },
    
    // Homepage Customization
    homeBannerTitle: { type: String, default: 'Modul' },
    homeBannerImage: { type: String, default: '' },
    homeBgImage: { type: String, default: '' },
    homeLeftColumnHtml: { type: String, default: '<p>Modul pembelajaran ini disediakan dari peringkat pembelajaran asas yang merangkumi pelbagai aspek topik kesejahteraan atlet dalam mengukuhkan ekosistem sukan berprestasi tinggi.</p><br><p>Setelah melengkapkan kuiz di akhir setiap modul, anda boleh mencetak atau memuat turun Sijil Penyertaan.</p>' },
    showMenu: { type: Boolean, default: true },
    menuLinks: [{
        label: { type: String, required: true },
        url: { type: String, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Branding', brandingSchema);
