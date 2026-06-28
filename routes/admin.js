// routes/admin.js - VERSI LENGKAP & DIBETULKAN
const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const User = require('../models/User');
const Group = require('../models/Group');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const Level = require('../models/Level');
const QuestionBank = require('../models/QuestionBank');
const CertificateTemplate = require('../models/CertificateTemplate');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

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
        res.render('admin-edit-module', { page: 'modules', module, editMode: 'edit' });
    } catch (err) { 
        console.error('Edit Module Form Error:', err);
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// POST: Cipta Modul Baru
router.post('/modules/new', upload.single('thumbnail'), async (req, res) => {
    try {
        const { title, description, order, isActive, hasLevels, isSequential, minPassingScore } = req.body;
        const moduleData = {
            title,
            description, // TinyMCE content
            order: parseInt(order) || 0,
            isActive: isActive === 'on',
            hasLevels: hasLevels === 'on',
            isSequential: isSequential === 'on',
            minPassingScore: parseInt(minPassingScore) || 0
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
        const { title, description, order, isActive, hasLevels, isSequential, minPassingScore } = req.body;
        const updateData = {
            title,
            description,
            order: parseInt(order) || 0,
            isActive: isActive === 'on',
            hasLevels: hasLevels === 'on',
            isSequential: isSequential === 'on',
            minPassingScore: parseInt(minPassingScore) || 0
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

// ==========================================
// MIGRATION DATA STATIK KE DATABASE (LEGACY)
// ==========================================
// MIGRASI LESSON KE MODUL
// ==========================================
router.get('/migrate-lessons', async (req, res) => {
    try {
        // Kira lesson yang BELUM ada moduleId (lesson lama)
        const orphanLessons = await Lesson.countDocuments({ 
            $or: [
                { moduleId: { $exists: false } },
                { moduleId: null }
            ]
        });
        
        if (orphanLessons === 0) {
            const totalLessons = await Lesson.countDocuments();
            return res.send(`✅ Semua lesson sudah mempunyai modul.<br><br>
                • Jumlah lesson dalam sistem: ${totalLessons}<br>
                • Lesson tanpa modul: 0<br><br>
                <a href="/admin-mace/modules">Kembali ke Pengurusan Modul</a> | 
                <a href="/admin-mace/elearning">Dashboard E-Learning</a>`);
        }
        
        // Cari atau cipta modul induk
        let parentModule = await Module.findOne({ title: 'Kurikulum Utama MACE' });
        
        if (!parentModule) {
            parentModule = await Module.create({
                title: 'Kurikulum Utama MACE',
                description: 'Modul induk untuk semua lesson dan kuiz sedia ada',
                order: 1,
                isActive: true
            });
        }
        
        // Update semua lesson tanpa moduleId
        const result = await Lesson.updateMany(
            { 
                $or: [
                    { moduleId: { $exists: false } },
                    { moduleId: null }
                ]
            },
            { $set: { moduleId: parentModule._id } }
        );
        
        res.send(`✅ Migration berjaya!<br><br>
            • Modul: <strong>${parentModule.title}</strong> (ID: ${parentModule._id})<br>
            • ${result.modifiedCount} lesson dipindahkan ke modul ini<br>
            • Baki lesson tanpa modul: ${orphanLessons - result.modifiedCount}<br>
            • Semua kuiz dikekalkan<br><br>
            <a href="/admin-mace/modules">Lihat Modul</a> | 
            <a href="/admin-mace/lessons?moduleId=${parentModule._id}">Lihat Lesson</a> | 
            <a href="/admin-mace/elearning">Dashboard E-Learning</a>`);
    } catch (err) { 
        console.error('Migration Error:', err);
        res.status(500).send(`❌ Ralat Migration: ${err.message}<br><br>
            <pre>${err.stack}</pre><br>
            <a href="javascript:history.back()">Kembali</a>`); 
    }
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

// GET: Preview Sijil (HTML untuk Print)
router.get('/certificate/preview/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.params.id);
        if (!athlete) {
            req.flash('error_msg', 'Atlet tidak dijumpai');
            return res.redirect('/admin-mace');
        }

        // Cari kursus yang atlet ini sertai
        let course = null;
        const Course = require('../models/Course');
        
        // Cuba cari kursus dengan pelbagai cara
        course = await Course.findOne({ 'participants.athlete': athlete._id });
        
        // Jika tak jumpa, cuba cari semua kursus dan semak manually
        if (!course) {
            const allCourses = await Course.find();
            for (const c of allCourses) {
                if (c.participants && Array.isArray(c.participants)) {
                    const found = c.participants.find(p => p.athlete && p.athlete.toString() === athlete._id.toString());
                    if (found) {
                        course = c;
                        break;
                    }
                }
            }
        }
        
        // Dapatkan template aktif
        let template = await CertificateTemplate.findOne({ isActive: true });
        
        // Jika tiada template aktif, guna default values
        if (!template) {
            template = new CertificateTemplate();
        }

        // Format tarikh - handle jika course tidak wujud
        let courseDate;
        if (course && course.endDate) {
            courseDate = new Date(course.endDate).toLocaleDateString('ms-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            courseDate = new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });
        }

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

// ==========================================
// PENGURUSAN TEACHER (ADMIN SAHAJA)
// ==========================================

// GET: Senarai Teacher
router.get('/teachers', async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 });
        res.render('admin', { page: 'teachers', teachers, msg: req.query.msg || null });
    } catch (err) {
        console.error('Teachers Error:', err);
        res.status(500).send('Ralat memuatkan senarai teacher.');
    }
});

// GET: Form Cipta Teacher Baru
router.get('/teachers/new', async (req, res) => {
    res.render('admin-edit-teacher', { page: 'teachers', teacher: null, editMode: 'create' });
});

// POST: Cipta Teacher Baru
router.post('/teachers/new', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        if (!fullName || !email || !password) {
            return res.redirect('/admin-mace/teachers?msg=missing_fields');
        }
        
        // Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.redirect('/admin-mace/teachers?msg=email_exists');
        }
        
        await User.create({
            fullName,
            email,
            password,
            role: 'teacher',
            isActive: true
        });
        
        res.redirect('/admin-mace/teachers?msg=teacher_created');
    } catch (err) {
        console.error('Create Teacher Error:', err);
        res.redirect('/admin-mace/teachers?msg=create_error');
    }
});

// GET: Form Edit Teacher
router.get('/teachers/edit/:id', async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/admin-mace/teachers?msg=not_found');
        }
        res.render('admin-edit-teacher', { page: 'teachers', teacher, editMode: 'edit' });
    } catch (err) {
        console.error('Edit Teacher Form Error:', err);
        res.redirect('/admin-mace/teachers?msg=error');
    }
});

// POST: Update Teacher
router.post('/teachers/edit/:id', async (req, res) => {
    try {
        const { fullName, email, password, isActive } = req.body;
        
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/admin-mace/teachers?msg=not_found');
        }
        
        if (email !== teacher.email) {
            const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
            if (existing) {
                return res.redirect('/admin-mace/teachers?msg=email_exists');
            }
        }
        
        const updateData = { fullName, email, isActive: isActive === 'on' };
        
        if (password && password.trim() !== '') {
            updateData.password = password;
        }
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-mace/teachers?msg=teacher_updated');
    } catch (err) {
        console.error('Update Teacher Error:', err);
        res.redirect('/admin-mace/teachers?msg=update_error');
    }
});

// POST: Delete Teacher
router.post('/teachers/delete/:id', async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/admin-mace/teachers?msg=not_found');
        }
        
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/teachers?msg=teacher_deleted');
    } catch (err) {
        console.error('Delete Teacher Error:', err);
        res.redirect('/admin-mace/teachers?msg=delete_error');
    }
});

// POST: Reset Password Teacher
router.post('/teachers/reset-password/:id', async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/admin-mace/teachers?msg=not_found');
        }
        
        const newPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
        teacher.password = newPassword;
        await teacher.save();
        
        res.redirect('/admin-mace/teachers?msg=password_reset&newPassword=' + encodeURIComponent(newPassword));
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.redirect('/admin-mace/teachers?msg=reset_error');
    }
});

// ==========================================
// PENGURUSAN PELAJAR (STUDENT) - ADMIN
// ==========================================

// GET: Redirect /users to /students (digabungkan)
router.get('/users', (req, res) => {
    res.redirect('/admin-mace/students');
});

// GET: Senarai Pelajar
router.get('/students', async (req, res) => {
    try {
        // Include both User model students AND Athlete model (for legacy data)
        const students = await User.find({ role: 'student' })
            .populate('athleteId')
            .populate('enrolledGroups')
            .sort({ createdAt: -1 });
        
        // Also get athletes from legacy Athlete collection
        const athletes = await Athlete.find().sort({ fullName: 1 }).limit(50);
        
        const groups = await Group.find().sort({ name: 1 });
        res.render('admin', { page: 'students', students, athletes, groups, msg: req.query.msg || null });
    } catch (err) {
        console.error('Students Error:', err);
        res.status(500).send('Ralat memuatkan senarai pelajar.');
    }
});

// GET: Form Edit Pelajar
router.get('/students/edit/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id)
            .populate('athleteId')
            .populate('enrolledGroups');
        if (!student || student.role !== 'student') {
            return res.redirect('/admin-mace/students?msg=not_found');
        }
        const groups = await Group.find().sort({ name: 1 });
        res.render('admin-edit-student', { page: 'students', student, groups, editMode: 'edit' });
    } catch (err) {
        console.error('Edit Student Form Error:', err);
        res.redirect('/admin-mace/students?msg=error');
    }
});

// POST: Update Pelajar
router.post('/students/edit/:id', async (req, res) => {
    try {
        const { fullName, email, password, isActive, groupIds } = req.body;
        
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.redirect('/admin-mace/students?msg=not_found');
        }
        
        if (email !== student.email) {
            const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
            if (existing) {
                return res.redirect('/admin-mace/students?msg=email_exists');
            }
        }
        
        const updateData = { fullName, email, isActive: isActive === 'on' };
        
        if (password && password.trim() !== '') {
            updateData.password = password;
        }
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        
        if (groupIds) {
            const groups = Array.isArray(groupIds) ? groupIds : (groupIds ? [groupIds] : []);
            student.enrolledGroups = groups;
            await student.save();
            
            await Group.updateMany(
                { _id: { $in: groups } },
                { $addToSet: { students: student._id } }
            );
            
            await Group.updateMany(
                { _id: { $nin: groups }, students: student._id },
                { $pull: { students: student._id } }
            );
        }
        
        res.redirect('/admin-mace/students?msg=student_updated');
    } catch (err) {
        console.error('Update Student Error:', err);
        res.redirect('/admin-mace/students?msg=update_error');
    }
});

// POST: Delete Pelajar
router.post('/students/delete/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.redirect('/admin-mace/students?msg=not_found');
        }
        
        await Group.updateMany(
            { students: student._id },
            { $pull: { students: student._id } }
        );
        
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/students?msg=student_deleted');
    } catch (err) {
        console.error('Delete Student Error:', err);
        res.redirect('/admin-mace/students?msg=delete_error');
    }
});

// POST: Reset Password Pelajar
router.post('/students/reset-password/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.redirect('/admin-mace/students?msg=not_found');
        }
        
        const newPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
        student.password = newPassword;
        await student.save();
        
        res.redirect('/admin-mace/students?msg=password_reset&newPassword=' + encodeURIComponent(newPassword));
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.redirect('/admin-mace/students?msg=reset_error');
    }
});

// ==========================================
// PENGURUSAN LEVEL DALAM MODUL (ADMIN)
// ==========================================

// GET: Manage Levels untuk Modul tertentu
router.get('/modules/:moduleId/levels', async (req, res) => {
    try {
        const module = await Module.findById(req.params.moduleId);
        if (!module) {
            return res.redirect('/admin-mace/modules?msg=not_found');
        }
        
        const levels = await Level.find({ moduleId: req.params.moduleId }).sort({ order: 1 });
        
        res.render('admin-manage-levels', { 
            page: 'modules', 
            module, 
            levels, 
            msg: req.query.msg || null 
        });
    } catch (err) {
        console.error('Manage Levels Error:', err);
        res.status(500).send('Ralat memuatkan levels.');
    }
});

// POST: Update Module Level Settings
router.post('/modules/:moduleId/level-settings', async (req, res) => {
    try {
        const { hasLevels, isSequential, minPassingScore } = req.body;
        
        const module = await Module.findById(req.params.moduleId);
        if (!module) {
            return res.redirect('/admin-mace/modules?msg=not_found');
        }
        
        module.hasLevels = hasLevels === 'on';
        module.isSequential = isSequential === 'on';
        module.minPassingScore = parseInt(minPassingScore) || 0;
        
        await module.save();
        res.redirect('/admin-mace/modules/' + req.params.moduleId + '/levels?msg=settings_updated');
    } catch (err) {
        console.error('Update Level Settings Error:', err);
        res.redirect('/admin-mace/modules?msg=update_error');
    }
});

// POST: Create Level
router.post('/modules/:moduleId/levels/create', async (req, res) => {
    try {
        const { name, description, order } = req.body;
        
        const module = await Module.findById(req.params.moduleId);
        if (!module) {
            return res.redirect('/admin-mace/modules?msg=not_found');
        }
        
        if (!module.hasLevels) {
            return res.redirect('/admin-mace/modules/' + req.params.moduleId + '/levels?msg=levels_not_enabled');
        }
        
        let finalOrder = order;
        if (!finalOrder) {
            const lastLevel = await Level.findOne({ moduleId: req.params.moduleId }).sort({ order: -1 });
            finalOrder = lastLevel ? lastLevel.order + 1 : 1;
        }
        
        await Level.create({
            moduleId: req.params.moduleId,
            name,
            description: description || '',
            order: parseInt(finalOrder)
        });
        
        res.redirect('/admin-mace/modules/' + req.params.moduleId + '/levels?msg=level_created');
    } catch (err) {
        console.error('Create Level Error:', err);
        res.redirect('/admin-mace/modules?msg=create_error');
    }
});

// POST: Delete Level
router.post('/levels/delete/:id', async (req, res) => {
    try {
        const level = await Level.findById(req.params.id);
        if (!level) {
            return res.redirect('/admin-mace/modules?msg=not_found');
        }
        
        const moduleId = level.moduleId;
        
        const lessonCount = await Lesson.countDocuments({ levelId: req.params.id });
        if (lessonCount > 0) {
            return res.redirect('/admin-mace/modules/' + moduleId + '/levels?msg=cannot_delete_has_lessons');
        }
        
        await Level.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/modules/' + moduleId + '/levels?msg=level_deleted');
    } catch (err) {
        console.error('Delete Level Error:', err);
        res.redirect('/admin-mace/modules?msg=delete_error');
    }
});


// ==========================================
// PENGURUSAN GROUP & ENROLLMENT (ADMIN)
// ==========================================

// GET: Senarai Group
router.get("/groups", async (req, res) => {
    try {
        const groups = await Group.find()
            .sort({ name: 1 })
            .populate("teacherId", "fullName email")
            .populate("modules", "title")
            .populate("students", "fullName email");
        
        res.render("admin", { 
            page: "groups", 
            groups, 
            msg: req.query.msg || null,
            createdKey: req.query.key || null,
            newKey: req.query.newKey || null
        });
    } catch (err) {
        console.error("Groups Error:", err);
        res.status(500).send("Ralat memuatkan senarai group.");
    }
});

// GET: Form Cipta Group Baru
router.get("/groups/new", async (req, res) => {
    try {
        const teachers = await User.find({ role: "teacher" }).sort({ fullName: 1 });
        const modules = await Module.find().sort({ title: 1 });
        res.render("admin-edit-group", { 
            page: "groups", 
            group: null, 
            teachers, 
            modules,
            editMode: "create" 
        });
    } catch (err) {
        res.status(500).send("Ralat memuatkan borang.");
    }
});

// POST: Cipta Group Baru
router.post("/groups/new", async (req, res) => {
    try {
        const { name, description, teacherId, moduleIds, enrollmentKey, maxStudents } = req.body;
        
        if (!name) {
            return res.redirect("/admin-mace/groups?msg=missing_fields");
        }

        let targetTeacherId = teacherId;
        if (!targetTeacherId) {
            if (req.session && req.session.userId) {
                targetTeacherId = req.session.userId;
            } else {
                const adminUser = await User.findOne({ role: "admin" });
                if (adminUser) {
                    targetTeacherId = adminUser._id;
                } else {
                    const anyUser = await User.findOne();
                    if (anyUser) {
                        targetTeacherId = anyUser._id;
                    }
                }
            }
        }

        if (!targetTeacherId) {
            return res.redirect("/admin-mace/groups?msg=no_teacher_available");
        }

        const groupData = {
            name,
            description: description || "",
            teacherId: targetTeacherId,
            createdBy: req.session && req.session.userId ? req.session.userId : targetTeacherId,
            modules: moduleIds ? (Array.isArray(moduleIds) ? moduleIds : [moduleIds]) : [],
            maxStudents: parseInt(maxStudents) || 0
        };

        // Jika admin nak set enrollment key sendiri
        if (enrollmentKey && enrollmentKey.trim() !== "") {
            groupData.enrollmentKey = enrollmentKey.trim().toUpperCase();
        }

        const group = await Group.create(groupData);
        res.redirect("/admin-mace/groups?msg=group_created&key=" + encodeURIComponent(group.enrollmentKey));
    } catch (err) {
        console.error("Create Group Error:", err);
        res.redirect("/admin-mace/groups?msg=create_error");
    }
});

// GET: Form Edit Group
router.get("/groups/edit/:id", async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate("teacherId", "fullName email")
            .populate("modules");
        
        if (!group) {
            return res.redirect("/admin-mace/groups?msg=not_found");
        }

        const teachers = await User.find({ role: "teacher" }).sort({ fullName: 1 });
        const modules = await Module.find().sort({ title: 1 });
        
        res.render("admin-edit-group", { 
            page: "groups", 
            group, 
            teachers, 
            modules,
            editMode: "edit" 
        });
    } catch (err) {
        console.error("Edit Group Form Error:", err);
        res.redirect("/admin-mace/groups?msg=error");
    }
});

// POST: Update Group
router.post("/groups/edit/:id", async (req, res) => {
    try {
        const { name, description, teacherId, moduleIds, enrollmentKey, maxStudents, isActive } = req.body;

        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.redirect("/admin-mace/groups?msg=not_found");
        }

        const updateData = {
            name,
            description,
            teacherId,
            modules: moduleIds ? (Array.isArray(moduleIds) ? moduleIds : [moduleIds]) : [],
            maxStudents: parseInt(maxStudents) || 0,
            isActive: isActive === "on"
        };

        // Update enrollment key jika ada perubahan
        if (enrollmentKey && enrollmentKey.trim() !== "" && enrollmentKey !== group.enrollmentKey) {
            updateData.enrollmentKey = enrollmentKey.trim().toUpperCase();
        }

        await Group.findByIdAndUpdate(req.params.id, updateData);
        res.redirect("/admin-mace/groups?msg=group_updated");
    } catch (err) {
        console.error("Update Group Error:", err);
        res.redirect("/admin-mace/groups?msg=update_error");
    }
});

// POST: Delete Group
router.post("/groups/delete/:id", async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.redirect("/admin-mace/groups?msg=not_found");
        }

        // Remove group reference from students
        await User.updateMany(
            { enrolledGroups: req.params.id },
            { $pull: { enrolledGroups: req.params.id } }
        );

        await Group.findByIdAndDelete(req.params.id);
        res.redirect("/admin-mace/groups?msg=group_deleted");
    } catch (err) {
        console.error("Delete Group Error:", err);
        res.redirect("/admin-mace/groups?msg=delete_error");
    }
});

// POST: Reset Enrollment Key
router.post("/groups/reset-key/:id", async (req, res) => {
    try {
        const crypto = require("crypto");
        const newKey = "GRP-" + crypto.randomBytes(4).toString("hex").toUpperCase();
        
        await Group.findByIdAndUpdate(req.params.id, { enrollmentKey: newKey });
        res.redirect("/admin-mace/groups?msg=key_reset&newKey=" + encodeURIComponent(newKey));
    } catch (err) {
        console.error("Reset Key Error:", err);
        res.redirect("/admin-mace/groups?msg=reset_error");
    }
});

module.exports = router;
