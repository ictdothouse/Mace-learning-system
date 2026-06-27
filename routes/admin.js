// routes/admin.js - VERSI LENGKAP & DIBETULKAN
const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const Lesson = require('../models/Lesson');
const CertificateTemplate = require('../models/CertificateTemplate');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Setup Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Basic Auth Middleware
const basicAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="MSN Admin Panel"');
    res.status(401).send('Akses Ditolak.');
};
router.use(basicAuth);

// GET: Dashboard Utama
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
    } catch (err) { res.send('Ralat memuatkan dashboard.'); }
});

// GET: Tetapan Sistem
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

// GET: Pengurusan Pengguna
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

// 🆕 PENGURUSAN MODUL & KUIZ (ROUTE DIBETULKAN)
router.get('/manage-lessons', async (req, res) => {
    try {
        const lessons = await Lesson.find().sort({ order: 1 });
        res.render('admin-manage-lessons', { page: 'manage-lessons', lessons, msg: req.query.msg || null });
    } catch (err) { res.status(500).send('Ralat memuatkan senarai modul.'); }
});

// Route untuk Cipta Modul Baharu
router.get('/manage-lessons/new', async (req, res) => {
    try { res.render('admin-edit-lesson', { page: 'manage-lessons', lesson: null }); }
    catch (err) { res.status(500).send('Ralat memuatkan borang.'); }
});

// Route untuk Edit Modul Sedia Ada
router.get('/manage-lessons/edit/:id', async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.redirect('/admin-mace/manage-lessons?msg=not_found');
        res.render('admin-edit-lesson', { page: 'manage-lessons', lesson });
    } catch (err) { res.status(500).send('Ralat memuatkan borang.'); }
});

// POST untuk cipta baru
router.post('/manage-lessons/new', async (req, res) => {
    try {
        const { title, contentHtml, videoUrl, passMark, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        const maxOrder = await Lesson.findOne().sort('-order');
        await Lesson.create({ title, contentHtml, videoUrl, passMark: parseInt(passMark) || 80, quizQuestions, order: (maxOrder ? maxOrder.order : 0) + 1 });
        res.redirect('/admin-mace/manage-lessons?msg=success');
    } catch (err) { res.status(500).send('Ralat menyimpan modul.'); }
});

// POST untuk update sedia ada
router.post('/manage-lessons/edit/:id', async (req, res) => {
    try {
        const { title, contentHtml, videoUrl, passMark, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        await Lesson.findByIdAndUpdate(req.params.id, { title, contentHtml, videoUrl, passMark: parseInt(passMark) || 80, quizQuestions });
        res.redirect('/admin-mace/manage-lessons?msg=success');
    } catch (err) { res.status(500).send('Ralat menyimpan modul.'); }
});

// POST: Padam Modul
router.post('/manage-lessons/delete/:id', async (req, res) => {
    try {
        await Lesson.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/manage-lessons?msg=deleted');
    } catch (err) { res.redirect('/admin-mace/manage-lessons?msg=delete_error'); }
});

// MIGRATION DATA STATIK KE DATABASE
router.get('/migrate-lessons', async (req, res) => {
    try {
        const existingCount = await Lesson.countDocuments();
        if (existingCount > 0) return res.send(`❌ Migration sudah dijalankan. Terdapat ${existingCount} modul.`);
        const { getLessonsWithQuiz } = require('./athlete'); 
        const staticData = getLessonsWithQuiz();
        if (!staticData || staticData.length === 0) return res.status(500).send('❌ Tiada data statik ditemui.');
        let successCount = 0;
        for (let i = 0; i < staticData.length; i++) {
            const item = staticData[i];
            // ✅ PEMBETULAN SINTAKS: q => ({ ... }) tanpa ruang
            const lessonData = {
                title: item.title, contentHtml: item.content?.rendered || '', videoUrl: item.videoFile || '',
                passMark: 80, order: item.id,
                quizQuestions: (item.quiz || []).map(q => ({ text: q.q, options: q.opts, correctIndex: q.ans, category: 'Default' }))
            };
            await Lesson.create(lessonData);
            successCount++;
        }
        res.send(`✅ Migration Berjaya! ${successCount} modul dipindahkan.`);
    } catch (err) { res.status(500).send(`❌ Ralat: ${err.message}`); }
});

// DOWNLOAD CSV
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

// ==========================================
// PENGURUSAN TEMPLATE SIJIL
// ==========================================

// GET: Halaman Template Sijil
router.get('/templates', async (req, res) => {
    try {
        const templates = await CertificateTemplate.find().sort({ createdAt: -1 });
        const activeTemplate = templates.find(t => t.isActive) || templates[0];
        res.render('admin', { page: 'templates', templates, activeTemplate, msg: req.query.msg || null });
    } catch (err) { 
        console.error('Templates Error:', err);
        res.status(500).send('Ralat memuatkan template sijil.'); 
    }
});

// POST: Cipta Template Baru
router.post('/templates/create', upload.single('backgroundImage'), async (req, res) => {
    try {
        const { 
            name, title, showTitle, subtitle, showSubtitle, courseName, showCourseName, 
            description, showDescription, showAthleteName, showIcNumber, showNegeri, 
            showDate, signatoryName, showSignatory, signatoryTitle,
            primaryColor, secondaryColor, accentColor, backgroundColor, fontFamily,
            showBorder, showLogo, logoUrl, logoPosition, borderStyle, borderColor, borderWidth,
            backgroundImageType, backgroundImageUrl, backgroundR2Key, backgroundOpacity
        } = req.body;
        
        // Parse elements JSON or use defaults
        let elements = {};
        if (req.body.elementsJson) {
            try { elements = JSON.parse(req.body.elementsJson); } catch(e) {}
        }
        
        const templateData = {
            name,
            title,
            showTitle: showTitle === 'on',
            subtitle,
            showSubtitle: showSubtitle === 'on',
            courseName,
            showCourseName: showCourseName === 'on',
            description,
            showDescription: showDescription === 'on',
            showAthleteName: showAthleteName === 'on',
            showIcNumber: showIcNumber === 'on',
            showNegeri: showNegeri === 'on',
            showDate: showDate === 'on',
            signatoryName,
            showSignatory: showSignatory === 'on',
            signatoryTitle,
            primaryColor,
            secondaryColor,
            accentColor,
            backgroundColor,
            fontFamily,
            showBorder: showBorder === 'on',
            showLogo: showLogo === 'on',
            logoUrl,
            logoPosition,
            borderStyle,
            borderColor,
            borderWidth: parseInt(borderWidth) || 3,
            backgroundImageType,
            backgroundImageUrl,
            backgroundR2Key,
            backgroundOpacity: parseFloat(backgroundOpacity) || 1,
            elements,
            isActive: false
        };
        
        // Handle file upload to R2
        if (req.file && backgroundImageType === 'r2') {
            // Upload to R2 would go here
            templateData.backgroundR2Key = `cert-bg-${Date.now()}-${req.file.originalname}`;
        }
        
        await CertificateTemplate.create(templateData);
        res.redirect('/admin-mace/templates?msg=template_created');
    } catch (err) {
        console.error('Create Template Error:', err);
        res.redirect('/admin-mace/templates?msg=create_error');
    }
});

// POST: Update Template
router.post('/templates/update/:id', upload.single('backgroundImage'), async (req, res) => {
    try {
        const { 
            name, title, showTitle, subtitle, showSubtitle, courseName, showCourseName,
            description, showDescription, showAthleteName, showIcNumber, showNegeri,
            showDate, signatoryName, showSignatory, signatoryTitle,
            primaryColor, secondaryColor, accentColor, backgroundColor, fontFamily,
            showBorder, showLogo, logoUrl, logoPosition, borderStyle, borderColor, borderWidth,
            backgroundImageType, backgroundImageUrl, backgroundR2Key, backgroundOpacity,
            setAsActive
        } = req.body;
        
        // Parse elements JSON or use defaults
        let elements = {};
        if (req.body.elementsJson) {
            try { elements = JSON.parse(req.body.elementsJson); } catch(e) {}
        }
        
        const updateData = {
            name,
            title,
            showTitle: showTitle === 'on',
            subtitle,
            showSubtitle: showSubtitle === 'on',
            courseName,
            showCourseName: showCourseName === 'on',
            description,
            showDescription: showDescription === 'on',
            showAthleteName: showAthleteName === 'on',
            showIcNumber: showIcNumber === 'on',
            showNegeri: showNegeri === 'on',
            showDate: showDate === 'on',
            signatoryName,
            showSignatory: showSignatory === 'on',
            signatoryTitle,
            primaryColor,
            secondaryColor,
            accentColor,
            backgroundColor,
            fontFamily,
            showBorder: showBorder === 'on',
            showLogo: showLogo === 'on',
            logoUrl,
            logoPosition,
            borderStyle,
            borderColor,
            borderWidth: parseInt(borderWidth) || 3,
            backgroundImageType,
            backgroundImageUrl,
            backgroundR2Key,
            backgroundOpacity: parseFloat(backgroundOpacity) || 1,
            elements
        };
        
        // Handle file upload to R2
        if (req.file && backgroundImageType === 'r2') {
            templateData.backgroundR2Key = `cert-bg-${Date.now()}-${req.file.originalname}`;
        }
        
        if (setAsActive === 'on') {
            await CertificateTemplate.setActiveTemplate(req.params.id);
        }
        
        await CertificateTemplate.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-mace/templates?msg=template_updated');
    } catch (err) {
        console.error('Update Template Error:', err);
        res.redirect('/admin-mace/templates?msg=update_error');
    }
});

// POST: Set Active Template
router.post('/templates/set-active/:id', async (req, res) => {
    try {
        await CertificateTemplate.setActiveTemplate(req.params.id);
        res.redirect('/admin-mace/templates?msg=template_activated');
    } catch (err) {
        console.error('Set Active Error:', err);
        res.redirect('/admin-mace/templates?msg=activate_error');
    }
});

// POST: Delete Template
router.post('/templates/delete/:id', async (req, res) => {
    try {
        await CertificateTemplate.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/templates?msg=template_deleted');
    } catch (err) {
        console.error('Delete Template Error:', err);
        res.redirect('/admin-mace/templates?msg=delete_error');
    }
});

module.exports = router;