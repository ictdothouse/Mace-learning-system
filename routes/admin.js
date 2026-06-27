// routes/admin.js - VERSI LENGKAP & DIBETULKAN
const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const QuestionBank = require('../models/QuestionBank');
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

// 🆕 PENGURUSAN E-LEARNING: MODUL, LESSON & QUIZ
// GET: Dashboard E-Learning
router.get('/elearning', async (req, res) => {
    try {
        const modules = await Module.find().sort({ order: 1 });
        const lessonsCount = await Lesson.countDocuments();
        const questionsCount = await QuestionBank.countDocuments();
        res.render('admin', { 
            page: 'elearning-dashboard', 
            modules, 
            stats: { modules: modules.length, lessons: lessonsCount, questions: questionsCount },
            msg: req.query.msg || null 
        });
    } catch (err) { 
        console.error('E-Learning Dashboard Error:', err);
        res.status(500).send('Ralat memuatkan dashboard e-learning.'); 
    }
});

// ==========================================\n// PENGURUSAN MODUL\n// ==========================================\n\n// GET: Senarai Modul
router.get('/modules', async (req, res) => {
    try {
        const modules = await Module.find().sort({ order: 1 });
        res.render('admin', { page: 'modules', modules, msg: req.query.msg || null });
    } catch (err) { 
        console.error('Modules Error:', err);
        res.status(500).send('Ralat memuatkan senarai modul.'); 
    }
});

// GET: Form Cipta Modul Baru
router.get('/modules/new', async (req, res) => {
    try { 
        res.render('admin-edit-module', { page: 'modules', module: null }); 
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// GET: Form Edit Modul
router.get('/modules/edit/:id', async (req, res) => {
    try {
        const module = await Module.findById(req.params.id);
        if (!module) return res.redirect('/admin-mace/modules?msg=not_found');
        res.render('admin-edit-module', { page: 'modules', module });
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// POST: Cipta Modul Baru
router.post('/modules/new', upload.single('thumbnail'), async (req, res) => {
    try {
        const { title, description, order, isActive } = req.body;
        const moduleData = {
            title,
            description, // TinyMCE content
            order: parseInt(order) || 0,
            isActive: isActive === 'on'
        };
        
        // Handle thumbnail upload
        if (req.file) {
            moduleData.thumbnail = `/uploads/${req.file.filename}`;
        }
        
        await Module.create(moduleData);
        res.redirect('/admin-mace/modules?msg=module_created');
    } catch (err) {
        console.error('Create Module Error:', err);
        res.redirect('/admin-mace/modules?msg=create_error');
    }
});

// POST: Update Modul
router.post('/modules/edit/:id', upload.single('thumbnail'), async (req, res) => {
    try {
        const { title, description, order, isActive } = req.body;
        const updateData = {
            title,
            description,
            order: parseInt(order) || 0,
            isActive: isActive === 'on'
        };
        
        // Handle thumbnail upload
        if (req.file) {
            updateData.thumbnail = `/uploads/${req.file.filename}`;
        }
        
        await Module.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-mace/modules?msg=module_updated');
    } catch (err) {
        console.error('Update Module Error:', err);
        res.redirect('/admin-mace/modules?msg=update_error');
    }
});

// POST: Delete Modul
router.post('/modules/delete/:id', async (req, res) => {
    try {
        await Module.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/modules?msg=module_deleted');
    } catch (err) {
        console.error('Delete Module Error:', err);
        res.redirect('/admin-mace/modules?msg=delete_error');
    }
});

// ==========================================\n// PENGURUSAN LESSON\n// ==========================================\n\n// GET: Senarai Lesson untuk Modul tertentu
router.get('/lessons', async (req, res) => {
    try {
        const moduleId = req.query.moduleId;
        if (!moduleId) {
            const modules = await Module.find().sort({ title: 1 });
            return res.render('admin', { page: 'lessons-select-module', modules, msg: req.query.msg || null });
        }
        
        const lessons = await Lesson.find({ moduleId }).sort({ order: 1 }).populate('moduleId');
        const module = await Module.findById(moduleId);
        res.render('admin', { page: 'lessons', lessons, module, msg: req.query.msg || null });
    } catch (err) { 
        console.error('Lessons Error:', err);
        res.status(500).send('Ralat memuatkan senarai lesson.'); 
    }
});

// GET: Form Cipta Lesson Baru
router.get('/lessons/new', async (req, res) => {
    try {
        const modules = await Module.find().sort({ title: 1 });
        res.render('admin-edit-lesson', { page: 'lessons', lesson: null, modules, editMode: 'create' }); 
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// GET: Form Edit Lesson
router.get('/lessons/edit/:id', async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id).populate('moduleId');
        const modules = await Module.find().sort({ title: 1 });
        if (!lesson) return res.redirect('/admin-mace/lessons?msg=not_found');
        res.render('admin-edit-lesson', { page: 'lessons', lesson, modules, editMode: 'edit' });
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// POST: Cipta Lesson Baru
router.post('/lessons/new', async (req, res) => {
    try {
        const { moduleId, title, contentHtml, videoUrl, passMark, order, isActive, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        
        const lessonData = {
            moduleId,
            title,
            contentHtml, // TinyMCE content
            videoUrl,
            passMark: parseInt(passMark) || 80,
            order: parseInt(order) || 0,
            isActive: isActive === 'on',
            quizQuestions
        };
        
        await Lesson.create(lessonData);
        res.redirect(`/admin-mace/lessons?moduleId=${moduleId}&msg=lesson_created`);
    } catch (err) {
        console.error('Create Lesson Error:', err);
        res.redirect('/admin-mace/lessons?msg=create_error');
    }
});

// POST: Update Lesson
router.post('/lessons/edit/:id', async (req, res) => {
    try {
        const { moduleId, title, contentHtml, videoUrl, passMark, order, isActive, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        
        const updateData = {
            moduleId,
            title,
            contentHtml,
            videoUrl,
            passMark: parseInt(passMark) || 80,
            order: parseInt(order) || 0,
            isActive: isActive === 'on',
            quizQuestions
        };
        
        await Lesson.findByIdAndUpdate(req.params.id, updateData);
        res.redirect(`/admin-mace/lessons?moduleId=${moduleId}&msg=lesson_updated`);
    } catch (err) {
        console.error('Update Lesson Error:', err);
        res.redirect('/admin-mace/lessons?msg=update_error');
    }
});

// POST: Delete Lesson
router.post('/lessons/delete/:id', async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        const moduleId = lesson.moduleId;
        await Lesson.findByIdAndDelete(req.params.id);
        res.redirect(`/admin-mace/lessons?moduleId=${moduleId}&msg=lesson_deleted`);
    } catch (err) {
        console.error('Delete Lesson Error:', err);
        res.redirect('/admin-mace/lessons?msg=delete_error');
    }
});

// ==========================================\n// PENGURUSAN QUESTION BANK\n// ==========================================\n\n// GET: Senarai Soalan Bank Kuiz
router.get('/question-bank', async (req, res) => {
    try {
        const questions = await QuestionBank.find().sort({ createdAt: -1 }).limit(100);
        res.render('admin', { page: 'question-bank', questions, msg: req.query.msg || null });
    } catch (err) { 
        console.error('Question Bank Error:', err);
        res.status(500).send('Ralat memuatkan bank soalan.'); 
    }
});

// GET: Form Cipta Soalan Baru
router.get('/question-bank/new', async (req, res) => {
    try { 
        res.render('admin-edit-question', { page: 'question-bank', question: null, editMode: 'create' }); 
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// GET: Form Edit Soalan
router.get('/question-bank/edit/:id', async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) return res.redirect('/admin-mace/question-bank?msg=not_found');
        res.render('admin-edit-question', { page: 'question-bank', question, editMode: 'edit' });
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// POST: Cipta Soalan Baru
router.post('/question-bank/new', async (req, res) => {
    try {
        const { text, explanation, options, correctIndex, category, difficulty, tags, isActive } = req.body;
        const questionData = {
            text, // TinyMCE content
            explanation, // TinyMCE content
            options: JSON.parse(options || '[]'),
            correctIndex: parseInt(correctIndex) || 0,
            category: category || 'General',
            difficulty: difficulty || 'medium',
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            isActive: isActive === 'on'
        };
        
        await QuestionBank.create(questionData);
        res.redirect('/admin-mace/question-bank?msg=question_created');
    } catch (err) {
        console.error('Create Question Error:', err);
        res.redirect('/admin-mace/question-bank?msg=create_error');
    }
});

// POST: Update Soalan
router.post('/question-bank/edit/:id', async (req, res) => {
    try {
        const { text, explanation, options, correctIndex, category, difficulty, tags, isActive } = req.body;
        const updateData = {
            text,
            explanation,
            options: JSON.parse(options || '[]'),
            correctIndex: parseInt(correctIndex) || 0,
            category: category || 'General',
            difficulty: difficulty || 'medium',
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            isActive: isActive === 'on'
        };
        
        await QuestionBank.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-mace/question-bank?msg=question_updated');
    } catch (err) {
        console.error('Update Question Error:', err);
        res.redirect('/admin-mace/question-bank?msg=update_error');
    }
});

// POST: Delete Soalan
router.post('/question-bank/delete/:id', async (req, res) => {
    try {
        await QuestionBank.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/question-bank?msg=question_deleted');
    } catch (err) {
        console.error('Delete Question Error:', err);
        res.redirect('/admin-mace/question-bank?msg=delete_error');
    }
});

// API: Get Questions by Category (for AJAX selection in lesson editor)
router.get('/api/questions', async (req, res) => {
    try {
        const { category, limit } = req.query;
        const query = category ? { category } : {};
        const questions = await QuestionBank.find(query).limit(parseInt(limit) || 50);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================\n// MIGRATION DATA STATIK KE DATABASE (LEGACY)\n// ==========================================\nrouter.get('/migrate-lessons', async (req, res) => {
    try {
        const existingCount = await Lesson.countDocuments();
        if (existingCount > 0) return res.send(`❌ Migration sudah dijalankan. Terdapat ${existingCount} modul.`);
        res.send('Sila guna interface E-Learning baharu untuk mencipta modul dan lesson.');
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
// GET: Preview Sijil (HTML untuk Print)
router.get('/certificate/preview/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.params.id);
        if (!athlete) {
            req.flash('error_msg', 'Atlet tidak dijumpai');
            return res.redirect('/admin-mace');
        }

        // Cari kursus yang atlet ini sertai
        const Course = require('../models/Course');
        const course = await Course.findOne({ 'participants.athlete': athlete._id });
        
        // Dapatkan template aktif
        let template = await CertificateTemplate.findOne({ isActive: true });
        
        // Jika tiada template aktif, guna default values
        if (!template) {
            template = new CertificateTemplate();
        }

        // Format tarikh
        const courseDate = course ? new Date(course.endDate).toLocaleDateString('ms-MY', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });

        res.render('certificate-print', {
            layout: false,
            athlete,
            course,
            template,
            courseDate
        });

    } catch (err) {
        console.error('Certificate Preview Error:', err);
        req.flash('error_msg', 'Ralat memuatkan preview sijil: ' + err.message);
        res.redirect('/admin-mace');
    }
});

module.exports = router;
