require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const rateLimit = require('express-rate-limit');

// 1. IMPORT ROUTES (Wajib buang tanda // di sini)
const adminRoutes = require('./routes/admin'); 
// Jika ada route lain (contoh: auth), import juga di sini
// const authRoutes = require('./routes/auth'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 2. FIX: Set Trust Proxy WAJIB untuk Hostinger
app.set('trust proxy', 1);

// 3. Middleware Dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Konfigurasi Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// 5. Sambungan MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ DB Connected successfully');
        startServer(); // Hanya start server bila DB connect
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
        console.log('Server tidak dapat dimulakan tanpa database.');
    });

function startServer() {
    // 6. Konfigurasi Session
    app.use(session({
        secret: process.env.SESSION_SECRET || 'rahsia_sulit_hostinger',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 24 * 60 * 60 
        }),
        cookie: {
            secure: true, // Wajib true jika guna HTTPS
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }
    }));

    // 7. AKTIFKAN ROUTES (Buang tanda // di sini)
    app.use('/admin-mace', adminRoutes);
    
    // Contoh route lain jika ada
    // app.use('/api', authRoutes);

    // Route ujian utama
    app.get('/', (req, res) => {
        res.send('Server Running & DB Connected! <br> <a href="/admin-mace">Go to Admin</a>');
    });

    // 8. Start Server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin-mace`);
    });
}
