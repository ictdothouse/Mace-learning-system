require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const i18nMiddleware = require('./middleware/i18n');

// 1. IMPORT ROUTES
const athleteRoutes = require('./routes/athlete').router; 
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const levelRoutes = require('./routes/levels');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// KONFIGURASI PENTING HOSTINGER & PROXY
// ==========================================

// 2. FIX: Set Trust Proxy WAJIB untuk Hostinger
app.set('trust proxy', 1);

// 3. Setup View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 4. Middleware Dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4b. i18n Dwibahasa — detect bahasa dari cookie
app.use(i18nMiddleware);

// 4c. Route tukar bahasa (boleh guna dari mana-mana halaman)
app.post('/set-language', (req, res) => {
    const { lang } = req.body;
    const supported = ['ms', 'en'];
    const selected = supported.includes(lang) ? lang : 'ms';
    // Simpan dalam cookie selama 30 hari
    res.cookie('lang', selected, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: false });
    // Redirect kembali ke halaman asal
    const referer = req.headers.referer || '/';
    res.redirect(referer);
});

// 5. Static Files
app.use(express.static(path.join(__dirname, 'public')));

// 6. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Terlalu banyak permintaan, sila cuba lagi sebentar lagi.'
});
app.use(limiter);

// ==========================================
// SAMBUNGAN DATABASE & START SERVER
// ==========================================

let isDbConnected = false;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ DB Connected successfully to MongoDB Atlas');
        isDbConnected = true;
        startServer(); 
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
        console.log('⚠️ Server tidak dapat dimulakan tanpa database.');
    });

function startServer() {
    if (!isDbConnected) return;

    // 7. Konfigurasi Session
    app.use(session({
        secret: process.env.SESSION_SECRET || 'rahsia_default_yang_perlu_ditukar',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 24 * 60 * 60 
        }),
        cookie: {
            secure: true, 
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        }
    }));

    // 8. AKTIFKAN ROUTES
    app.use('/', athleteRoutes);
    app.use('/admin-mace', adminRoutes);
    app.use('/auth', authRoutes);
    app.use('/teacher', teacherRoutes);
    app.use('/api/levels', levelRoutes);
    app.use('/api/progress', progressRoutes);

    // 9. Handle 404
    app.use((req, res) => {
        res.status(404).send('Halaman tidak dijumpai (404). Sila kembali ke <a href="/">Dashboard</a>.');
    });

    // 10. Start Server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin-mace`);
        console.log(`🏠 Main App: http://localhost:${PORT}/`);
    });
}
