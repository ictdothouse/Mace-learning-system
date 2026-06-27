require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const rateLimit = require('express-rate-limit');

// 1. IMPORT ROUTES
// Perhatikan kita ambil '.router' kerana athlete.js export objek { router, getLessonsWithQuiz }
const athleteRoutes = require('./routes/athlete').router; 
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// KONFIGURASI PENTING HOSTINGER & PROXY
// ==========================================

// 2. FIX: Set Trust Proxy WAJIB untuk Hostinger (Reverse Proxy)
// Ini menyelesaikan error 'X-Forwarded-For' dan memastikan IP user dikesan
app.set('trust proxy', 1);

// 3. Setup View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 4. Middleware Dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Static Files (Jika ada css/js/images dalam folder public)
app.use(express.static(path.join(__dirname, 'public')));

// 6. Rate Limiting (Ditelahurkan sedikit untuk elak block awal)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minit
    max: 100, // limit setiap IP ke 100 request
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
        startServer(); // Hanya start server bila DB connect
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
        console.log('⚠️ Server tidak dapat dimulakan tanpa database. Semak MONGO_URI dan IP Whitelist.');
    });

function startServer() {
    if (!isDbConnected) return;

    // 7. Konfigurasi Session (Wajib selepas DB connect sebab guna MongoStore)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'rahsia_sulit_hostinger_mace_2024',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 24 * 60 * 60 // 1 hari
        }),
        cookie: {
            secure: true, // WAJIB true jika guna HTTPS di Hostinger
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        }
    }));

    // 8. AKTIFKAN ROUTES
    // Route Utama (Login, Dashboard, Lesson, Quiz) - Dari athlete.js
    app.use('/', athleteRoutes);

    // Route Admin (Pengurusan) - Dari admin.js
    app.use('/admin-mace', adminRoutes);

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
