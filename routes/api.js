const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Athlete = require('../models/Athlete');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const Level = require('../models/Level');
const Sport = require('../models/Sport');
const Page = require('../models/Page');
const Group = require('../models/Group');
const Branding = require('../models/Branding');
const { concurrencyGuardApi } = require('../middleware/concurrency');

// ==========================================
// R2 CLOUDFLARE SIGNED URL SETUP
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

const videoUrlCache = new Map();
const VIDEO_URL_CACHE_TTL = 30 * 60 * 1000;

const getSecureVideoUrl = async (filename) => {
    if (!filename) return null;
    if (filename.startsWith('/uploads/') || filename.startsWith('http')) return filename;
    
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
        videoUrlCache.set(filename, { url, expiry: Date.now() + VIDEO_URL_CACHE_TTL });
        return url;
    } catch (err) {
        console.error('Error generating secure R2 URL:', err);
        return `/uploads/${filename}`;
    }
};

// ==========================================
// IN-MEMORY CACHE HELPERS
// ==========================================
let lessonsCache = null;
let lessonsCacheTime = 0;
const LESSONS_CACHE_TTL = 5 * 60 * 1000;

const getLessonsWithQuiz = async () => {
    const now = Date.now();
    if (!lessonsCache || (now - lessonsCacheTime > LESSONS_CACHE_TTL)) {
        lessonsCache = await Lesson.find().populate('moduleId').sort({ order: 1 }).lean();
        lessonsCacheTime = now;
    }
    return lessonsCache;
};

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
// MIDDLEWARES
// ==========================================
const checkAthleteSession = (req, res, next) => {
    if (req.session.athleteId) return next();
    res.status(401).json({ error: 'Sesi anda telah tamat. Sila log masuk semula.' });
};

// ==========================================
// 1. SISTEM AUTHENTICATION API
// ==========================================

// GET: Semak Status Sesi Aktif
router.get('/auth/me', async (req, res) => {
    try {
        if (req.session.athleteId) {
            const athlete = await Athlete.findById(req.session.athleteId).lean();
            if (athlete) {
                return res.json({ authenticated: true, role: 'student', athlete });
            }
        }
        if (req.session.userId) {
            const user = await User.findById(req.session.userId).select('-password').lean();
            if (user) {
                return res.json({ authenticated: true, role: user.role, user });
            }
        }
        res.json({ authenticated: false });
    } catch (err) {
        console.error('API Check Auth Error:', err);
        res.status(500).json({ error: 'Ralat sistem pelayan.' });
    }
});

// POST: Pendaftaran / Semakan Masuk Atlet
router.post('/auth/access', async (req, res) => {
    const { action, fullName, icNumber, jantina, umur, negeri, sukan, enrollmentKey, password } = req.body;
    try {
        let branding = await Branding.findOne();
        if (!branding) branding = { loginMethod: 'name_ic' };
        
        const loginMethod = branding.loginMethod || 'name_ic';
        
        if (action === 'new') {
            if (!fullName || !icNumber) {
                return res.status(400).json({ error: 'Nama penuh dan No. IC wajib diisi.' });
            }
            if (!password) {
                return res.status(400).json({ error: 'Kata laluan wajib diisi untuk pendaftaran baru.' });
            }
            if (!jantina || !umur || !negeri || !sukan) {
                return res.status(400).json({ error: 'Sila lengkapkan semua butiran (Jantina, Umur, Negeri, Sukan).' });
            }
        } else if (action === 'resume') {
            if (loginMethod === 'name_ic') {
                if (!fullName || !icNumber) return res.status(400).json({ error: 'Nama penuh dan No. IC wajib diisi.' });
            } else if (loginMethod === 'ic_password') {
                if (!icNumber || !password) return res.status(400).json({ error: 'No. IC dan kata laluan wajib diisi.' });
            } else if (loginMethod === 'name_password') {
                if (!fullName || !password) return res.status(400).json({ error: 'Nama penuh dan kata laluan wajib diisi.' });
            }
        }
        
        let targetGroup = null;
        if (enrollmentKey && enrollmentKey.trim() !== '') {
            const cleanKey = enrollmentKey.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            targetGroup = await Group.findOne({ enrollmentKey: { $regex: new RegExp('^' + cleanKey + '$', 'i') } });
            if (!targetGroup) {
                return res.status(400).json({ error: 'Enrollment Key tidak sah. Sila semak semula.' });
            }
        }

        if (action === 'new') {
            const existing = await Athlete.findOne({ icNumber });
            if (existing) {
                return res.status(400).json({ error: 'No. IC sudah berdaftar. Sila guna "Semak Akaun".' });
            }
            const newAthlete = await Athlete.create({ 
                fullName, 
                icNumber, 
                jantina, 
                umur, 
                negeriWakil: negeri, 
                sukan,
                password: password || undefined,
                pdpaAccepted: true,
                pdpaAcceptedAt: new Date(),
                enrolledGroups: targetGroup ? [targetGroup._id] : []
            });
            req.session.athleteId = newAthlete._id;
            return res.json({ success: true, role: 'student', athlete: newAthlete });
        } else if (action === 'resume') {
            // Find athlete depending on login method
            let athlete = null;
            if (loginMethod === 'name_ic' || loginMethod === 'ic_password') {
                athlete = await Athlete.findOne({ icNumber });
                if (!athlete) {
                    return res.status(404).json({ error: 'No. IC tidak dijumpai dalam sistem.' });
                }
            } else if (loginMethod === 'name_password') {
                // Find by name (loose match)
                const cleanInputName = fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const athletes = await Athlete.find();
                athlete = athletes.find(a => {
                    const cleanDbName = a.fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    return cleanDbName === cleanInputName || cleanDbName.includes(cleanInputName);
                });
                if (!athlete) {
                    return res.status(404).json({ error: 'Nama penuh tidak dijumpai dalam sistem.' });
                }
            }
            
            // Password Check
            if (loginMethod === 'ic_password' || loginMethod === 'name_password') {
                const isMatch = await athlete.comparePassword(password);
                if (!isMatch) {
                    return res.status(400).json({ error: 'Kata laluan salah.' });
                }
            }

            // Loose name matching for name_ic
            if (loginMethod === 'name_ic') {
                const cleanDbName = athlete.fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const cleanInputName = fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                if (cleanDbName !== cleanInputName && !cleanDbName.includes(cleanInputName)) {
                    return res.status(400).json({ error: 'Nama penuh tidak sepadan dengan rekod No. IC ini.' });
                }
            }

            if (targetGroup) {
                await Athlete.findByIdAndUpdate(athlete._id, {
                    $addToSet: { enrolledGroups: targetGroup._id }
                });
                if (!athlete.enrolledGroups) athlete.enrolledGroups = [];
                if (!athlete.enrolledGroups.includes(targetGroup._id.toString())) {
                    athlete.enrolledGroups.push(targetGroup._id);
                }
            }

            req.session.athleteId = athlete._id;
            return res.json({ success: true, role: 'student', athlete });
        } else {
            return res.status(400).json({ error: 'Aksi pendaftaran tidak sah.' });
        }
    } catch (err) {
        console.error('API Access Error:', err);
        res.status(500).json({ error: 'Ralat sistem pendaftaran: ' + err.message });
    }
});

// POST: Log Masuk Admin / Guru
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Sila masukkan email/username dan kata laluan.' });
        }
        
        const loginInput = email.trim().toLowerCase();
        let user = await User.findOne({ 
            $or: [
                { email: loginInput },
                { username: loginInput }
            ], 
            isActive: true 
        });
        
        if (!user) {
            user = await User.findOne({ 
                fullName: { $regex: new RegExp('^' + email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
                role: { $in: ['admin', 'teacher'] },
                isActive: true 
            });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Email/username tidak dijumpai atau akaun tidak aktif.' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Kata laluan salah.' });
        }
        
        user.lastLogin = new Date();
        await user.save();
        
        req.session.userId = user._id.toString();
        req.session.userRole = user.role;
        req.session.userName = user.fullName;
        
        res.json({ 
            success: true, 
            role: user.role, 
            user: { id: user._id, fullName: user.fullName, role: user.role } 
        });
    } catch (err) {
        console.error('API Login Error:', err);
        res.status(500).json({ error: 'Ralat sistem log masuk.' });
    }
});

// POST: Log Keluar Sesi
router.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Gagal membersihkan sesi log keluar.' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// ==========================================
// 2. DATA SISTEM & UTILITIES API
// ==========================================

// GET: Dapatkan Senarai Sukan
router.get('/sports', async (req, res) => {
    try {
        const sports = await Sport.find().sort({ name: 1 }).lean();
        res.json(sports);
    } catch (err) {
        res.status(500).json({ error: 'Gagal memuatkan senarai sukan.' });
    }
});

// GET: Dapatkan Tetapan Penjenamaan (Branding)
router.get('/branding', (req, res) => {
    const rawBranding = res.locals.branding;
    const branding = (rawBranding && typeof rawBranding.toObject === 'function') 
        ? rawBranding.toObject() 
        : { ...(rawBranding || {}) };
    branding.navPages = res.locals.navPages || [];
    res.json(branding);
});

// ==========================================
// 3. ATHLETE DASHBOARD & LESSONS API
// ==========================================

// âš¡ Lindungi semua laluan /athlete dengan sistem giliran
router.use('/athlete', checkAthleteSession, concurrencyGuardApi);

// GET: Data Dashboard Atlet (Modul, Levels & Lessons)
router.get('/athlete/dashboard', async (req, res) => {
    try {
        const [athlete, modules, allLessons, levels] = await Promise.all([
            Athlete.findById(req.session.athleteId).lean(),
            Module.find({ isActive: { $ne: false } }).sort({ order: 1 }).lean(),
            getLessonsWithQuiz(),
            Level.find().sort({ order: 1 }).lean()
        ]);

        if (!athlete) return res.status(404).json({ error: 'Data atlet tidak dijumpai.' });

        const activeLessons = allLessons.filter(l => l.isActive !== false);

        const lang = req.cookies && req.cookies.lang || 'ms';
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

        const translatedModules = modules.map(m => ({
            ...m,
            title: translateText(m.title, lang),
            description: translateText(m.description, lang)
        }));

        res.json({
            athlete,
            modules: translatedModules,
            lessons: translatedLessons,
            levels
        });
    } catch (err) {
        console.error('API Athlete Dashboard Error:', err);
        res.status(500).json({ error: 'Gagal memuatkan maklumat dashboard.' });
    }
});

// GET: Data Lesson Spesifik
router.get('/athlete/lesson/:id', async (req, res) => {
    try {
        const moduleId = parseInt(req.params.id);
        const [athlete, lessons] = await Promise.all([
            Athlete.findById(req.session.athleteId).lean(),
            getLessonsWithQuiz()
        ]);

        if (athlete.currentStage < moduleId) {
            return res.status(403).json({ error: 'Akses ditolak. Sila lengkapkan modul terdahulu.' });
        }
        const lang = req.cookies && req.cookies.lang || 'ms';
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
        if (!lesson) return res.status(404).json({ error: 'Modul pembelajaran tidak dijumpai.' });

        let secureVideoUrl = null;
        if (lesson.videoUrl) secureVideoUrl = await getSecureVideoUrl(lesson.videoUrl);

        res.json({
            athlete,
            lesson,
            secureVideoUrl,
            allLessons: translatedLessons
        });
    } catch (err) {
        console.error('API Lesson Fetch Error:', err);
        res.status(500).json({ error: 'Gagal memuatkan data pembelajaran.' });
    }
});

// POST: Tandakan Lesson sebagai Selesai (Tonton Habis)
router.post('/athlete/mark-watched/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        const moduleId = parseInt(req.params.id);
        if (!athlete.watchedLessons) athlete.watchedLessons = [];
        
        if (!athlete.watchedLessons.includes(moduleId)) {
            athlete.watchedLessons.push(moduleId);
            await athlete.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Gagal menjejaki video tontonan.' });
    }
});

// POST: Hantar Jawapan Kuiz & Kira Markah
router.post('/athlete/submit-quiz/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        const moduleId = parseInt(req.params.id);
        
        const isAlreadyPassed = 
            (moduleId === 1 && athlete.quizScores.quiz1 >= 80) ||
            (moduleId === 2 && athlete.quizScores.quiz2 >= 80) ||
            (moduleId === 3 && athlete.quizScores.quiz3 >= 80);

        if (!isAlreadyPassed && (!athlete.watchedLessons || !athlete.watchedLessons.includes(moduleId))) {
            return res.status(400).json({ error: "Sila tonton video modul ini sepenuhnya sebelum menjawab kuiz." });
        }

        const userAnswers = req.body.answers || {}; 
        const lessons = await getLessonsWithQuiz();
        const currentLesson = lessons[moduleId - 1];
        
        if (!currentLesson || !currentLesson.quizQuestions || currentLesson.quizQuestions.length === 0) {
            return res.status(400).json({ error: "Soalan kuiz tidak ditemui." });
        }

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
                const userAnsText = (userAns || '').toString().trim().toLowerCase();
                const correctAnsText = (q.correctAnswerText || '').toString().trim().toLowerCase();
                if (userAnsText && correctAnsText && userAnsText === correctAnsText) {
                    earnedPoints += points;
                }
            }
        });

        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = score >= (currentLesson.passMark || 80);

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

        res.json({ passed, score, userAnswers, totalPoints, earnedPoints });
    } catch (err) {
        console.error('API Submit Quiz Error:', err);
        res.status(500).json({ error: 'Ralat menghantar keputusan kuiz.' });
    }
});

// ==========================================
// 4. CMS DYNAMIC CUSTOM PAGES API
// ==========================================

// In-memory cache for CMS custom pages
const pagesCache = new Map();
const PAGES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET: Pemuatan Halaman CMS Dinamik
router.get('/pages/:slug', async (req, res) => {
    const { slug } = req.params;
    const now = Date.now();

    // Check if fresh cache exists
    if (pagesCache.has(slug)) {
        const cached = pagesCache.get(slug);
        if (now - cached.time < PAGES_CACHE_TTL) {
            return res.json(cached.data);
        }
    }

    try {
        const page = await Page.findOne({ slug, isPublished: true }).lean();
        if (!page) return res.status(404).json({ error: 'Halaman tidak dijumpai.' });
        
        let module1 = null;
        if (page.customTemplate === 'modules') {
            module1 = await Module.findOne({ order: 1 }).lean();
        }

        const responseData = { page, module1 };
        pagesCache.set(slug, {
            data: responseData,
            time: now
        });

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: 'Gagal memuatkan kandungan halaman.' });
    }
});

// In-memory cache for translation dictionaries
const localesCache = {};

// GET: Dapatkan Kamus Terjemahan Halaman
router.get('/locales/:lang', (req, res) => {
    try {
        const lang = req.params.lang === 'en' ? 'en' : 'ms';
        if (!localesCache[lang]) {
            localesCache[lang] = require(`../locales/${lang}.json`);
        }
        res.json(localesCache[lang]);
    } catch (err) {
        console.error('API Locales Error:', err);
        res.status(500).json({ error: 'Gagal memuatkan kamus terjemahan.' });
    }
});

// ==========================================
// MODULE LANDING PAGE API (for React SPA)
// ==========================================
router.get('/module/:id', async (req, res) => {
    try {
        const module = await Module.findById(req.params.id).lean();
        if (!module) return res.status(404).json({ error: 'Modul tidak dijumpai.' });

        let levels = await Level.find({ moduleId: module._id }).sort({ order: 1 }).lean();

        // Seed default levels if none exist (mirrors athlete.js logic)
        if (!levels || levels.length === 0) {
            const defaultLevels = [
                { moduleId: module._id, name: 'BRONZE (ASAS)', name_en: 'BRONZE (BASICS)', description: 'Peringkat Asas - Peraturan & Kesedaran Asas', description_en: 'Basic Level - Basic Rules & Awareness', targetAudience: 'Semua atlet', targetAudience_en: 'All athletes', duration: '15 minit', duration_en: '15 mins', order: 1 },
                { moduleId: module._id, name: 'SILVER (PERTENGAHAN)', name_en: 'SILVER (INTERMEDIATE)', description: 'Peringkat Pertengahan - Jenis Salah Laku', description_en: 'Intermediate Level - Types of Misconduct', targetAudience: 'Atlet aktif', targetAudience_en: 'Active athlete', duration: '15 - 20 minit', duration_en: '15 - 20 mins', order: 2 },
                { moduleId: module._id, name: 'GOLD (LEVEL 3)', name_en: 'GOLD (LEVEL 3)', description: 'Peringkat Emas - Kesedaran Buli & Gangguan', description_en: 'Gold Level - Bullying & Harassment Awareness', targetAudience: 'Atlet elit', targetAudience_en: 'Elite athlete', duration: '20 - 30 minit', duration_en: '20 - 30 mins', order: 3 },
                { moduleId: module._id, name: 'PLATINUM (ADVANCED)', name_en: 'PLATINUM (ADVANCED)', description: 'Peringkat Platinum - Pelaporan dan Tindakan', description_en: 'Platinum Level - Reporting and Action', targetAudience: 'Atlet profesional', targetAudience_en: 'Professional athlete', duration: '30 - 45 minit', duration_en: '30 - 45 mins', order: 4 }
            ];
            const inserted = await Level.insertMany(defaultLevels);
            const currentLessons = await Lesson.find({ moduleId: module._id }).sort({ order: 1 });
            if (currentLessons.length >= 1) await Lesson.findByIdAndUpdate(currentLessons[0]._id, { levelId: inserted[0]._id });
            if (currentLessons.length >= 2) await Lesson.findByIdAndUpdate(currentLessons[1]._id, { levelId: inserted[1]._id });
            if (currentLessons.length >= 3) await Lesson.findByIdAndUpdate(currentLessons[2]._id, { levelId: inserted[2]._id });
            levels = await Level.find({ moduleId: module._id }).sort({ order: 1 }).lean();
        }

        // Attach firstLessonId to each level
        const levelsWithLesson = await Promise.all(levels.map(async (l) => {
            const firstLesson = await Lesson.findOne({ levelId: l._id, isActive: true }).sort({ order: 1 }).lean();
            return { ...l, firstLessonId: firstLesson ? firstLesson._id : null };
        }));

        // First lesson of whole module (for no-levels fallback)
        const firstLesson = await Lesson.findOne({ moduleId: module._id, isActive: true }).sort({ order: 1 }).lean();

        // Check if athlete is logged in
        const isLoggedIn = !!req.session.athleteId;

        res.json({
            module,
            levels: levelsWithLesson,
            firstLessonId: firstLesson ? firstLesson._id : null,
            isLoggedIn
        });
    } catch (err) {
        console.error('API Module Error:', err);
        res.status(500).json({ error: 'Ralat memuatkan modul.' });
    }
});

module.exports = router;

