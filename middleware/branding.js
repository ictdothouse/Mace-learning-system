const Branding = require('../models/Branding');
const Page = require('../models/Page');

// ⚡ Cache to avoid querying the DB on every request
let brandingCache = null;
let lastCacheTime = 0;
let navPagesCache = null;       // ⚡ BARU: Cache untuk navigation pages
let navPagesCacheTime = 0;      // ⚡ BARU: Timestamp cache navPages
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

async function fetchBranding() {
    try {
        let branding = await Branding.findOne();
        if (!branding) {
            // Create default branding if it doesn't exist
            branding = await Branding.create({});
        }
        return branding.toObject();
    } catch (err) {
        console.error('Error fetching branding:', err);
        return {
            siteName: 'eLearning Atlit MACE',
            tagline: 'Majlis Sukan Negara Malaysia',
            logoUrl: '',
            faviconUrl: '',
            primaryColor: '#2563eb',
            dashboardTitle: 'Dashboard Pemantauan',
            dashboardTitle_en: 'Monitoring Dashboard',
            dashboardSubtitle: 'Statistik terkini prestasi atlit MACE secara live.',
            dashboardSubtitle_en: 'Live monitoring statistics of MACE athletes performance.'
        };
    }
}

// ⚡ BARU: Fungsi fetch navPages dengan cache
async function fetchNavPages() {
    try {
        return await Page.find({ isPublished: true, showInNavigation: true })
            .sort({ navigationOrder: 1 }).lean();
    } catch (e) {
        console.error('Error fetching navPages:', e);
        return [];
    }
}

module.exports = async function brandingMiddleware(req, res, next) {
    const now = Date.now();
    
    // Refresh branding cache if it's expired or doesn't exist
    if (!brandingCache || (now - lastCacheTime > CACHE_DURATION)) {
        brandingCache = await fetchBranding();
        lastCacheTime = now;
    }
    
    // ⚡ Refresh navPages cache if it's expired or doesn't exist
    if (!navPagesCache || (now - navPagesCacheTime > CACHE_DURATION)) {
        navPagesCache = await fetchNavPages();
        navPagesCacheTime = now;
    }
    
    // Provide a way to force refresh cache (e.g., after updating settings)
    req.refreshBrandingCache = async () => {
        brandingCache = await fetchBranding();
        lastCacheTime = Date.now();
        res.locals.branding = brandingCache;
        // ⚡ Juga refresh navPages bila branding di-refresh
        navPagesCache = await fetchNavPages();
        navPagesCacheTime = Date.now();
        res.locals.navPages = navPagesCache;
    };

    res.locals.branding = brandingCache;
    res.locals.navPages = navPagesCache;  // ⚡ Guna cache, bukan DB query setiap request
    
    // Terminology translator helper with plural support for English
    res.locals.getTerm = (key, isPlural = false) => {
        const lang = res.locals.lang || 'ms';
        if (key === 'teacher') {
            const base = lang === 'en' 
                ? (brandingCache.termTeacher_en || 'Instructor') 
                : (brandingCache.termTeacher_ms || 'Instruktor');
            return isPlural && lang === 'en' ? base + 's' : base;
        }
        if (key === 'student') {
            const base = lang === 'en' 
                ? (brandingCache.termStudent_en || 'Athlete') 
                : (brandingCache.termStudent_ms || 'Atlit');
            return isPlural && lang === 'en' ? base + 's' : base;
        }
        return '';
    };

    // Override localization function to dynamically replace terms from DB
    const originalTranslate = res.locals.__;
    res.locals.__ = (key, fallback) => {
        let text = originalTranslate(key, fallback);
        const lang = res.locals.lang || 'ms';
        
        const teacherTerm = lang === 'en' 
            ? (brandingCache.termTeacher_en || 'Instructor') 
            : (brandingCache.termTeacher_ms || 'Instruktor');
            
        const studentTerm = lang === 'en' 
            ? (brandingCache.termStudent_en || 'Athlete') 
            : (brandingCache.termStudent_ms || 'Atlit');

        if (lang === 'ms') {
            // Match exactly or context-based replacement
            text = text.replace(/pelajar/g, studentTerm.toLowerCase())
                       .replace(/Pelajar/g, studentTerm)
                       .replace(/guru/g, teacherTerm.toLowerCase())
                       .replace(/Guru/g, teacherTerm);
        } else {
            // Match plurals first in English
            text = text.replace(/students/g, studentTerm.toLowerCase() + 's')
                       .replace(/Students/g, studentTerm + 's')
                       .replace(/teachers/g, teacherTerm.toLowerCase() + 's')
                       .replace(/Teachers/g, teacherTerm + 's')
                       .replace(/student/g, studentTerm.toLowerCase())
                       .replace(/Student/g, studentTerm)
                       .replace(/teacher/g, teacherTerm.toLowerCase())
                       .replace(/Teacher/g, teacherTerm);
        }
        return text;
    };

    next();
};
