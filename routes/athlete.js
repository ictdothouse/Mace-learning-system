// routes/athlete.js - VERSI DATABASE DRIVEN + R2 SIGNED URL
const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const Lesson = require('../models/Lesson'); // Import Model Lesson
const Group = require('../models/Group');
const User = require('../models/User');
const Module = require('../models/Module');
const { generateCertificate } = require('../utils/certificate');
const Page = require('../models/Page');
const CertificateTemplate = require('../models/CertificateTemplate');
const Level = require('../models/Level');

// ==========================================
// KONFIGURASI CLOUDFLARE R2 (VIDEO SULIT)
// ==========================================
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
    region: 'auto',
    forcePathStyle: true,
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

// ==========================================
// ⚡ SISTEM CACHE IN-MEMORY (PRESTASI)
// ==========================================

// Cache #1: R2 Signed URLs — elak generate URL baru setiap request
const videoUrlCache = new Map();
const VIDEO_URL_CACHE_TTL = 30 * 60 * 1000; // 30 minit (URL valid 1 jam, cache 30 min untuk safety)

const getSecureVideoUrl = async (filename) => {
    if (!filename) return null;
    if (filename.startsWith('/uploads/') || filename.startsWith('http')) return filename;
    
    // ⚡ Semak cache dahulu
    const cached = videoUrlCache.get(filename);
    if (cached && cached.expiry > Date.now()) {
        return cached.url;
    }
    
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'modulmace',
            Key: filename
        });
        const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
        
        // ⚡ Simpan dalam cache
        videoUrlCache.set(filename, { url, expiry: Date.now() + VIDEO_URL_CACHE_TTL });
        
        return url;
    } catch (err) {
        console.error('Error generating secure url:', err);
        return `/uploads/${filename}`;
    }
};

// Cache #2: Lessons + Quiz data — data ini jarang berubah
let lessonsCache = null;
let lessonsCacheTime = 0;
const LESSONS_CACHE_TTL = 5 * 60 * 1000; // 5 minit

const getLessonsWithQuiz = async () => {
    const now = Date.now();
    if (!lessonsCache || (now - lessonsCacheTime > LESSONS_CACHE_TTL)) {
        lessonsCache = await Lesson.find().populate('moduleId').sort({ order: 1 }).lean();
        lessonsCacheTime = now;
        console.log('📦 Lessons cache refreshed');
    }
    return lessonsCache;
};

// Cache #3: Sports list — data ini hampir tidak pernah berubah
let sportsCache = null;
let sportsCacheTime = 0;
const SPORTS_CACHE_TTL = 10 * 60 * 1000; // 10 minit

// Queue Guard for Registration: Mencegah MongoDB Atlas Free Tier tersumbat semasa peak pendaftaran
let registrationCounter = 0;
setInterval(() => {
    registrationCounter = 0;
}, 10000); // Reset pembilang setiap 10 saat

const checkSports = async (req, res, next) => {
    const now = Date.now();
    if (!sportsCache || (now - sportsCacheTime > SPORTS_CACHE_TTL)) {
        try {
            const Sport = require('../models/Sport');
            sportsCache = await Sport.find().sort({ name: 1 }).lean();
            sportsCacheTime = now;
        } catch (err) {
            sportsCache = sportsCache || [];
        }
    }
    req.sports = sportsCache;
    next();
};

const checkSession = (req, res, next) => req.session.athleteId ? next() : res.redirect('/');

const translateText = (text, lang) => {
    if (!text || lang !== 'en') return text;
    let result = text.replace(/[\s\u00a0]+/g, ' ').trim();
    const mappings = [
        {
            ms: /Jom kuasai asas dulu sebelum jadi pro!/gi,
            en: "Let's master the basics first before becoming a pro!"
        },
        {
            ms: /Topik pembelajaran ini mengenai Peraturan Asas. Tonton topik ini dan uji kefahaman anda melalui Kuiz!/gi,
            en: "This learning topic is about Basic Rules. Watch this topic and test your understanding through the Quiz!"
        },
        {
            ms: /Jenis-Jenis Salah Laku: Kenali kesalahan, elak jadi pelaku!/gi,
            en: "Types of Misconduct: Recognize mistakes, avoid being a perpetrator!"
        },
        {
            ms: /Kenali kesalahan, elak jadi pelaku!/gi,
            en: "Recognize mistakes, avoid being a perpetrator!"
        },
        {
            ms: /Tonton topik ini dan uji kefahaman anda melalui Kuiz!/gi,
            en: "Watch this topic and test your understanding through the Quiz!"
        },
        {
            ms: /Ambil tindakan yang betul, laporkan tanpa ragu!/gi,
            en: "Take the right action, report it without hesitation!"
        },
        {
            ms: /MODUL 1\s*:\s*PLAY SAFE WIN STRONG/gi,
            en: "MODULE 1: PLAY SAFE WIN STRONG"
        },
        {
            ms: /Di akhir modul ini anda akan dapat memahami peraturan asas, jenis\s*(&ndash;|-)\s*jenis salah laku serta tindakan yang anda perlu lakukan sekiranya sesuatu perkara yang tidak diingini berlaku terhadap anda atau orang sekeliling anda\./gi,
            en: "At the end of this module you will be able to understand basic rules, types of misconduct, and the actions you need to take if something undesirable happens to you or those around you."
        },
        {
            ms: /Ini penting bagi melindungi anda dan mewujudkan persekitaran sukan selamat dan berintegriti\./gi,
            en: "This is important to protect you and create a safe and integrated sports environment."
        },
        {
            ms: /Sebarang pertanyaan atau maklumbalas, hubungi kami menerusi email\s*:/gi,
            en: "For any inquiries or feedback, contact us via email:"
        },
        {
            ms: /^Hubungi$/gi,
            en: "Contact Us"
        },
        {
            ms: /Hubungi Kami/gi,
            en: "Contact Us"
        }
    ];
    for (const m of mappings) {
        result = result.replace(m.ms, m.en);
    }
    return result;
};

// ==========================================
// ROUTES UTAMA
// ==========================================
router.get('/', (req, res) => {
    let lang = req.cookies && req.cookies.lang;
    if (lang === 'en') {
        res.redirect('/en');
    } else {
        res.redirect('/ms');
    }
});

router.get('/test-waiting-room', (req, res) => {
    const lang = req.query.lang || 'ms';
    res.render('waiting-room', {
        lang,
        queuePosition: 5,
        estimatedWaitSeconds: 120,
        activeCount: 201,
        maxCount: 200,
        formData: {}
    });
});

router.get('/ms', (req, res) => {
    res.cookie('lang', 'ms', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: false, path: '/' });
    res.redirect('/');
});

router.get('/en', (req, res) => {
    res.cookie('lang', 'en', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: false, path: '/' });
    res.redirect('/');
});

router.post('/access', checkSports, async (req, res) => {
    const { action, fullName, icNumber, jantina, umur, negeri, sukan } = req.body;
    try {
        if (action === 'new') {
            // Mencegah lambakan pendaftaran (maksima 20 pendaftaran dalam 10 saat)
            if (registrationCounter >= 20) {
                const lang = res.locals.lang || 'ms';
                return res.render('waiting-room', {
                    lang,
                    formData: req.body
                });
            }
            registrationCounter++;

            const existing = await Athlete.findOne({ icNumber });
            if (existing) return res.render('entry', { error: 'No. IC sudah berdaftar. Sila guna "Semak Akaun".', sports: req.sports });
            const newAthlete = await Athlete.create({ fullName, icNumber, jantina, umur, negeriWakil: negeri, sukan });
            req.session.athleteId = newAthlete._id;
            res.redirect('/dashboard');
        } else if (action === 'resume') {
            const athlete = await Athlete.findOne({ icNumber, fullName: { $regex: new RegExp('^' + fullName + '$', 'i') } });
            if (!athlete) return res.render('entry', { error: 'Rekod tidak dijumpai. Semak Nama & No. IC.', sports: req.sports });
            req.session.athleteId = athlete._id;
            res.redirect('/dashboard');
        }
    } catch (err) {
        console.error('Access Error:', err);
        res.render('entry', { error: 'Ralat sistem. Sila cuba lagi.', sports: req.sports });
    }
});

router.get('/dashboard', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId).lean();
        if (!athlete) { req.session.destroy(); return res.redirect('/'); }
        
        // ⚡ Guna cache untuk lessons dan modules (bukan query DB setiap kali)
        const lessons = await getLessonsWithQuiz();
        const activeLessons = lessons.filter(l => l.isActive !== false);

        // ⚡ Menterjemah tajuk & deskripsi lesson jika bahasa english dipilih
        const lang = res.locals.lang || 'ms';
        const translatedLessons = activeLessons.map(l => {
            const cloned = { ...l };
            cloned.title = translateText(l.title, lang);
            cloned.contentHtml = translateText(l.contentHtml, lang);
            if (cloned.moduleId) {
                cloned.moduleId = {
                    ...cloned.moduleId,
                    title: translateText(cloned.moduleId.title, lang),
                    description: translateText(cloned.moduleId.description, lang)
                };
            }
            return cloned;
        });
            
        // ⚡ Ambil modules dari cache (extract unique dari lessons cache)
        const allModules = await Module.find().sort({ order: 1 }).lean();
            
        res.render('dashboard', { athlete, lessons: translatedLessons, allModules });
    } catch (err) { res.redirect('/'); }
});

router.get('/lesson/:id', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        const moduleId = parseInt(req.params.id);
        if (athlete.currentStage < moduleId) return res.redirect('/dashboard');

        // ✅ AMBIL DATA DARI DATABASE
        const lessons = await getLessonsWithQuiz();

        // ⚡ Menterjemah tajuk & deskripsi lesson jika bahasa english dipilih
        const lang = res.locals.lang || 'ms';
        const translatedLessons = lessons.map(l => {
            const cloned = { ...l };
            cloned.title = translateText(l.title, lang);
            cloned.contentHtml = translateText(l.contentHtml, lang);
            if (cloned.moduleId) {
                cloned.moduleId = {
                    ...cloned.moduleId,
                    title: translateText(cloned.moduleId.title, lang),
                    description: translateText(cloned.moduleId.description, lang)
                };
            }
            return cloned;
        });

        const lesson = translatedLessons[moduleId - 1];
        if (!lesson) return res.status(404).send('Modul tidak dijumpai');

        let secureVideoUrl = null;
        if (lesson.videoUrl) secureVideoUrl = await getSecureVideoUrl(lesson.videoUrl);

        const quizResult = req.session.quizResult || null;
        req.session.quizResult = null;

        res.render('lesson', { 
            athlete, lesson, moduleId, secureVideoUrl, quizResult,
            allLessons: translatedLessons,
            error: req.session.error, success: req.session.success 
        });
        
        req.session.error = null; req.session.success = null;
    } catch (err) {
        console.error('Lesson Route Error:', err);
        res.redirect('/dashboard');
    }
});

// 🆕 POST: Join Group via Enrollment Key
router.post('/api/join-group', checkSession, async (req, res) => {
    try {
        const { enrollmentKey, moduleId } = req.body;
        if (!enrollmentKey) {
            return res.status(400).json({ error: 'Enrollment Key diperlukan' });
        }

        const cleanKey = enrollmentKey.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const group = await Group.findOne({ enrollmentKey: { $regex: new RegExp('^' + cleanKey + '$', 'i') } });
        if (!group) {
            return res.status(404).json({ error: 'Enrollment Key tidak sah. Sila semak semula.' });
        }

        const athleteId = req.session.athleteId;
        
        // Tambah ke Athlete
        await Athlete.findByIdAndUpdate(athleteId, {
            $addToSet: { enrolledGroups: group._id }
        });
        
        // Tambah ke User jika wujud
        await User.findOneAndUpdate(
            { athleteId: athleteId },
            { $addToSet: { enrolledGroups: group._id } }
        );

        res.json({ success: true, groupId: group._id, moduleId: moduleId });
    } catch (err) {
        console.error('Join Group Error:', err);
        res.status(500).json({ error: 'Ralat pelayan.' });
    }
});

router.post('/api/mark-watched/:id', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        const moduleId = parseInt(req.params.id);
        if (!athlete.watchedLessons) athlete.watchedLessons = [];
        if (!athlete.watchedLessons.includes(moduleId)) {
            athlete.watchedLessons.push(moduleId);
            await athlete.save();
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to track' }); }
});

router.post('/submit-quiz/:id', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        const moduleId = parseInt(req.params.id);
        
        // VALIDATE: Wajib tonton video dulu (kecuali sudah pernah lulus)
        const isAlreadyPassed = 
            (moduleId === 1 && athlete.quizScores.quiz1 >= 80) ||
            (moduleId === 2 && athlete.quizScores.quiz2 >= 80) ||
            (moduleId === 3 && athlete.quizScores.quiz3 >= 80);

        if (!isAlreadyPassed && (!athlete.watchedLessons || !athlete.watchedLessons.includes(moduleId))) {
            req.session.error = "Sila tonton video modul ini sepenuhnya sebelum menjawab kuiz.";
            return res.redirect(`/lesson/${moduleId}`);
        }

        const userAnswers = req.body.answers || {}; 
        
        // ✅ AMBIL DATA KUIZ DARI DATABASE
        const lessons = await getLessonsWithQuiz();
        const currentLesson = lessons[moduleId - 1];
        
        if (!currentLesson || !currentLesson.quizQuestions || currentLesson.quizQuestions.length === 0) {
            req.session.error = "Soalan kuiz tidak ditemui dalam database.";
            return res.redirect(`/lesson/${moduleId}`);
        }

        // Kira markah di server berasaskan mata/points
        let totalPoints = 0;
        let earnedPoints = 0;
        
        currentLesson.quizQuestions.forEach((q, index) => {
            const points = q.points !== undefined ? q.points : 1;
            totalPoints += points;
            
            const qType = q.type || 'multiple-choice';
            const userAns = userAnswers[index];
            
            if (qType === 'multiple-choice' || qType === 'true-false') {
                const userAnsIndex = parseInt(userAns);
                if (userAnsIndex === q.correctIndex) {
                    earnedPoints += points;
                }
            } else if (qType === 'short-answer') {
                // Padanan jawapan pendek (case-insensitive & trimmed)
                const userAnsText = (userAns || '').toString().trim().toLowerCase();
                const correctAnsText = (q.correctAnswerText || '').toString().trim().toLowerCase();
                if (userAnsText && correctAnsText && userAnsText === correctAnsText) {
                    earnedPoints += points;
                }
            }
        });

        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = score >= (currentLesson.passMark || 80);

        // Simpan keputusan hanya jika lulus atau markah lebih tinggi
        if (passed) {
            const updateData = {};
            if (moduleId === 1) { 
                if (score > (athlete.quizScores?.quiz1 || 0)) updateData['quizScores.quiz1'] = score;
                if (athlete.currentStage < 2) updateData.currentStage = 2; 
            }
            else if (moduleId === 2) { 
                if (score > (athlete.quizScores?.quiz2 || 0)) updateData['quizScores.quiz2'] = score;
                if (athlete.currentStage < 3) updateData.currentStage = 3; 
            }
            else if (moduleId === 3) { 
                if (score > (athlete.quizScores?.quiz3 || 0)) updateData['quizScores.quiz3'] = score;
                if (athlete.currentStage < 4) { updateData.currentStage = 4; updateData.completedAt = new Date(); } 
            }
            
            if (Object.keys(updateData).length > 0) {
                await Athlete.findByIdAndUpdate(athlete._id, updateData);
            }
        }

        req.session.quizResult = { passed, score, userAnswers, totalPoints, earnedPoints };
        res.redirect(`/lesson/${moduleId}`);

    } catch (err) {
        console.error('Quiz Error:', err);
        res.redirect('/dashboard');
    }
});

router.get('/download-certificate', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        if (athlete.currentStage < 4) return res.redirect('/dashboard');
        generateCertificate(athlete, res);
    } catch (err) { res.redirect('/dashboard'); }
});

// Route untuk preview/download sijil dengan ID
router.get('/certificate/:id', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.params.id);
        if (!athlete || athlete._id.toString() !== req.session.athleteId.toString()) {
            return res.status(403).send('Akses ditolak');
        }
        if (athlete.currentStage < 4) return res.redirect('/dashboard');
        
        // Jika ada parameter print=1, download PDF
        if (req.query.print === '1') {
            generateCertificate(athlete, res);
        } else {
            // Preview halaman HTML menggunakan template aktif
            let template = await CertificateTemplate.findOne({ isActive: true });
            if (!template) {
                template = new CertificateTemplate();
            }

            const course = {};
            const courseDate = new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });

            res.render('certificate-print', {
                layout: false,
                athlete,
                template,
                course,
                courseDate,
                backUrl: '/dashboard'
            });
        }
    } catch (err) { 
        console.error('Certificate Error:', err);
        res.redirect('/dashboard'); 
    }
});

// Route untuk download/preview sijil modul spesifik
router.get('/certificate/module/:moduleId', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        if (!athlete) return res.redirect('/');
        
        const module = await Module.findById(req.params.moduleId);
        if (!module || !module.hasCertificate) {
            return res.redirect('/dashboard');
        }
        
        // Semak kelayakan (pastikan semua lesson dalam modul ini telah selesai)
        const lessons = await Lesson.find({ moduleId: req.params.moduleId, isActive: true }).sort({ order: -1 });
        if (lessons.length > 0) {
            const lastLessonOrder = lessons[0].order;
            if (athlete.currentStage <= lastLessonOrder) {
                return res.status(403).send('Akses ditolak. Anda belum menyelesaikan modul ini.');
            }
        }
        
        // JIKA ADA print=1, download PDF. JIKA TIDAK, render HTML print preview!
        if (req.query.print === '1') {
            generateCertificate(athlete, res, module.certificateTemplate);
        } else {
            let template = null;
            if (module.certificateTemplate) {
                template = await CertificateTemplate.findById(module.certificateTemplate);
            }
            if (!template) {
                template = await CertificateTemplate.findOne({ isActive: true });
            }
            if (!template) {
                template = new CertificateTemplate();
            }

            const course = { name: module.title };
            const courseDate = new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });

            res.render('certificate-print', {
                layout: false,
                athlete,
                template,
                course,
                courseDate,
                backUrl: '/dashboard'
            });
        }
    } catch (err) {
        console.error('Module Certificate Error:', err);
        res.redirect('/dashboard');
    }
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// GET: Landing Page Modul
router.get('/module/:id', checkSports, async (req, res) => {
    try {
        const module = await Module.findById(req.params.id).lean();
        if (!module) return res.redirect('/');

        let levels = await Level.find({ moduleId: module._id }).sort({ order: 1 }).lean();
        
        // Auto-seed default levels untuk Modul 1 jika sistem level diaktifkan dan tiada level lagi
        if (levels.length === 0 && (module.hasLevels || module.order === 1)) {
            if (!module.hasLevels) {
                await Module.findByIdAndUpdate(module._id, { hasLevels: true });
                module.hasLevels = true;
            }
            const defaultLevels = [
                {
                    moduleId: module._id,
                    name: 'BRONZE (LEVEL 1)',
                    name_en: 'BRONZE (LEVEL 1)',
                    description: 'Peringkat Gangsa - Pengenalan Asas',
                    description_en: 'Bronze Level - Basic Introduction',
                    targetAudience: 'Atlet di peringkat kebangsaan',
                    targetAudience_en: 'Athlete at national level',
                    duration: '10 - 15 minit',
                    duration_en: '10 - 15 mins',
                    order: 1
                },
                {
                    moduleId: module._id,
                    name: 'SILVER (LEVEL 2)',
                    name_en: 'SILVER (LEVEL 2)',
                    description: 'Peringkat Perak - Salah Laku Sukan',
                    description_en: 'Silver Level - Sports Misconduct',
                    targetAudience: 'Atlet di peringkat negeri',
                    targetAudience_en: 'Athlete at state level',
                    duration: '15 - 20 minit',
                    duration_en: '15 - 20 mins',
                    order: 2
                },
                {
                    moduleId: module._id,
                    name: 'GOLD (LEVEL 3)',
                    name_en: 'GOLD (LEVEL 3)',
                    description: 'Peringkat Emas - Kesedaran Buli & Gangguan',
                    description_en: 'Gold Level - Bullying & Harassment Awareness',
                    targetAudience: 'Atlet elit',
                    targetAudience_en: 'Elite athlete',
                    duration: '20 - 30 minit',
                    duration_en: '20 - 30 mins',
                    order: 3
                },
                {
                    moduleId: module._id,
                    name: 'PLATINUM (ADVANCED)',
                    name_en: 'PLATINUM (ADVANCED)',
                    description: 'Peringkat Platinum - Pelaporan dan Tindakan',
                    description_en: 'Platinum Level - Reporting and Action',
                    targetAudience: 'Atlet profesional',
                    targetAudience_en: 'Professional athlete',
                    duration: '30 - 45 minit',
                    duration_en: '30 - 45 mins',
                    order: 4
                }
            ];
            const inserted = await Level.insertMany(defaultLevels);
            
            // Kaitkan lesson sedia ada ke level yang baru di-seed
            const Lesson = require('../models/Lesson');
            const currentLessons = await Lesson.find({ moduleId: module._id }).sort({ order: 1 });
            if (currentLessons.length >= 1) await Lesson.findByIdAndUpdate(currentLessons[0]._id, { levelId: inserted[0]._id });
            if (currentLessons.length >= 2) await Lesson.findByIdAndUpdate(currentLessons[1]._id, { levelId: inserted[1]._id });
            if (currentLessons.length >= 3) await Lesson.findByIdAndUpdate(currentLessons[2]._id, { levelId: inserted[2]._id });

            levels = await Level.find({ moduleId: module._id }).sort({ order: 1 }).lean();
        }

        // Semak status log masuk atlet
        let athlete = null;
        let isLoggedIn = false;
        if (req.session.athleteId) {
            athlete = await Athlete.findById(req.session.athleteId).lean();
            if (athlete) isLoggedIn = true;
        }

        // Cari lesson pertama untuk butang permulaan modul keseluruhan
        const LessonModel = require('../models/Lesson');
        const firstLesson = await LessonModel.findOne({ moduleId: module._id, isActive: true }).sort({ order: 1 }).lean();
        const firstLessonId = firstLesson ? firstLesson._id : null;

        const lang = res.locals.lang || 'ms';

        // Terjemah nama modul & penerangan jika english
        const translatedModule = {
            ...module,
            title: translateText(module.title, lang),
            description: translateText(module.description, lang)
        };

        const translatedLevels = await Promise.all(levels.map(async (l) => {
            const levelFirstLesson = await LessonModel.findOne({ levelId: l._id, isActive: true }).sort({ order: 1 }).lean();
            return {
                ...l,
                firstLessonId: levelFirstLesson ? levelFirstLesson._id : null,
                name: lang === 'en' ? (l.name_en || l.name) : l.name,
                description: lang === 'en' ? (l.description_en || l.description) : l.description,
                targetAudience: lang === 'en' ? (l.targetAudience_en || l.targetAudience) : l.targetAudience,
                duration: lang === 'en' ? (l.duration_en || l.duration) : l.duration
            };
        }));

        res.render('module-landing', {
            module: translatedModule,
            levels: translatedLevels,
            athlete,
            isLoggedIn,
            firstLessonId,
            lang,
            sports: req.sports || []
        });
    } catch (err) {
        console.error('Module Landing Page Error:', err);
        res.redirect('/');
    }
});

// Route untuk dynamic CMS pages
router.get('/page/:slug', checkSports, async (req, res) => {
    try {
        const page = await Page.findOne({ slug: req.params.slug.toLowerCase(), isPublished: true });
        if (!page) {
            return res.status(404).send('Page not found');
        }
        
        let module1 = null;
        if (page.customTemplate === 'modules') {
            // Tarik modul pertama (Modul 1)
            module1 = await Module.findOne({ isActive: true }).sort({ order: 1 });
            if (module1) {
                const firstLesson = await Lesson.findOne({ moduleId: module1._id, isActive: true }).sort({ order: 1 });
                module1.firstLessonId = firstLesson ? firstLesson._id : null;
            }
        }
        
        const lang = res.locals.lang || 'ms';
        const pageData = page.toObject();
        pageData.title = translateText(lang === 'en' ? (pageData.title_en || pageData.title) : pageData.title, lang);
        pageData.content = translateText(lang === 'en' ? (pageData.content_en || pageData.content) : pageData.content, lang);
        
        if (pageData.customTemplate === 'contact' && pageData.contactConfig) {
            pageData.contactConfig.bannerTitle = translateText(pageData.contactConfig.bannerTitle, lang);
            pageData.contactConfig.description = translateText(pageData.contactConfig.description, lang);
        }

        res.render('custom-page', { 
            page: pageData, 
            module1, 
            sports: req.sports || [],
            lang
        });
    } catch (err) {
        console.error('Error loading custom page:', err);
        res.redirect('/');
    }
});router.get('/debug-translation', async (req, res) => {
    try {
        const lessons = await getLessonsWithQuiz();
        const lang = req.query.lang || 'ms';
        const data = lessons.map(l => {
            const translated = translateText(l.title, lang);
            return {
                original: l.title,
                originalHex: Buffer.from(l.title).toString('hex'),
                lang,
                translated
            };
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ✅ EXPORT OBJEK YANG BETUL
module.exports = { 
    router, 
    getLessonsWithQuiz 
};