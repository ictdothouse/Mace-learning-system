// routes/admin.js - VERSI LENGKAP + MIGRATION + HARDCODED AUTH (SEMENTARA)
const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const Lesson = require('../models/Lesson');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// ==========================================
// 1. SETUP MULTER (UPLOAD FILES)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// ==========================================
// 2. BASIC AUTH MIDDLEWARE (HARDCODED SEMENTARA)
// ==========================================
const basicAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    // --- SETTING LOGIN SEMENTARA ---
    const VALID_USER = 'adminmace';
    const VALID_PASS = 'MaceSUKMA2024!'; 
    // -------------------------------

    // Debug log (akan keluar di log Hostinger)
    console.log(`[Admin Auth] Cubaa Login: User=${login}, Pass=${password}`);

    if (login === VALID_USER && password === VALID_PASS) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="MSN Admin Panel"');
    res.status(401).send('Akses Ditolak. Username atau Password salah.');
};

// Gunakan auth untuk semua route dalam file ini
router.use(basicAuth);

// ==========================================
// 3. ROUTE DASHBOARD UTAMA
// ==========================================
router.get('/', async (req, res) => {
    try {
        const total = await Athlete.countDocuments();
        const passed = await Athlete.countDocuments({ currentStage: 4 });
        const byState = await Athlete.aggregate([
            { $group: { _id: '$negeriWakil', total: { $sum: 1 }, passed: { $sum: { $cond: [{ $eq: ['$currentStage', 4] }, 1, 0] } } } },
            { $sort: { total: -1 } }
        ]);
        const athletes = await Athlete.find().sort({ createdAt: -1 }).limit(100);
        res.render('admin', { page: 'dashboard', total, passed, learning: total - passed, byState, athletes, msg: req.query.msg || null, file: req.query.file || null });
    } catch (err) { 
        console.error(err);
        res.send('Ralat memuatkan dashboard: ' + err.message); 
    }
});

// ==========================================
// 4. ROUTE PENGURUSAN MODUL (LESSONS)
// ==========================================
router.get('/manage-lessons', async (req, res) => {
    try {
        const lessons = await Lesson.find().sort({ order: 1 });
        res.render('admin-manage-lessons', { page: 'manage-lessons', lessons, msg: req.query.msg || null });
    } catch (err) { res.status(500).send('Ralat memuatkan senarai modul.'); }
});

router.get('/manage-lessons/new', async (req, res) => {
    try { res.render('admin-edit-lesson', { page: 'manage-lessons', lesson: null }); }
    catch (err) { res.status(500).send('Ralat memuatkan borang.'); }
});

router.get('/manage-lessons/edit/:id', async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.redirect('/admin-mace/manage-lessons?msg=not_found');
        res.render('admin-edit-lesson', { page: 'manage-lessons', lesson });
    } catch (err) { res.status(500).send('Ralat memuatkan borang.'); }
});

router.post('/manage-lessons/new', async (req, res) => {
    try {
        const { title, contentHtml, videoUrl, passMark, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        
        const maxOrder = await Lesson.findOne().sort('-order');
        await Lesson.create({ 
            title, contentHtml, videoUrl, 
            passMark: parseInt(passMark) || 80, 
            quizQuestions, 
            order: (maxOrder ? maxOrder.order : 0) + 1 
        });
        res.redirect('/admin-mace/manage-lessons?msg=success');
    } catch (err) { res.status(500).send('Ralat menyimpan modul: ' + err.message); }
});

router.post('/manage-lessons/edit/:id', async (req, res) => {
    try {
        const { title, contentHtml, videoUrl, passMark, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        
        await Lesson.findByIdAndUpdate(req.params.id, { 
            title, contentHtml, videoUrl, 
            passMark: parseInt(passMark) || 80, 
            quizQuestions 
        });
        res.redirect('/admin-mace/manage-lessons?msg=success');
    } catch (err) { res.status(500).send('Ralat menyimpan modul.'); }
});

router.post('/manage-lessons/delete/:id', async (req, res) => {
    try {
        await Lesson.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/manage-lessons?msg=deleted');
    } catch (err) { res.redirect('/admin-mace/manage-lessons?msg=delete_error'); }
});

// ==========================================
// 5. 🚀 ROUTE MIGRATION (PENTING!)
// ==========================================
router.get('/migrate-lessons', async (req, res) => {
    try {
        const existingCount = await Lesson.countDocuments();
        if (existingCount > 0) {
            return res.send(`
                <div style="font-family:sans-serif; padding:20px;">
                    <h2>⚠️ Migration Tidak Perlu</h2>
                    <p>Terdapat ${existingCount} modul sudah wujud dalam database.</p>
                    <p>Jika anda ingin reset, sila padam data di MongoDB Atlas secara manual.</p>
                    <a href="/admin-mace/manage-lessons" style="display:inline-block; margin-top:10px; padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">Ke Pengurusan Modul</a>
                </div>
            `);
        }

        // Import fungsi data statik dari athlete.js
        // Nota: Pastikan athlete.js export getLessonsWithQuiz
        const { getLessonsWithQuiz } = require('./athlete'); 
        
        // Panggil fungsi (iaitu async)
        const staticData = await getLessonsWithQuiz();

        if (!staticData || staticData.length === 0) {
            return res.status(500).send('❌ Tiada data statik ditemui dalam athlete.js. Sila semak fungsi getLessonsWithQuiz.');
        }

        let successCount = 0;
        res.write('<div style="font-family:sans-serif; padding:20px;"><h2>🔄 Sedang menjalankan Migration...</h2><ul>');

        for (let i = 0; i < staticData.length; i++) {
            const item = staticData[i];
            const lessonData = {
                title: item.title, 
                contentHtml: item.content?.rendered || '', 
                videoUrl: item.videoFile || '',
                passMark: 80, 
                order: item.id,
                quizQuestions: (item.quiz || []).map(q => ({ 
                    text: q.q, 
                    options: q.opts, 
                    correctIndex: q.ans, 
                    category: 'Default' 
                }))
            };
            
            await Lesson.create(lessonData);
            successCount++;
            res.write(`<li>✅ Modul ${i+1}: ${item.title} berjaya dipindahkan.</li>`);
        }

        res.write(`</ul><h3>✅ Migration Berjaya! ${successCount} modul dipindahkan.</h3>`);
        res.write('<a href="/admin-mace/manage-lessons">Kembali ke Pengurusan Modul</a></div>');
        res.end();

    } catch (err) { 
        console.error(err);
        res.status(500).send(`❌ Ralat Migration: ${err.message}`); 
    }
});

// ==========================================
// 6. ROUTE LAIN-LAIN (SETTINGS, USERS, CSV)
// ==========================================
router.get('/settings', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        let uploadedFiles = [];
        if (fs.existsSync(uploadsDir)) uploadedFiles = fs.readdirSync(uploadsDir).map(f => ({ name: f, size: (fs.statSync(path.join(uploadsDir, f)).size / 1024).toFixed(1) + ' KB' }));
        res.render('admin', { page: 'settings', uploadedFiles, msg: req.query.msg || null, file: req.query.file || null });
    } catch (err) { res.send('Error loading settings'); }
});

router.post('/upload-data', upload.single('dataFile'), async (req, res) => {
    try {
        if (!req.file) return res.redirect('/admin-mace/settings?msg=error_no_file');
        res.redirect('/admin-mace/settings?msg=success_upload&file=' + encodeURIComponent(req.file.filename));
    } catch (err) { res.redirect('/admin-mace/settings?msg=error_upload'); }
});

router.get('/users', async (req, res) => {
    try {
        let query = {};
        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            query.$or = [{ fullName: regex }, { icNumber: regex }];
        }
        if (req.query.state && req.query.state !== 'all') query.negeriWakil = req.query.state;
        const statesList = await Athlete.distinct('negeriWakil').sort();
        const athletes = await Athlete.find(query).sort({ fullName: 1 }).limit(50);
        res.render('admin', { page: 'users', athletes, statesList, currentSearch: req.query.search || '', currentState: req.query.state || 'all', msg: req.query.msg || null });
    } catch (err) { res.send('Error loading users'); }
});

router.post('/users/update/:id', async (req, res) => {
    try {
        const { fullName, icNumber, jantina, umur, negeriWakil } = req.body;
        const existing = await Athlete.findOne({ icNumber, _id: { $ne: req.params.id } });
        if (existing) return res.redirect(`/admin-mace/users?msg=ic_exists`);
        await Athlete.findByIdAndUpdate(req.params.id, { fullName, icNumber, jantina, umur, negeriWakil });
        res.redirect('/admin-mace/users?msg=profile_updated');
    } catch (err) { res.redirect('/admin-mace/users?msg=update_error'); }
});

router.post('/users/reset/:id', async (req, res) => {
    try {
        await Athlete.findByIdAndUpdate(req.params.id, { currentStage: 1, quizScores: { quiz1: 0, quiz2: 0, quiz3: 0 }, watchedLessons: [], completedAt: null });
        res.redirect('/admin-mace/users?msg=reset_success');
    } catch (err) { res.redirect('/admin-mace/users?msg=reset_error'); }
});

router.get('/download', async (req, res) => {
    try {
        const athletes = await Athlete.find().lean();
        const bom = '\uFEFF';
        const headers = ['Nama', 'No. IC', 'Jantina', 'Umur', 'Negeri', 'K1', 'K2', 'K3', 'Status', 'Tarikh'];
        let csv = bom + headers.join(',') + '\n';
        athletes.forEach(a => {
            const status = a.currentStage >= 4 ? 'Lulus' : `Stage ${a.currentStage}`;
            const date = a.completedAt ? new Date(a.completedAt).toLocaleDateString('ms-MY') : '-';
            const name = `"${(a.fullName || '').replace(/"/g, '""')}"`;
            csv += [name, a.icNumber, a.jantina, a.umur, a.negeriWakil, a.quizScores?.quiz1||0, a.quizScores?.quiz2||0, a.quizScores?.quiz3||0, status, date].join(',') + '\n';
        });
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`Data-Atlet-${Date.now()}.csv`);
        res.send(csv);
    } catch (err) { res.send('Error generating CSV'); }
});

module.exports = router;
