const Branding = require('../models/Branding');

// Cache to avoid querying the DB on every request
let brandingCache = null;
let lastCacheTime = 0;
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
            dashboardSubtitle: 'Statistik terkini prestasi atlit MACE secara live.'
        };
    }
}

module.exports = async function brandingMiddleware(req, res, next) {
    const now = Date.now();
    
    // Refresh cache if it's expired or doesn't exist
    if (!brandingCache || (now - lastCacheTime > CACHE_DURATION)) {
        brandingCache = await fetchBranding();
        lastCacheTime = now;
    }
    
    // Provide a way to force refresh cache (e.g., after updating settings)
    req.refreshBrandingCache = async () => {
        brandingCache = await fetchBranding();
        lastCacheTime = Date.now();
        res.locals.branding = brandingCache;
    };

    res.locals.branding = brandingCache;
    next();
};
