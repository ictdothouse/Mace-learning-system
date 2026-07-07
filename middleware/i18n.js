// middleware/i18n.js - Sistem Dwibahasa (BM / EN)
const path = require('path');
const fs = require('fs');

// Load translation files sekali sahaja pada startup
const locales = {};
const localesDir = path.join(__dirname, '../locales');

try {
    locales.ms = JSON.parse(fs.readFileSync(path.join(localesDir, 'ms.json'), 'utf8'));
    locales.en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
} catch (err) {
    console.error('⚠️  i18n: Gagal memuatkan fail terjemahan:', err.message);
    locales.ms = {};
    locales.en = {};
}

const SUPPORTED_LANGS = ['ms', 'en'];
const DEFAULT_LANG = 'ms';

module.exports = function i18nMiddleware(req, res, next) {
    // Detect bahasa dari query param (?lang=xx) atau dari cookie, default ke 'ms'
    let lang = req.query.lang || (req.cookies && req.cookies.lang);

    if (!lang || !SUPPORTED_LANGS.includes(lang)) {
        lang = DEFAULT_LANG;
    } else if (req.query.lang && SUPPORTED_LANGS.includes(req.query.lang)) {
        // Jika tukar menerusi query parameter, set cookie secara automatik
        res.cookie('lang', lang, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: false, path: '/' });
    }

    const translations = locales[lang] || locales[DEFAULT_LANG];

    // Inject ke res.locals supaya semua EJS views boleh guna
    res.locals.lang = lang;
    res.locals.__ = function(key, fallback) {
        return translations[key] || fallback || key;
    };

    next();
};
