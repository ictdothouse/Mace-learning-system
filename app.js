require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const rateLimit = require('express-rate-limit');

// 1. IMPORT ROUTES
const adminRoutes = require('./routes/admin');
// Import route athlete jika ada (untuk handle /access)
// const athleteRoutes = require('./routes/athlete'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 2. SET TRUST PROXY (Wajib untuk Hostinger)
app.set('trust proxy', 1);

// 3. SETUP VIEW ENGINE (EJS) - PENTING!
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Pastikan folder views wujud

// 4. MIDDLEWARE DASAR
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (css, js, images) jika ada folder public
app.use(express.static(path.join(__dirname, 'public')));

// 5. RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// 6. SAMBUNGAN DB & START SERVER
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ DB Connected successfully');
        startServer();
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
    });

function startServer() {
    // 7. SESSION CONFIG
    app.use(session({
        secret: process.env.SESSION_SECRET || 'rahsia_sulit_hostinger',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 24 * 60 * 60 
        }),
        cookie: {
            secure: true, // True untuk HTTPS
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }
    }));

    // 8. DEFINISI ROUTE UTAMA (HALAMAN LOGIN/ENTRY)
    app.get('/', (req, res) => {
        // Ini akan render fail views/entry.ejs
        res.render('entry', { error: null });
    });

    // 9. ROUTE UNTUK PROSES LOGIN (ACTION FORM)
    // Anda perlu pastikan logik ini wujud sama ada di sini atau dalam router terpisah
    app.post('/access', async (req, res) => {
        try {
            const { action, fullName, icNumber, jantina, umur, negeri } = req.body;
            const Athlete = require('./models/Athlete'); // Pastikan model wujud

            if (action === 'new') {
                // Logik Daftar Baru
                const existing = await Athlete.findOne({ icNumber });
                if (existing) {
                    return res.render('entry', { error: 'No. IC telah didaftarkan. Sila guna tab "Semak Akaun".' });
                }
                
                const newAthlete = await Athlete.create({
                    fullName, icNumber, jantina, umur, negeriWakil: negeri,
                    currentStage: 1, quizScores: { quiz1: 0, quiz2: 0, quiz3: 0 }, watchedLessons: []
                });
                
                // Simpan session user baru
                req.session.userId = newAthlete._id;
                req.session.isLoggedIn = true;
                
                return res.redirect('/dashboard'); // Redirect ke dashboard atlet (pastikan route ini wujud)

            } else if (action === 'resume') {
                // Logik Login Semula
                const athlete = await Athlete.findOne({ fullName, icNumber });
                if (!athlete) {
                    return res.render('entry', { error: 'Rekod tidak dijumpai. Sila semak nama dan no. IC.' });
                }

                req.session.userId = athlete._id;
                req.session.isLoggedIn = true;
                
                return res.redirect('/dashboard'); // Redirect ke dashboard

            } else {
                return res.render('entry', { error: 'Tindakan tidak sah.' });
            }
        } catch (err) {
            console.error('Error processing access:', err);
            return res.render('entry', { error: 'Ralat sistem. Sila cuba sebentar lagi.' });
        }
    });

    // 10. AKTIFKAN ROUTE ADMIN
    app.use('/admin-mace', adminRoutes);

    // Route test dashboard ( sementara )
    app.get('/dashboard', (req, res) => {
        if (!req.session.isLoggedIn) return res.redirect('/');
        res.send('Selamat Datang ke Dashboard Atlet! (Page ini perlu dibina)');
    });

    // 11. START SERVER
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔗 Access: http://localhost:${PORT}`);
        console.log(`🔐 Admin: http://localhost:${PORT}/admin-mace`);
    });
}
