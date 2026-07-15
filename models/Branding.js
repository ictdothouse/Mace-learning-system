const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
    siteName: { type: String, default: 'eLearning Atlit MACE' },
    tagline: { type: String, default: 'Majlis Sukan Negara Malaysia' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#2563eb' },
    dashboardTitle: { type: String, default: 'DASHBOARD ATLET' },
    dashboardTitle_en: { type: String, default: 'ATHLETES DASHBOARD' },
    dashboardSubtitle: { type: String, default: 'Pantau kemajuan pembelajaran anda di sini.' },
    dashboardSubtitle_en: { type: String, default: 'Monitor your learning progress here.' },
    allowModuleSelectionInEnrollment: { type: Boolean, default: false },
    loginMethod: { 
        type: String, 
        enum: ['name_ic', 'ic_password', 'name_password'], 
        default: 'name_ic' 
    },
    
    // Homepage Customization
    homeBannerTitle: { type: String, default: 'Modul' },
    homeBannerTitle_en: { type: String, default: 'Modules' },
    homeBannerImage: { type: String, default: '' },
    homeBgImage: { type: String, default: '' },
    homeLeftColumnHtml: { type: String, default: '<p>Modul pembelajaran ini disediakan dari peringkat pembelajaran asas yang merangkumi pelbagai aspek topik kesejahteraan atlet dalam mengukuhkan ekosistem sukan berprestasi tinggi.</p><br><p>Setelah melengkapkan kuiz di akhir setiap modul, anda boleh mencetak atau memuat turun Sijil Penyertaan.</p>' },
    homeLeftColumnHtml_en: { type: String, default: '<p>This learning module is prepared starting from the basic learning stage, covering various aspects of athlete well-being topics to strengthen the high-performance sports ecosystem.</p><br><p>Upon completing the quiz at the end of each module, you can print or download the Certificate of Participation.</p>' },
    homeFormSubtitle: { type: String, default: 'Daftar atau sambung modul latihan atlet anda' }, // ⚡ BARU: Teks Borang BM
    homeFormSubtitle_en: { type: String, default: 'Register or resume your athlete learning path' }, // ⚡ BARU: Teks Borang EN
    showMenu: { type: Boolean, default: true },
    showBannerTitle: { type: Boolean, default: true }, // ⚡ BARU: On/Off tajuk banner utama
    showRegistrationForm: { type: Boolean, default: true }, // ⚡ BARU: On/Off borang login/pendaftaran
    menuLinks: [{
        label: { type: String, required: true },
        label_en: { type: String },
        url: { type: String, required: true }
    }],
    // Footer Customization
    footerText: { type: String, default: '© 2026 Majlis Sukan Negara Malaysia. Hak Cipta Terpelihara.' },
    footerLinks: [{
        label: { type: String, required: true },
    }],
    // Terminology Customization (Daftar Istilah)
    termTeacher_ms: { type: String, default: 'Instruktor' },
    termTeacher_en: { type: String, default: 'Instructor' },
    termStudent_ms: { type: String, default: 'Atlit' },
    termStudent_en: { type: String, default: 'Athlete' },
    
    // PDPA Customization
    pdpaTitle: { type: String, default: '' },
    pdpaTitle_en: { type: String, default: '' },
    pdpaDesc1: { type: String, default: '' },
    pdpaDesc1_en: { type: String, default: '' },
    pdpaDesc2: { type: String, default: '' },
    pdpaDesc2_en: { type: String, default: '' },
    pdpaCheckbox: { type: String, default: '' },
    pdpaCheckbox_en: { type: String, default: '' },
    pdpaBtnAgree: { type: String, default: '' },
    pdpaBtnAgree_en: { type: String, default: '' },
    pdpaBtnCancel: { type: String, default: '' },
    pdpaBtnCancel_en: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Branding', brandingSchema);
