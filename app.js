// app.js - VERSI PRODUCTION FINAL (NODE.JS V22 + ADMIN MACE)
require('dotenv').config();
const express = require('express');
app.set('trust proxy', 1);
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

// ==========================================
// KESELAMATAN: IMPORT SECURITY PACKAGES
// ==========================================
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ✅ IMPORT YANG BETUL UNTUK STRUKTUR EXPORT BAHARU
const { router: athleteRoutes } = require('./routes/athlete');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// KESELAMATAN: SECURITY MIDDLEWARE
// ==========================================

// Helmet.js untuk Security Headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable untuk EJS compatibility (optional)
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting - Prevent Brute Force
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minit
    max: 100, // max 100 requests per IP per window
    message: 'Terlalu banyak request. Sila cuba lagi kemudian.',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limit ke semua routes
app.use(limiter);

// Rate limit lebih ketat untuk login/access routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minit
    max: 5, // max 5 attempts per IP
    message: 'Terlalu banyak percubaan login. Sila cuba lagi kemudian.'
});

app.use('/access', authLimiter);
app.use('/admin-mace', authLimiter);

// ==========================================
// VALIDASI & KONEKSI DATABASE
// ==========================================
const dbUri = process.env.MONGO_URI; // Menggunakan nama pembolehubah dari .env anda

if (!dbUri) {
    console.error('❌ RALAT KRITIKAL: MONGO_URI tidak ditemui dalam fail .env!');
    process.exit(1);
}


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Connected'))
  .catch(err => {
      console.error('❌ DB Connection Error:', err);
      // Jangan process.exit(1) di sini jika nak server tetap hidup walaupun DB down sekejap,
      // tapi untuk login, DB mesti hidup.
  });








// ==========================================
// KONFIGURASI SESSION (CONNECT-MONGO V5)
// ==========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'sukma-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: dbUri, // Wajib guna mongoUrl untuk v5+
        ttl: 7 * 24 * 60 * 60 // Sesi bertahan 7 hari
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ==========================================
// MIDDLEWARE GLOBAL
// ==========================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setup View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve Static Files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// ROUTES UTAMA
// ==========================================
app.use('/', athleteRoutes);
app.use('/admin-mace', adminRoutes);

// 404 Handler untuk route yang tidak wujud
app.use((req, res) => {
    res.status(404).render('entry', { error: 'Halaman yang anda cari tidak dijumpai.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err.stack);
    res.status(500).send('Ralat dalaman pelayan. Sila cuba lagi sebentar.');
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin-mace`);
    console.log(`💾 Session Store: MongoDB Atlas (connect-mongo v5)`);
});
