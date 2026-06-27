require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import routes (Sesuaikan dengan nama file route anda)
// const authRoutes = require('./routes/auth'); 
// const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. FIX: Set Trust Proxy WAJIB untuk Hostinger/Reverse Proxy
// Ini menyelesaikan error 'X-Forwarded-For' dan memastikan IP user dikesan dengan betul
app.set('trust proxy', 1);

// 2. Middleware Dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Konfigurasi Rate Limiting (Dipermudah untuk elak error awal)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minit
    max: 100, // limit setiap IP ke 100 request
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// 4. Sambungan MongoDB
// Pastikan MONGO_URI ada dalam .env di Hostinger
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ DB Connected successfully');
        
        // ONLY start server AFTER DB is connected
        startServer();
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
        console.log('Server will not start until DB is connected.');
        // Jangan exit process, biarkan ia cuba lagi atau log error
    });

function startServer() {
    // 5. Konfigurasi Session (Hanya jalan bila DB connect)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'rahsia_sulit_hostinger',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 24 * 60 * 60 // 1 hari
        }),
        cookie: {
            secure: true, // WAJIB true jika guna HTTPS di Hostinger
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }
    }));

    // 6. Routes
    // Letakkan route anda di sini
    // app.use('/api', authRoutes);
    // app.use('/admin', adminRoutes);
    
    // Route contoh untuk test
    app.get('/', (req, res) => {
        res.send('Server Running & DB Connected!');
    });

    // 7. Start Server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin-mace`);
    });
}
