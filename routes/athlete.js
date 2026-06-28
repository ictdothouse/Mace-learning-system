// routes/athlete.js - VERSI DATABASE DRIVEN + R2 SIGNED URL
const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const Lesson = require('../models/Lesson'); // Import Model Lesson
const { generateCertificate } = require('../utils/certificate');

// ==========================================
// KONFIGURASI CLOUDFLARE R2 (VIDEO SULIT)
// ==========================================
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const getSecureVideoUrl = async (filename) => {
    if (!filename) return null;
    if (filename.startsWith('/uploads/') || filename.startsWith('http')) return filename;
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || 'modulmace',
            Key: filename
        });
        return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    } catch (err) {
        console.error('Error generating secure url:', err);
        return `/uploads/${filename}`;
    }
};

// ✅ FUNGSI ASYNC UNTUK AMBIL DATA DARI MONGODB
const getLessonsWithQuiz = async () => {
    return await Lesson.find().populate('moduleId').sort({ order: 1 }).lean();
};

const checkSession = (req, res, next) => req.session.athleteId ? next() : res.redirect('/');

// ==========================================
// ROUTES UTAMA
// ==========================================
router.get('/', (req, res) => res.render('entry', { error: null }));

router.post('/access', async (req, res) => {
    const { action, fullName, icNumber, jantina, umur, negeri, sukan } = req.body;
    try {
        if (action === 'new') {
            const existing = await Athlete.findOne({ icNumber });
            if (existing) return res.render('entry', { error: 'No. IC sudah berdaftar. Sila guna "Semak Akaun".' });
            const newAthlete = await Athlete.create({ fullName, icNumber, jantina, umur, negeriWakil: negeri, sukan });
            req.session.athleteId = newAthlete._id;
            res.redirect('/dashboard');
        } else if (action === 'resume') {
            const athlete = await Athlete.findOne({ icNumber, fullName: { $regex: new RegExp('^' + fullName + '$', 'i') } });
            if (!athlete) return res.render('entry', { error: 'Rekod tidak dijumpai. Semak Nama & No. IC.' });
            req.session.athleteId = athlete._id;
            res.redirect('/dashboard');
        }
    } catch (err) {
        console.error('Access Error:', err);
        res.render('entry', { error: 'Ralat sistem. Sila cuba lagi.' });
    }
});

router.get('/dashboard', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        if (!athlete) { req.session.destroy(); return res.redirect('/'); }
        
        // Ambil senarai lesson dengan tajuk sebenar dari DB dan populate modul
        const lessons = await Lesson.find({ isActive: true })
            .populate('moduleId')
            .sort({ order: 1 })
            .lean();
            
        res.render('dashboard', { athlete, lessons });
    } catch (err) { res.redirect('/'); }
});

router.get('/lesson/:id', checkSession, async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.session.athleteId);
        const moduleId = parseInt(req.params.id);
        if (athlete.currentStage < moduleId) return res.redirect('/dashboard');

        // ✅ AMBIL DATA DARI DATABASE
        const lessons = await getLessonsWithQuiz();
        const lesson = lessons[moduleId - 1];
        if (!lesson) return res.status(404).send('Modul tidak dijumpai');

        let secureVideoUrl = null;
        if (lesson.videoUrl) secureVideoUrl = await getSecureVideoUrl(lesson.videoUrl);

        const quizResult = req.session.quizResult || null;
        req.session.quizResult = null;

        res.render('lesson', { 
            athlete, lesson, moduleId, secureVideoUrl, quizResult,
            allLessons: lessons,
            error: req.session.error, success: req.session.success 
        });
        
        req.session.error = null; req.session.success = null;
    } catch (err) {
        console.error('Lesson Route Error:', err);
        res.redirect('/dashboard');
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
            if (moduleId === 1) { updateData['quizScores.quiz1'] = score; if (athlete.currentStage < 2) updateData.currentStage = 2; }
            else if (moduleId === 2) { updateData['quizScores.quiz2'] = score; if (athlete.currentStage < 3) updateData.currentStage = 3; }
            else if (moduleId === 3) { updateData['quizScores.quiz3'] = score; if (athlete.currentStage < 4) { updateData.currentStage = 4; updateData.completedAt = new Date(); } }
            
            await Athlete.findByIdAndUpdate(athlete._id, updateData);
        }

        req.session.quizResult = { passed, score, userAnswers };
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
            // Preview halaman HTML
            res.render('certificate-preview', { athlete });
        }
    } catch (err) { 
        console.error('Certificate Error:', err);
        res.redirect('/dashboard'); 
    }
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ✅ EXPORT OBJEK YANG BETUL
module.exports = { 
    router, 
    getLessonsWithQuiz 
};