require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const i18nMiddleware = require('./middleware/i18n');
const brandingMiddleware = require('./middleware/branding');

// 0. WAJIB: Pastikan SESSION_SECRET dikonfigurasikan dalam .env
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('❌ FATAL: SESSION_SECRET tidak dikonfigurasikan atau terlalu pendek (min 32 chars) dalam .env');
    console.error('   Sila jana dengan: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    process.exit(1);
}

// 1. IMPORT ROUTES
const athleteRoutes = require('./routes/athlete').router; 
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const levelRoutes = require('./routes/levels');
const progressRoutes = require('./routes/progress');
const apiRoutes = require('./routes/api');

// ⚡ Queue Control Middleware (tanpa Redis — in-memory)
const { concurrencyGuard, concurrencyGuardApi, queueStatusHandler } = require('./middleware/concurrency');

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
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false
}));

// Serve React SPA client/dist static assets (JS/CSS) immediately (Light Speed)
const reactDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(reactDistPath)) {
    app.use('/assets', express.static(path.join(reactDistPath, 'assets'), {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        immutable: true
    }));
    app.use(express.static(reactDistPath, {
        index: false,
        maxAge: 365 * 24 * 60 * 60 * 1000
    }));
}

// 5. Static Files with 1-Year Browser & CDN Caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 365 * 24 * 60 * 60 * 1000
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: 365 * 24 * 60 * 60 * 1000
}));

// Tambah CSP Frame-Ancestors untuk menyokong embedding di WordPress secara selamat
app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_EMBED_ORIGINS || 'https://www.nsc.gov.my,https://modulatlitmace.com';
    const origins = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);
    if (origins.length > 0) {
        res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origins.join(' ')}`);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4b. i18n Dwibahasa — detect bahasa dari cookie
app.use(i18nMiddleware);

// 4c. Branding - inject branding info to res.locals
app.use(brandingMiddleware);

// 4d. Route tukar bahasa (boleh guna dari mana-mana halaman)
app.post('/set-language', (req, res) => {
    const { lang } = req.body;
    const supported = ['ms', 'en'];
    const selected = supported.includes(lang) ? lang : 'ms';
    // Simpan dalam cookie selama 30 hari
    res.cookie('lang', selected, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: false, path: '/' });
    // Redirect kembali ke halaman asal
    const referer = req.headers.referer || '/';
    res.redirect(referer);
});

// 6. Rate Limiting — Dinaikkan untuk handle 8K atlit blast serentak
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500,  // ⚡ Dinaikkan dari 100 → 500 (atlit biasa guna ~50-80 req/15min)
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Terlalu banyak permintaan, sila cuba lagi sebentar lagi.'
});
app.use(limiter);

// ==========================================
// SAMBUNGAN DATABASE & START SERVER
// ==========================================

let isDbConnected = false;

mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 50,                    // ⚡ Hadkan pool ke 50 (Sesuai untuk VPS sendiri berbanding Hostinger)
    serverSelectionTimeoutMS: 5000,     // ⚡ Timeout cepat jika DB tak respons
    socketTimeoutMS: 20000,             // ⚡ Turunkan socket timeout ke 20s untuk fail-fast
    heartbeatFrequencyMS: 10000,        // ⚡ Ping setiap 10s untuk elak drop connection
})
    .then(async () => {
        console.log('✅ DB Connected successfully to MongoDB Atlas');
        isDbConnected = true;
        
        // Seed sports database if empty
        try {
            const Sport = require('./models/Sport');
            const count = await Sport.countDocuments();
            if (count === 0) {
                const initialSports = [
                    'Akuatik (Renang)',
                    'Akuatik (Terjun)',
                    'Memanah (Archery)',
                    'Olahraga (Athletics)',
                    'Badminton',
                    'Bola Keranjang (Basketball)',
                    'Tinju (Boxing)',
                    'Kanu (Canoeing)',
                    'Berbasikal (Cycling)',
                    'Bola Sepak (Football)',
                    'Golf',
                    'Gimnastik (Gymnastics)',
                    'Gimrama (Rhythmic Gymnastics)',
                    'Bola Baling (Handball)',
                    'Hoki (Hockey)',
                    'Judo',
                    'Karate',
                    'Lawn Bowls',
                    'Skuash (Squash)',
                    'Ping Pong (Table Tennis)',
                    'Taekwondo',
                    'Tenis (Tennis)',
                    'Tenpin Boling (Bowling)',
                    'Layar (Sailing)',
                    'Menembak (Shooting)',
                    'Silat (Pencak Silat)',
                    'Angkat Berat (Weightlifting)',
                    'Wushu',
                    'Bola Jaring (Netball)',
                    'Ragbi (Rugby)',
                    'Bola Tampar (Volleyball)',
                    'Sepak Takraw',
                    'E-Sukan (Esports)',
                    'Catur (Chess)',
                    'Petanque',
                    'Kabaddi',
                    'Silambam',
                    'Muay Thai',
                    'Kriket (Cricket)',
                    'Memanah Tradisional'
                ].map(name => ({ name }));
                await Sport.insertMany(initialSports);
                console.log('🌱 Successfully seeded initial sports fields.');
            }
        } catch (err) {
            console.error('❌ Error seeding sports:', err.message);
        }

        // ==========================================
        // AUTO-MIGRATE LEGACY LESSONS TO MODULE
        // ==========================================
        try {
            const Module = require('./models/Module');
            const Lesson = require('./models/Lesson');
            
            // Check if there are orphan lessons without a valid ObjectId moduleId
            const orphanLessons = await Lesson.countDocuments({
                $or: [
                    { moduleId: { $exists: false } },
                    { moduleId: null }
                ]
            });
            
            if (orphanLessons > 0) {
                console.log(`⚠️ Jumpa ${orphanLessons} lesson lama tanpa modul! Menjalankan auto-migration...`);
                let parentModule = await Module.findOne({ title: 'PLAY SAFE WIN STRONG' });
                if (!parentModule) {
                    parentModule = await Module.findOne({ title: 'Kurikulum Utama MACE' });
                }
                
                if (!parentModule) {
                    parentModule = await Module.create({
                        title: 'PLAY SAFE WIN STRONG',
                        description: 'Modul pengenalan untuk keselamatan atlet dan sukan berintegriti.',
                        title_en: 'PLAY SAFE WIN STRONG',
                        description_en: 'Introductory module for athlete safety and sports integrity.',
                        order: 1,
                        isActive: true
                    });
                }
                
                // Update all orphan lessons to use this new parent module
                const result = await Lesson.updateMany(
                    { 
                        $or: [
                            { moduleId: { $exists: false } },
                            { moduleId: null }
                        ]
                    },
                    { $set: { moduleId: parentModule._id } }
                );
                console.log(`✅ Berjaya memindahkan ${result.modifiedCount} lesson lama ke Modul "${parentModule.title}".`);
            } else {
                // Walaupun tiada orphan lesson, pastikan Modul 1 wujud jika database mempunyai lesson
                const lessonCount = await Lesson.countDocuments();
                if (lessonCount > 0) {
                    const moduleCount = await Module.countDocuments();
                    if (moduleCount === 0) {
                        console.log('⚠️ Lesson wujud tetapi tiada rekod modul! Mencipta modul lalai...');
                        const parentModule = await Module.create({
                            title: 'PLAY SAFE WIN STRONG',
                            description: 'Modul pengenalan untuk keselamatan atlet dan sukan berintegriti.',
                            order: 1,
                            isActive: true
                        });
                        await Lesson.updateMany({}, { $set: { moduleId: parentModule._id } });
                    }
                }
            }
        } catch (err) {
            console.error('❌ Ralat semasa auto-migration modul:', err.message);
        }

        // Seed default CMS Page for 'modul' if it doesn't exist
        try {
            const Page = require('./models/Page');
            const modulPage = await Page.findOne({ slug: 'modul' });
            if (!modulPage) {
                await Page.create({
                    title: 'Modul',
                    title_en: 'Modules',
                    slug: 'modul',
                    content: '<p>Halaman Modul e-Learning MACE.</p>',
                    content_en: '<p>MACE e-Learning Modules Page.</p>',
                    isPublished: true,
                    showInNavigation: true,
                    navigationOrder: 1,
                    customTemplate: 'modules',
                    modulesConfig: [
                        {
                            title: 'CAREER BOOST',
                            statusText: 'Akan Datang',
                            imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600&auto=format&fit=crop'
                        },
                        {
                            title: 'POCKET POWER',
                            statusText: 'Akan Datang',
                            imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop'
                        },
                        {
                            title: 'MODE ON!',
                            statusText: 'Akan Datang',
                            imageUrl: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?q=80&w=600&auto=format&fit=crop'
                        },
                        {
                            title: 'SMART ATHLETE',
                            statusText: 'Akan Datang',
                            imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop'
                        }
                    ]
                });
                console.log('🌱 Seeded default CMS page: Modul');
            }
            
            // Seed default CMS Page for 'hubungi-kami' if it doesn't exist
            const hubungiPage = await Page.findOne({ slug: 'hubungi-kami' });
            if (!hubungiPage) {
                await Page.create({
                    title: 'Hubungi Kami',
                    title_en: 'Contact Us',
                    slug: 'hubungi-kami',
                    content: '<p>Hubungi kami untuk sebarang pertanyaan.</p>',
                    content_en: '<p>Contact us for any inquiries.</p>',
                    isPublished: true,
                    showInNavigation: true,
                    navigationOrder: 2,
                    customTemplate: 'contact',
                    contactConfig: {
                        bannerTitle: 'Hubungi',
                        bannerImage: 'https://images.unsplash.com/photo-1540747737956-37872f747802?q=80&w=1200&auto=format&fit=crop',
                        description: 'Sebarang pertanyaan atau maklumbalas, hubungi kami menerusi email :',
                        email: 'mace@nsc.gov.my',
                        imageUrl: ''
                    }
                });
                console.log('🌱 Seeded default CMS page: Hubungi Kami');
            }
        } catch (err) {
            console.error('❌ Error seeding CMS pages:', err.message);
        }

        startServer(); 
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err.message);
        console.log('⚠️ Server tidak dapat dimulakan tanpa database.');
    });

function startServer() {
    if (!isDbConnected) return;

    // Fast 204 response for favicon to avoid redundant 404 routing overhead
    app.get('/favicon.ico', (req, res) => res.status(204).end());

    // 🔐 ⚡ Debug status endpoint to diagnose live server performance issues
    app.get('/api/debug-status', async (req, res) => {
        try {
            const dbStatus = mongoose.connection.readyState;
            const statusNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
            
            let dbPing = 'N/A';
            if (dbStatus === 1) {
                const start = Date.now();
                await mongoose.connection.db.admin().ping();
                dbPing = `${Date.now() - start}ms`;
            }

            res.json({
                status: 'ok',
                uptime: `${process.uptime().toFixed(1)}s`,
                memory: process.memoryUsage(),
                dbStatus: statusNames[dbStatus] || dbStatus,
                dbPing,
                nodeVersion: process.version,
                env: process.env.NODE_ENV
            });
        } catch (err) {
            res.status(500).json({ error: err.message, stack: err.stack });
        }
    });

    // 7. AKTIFKAN SPA ROUTES SEBELUM SESSION (SUPER FAST HTML DELIVERY)
    if (fs.existsSync(reactDistPath)) {
        // Serve index.html for main athlete routes (client-side routing fallback)
        const spaPaths = ['/', '/login', '/dashboard', '/lesson/:id', '/module/:id', '/p/:slug', '/page/:slug'];
        let cachedIndexHtml = null;
        
        spaPaths.forEach(routePath => {
            app.get(routePath, (req, res) => {
                // Set Cache-Control header for static index.html to allow Cloudflare Edge caching (ultra-fast TTFB)
                res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600'); // Browser: 10 mins, CDN/Cloudflare Edge: 1 hour
                
                try {
                    if (!cachedIndexHtml) {
                        const indexHtmlPath = path.join(reactDistPath, 'index.html');
                        if (fs.existsSync(indexHtmlPath)) {
                            cachedIndexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
                        }
                    }
                    
                    if (cachedIndexHtml) {
                        const branding = res.locals.branding || {};
                        const bannerImg = branding.homeBannerImage || 'https://images.unsplash.com/photo-1540747737956-37872f747802?q=80&w=1200&auto=format&fit=crop';
                        
                        let html = cachedIndexHtml;
                        if (bannerImg) {
                            // Inject preload tag at the top of <head> so browser downloads hero image immediately (removes LCP delay)
                            const preloadTag = `<link rel="preload" as="image" href="${bannerImg}">`;
                            html = html.replace('<head>', `<head>\n    ${preloadTag}`);
                        }
                        return res.send(html);
                    }
                } catch (err) {
                    console.error('SPA serve error, falling back to static:', err.message);
                }
                
                res.sendFile(path.join(reactDistPath, 'index.html'));
            });
        });
    }

    // 8. Konfigurasi Session
    const sessionMiddleware = session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
            ttl: 24 * 60 * 60 
        }),
        cookie: {
            secure: process.env.SECURE_COOKIE === 'true', // Mesti 'true' jika nak embed dalam iframe HTTPS
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: process.env.SECURE_COOKIE === 'true' ? 'none' : 'lax'
        }
    });

    // ⚡ Bypass session DB lookups for public/cached APIs to prevent 20s bottlenecks!
    app.use((req, res, next) => {
        const publicApiPrefixes = ['/api/branding', '/api/locales', '/api/sports', '/api/pages'];
        if (publicApiPrefixes.some(prefix => req.path.startsWith(prefix))) {
            return next(); // Skip session!
        }
        return sessionMiddleware(req, res, next);
    });

    // 9. AKTIFKAN API & VIEW ROUTES
    if (fs.existsSync(reactDistPath)) {
        // ⚡ Register athleteRoutes so backend rendering routes like /certificate/... can be accessed
        app.use('/', athleteRoutes);
    } else {
        // Fallback to legacy EJS views if client/dist is not built
        // ⚡ concurrencyGuard: kawal akses concurrent ke dashboard/lesson
        // Halaman entry (/ms, /en, /access) tidak dihadkan — hanya selepas login
        app.use('/dashboard', concurrencyGuard, athleteRoutes);
        app.use('/lesson', concurrencyGuard, athleteRoutes);
        app.use('/', athleteRoutes);
    }

    app.use('/admin-mace', adminRoutes);
    app.use('/auth', authRoutes);
    app.use('/teacher', teacherRoutes);
    app.use('/api/levels', levelRoutes);

    // ⚡ Queue Status Endpoint — dipanggil oleh waiting-room.ejs setiap 15 saat
    // Ringan: tiada DB query, hanya semak in-memory counter
    app.get('/api/queue-status', queueStatusHandler);

    // ⚡ Progress API dilindungi oleh concurrencyGuardApi
    app.use('/api/progress', concurrencyGuardApi, progressRoutes);
    app.use('/api', apiRoutes);

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
