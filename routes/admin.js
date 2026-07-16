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
const LessonProgress = require('../models/LessonProgress');
const Page = require('../models/Page');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const axios = require('axios');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Cloudflare R2 client for Featured Images upload
const r2Client = new S3Client({
    region: 'auto',
    forcePathStyle: true,
    endpoint: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const processAndUploadImage = async (file, urlInput) => {
    let inputBuffer = null;
    let originalName = 'image.png';

    if (file) {
        // Read file from disk
        inputBuffer = fs.readFileSync(file.path);
        originalName = file.originalname;
        // Clean up temporary file
        try {
            fs.unlinkSync(file.path);
        } catch (err) {
            console.error('Error deleting temp file:', err);
        }
    } else if (urlInput && urlInput.trim() !== '') {
        try {
            const response = await axios.get(urlInput, { responseType: 'arraybuffer' });
            inputBuffer = Buffer.from(response.data);
            const urlParts = urlInput.split('/');
            originalName = urlParts[urlParts.length - 1].split('?')[0] || 'url-image.png';
        } catch (err) {
            console.error('Error fetching image from URL:', err.message);
            return urlInput; // Fallback to raw URL
        }
    }

    if (!inputBuffer) return null;

    try {
        // Compress and convert to webp using sharp
        const compressedBuffer = await sharp(inputBuffer)
            .resize({ width: 1200, height: 800, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const filename = `${Date.now()}-${path.parse(originalName).name}.webp`;

        // Check if R2 is configured
        const hasR2 = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ACCOUNT_ID;
        if (hasR2) {
            const bucketName = process.env.R2_BUCKET_NAME || 'modulmace';
            await r2Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: filename,
                Body: compressedBuffer,
                ContentType: 'image/webp'
            }));
            
            let publicUrlBase = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
            if (publicUrlBase && !publicUrlBase.startsWith('http://') && !publicUrlBase.startsWith('https://')) {
                publicUrlBase = 'https://' + publicUrlBase;
            }
            return `${publicUrlBase}/${filename}`;
        } else {
            // Local fallback
            const localPath = path.join(__dirname, '../uploads', filename);
            const dir = path.dirname(localPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(localPath, compressedBuffer);
            return `/uploads/${filename}`;
        }
    } catch (err) {
        console.error('Error processing image:', err);
        if (file) {
            return `/uploads/${file.filename}`;
        }
        return urlInput || null;
    }
};

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

// GET: API to generate signed URL dynamically for frontend previews
router.get('/api/sign-video-url', async (req, res) => {
    const filename = req.query.filename;
    if (!filename) return res.json({ url: '' });
    
    const signedUrl = await getSecureVideoUrl(filename);
    res.json({ url: signedUrl });
});

const compressVideo = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        // We compress the video using ffmpeg:
        // -crf 28: good compression ratio, keeping great quality
        // -preset veryfast: extremely fast compression, safe from HTTP timeout limits
        execFile(ffmpegPath, [
            '-i', inputPath,
            '-vcodec', 'libx264',
            '-crf', '28',
            '-preset', 'veryfast',
            '-maxrate', '1.5M',
            '-bufsize', '3M',
            '-acodec', 'aac',
            '-b:a', '128k',
            '-y',
            outputPath
        ], (error, stdout, stderr) => {
            if (error) {
                console.error('FFmpeg error:', error);
                return reject(error);
            }
            resolve(outputPath);
        });
    });
};

const processAndUploadVideo = async (file, urlInput) => {
    let inputPath = null;
    let originalName = 'video.mp4';
    let isTempFile = false;

    if (file) {
        inputPath = file.path;
        originalName = file.originalname;
    } else if (urlInput && urlInput.trim() !== '') {
        if (urlInput.startsWith('http')) {
            try {
                const tempFilename = `temp-download-${Date.now()}.mp4`;
                const tempPath = path.join(__dirname, '../uploads', tempFilename);
                const writer = fs.createWriteStream(tempPath);
                
                const response = await axios({
                    url: urlInput,
                    method: 'GET',
                    responseType: 'stream'
                });
                
                response.data.pipe(writer);
                
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                
                inputPath = tempPath;
                originalName = urlInput.split('/').pop() || 'downloaded-video.mp4';
                isTempFile = true;
            } catch (err) {
                console.error('Error downloading video from URL:', err.message);
                return urlInput; // Fallback to raw URL
            }
        } else {
            return urlInput;
        }
    }

    if (!inputPath) return null;

    const compressedFilename = `compressed-${Date.now()}-${path.parse(originalName).name}.mp4`;
    const compressedPath = path.join(__dirname, '../uploads', compressedFilename);

    try {
        console.log(`Starting video compression for: ${inputPath}`);
        await compressVideo(inputPath, compressedPath);
        console.log(`Video compression finished: ${compressedPath}`);
        
        // Clean up input file
        if (file || isTempFile) {
            try {
                fs.unlinkSync(inputPath);
            } catch (err) {
                console.error('Error deleting input video file:', err);
            }
        }

        const hasR2 = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ACCOUNT_ID;
        if (hasR2) {
            const bucketName = process.env.R2_BUCKET_NAME || 'modulmace';
            const compressedBuffer = fs.readFileSync(compressedPath);
            
            await r2Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: compressedFilename,
                Body: compressedBuffer,
                ContentType: 'video/mp4'
            }));
            
            try {
                fs.unlinkSync(compressedPath);
            } catch (err) {
                console.error('Error deleting compressed video file:', err);
            }
            
            return compressedFilename;
        } else {
            return `/uploads/${compressedFilename}`;
        }
    } catch (err) {
        console.error('Error processing/compressing video:', err);
        if (file) {
            const fallbackFilename = `original-${Date.now()}-${originalName}`;
            const fallbackPath = path.join(__dirname, '../uploads', fallbackFilename);
            try {
                fs.renameSync(inputPath, fallbackPath);
                return `/uploads/${fallbackFilename}`;
            } catch (renameErr) {
                return `/uploads/${file.filename}`;
            }
        }
        return urlInput || null;
    }
};

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

// Basic Auth / Session Middleware
const requireAdminAuth = (req, res, next) => {
    // Jika sudah log masuk melalui borang (/auth/login) sebagai admin
    if (req.session && req.session.userId && req.session.userRole === 'admin') {
        return next();
    }
    
    // Jika belum log masuk, gunakan Basic Auth (untuk master admin dari .env)
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        // Set info sementara supaya page tidak crash jika cari user nama
        res.locals.isMasterAdmin = true;
        return next();
    }
    
    res.set('WWW-Authenticate', 'Basic realm="MSN Admin Panel"');
    res.status(401).send('Akses Ditolak. Sila log masuk melalui /auth/login atau masukkan kata laluan.');
};
router.use(requireAdminAuth);

// GET: Generate Pre-signed URL for direct browser upload to R2
router.get('/api/presigned-url', async (req, res) => {
    try {
        const { filename, contentType } = req.query;
        if (!filename || !contentType) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const hasR2 = process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ACCOUNT_ID;
        const bucketName = process.env.R2_BUCKET_NAME || 'modulmace';
        
        const sanitizeFilename = (name) => {
            return name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
        };
        const uniqueFilename = `${Date.now()}-${sanitizeFilename(filename)}`;
        if (hasR2) {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: uniqueFilename,
                ContentType: contentType
            });

            // Pre-signed URL valid for 15 minutes (900 seconds)
            const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
            let publicUrlBase = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
            if (publicUrlBase && !publicUrlBase.startsWith('http://') && !publicUrlBase.startsWith('https://')) {
                publicUrlBase = 'https://' + publicUrlBase;
            }
            const publicUrl = `${publicUrlBase}/${uniqueFilename}`;

            res.json({
                uploadUrl,
                fileKey: uniqueFilename,
                publicUrl,
                isR2: true
            });
        } else {
            // Local fallback upload url
            res.json({
                uploadUrl: '/admin-mace/api/local-upload',
                fileKey: uniqueFilename,
                publicUrl: `/uploads/${uniqueFilename}`,
                isR2: false
            });
        }
    } catch (err) {
        console.error('Presigned URL error:', err);
        res.status(500).json({ error: 'Failed to generate pre-signed URL' });
    }
});

// POST: Local fallback file upload endpoint (when R2 is not configured)
router.post('/api/local-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileKey = req.body.fileKey;
        if (fileKey) {
            const oldPath = req.file.path;
            const newPath = path.join(__dirname, '../uploads', fileKey);
            fs.renameSync(oldPath, newPath);
        }
        res.json({ success: true, url: `/uploads/${fileKey || req.file.filename}` });
    } catch (err) {
        console.error('Local upload error:', err);
        res.status(500).json({ error: 'Local upload failed' });
    }
});

// GET: Dashboard Utama (Urusan Kemajuan Atlit SUKMA)
router.get('/', async (req, res) => {
    try {
        const total = await Athlete.countDocuments();
        const passed = await Athlete.countDocuments({ currentStage: 4 });
        const byState = await Athlete.aggregate([
            { $group: { _id: '$negeriWakil', total: { $sum: 1 }, passed: { $sum: { $cond: [{ $eq: ['$currentStage', 4] }, 1, 0] } } } },
            { $sort: { total: -1 } }
        ]);

        const athletes = await Athlete.find().sort({ createdAt: -1 }).limit(100);
        
        // === SISTEM BARU: LessonProgress ===
        const athleteIds = athletes.map(a => a._id);
        const users = await User.find({ athleteId: { $in: athleteIds } });
        
        const athleteUserMap = {};
        users.forEach(u => {
            if (u.athleteId) athleteUserMap[u.athleteId.toString()] = u._id;
        });

        const allModules = await Module.find({ isActive: true }).sort({ order: 1 });
        const allLessons = await Lesson.find({ isActive: true });
        
        const moduleLessonCount = {};
        allModules.forEach(m => {
            moduleLessonCount[m._id.toString()] = allLessons.filter(l => l.moduleId && l.moduleId.toString() === m._id.toString()).length;
        });

        const userIds = users.map(u => u._id);
        const progresses = userIds.length > 0 
            ? await LessonProgress.find({ userId: { $in: userIds } })
            : [];

        const userCompletedCount = {};
        const userLessonsProgress = {};
        progresses.forEach(p => {
            const uId = p.userId.toString();
            const mId = p.moduleId.toString();
            const lId = p.lessonId.toString();

            if (!userCompletedCount[uId]) userCompletedCount[uId] = {};
            if (!userCompletedCount[uId][mId]) userCompletedCount[uId][mId] = 0;
            if (p.isCompleted) {
                userCompletedCount[uId][mId]++;
            }

            if (!userLessonsProgress[uId]) userLessonsProgress[uId] = {};
            if (!userLessonsProgress[uId][mId]) userLessonsProgress[uId][mId] = {};
            userLessonsProgress[uId][mId][lId] = p;
        });

        // === GABUNG DUA SISTEM ===
        const athletesWithProgress = athletes.map(a => {
            const athleteObj = a.toObject();
            const userId = athleteUserMap[a._id.toString()];
            
            athleteObj.progress = [];
            athleteObj.hasAccount = !!userId;

            // --- Sistem Baru: User + LessonProgress ---
            if (userId && allModules.length > 0) {
                allModules.forEach(m => {
                    const mIdStr = m._id.toString();
                    const total = moduleLessonCount[mIdStr] || 0;
                    if (total > 0) {
                        const completed = (userCompletedCount[userId.toString()] && userCompletedCount[userId.toString()][mIdStr]) || 0;
                        const percent = Math.round((completed / total) * 100);
                        
                        const mLessons = allLessons.filter(l => l.moduleId && l.moduleId.toString() === mIdStr).map(l => {
                            const lProg = userLessonsProgress[userId.toString()] && userLessonsProgress[userId.toString()][mIdStr] && userLessonsProgress[userId.toString()][mIdStr][l._id.toString()];
                            return {
                                title: l.title,
                                isCompleted: lProg ? lProg.isCompleted : false,
                                score: lProg ? lProg.bestScore : 0
                            };
                        });

                        athleteObj.progress.push({
                            moduleId: m._id,
                            moduleTitle: m.title,
                            completed,
                            total,
                            percent,
                            isFinished: completed >= total,
                            source: 'new',
                            lessons: mLessons
                        });
                    }
                });
            }

            // --- Sistem Lama: Athlete.quizScores + currentStage ---
            // Jika tiada progress dari sistem baru, paparkan dari sistem lama
            if (athleteObj.progress.length === 0) {
                const stage = athleteObj.currentStage || 1;
                const scores = athleteObj.quizScores || {};
                
                // Ambil tajuk sebenar dari lessons (sorted by order), fallback ke "Pembelajaran N"
                const sortedLessons = allLessons.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
                const legacyDefs = [
                    { quizKey: 'quiz1', stageRequired: 1, stagePassed: 2 },
                    { quizKey: 'quiz2', stageRequired: 2, stagePassed: 3 },
                    { quizKey: 'quiz3', stageRequired: 3, stagePassed: 4 }
                ];
                
                legacyDefs.forEach((m, i) => {
                    const moduleData = allModules[i];
                    if (allModules.length > 0 && !moduleData) return;
                    const title = moduleData ? moduleData.title : `Modul ${i + 1}`;
                    const score = scores[m.quizKey] || 0;
                    const isFinished = stage >= m.stagePassed;
                    
                    let mLessons = [];
                    if (moduleData) {
                        const actualLessons = allLessons.filter(l => l.moduleId && l.moduleId.toString() === moduleData._id.toString());
                        mLessons = actualLessons.map(l => ({
                            title: l.title,
                            isCompleted: isFinished,
                            score: isFinished ? score : (stage === m.stageRequired ? score : 0)
                        }));
                    } else {
                        mLessons = [{ title: `Kuiz`, isCompleted: isFinished, score: score }];
                    }

                    athleteObj.progress.push({
                        moduleTitle: title,
                        completed: isFinished ? 1 : 0,
                        total: 1,
                        percent: score,
                        isFinished,
                        score,
                        source: 'legacy',
                        lessons: mLessons
                    });
                });
                athleteObj.hasAccount = true;
            }


            return athleteObj;
        });

        res.render('admin', { 
            page: 'dashboard', 
            total, 
            passed, 
            learning: total - passed, 
            byState, 
            athletes: athletesWithProgress, 
            msg: req.query.msg || null, 
            file: req.query.file || null 
        });
    } catch (err) { 
        console.error('Dashboard Load Error:', err);
        res.send('Ralat memuatkan dashboard.'); 
    }
});


// GET: Tetapan Sistem
router.get('/settings', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        let uploadedFiles = [];
        if (fs.existsSync(uploadsDir)) uploadedFiles = fs.readdirSync(uploadsDir).map(f => ({ name: f, size: (fs.statSync(path.join(uploadsDir, f)).size / 1024).toFixed(1) + ' KB' }));
        
        const Sport = require('../models/Sport');
        const sportsList = await Sport.find().sort({ name: 1 });
        
        res.render('admin', { 
            page: 'settings', 
            uploadedFiles, 
            sportsList,
            msg: req.query.msg || null, 
            file: req.query.file || null, 
            tab: req.query.tab || 'general' 
        });
    } catch (err) { 
        console.error('Settings error:', err);
        res.send('Error loading settings'); 
    }
});

// POST: Tambah Sukan Baru
router.post('/settings/sports/add', async (req, res) => {
    try {
        const { sportName } = req.body;
        if (!sportName || !sportName.trim()) {
            return res.redirect('/admin-mace/settings?tab=sports&msg=sport_required');
        }
        const Sport = require('../models/Sport');
        
        // Cek duplicate
        const exists = await Sport.findOne({ name: sportName.trim() });
        if (exists) {
            return res.redirect('/admin-mace/settings?tab=sports&msg=sport_exists');
        }
        
        await Sport.create({ name: sportName.trim() });
        res.redirect('/admin-mace/settings?tab=sports&msg=sport_added');
    } catch (err) {
        console.error('Add sport error:', err);
        res.redirect('/admin-mace/settings?tab=sports&msg=error');
    }
});

// POST: Padam Sukan
router.post('/settings/sports/delete/:id', async (req, res) => {
    try {
        const Sport = require('../models/Sport');
        await Sport.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/settings?tab=sports&msg=sport_deleted');
    } catch (err) {
        console.error('Delete sport error:', err);
        res.redirect('/admin-mace/settings?tab=sports&msg=error');
    }
});
router.post('/upload-data', upload.single('dataFile'), async (req, res) => {
    try {
        if (!req.file) return res.redirect('/admin-mace/settings?msg=error_no_file');
        
        const fs = require('fs');
        const filePath = req.file.path;
        
        // Baca fail JSON
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        // Import models
        const Athlete = require('../models/Athlete');
        const Module = require('../models/Module');
        const Lesson = require('../models/Lesson');
        const Branding = require('../models/Branding');
        const Group = require('../models/Group');
        const Page = require('../models/Page');
        const Level = require('../models/Level');
        const CertificateTemplate = require('../models/CertificateTemplate');
        const Sport = require('../models/Sport');
        const User = require('../models/User');
        const LessonProgress = require('../models/LessonProgress');
        const LevelProgress = require('../models/LevelProgress');
        const QuizResult = require('../models/QuizResult');
        const QuestionBank = require('../models/QuestionBank');
        
        // Bersihkan database (drop semua)
        await Promise.all([
            Athlete.deleteMany({}),
            Module.deleteMany({}),
            Lesson.deleteMany({}),
            Branding.deleteMany({}),
            Group.deleteMany({}),
            Page.deleteMany({}),
            Level.deleteMany({}),
            CertificateTemplate.deleteMany({}),
            Sport.deleteMany({}),
            User.deleteMany({}),
            LessonProgress.deleteMany({}),
            LevelProgress.deleteMany({}),
            QuizResult.deleteMany({}),
            QuestionBank.deleteMany({})
        ]);
        
        // Masukkan data baru
        if (data.branding) await Branding.create(data.branding);
        if (data.groups && data.groups.length > 0) await Group.insertMany(data.groups);
        if (data.modules && data.modules.length > 0) await Module.insertMany(data.modules);
        if (data.lessons && data.lessons.length > 0) await Lesson.insertMany(data.lessons);
        
        if (data.athletes && data.athletes.length > 0) {
            // Fix missing required fields for older backups
            const athletesToInsert = data.athletes.map(a => {
                if (!a.sukan) a.sukan = 'Umum';
                return a;
            });
            await Athlete.insertMany(athletesToInsert);
        }
        
        if (data.pages && data.pages.length > 0) await Page.insertMany(data.pages);
        if (data.levels && data.levels.length > 0) await Level.insertMany(data.levels);
        if (data.templates && data.templates.length > 0) await CertificateTemplate.insertMany(data.templates);
        if (data.sports && data.sports.length > 0) await Sport.insertMany(data.sports);
        if (data.users && data.users.length > 0) await User.insertMany(data.users);
        if (data.lessonProgresses && data.lessonProgresses.length > 0) await LessonProgress.insertMany(data.lessonProgresses);
        if (data.levelProgresses && data.levelProgresses.length > 0) await LevelProgress.insertMany(data.levelProgresses);
        if (data.quizResults && data.quizResults.length > 0) await QuizResult.insertMany(data.quizResults);
        if (data.questionBanks && data.questionBanks.length > 0) await QuestionBank.insertMany(data.questionBanks);
        
        // Refresh branding cache so the restored branding shows up immediately
        if (typeof req.refreshBrandingCache === 'function') {
            await req.refreshBrandingCache();
        }
        
        // Buang fail selepas berjaya
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        res.redirect('/admin-mace/settings?msg=success_upload');
    } catch (err) { 
        console.error('JSON Import Error:', err);
        res.redirect('/admin-mace/settings?msg=error_upload'); 
    }
});

router.get('/download-system-data', async (req, res) => {
    try {
        const Athlete = require('../models/Athlete');
        const Module = require('../models/Module');
        const Lesson = require('../models/Lesson');
        const Branding = require('../models/Branding');
        const Group = require('../models/Group');
        const Page = require('../models/Page');
        const Level = require('../models/Level');
        const CertificateTemplate = require('../models/CertificateTemplate');
        const Sport = require('../models/Sport');
        const User = require('../models/User');
        const LessonProgress = require('../models/LessonProgress');
        const LevelProgress = require('../models/LevelProgress');
        const QuizResult = require('../models/QuizResult');
        const QuestionBank = require('../models/QuestionBank');

        const [athletes, modules, lessons, branding, groups, pages, levels, templates, sports, users, lessonProgresses, levelProgresses, quizResults, questionBanks] = await Promise.all([
            Athlete.find().lean(),
            Module.find().lean(),
            Lesson.find().lean(),
            Branding.findOne().lean(),
            Group.find().lean(),
            Page.find().lean(),
            Level.find().lean(),
            CertificateTemplate.find().lean(),
            Sport.find().lean(),
            User.find().lean(),
            LessonProgress.find().lean(),
            LevelProgress.find().lean(),
            QuizResult.find().lean(),
            QuestionBank.find().lean()
        ]);

        const exportData = {
            exportDate: new Date().toISOString(),
            branding,
            groups,
            modules,
            lessons,
            athletes,
            pages,
            levels,
            templates,
            sports,
            users,
            lessonProgresses,
            levelProgresses,
            quizResults,
            questionBanks
        };

        res.setHeader('Content-disposition', 'attachment; filename=mace_system_data.json');
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(exportData, null, 2));
    } catch (err) {
        console.error('Export Error:', err);
        res.redirect('/admin-mace/settings?msg=error_export');
    }
});

router.get('/download-pdpa', async (req, res) => {
    try {
        const Athlete = require('../models/Athlete');
        const athletes = await Athlete.find({ pdpaAccepted: true }).sort({ pdpaAcceptedAt: -1 }).lean();
        
        let csvContent = "Nama Penuh,No Kad Pengenalan,Status PDPA,Tarikh Persetujuan\n";
        
        athletes.forEach(a => {
            const dateStr = a.pdpaAcceptedAt 
                ? new Date(a.pdpaAcceptedAt).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }) 
                : "Tiada Rekod Tarikh";
            csvContent += `"${a.fullName}","${a.icNumber}","Bersetuju","${dateStr}"\n`;
        });
        
        res.setHeader('Content-disposition', 'attachment; filename=rekod_persetujuan_pdpa.csv');
        res.setHeader('Content-type', 'text/csv; charset=utf-8');
        res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8')); // Add BOM for Excel UTF-8 support
    } catch (err) {
        console.error('PDPA Export Error:', err);
        res.redirect('/admin-mace/settings?msg=error_export');
    }
});

// POST: Kemaskini Penjenamaan (Branding)
router.post('/settings/branding', async (req, res) => {
    try {
        const { 
            siteName, tagline, primaryColor, dashboardTitle, dashboardTitle_en, dashboardSubtitle, dashboardSubtitle_en, logoUrl, faviconUrl,
            homeBannerTitle, homeBannerTitle_en, homeBannerImage, homeBgImage, homeLeftColumnHtml, homeLeftColumnHtml_en, menuLinksJson,
            footerText, footerLinksJson,
            termTeacher_ms, termTeacher_en, termStudent_ms, termStudent_en,
            homeFormSubtitle, homeFormSubtitle_en,
            pdpaTitle, pdpaTitle_en, pdpaDesc1, pdpaDesc1_en, pdpaDesc2, pdpaDesc2_en,
            pdpaCheckbox, pdpaCheckbox_en, pdpaBtnAgree, pdpaBtnAgree_en, pdpaBtnCancel, pdpaBtnCancel_en
        } = req.body;
        const Branding = require('../models/Branding');
        
        let branding = await Branding.findOne();
        if (!branding) {
            branding = new Branding();
        }
        
        if (siteName !== undefined) branding.siteName = siteName;
        if (tagline !== undefined) branding.tagline = tagline;
        if (primaryColor !== undefined) branding.primaryColor = primaryColor;
        if (dashboardTitle !== undefined) branding.dashboardTitle = dashboardTitle;
        if (dashboardTitle_en !== undefined) branding.dashboardTitle_en = dashboardTitle_en;
        if (dashboardSubtitle !== undefined) branding.dashboardSubtitle = dashboardSubtitle;
        if (dashboardSubtitle_en !== undefined) branding.dashboardSubtitle_en = dashboardSubtitle_en;
        if (logoUrl !== undefined) branding.logoUrl = logoUrl;
        if (faviconUrl !== undefined) branding.faviconUrl = faviconUrl;
        
        if (homeBannerTitle !== undefined) branding.homeBannerTitle = homeBannerTitle;
        if (homeBannerTitle_en !== undefined) branding.homeBannerTitle_en = homeBannerTitle_en;
        if (homeFormSubtitle !== undefined) branding.homeFormSubtitle = homeFormSubtitle;
        if (homeFormSubtitle_en !== undefined) branding.homeFormSubtitle_en = homeFormSubtitle_en;
        if (homeBannerImage !== undefined) branding.homeBannerImage = homeBannerImage;
        if (homeBgImage !== undefined) branding.homeBgImage = homeBgImage;
        if (homeLeftColumnHtml !== undefined) branding.homeLeftColumnHtml = homeLeftColumnHtml;
        if (homeLeftColumnHtml_en !== undefined) branding.homeLeftColumnHtml_en = homeLeftColumnHtml_en;
        branding.showMenu = req.body.showMenu === 'on';
        branding.showBannerTitle = req.body.showBannerTitle === 'on';
        branding.showRegistrationForm = req.body.showRegistrationForm === 'on';
        
        if (req.body.loginMethod !== undefined) branding.loginMethod = req.body.loginMethod;
        
        if (menuLinksJson) {
            try {
                branding.menuLinks = JSON.parse(menuLinksJson);
            } catch (e) {
                console.error("Failed to parse menu links:", e);
            }
        }
        
        if (footerText !== undefined) branding.footerText = footerText;
        if (footerLinksJson) {
            try {
                branding.footerLinks = JSON.parse(footerLinksJson);
            } catch (e) {
                console.error("Failed to parse footer links:", e);
            }
        }

        branding.allowModuleSelectionInEnrollment = req.body.allowModuleSelectionInEnrollment === 'on';
        
        if (termTeacher_ms !== undefined) branding.termTeacher_ms = termTeacher_ms;
        if (termTeacher_en !== undefined) branding.termTeacher_en = termTeacher_en;
        if (termStudent_ms !== undefined) branding.termStudent_ms = termStudent_ms;
        if (termStudent_en !== undefined) branding.termStudent_en = termStudent_en;
        
        if (pdpaTitle !== undefined) branding.pdpaTitle = pdpaTitle;
        if (pdpaTitle_en !== undefined) branding.pdpaTitle_en = pdpaTitle_en;
        if (pdpaDesc1 !== undefined) branding.pdpaDesc1 = pdpaDesc1;
        if (pdpaDesc1_en !== undefined) branding.pdpaDesc1_en = pdpaDesc1_en;
        if (pdpaDesc2 !== undefined) branding.pdpaDesc2 = pdpaDesc2;
        if (pdpaDesc2_en !== undefined) branding.pdpaDesc2_en = pdpaDesc2_en;
        if (pdpaCheckbox !== undefined) branding.pdpaCheckbox = pdpaCheckbox;
        if (pdpaCheckbox_en !== undefined) branding.pdpaCheckbox_en = pdpaCheckbox_en;
        if (pdpaBtnAgree !== undefined) branding.pdpaBtnAgree = pdpaBtnAgree;
        if (pdpaBtnAgree_en !== undefined) branding.pdpaBtnAgree_en = pdpaBtnAgree_en;
        if (pdpaBtnCancel !== undefined) branding.pdpaBtnCancel = pdpaBtnCancel;
        if (pdpaBtnCancel_en !== undefined) branding.pdpaBtnCancel_en = pdpaBtnCancel_en;

        await branding.save();
        
        if (req.refreshBrandingCache) {
            await req.refreshBrandingCache();
        }
        
        const targetTab = termTeacher_ms !== undefined ? 'terms' : 'branding';
        res.redirect('/admin-mace/settings?msg=branding_updated&tab=' + targetTab);
    } catch (err) {
        console.error('Branding update error:', err);
        const targetTab = req.body.termTeacher_ms !== undefined ? 'terms' : 'branding';
        res.redirect('/admin-mace/settings?msg=update_error&tab=' + targetTab);
    }
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
        const certificateTemplates = await CertificateTemplate.find().sort({ name: 1 });
        res.render('admin-edit-module', { 
            page: 'modules', 
            module: null, 
            editMode: 'create',
            certificateTemplates
        }); 
    } catch (err) { 
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// GET: Form Edit Modul
router.get('/modules/edit/:id', async (req, res) => {
    try {
        const module = await Module.findById(req.params.id);
        if (!module) return res.redirect('/admin-mace/modules?msg=not_found');
        const certificateTemplates = await CertificateTemplate.find().sort({ name: 1 });
        res.render('admin-edit-module', { 
            page: 'modules', 
            module, 
            editMode: 'edit',
            certificateTemplates
        });
    } catch (err) { 
        console.error('Edit Module Form Error:', err);
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// POST: Cipta Modul Baru
// POST: Cipta Modul Baru (Kini menggunakan Pautan R2 terus dari Client)
router.post('/modules/new', async (req, res) => {
    try {
        const { title, description, order, isActive, hasLevels, isSequential, minPassingScore, featuredImageUrl, hasCertificate, certificateTemplate } = req.body;
        const moduleData = {
            title,
            description, // TinyMCE content
            order: parseInt(order) || 0,
            isActive: isActive === 'on',
            hasLevels: hasLevels === 'on',
            isSequential: isSequential === 'on',
            minPassingScore: parseInt(minPassingScore) || 0,
            thumbnail: featuredImageUrl || '',
            hasCertificate: hasCertificate === 'on',
            certificateTemplate: (hasCertificate === 'on' && certificateTemplate) ? certificateTemplate : null
        };
        
        await Module.create(moduleData);
        res.redirect('/admin-mace/modules?msg=module_created');
    } catch (err) {
        console.error('Create Module Error:', err);
        res.redirect('/admin-mace/modules?msg=create_error');
    }
});

// POST: Update Modul (Kini menggunakan Pautan R2 terus dari Client)
router.post('/modules/edit/:id', async (req, res) => {
    try {
        const { title, description, order, isActive, hasLevels, isSequential, minPassingScore, featuredImageUrl, hasCertificate, certificateTemplate } = req.body;
        
        const module = await Module.findById(req.params.id);
        if (!module) return res.redirect('/admin-mace/modules?msg=not_found');

        const updateData = {
            title,
            description,
            order: parseInt(order) || 0,
            isActive: isActive === 'on',
            hasLevels: hasLevels === 'on',
            isSequential: isSequential === 'on',
            minPassingScore: parseInt(minPassingScore) || 0,
            thumbnail: featuredImageUrl !== undefined ? featuredImageUrl : module.thumbnail,
            hasCertificate: hasCertificate === 'on',
            certificateTemplate: (hasCertificate === 'on' && certificateTemplate) ? certificateTemplate : null
        };
        
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
        res.render('admin-edit-lesson', { page: 'lessons', lesson: null, modules, levels: [], editMode: 'create', secureVideoUrl: null }); 
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
        
        let secureVideoUrl = null;
        if (lesson.videoUrl) {
            secureVideoUrl = await getSecureVideoUrl(lesson.videoUrl);
        }
        
        const levels = lesson.moduleId ? await Level.find({ moduleId: lesson.moduleId._id }).sort({ order: 1 }) : [];
        
        res.render('admin-edit-lesson', { page: 'lessons', lesson, modules, levels, editMode: 'edit', secureVideoUrl });
    } catch (err) { 
        console.error('Edit Lesson Form Error:', err);
        res.status(500).send('Ralat memuatkan borang.'); 
    }
});

// POST: Cipta Lesson Baru
router.post('/lessons/new', async (req, res) => {
    try {
        const { moduleId, levelId, title, contentHtml, videoUrl, passMark, showPoints, order, isActive, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        
        const lessonData = {
            moduleId,
            levelId: levelId || null,
            title,
            contentHtml, // TinyMCE content
            videoUrl: videoUrl || '',
            passMark: parseInt(passMark) || 80,
            showPoints: showPoints === 'on',
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
        const { moduleId, levelId, title, contentHtml, videoUrl, passMark, showPoints, order, isActive, questionsJson } = req.body;
        let quizQuestions = [];
        try { quizQuestions = JSON.parse(questionsJson || '[]'); } catch(e) {}
        
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.redirect('/admin-mace/lessons?msg=not_found');

        const updateData = {
            moduleId,
            levelId: levelId || null,
            title,
            contentHtml,
            videoUrl: videoUrl !== undefined ? videoUrl : lesson.videoUrl,
            passMark: parseInt(passMark) || 80,
            showPoints: showPoints === 'on',
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
        const athletes = await Athlete.find().sort({ createdAt: -1 }).lean();
        const users = await User.find({ athleteId: { $in: athletes.map(a => a._id) } }).lean();
        const progresses = await LessonProgress.find().lean();
        
        const allModules = await Module.find({ isActive: true }).sort({ order: 1 }).lean();
        const allLessons = await Lesson.find({ isActive: true }).lean();
        
        const moduleLessonCount = {};
        allModules.forEach(m => {
            moduleLessonCount[m._id.toString()] = allLessons.filter(l => l.moduleId && l.moduleId.toString() === m._id.toString()).length;
        });

        const athleteUserMap = {};
        users.forEach(u => {
            if (u.athleteId) athleteUserMap[u.athleteId.toString()] = u._id;
        });

        const userCompletedCount = {};
        progresses.forEach(p => {
            if (!p.isCompleted) return;
            const uId = p.userId.toString();
            const mId = p.moduleId.toString();
            if (!userCompletedCount[uId]) userCompletedCount[uId] = {};
            if (!userCompletedCount[uId][mId]) userCompletedCount[uId][mId] = 0;
            userCompletedCount[uId][mId]++;
        });

        const bom = '\uFEFF';
        const moduleHeaders = allModules.map(m => `"${(m.title || '').replace(/"/g, '""')} (%)"`);
        const headers = ['Nama', 'No. IC', 'Jantina', 'Umur', 'Negeri', 'Sukan', ...moduleHeaders, 'Status', 'Tarikh'];
        let csv = bom + headers.join(',') + '\n';
        
        athletes.forEach(a => {
            const status = a.currentStage >= 4 ? 'Lulus' : `Sedang Belajar`;
            const date = a.completedAt ? new Date(a.completedAt).toLocaleDateString('ms-MY') : '-';
            const name = `"${(a.fullName || '').replace(/"/g, '""')}"`;
            const sukan = `"${(a.sukan || '').replace(/"/g, '""')}"`;
            
            const userId = athleteUserMap[a._id.toString()];
            const hasNewProgress = userId && userCompletedCount[userId.toString()];
            
            const icNumber = a.icNumber ? `="${a.icNumber.trim()}"` : '""';
            const rowData = [name, icNumber, a.jantina, a.umur, a.negeriWakil, sukan];
            
            allModules.forEach((m, i) => {
                let percent = 0;
                if (hasNewProgress) {
                    const total = moduleLessonCount[m._id.toString()] || 0;
                    if (total > 0) {
                        const completed = userCompletedCount[userId.toString()][m._id.toString()] || 0;
                        percent = Math.round((completed / total) * 100);
                    }
                } else {
                    const legacyKeys = ['quiz1', 'quiz2', 'quiz3'];
                    const qKey = legacyKeys[i];
                    if (qKey) {
                        percent = (a.quizScores && a.quizScores[qKey]) ? a.quizScores[qKey] : 0;
                    }
                }
                rowData.push(percent);
            });
            
            rowData.push(status, date);
            csv += rowData.join(',') + '\n';
        });
        
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`Data-Atlit-${Date.now()}.csv`);
        res.send(csv);
    } catch (err) { 
        console.error('CSV Error:', err);
        res.send('Error generating CSV'); 
    }
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
            description, showDescription, showAthleteName, showIcNumber, showNegeri, showSukan,
            showDate, signatoryName, showSignatory, signatoryTitle,
            primaryColor, secondaryColor, accentColor, backgroundColor, fontFamily, athleteNameFont,
            showBorder, showLogo, logoUrl, logoPosition, borderStyle, borderColor, borderWidth,
            showFooter, footerLine1, footerLine2,
            backgroundImageType, backgroundImageUrl, backgroundR2Key, backgroundOpacity,
            orientation
        } = req.body;
        
        // Parse elements JSON or use defaults
        let elements = req.body.elements || {};
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
            showSukan: showSukan === 'on',
            showDate: showDate === 'on',
            signatoryName,
            showSignatory: showSignatory === 'on',
            signatoryTitle,
            primaryColor,
            secondaryColor,
            accentColor,
            backgroundColor,
            fontFamily,
            athleteNameFont: athleteNameFont || 'Great Vibes',
            showBorder: showBorder === 'on',
            showFooter: showFooter === 'on',
            footerLine1,
            footerLine2,
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
            orientation: orientation || 'landscape',
            elements,
            isActive: false
        };
        
        // Handle background image file upload
        if (req.file) {
            const uploadedUrl = await processAndUploadImage(req.file, null);
            if (uploadedUrl) {
                templateData.backgroundImageUrl = uploadedUrl;
                templateData.backgroundImageType = 'url';
            }
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
            description, showDescription, showAthleteName, showIcNumber, showNegeri, showSukan,
            showDate, signatoryName, showSignatory, signatoryTitle,
            primaryColor, secondaryColor, accentColor, backgroundColor, fontFamily, athleteNameFont,
            showBorder, showLogo, logoUrl, logoPosition, borderStyle, borderColor, borderWidth,
            showFooter, footerLine1, footerLine2,
            backgroundImageType, backgroundImageUrl, backgroundR2Key, backgroundOpacity,
            orientation, setAsActive
        } = req.body;
        
        // Parse elements JSON or use defaults
        let elements = req.body.elements || {};
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
            showSukan: showSukan === 'on',
            showDate: showDate === 'on',
            signatoryName,
            showSignatory: showSignatory === 'on',
            signatoryTitle,
            primaryColor,
            secondaryColor,
            accentColor,
            backgroundColor,
            fontFamily,
            athleteNameFont: athleteNameFont || 'Great Vibes',
            showBorder: showBorder === 'on',
            showFooter: showFooter === 'on',
            footerLine1,
            footerLine2,
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
            orientation: orientation || 'landscape',
            elements
        };
        
        // Handle background image file upload
        if (req.file) {
            const uploadedUrl = await processAndUploadImage(req.file, null);
            if (uploadedUrl) {
                updateData.backgroundImageUrl = uploadedUrl;
                updateData.backgroundImageType = 'url';
            }
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

// POST: API upload image helper for CMS pages and general usage
router.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const uploadedUrl = await processAndUploadImage(req.file, null);
        res.json({ success: true, url: uploadedUrl });
    } catch (err) {
        console.error('API Image Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// GET: Urus CMS Pages
router.get('/pages', async (req, res) => {
    try {
        const pages = await Page.find().sort({ navigationOrder: 1 });
        res.render('admin', { 
            page: 'pages', 
            pages, 
            msg: req.query.msg || null 
        });
    } catch (err) {
        console.error('Fetch Pages Error:', err);
        res.redirect('/admin-mace?msg=error');
    }
});

// POST: Cipta Page Baru
router.post('/pages/create', async (req, res) => {
    try {
        const { 
            title, title_en, slug, content, content_en, customTemplate, navigationOrder, showInNavigation, isPublished, 
            modulesConfigJson,
            contact_bannerTitle, contact_bannerImage, contact_description, contact_email, contact_imageUrl
        } = req.body;
        
        // Ensure unique slug
        const existing = await Page.findOne({ slug: slug.toLowerCase().trim() });
        if (existing) {
            return res.redirect('/admin-mace/pages?msg=slug_exists');
        }
        
        let modulesConfig = [];
        if (modulesConfigJson) {
            try {
                modulesConfig = JSON.parse(modulesConfigJson);
            } catch (e) {
                console.error('Failed to parse modulesConfigJson:', e);
            }
        }
        
        const contactConfig = {
            bannerTitle: contact_bannerTitle || 'Hubungi',
            bannerImage: contact_bannerImage || '',
            description: contact_description || '',
            email: contact_email || '',
            imageUrl: contact_imageUrl || ''
        };
        
        await Page.create({
            title,
            title_en: title_en || '',
            slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
            content,
            content_en,
            customTemplate: customTemplate || 'default',
            navigationOrder: parseInt(navigationOrder) || 0,
            showInNavigation: showInNavigation === 'on',
            isPublished: isPublished === 'on',
            modulesConfig,
            contactConfig
        });
        
        res.redirect('/admin-mace/pages?msg=page_created');
    } catch (err) {
        console.error('Create Page Error:', err);
        res.redirect('/admin-mace/pages?msg=create_error');
    }
});

// POST: Kemaskini Page
router.post('/pages/update/:id', async (req, res) => {
    try {
        const { 
            title, title_en, slug, content, content_en, customTemplate, navigationOrder, showInNavigation, isPublished, 
            modulesConfigJson,
            contact_bannerTitle, contact_bannerImage, contact_description, contact_email, contact_imageUrl
        } = req.body;
        const normalizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
        
        // Check uniqueness of slug (excluding current page)
        const existing = await Page.findOne({ slug: normalizedSlug, _id: { $ne: req.params.id } });
        if (existing) {
            return res.redirect('/admin-mace/pages?msg=slug_exists');
        }
        
        let modulesConfig = [];
        if (modulesConfigJson) {
            try {
                modulesConfig = JSON.parse(modulesConfigJson);
            } catch (e) {
                console.error('Failed to parse modulesConfigJson:', e);
            }
        }
        
        const contactConfig = {
            bannerTitle: contact_bannerTitle || 'Hubungi',
            bannerImage: contact_bannerImage || '',
            description: contact_description || '',
            email: contact_email || '',
            imageUrl: contact_imageUrl || ''
        };
        
        await Page.findByIdAndUpdate(req.params.id, {
            title,
            title_en: title_en || '',
            slug: normalizedSlug,
            content,
            content_en,
            customTemplate: customTemplate || 'default',
            navigationOrder: parseInt(navigationOrder) || 0,
            showInNavigation: showInNavigation === 'on',
            isPublished: isPublished === 'on',
            modulesConfig,
            contactConfig
        });
        
        res.redirect('/admin-mace/pages?msg=page_updated');
    } catch (err) {
        console.error('Update Page Error:', err);
        res.redirect('/admin-mace/pages?msg=update_error');
    }
});

// POST: Padam Page
router.post('/pages/delete/:id', async (req, res) => {
    try {
        await Page.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/pages?msg=page_deleted');
    } catch (err) {
        console.error('Delete Page Error:', err);
        res.redirect('/admin-mace/pages?msg=delete_error');
    }
});

// GET: Preview Sijil (HTML untuk Print)
router.get('/certificate/preview/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.params.id);
        if (!athlete) {
            return res.redirect('/admin-mace?msg=not_found');
        }

        // Cari modul atau kursus yang atlet ini sertai
        let course = null;
        const moduleId = req.query.moduleId;
        if (moduleId) {
            const module = await Module.findById(moduleId);
            if (module) {
                course = { name: module.title };
            }
        }
        
        if (!course) {
            course = {};
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
            courseDate,
            backUrl: '/admin-mace/templates'
        });

    } catch (err) {
        console.error('Certificate Preview Error:', err);
        res.redirect('/admin-mace?msg=preview_error');
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
        const { fullName, username, email, password } = req.body;
        
        if (!fullName || !username || !email || !password) {
            return res.redirect('/admin-mace/teachers?msg=missing_fields');
        }
        
        // Check if email already exists
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.redirect('/admin-mace/teachers?msg=email_exists');
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.redirect('/admin-mace/teachers?msg=username_exists');
        }
        
        await User.create({
            fullName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
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
        const { fullName, username, email, password, isActive } = req.body;
        
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/admin-mace/teachers?msg=not_found');
        }
        
        if (email !== teacher.email) {
            const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
            if (existingEmail) {
                return res.redirect('/admin-mace/teachers?msg=email_exists');
            }
        }

        if (username && username.toLowerCase() !== teacher.username) {
            const existingUsername = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.params.id } });
            if (existingUsername) {
                return res.redirect('/admin-mace/teachers?msg=username_exists');
            }
        }
        
        const updateData = { fullName, email: email.toLowerCase(), isActive: isActive === 'on' };
        if (username) updateData.username = username.toLowerCase();
        
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

// GET: Senarai Pelajar (Student/Atlit)
router.get('/students', async (req, res) => {
    try {
        // Get all users with student role
        const studentUsers = await User.find({ role: 'student' })
            .populate('athleteId')
            .populate('enrolledGroups')
            .sort({ createdAt: -1 });
        
        // Get all athletes from Athlete collection
        const allAthletes = await Athlete.find()
            .populate('enrolledGroups')
            .sort({ fullName: 1 });
        
        // Combine both lists: 
        // - If athlete has a linked User account, show the User info
        // - If athlete doesn't have User account, show athlete info directly
        // - Also include standalone students (users without athleteId)
        
        const combinedStudents = [];
        const processedAthleteIds = new Set();
        
        // First, add all student users
        for (const user of studentUsers) {
            if (user.athleteId) {
                processedAthleteIds.add(user.athleteId.toString());
            }
            combinedStudents.push({
                _id: user._id,
                fullName: user.fullName,
                email: user.email || '-',
                isActive: user.isActive,
                enrolledGroups: user.enrolledGroups || [],
                createdAt: user.createdAt,
                isUserAccount: true,
                userType: 'student',
                athleteData: user.athleteId ? {
                    _id: user.athleteId._id,
                    noKadPengenalan: user.athleteId.noKadPengenalan,
                    negeriWakil: user.athleteId.negeriWakil,
                    sukan: user.athleteId.sukan
                } : null
            });
        }
        
        // Then, add athletes that don't have User accounts yet
        for (const athlete of allAthletes) {
            if (!processedAthleteIds.has(athlete._id.toString())) {
                combinedStudents.push({
                    _id: athlete._id,
                    fullName: athlete.fullName,
                    email: athlete.email || '-',
                    isActive: athlete.isActive !== false,
                    enrolledGroups: athlete.enrolledGroups || [],
                    createdAt: athlete.createdAt || new Date(),
                    isUserAccount: false,
                    userType: 'athlete',
                    athleteData: {
                        _id: athlete._id,
                        noKadPengenalan: athlete.noKadPengenalan,
                        negeriWakil: athlete.negeriWakil,
                        sukan: athlete.sukan
                    }
                });
            }
        }
        
        const groups = await Group.find().sort({ name: 1 });
        const states = [...new Set(allAthletes.map(a => a.negeriWakil).filter(Boolean))].sort();

        // Retrieve query parameters
        const selectedNegeri = req.query.negeri || '';
        const selectedGroupId = req.query.groupId || '';
        const startDateStr = req.query.startDate || '';
        const endDateStr = req.query.endDate || '';

        // Apply filters in-memory
        let filteredStudents = combinedStudents;

        if (selectedNegeri) {
            filteredStudents = filteredStudents.filter(s => s.athleteData && s.athleteData.negeriWakil === selectedNegeri);
        }

        if (selectedGroupId) {
            filteredStudents = filteredStudents.filter(s => 
                s.enrolledGroups && s.enrolledGroups.some(g => g._id.toString() === selectedGroupId)
            );
        }

        if (startDateStr) {
            const start = new Date(startDateStr);
            start.setHours(0, 0, 0, 0);
            filteredStudents = filteredStudents.filter(s => new Date(s.createdAt) >= start);
        }

        if (endDateStr) {
            const end = new Date(endDateStr);
            end.setHours(23, 59, 59, 999);
            filteredStudents = filteredStudents.filter(s => new Date(s.createdAt) <= end);
        }

        res.render('admin', { 
            page: 'students', 
            students: filteredStudents, 
            groups, 
            states,
            filters: {
                negeri: selectedNegeri,
                groupId: selectedGroupId,
                startDate: startDateStr,
                endDate: endDateStr
            },
            msg: req.query.msg || null 
        });
    } catch (err) {
        console.error('Students Error:', err);
        res.status(500).send('Ralat memuatkan senarai pelajar.');
    }
});

// GET: Form Edit Pelajar (supports both User accounts and Athlete records)
router.get('/students/edit/:id', async (req, res) => {
    try {
        // Try to find as User first
        let student = await User.findById(req.params.id)
            .populate('athleteId')
            .populate('enrolledGroups');
        
        let isAthleteRecord = false;
        
        if (!student || student.role !== 'student') {
            // If not found as User, try to find as Athlete record
            const mongoose = require('mongoose');
            if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                const athlete = await Athlete.findById(req.params.id);
                if (athlete) {
                    student = athlete;
                    isAthleteRecord = true;
                }
            }
        }
        
        if (!student) {
            return res.redirect('/admin-mace/students?msg=not_found');
        }
        
        const groups = await Group.find().sort({ name: 1 });
        res.render('admin-edit-student', { 
            page: 'students', 
            student, 
            groups, 
            editMode: 'edit',
            isAthleteRecord 
        });
    } catch (err) {
        console.error('Edit Student Form Error:', err);
        res.redirect('/admin-mace/students?msg=error');
    }
});

// POST: Update Pelajar (supports both User accounts and Athlete records)
router.post('/students/edit/:id', async (req, res) => {
    try {
        const { fullName, username, email, password, isActive, groupIds } = req.body;

        // Try to find as User first
        let student = await User.findById(req.params.id);
        let isAthleteRecord = false;

        if (!student || student.role !== 'student') {
            // If not found as User, try to find as Athlete record
            const mongoose = require('mongoose');
            if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                const athlete = await Athlete.findById(req.params.id);
                if (athlete) {
                    student = athlete;
                    isAthleteRecord = true;
                }
            }
        }

        if (!student) {
            return res.redirect('/admin-mace/students?msg=not_found');
        }

        if (isAthleteRecord) {
            // Update Athlete record
            const updateData = { fullName, isActive: isActive === 'on' };
            const unsetData = {};
            
            if (email && email.trim() !== '' && email !== '-') {
                updateData.email = email;
            } else {
                unsetData.email = 1;
            }
            
            const updateOperation = { $set: updateData };
            if (Object.keys(unsetData).length > 0) {
                updateOperation.$unset = unsetData;
            }
            
            await Athlete.findByIdAndUpdate(req.params.id, updateOperation);
        } else {
            // Update User account
            if (email !== student.email) {
                const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
                if (existingEmail) {
                    return res.redirect('/admin-mace/students?msg=email_exists');
                }
            }

            if (username && username.toLowerCase() !== student.username) {
                const existingUsername = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.params.id } });
                if (existingUsername) {
                    return res.redirect('/admin-mace/students?msg=username_exists');
                }
            }

            const updateData = { fullName, email: email.toLowerCase(), isActive: isActive === 'on' };
            if (username) updateData.username = username.toLowerCase();

            if (password && password.trim() !== '') {
                updateData.password = password;
            }

            await User.findByIdAndUpdate(req.params.id, updateData);
        }

        // Handle group enrollment for both types
        if (groupIds) {
            const groups = Array.isArray(groupIds) ? groupIds : (groupIds ? [groupIds] : []);

            if (isAthleteRecord) {
                // Update enrolledGroups in Athlete model
                await Athlete.findByIdAndUpdate(req.params.id, { enrolledGroups: groups });

                // Update Group model to add/remove this athlete
                await Group.updateMany(
                    { _id: { $in: groups } },
                    { $addToSet: { students: req.params.id } }
                );

                await Group.updateMany(
                    { _id: { $nin: groups }, students: req.params.id },
                    { $pull: { students: req.params.id } }
                );
            } else {
                // Update enrolledGroups in User model
                await User.findByIdAndUpdate(req.params.id, { enrolledGroups: groups });

                // Update Group model to add/remove this student
                await Group.updateMany(
                    { _id: { $in: groups } },
                    { $addToSet: { students: req.params.id } }
                );

                await Group.updateMany(
                    { _id: { $nin: groups }, students: req.params.id },
                    { $pull: { students: req.params.id } }
                );
            }
        }

        res.redirect('/admin-mace/students?msg=student_updated');
    } catch (err) {
        console.error('Update Student Error:', err);
        res.redirect('/admin-mace/students?msg=update_error');
    }
});


// POST: Delete Pelajar (supports both User accounts and Athlete records)
router.post('/students/delete/:id', async (req, res) => {
    try {
        // Try to find as User first
        let student = await User.findById(req.params.id);
        let isAthleteRecord = false;

        if (!student || student.role !== 'student') {
            const mongoose = require('mongoose');
            if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                const athlete = await Athlete.findById(req.params.id);
                if (athlete) {
                    student = athlete;
                    isAthleteRecord = true;
                }
            }
        }

        if (!student) {
            return res.redirect('/admin-mace/students?msg=not_found');
        }

        // Remove from groups
        await Group.updateMany(
            { students: req.params.id },
            { $pull: { students: req.params.id } }
        );

        if (isAthleteRecord) {
            await Athlete.findByIdAndDelete(req.params.id);
        } else {
            await User.findByIdAndDelete(req.params.id);
        }

        res.redirect('/admin-mace/students?msg=student_deleted');
    } catch (err) {
        console.error('Delete Student Error:', err);
        res.redirect('/admin-mace/students?msg=delete_error');
    }
});

// POST: Reset Password Pelajar (User accounts only)
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
// BULK ACTIONS - PENGURUSAN PELAJAR
// ==========================================

// POST: Bulk Add to Group
router.post('/students/bulk/add-to-group', async (req, res) => {
    try {
        const { studentIds, groupId } = req.body;
        if (!studentIds || !groupId) {
            return res.redirect('/admin-mace/students?msg=bulk_error');
        }
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
        
        // Update Group — tambah semua pelajar ke group
        await Group.findByIdAndUpdate(groupId, {
            $addToSet: { students: { $each: ids } }
        });
        
        // Update setiap User/Athlete — tambah group ke enrolledGroups
        await User.updateMany(
            { _id: { $in: ids }, role: 'student' },
            { $addToSet: { enrolledGroups: groupId } }
        );
        await Athlete.updateMany(
            { _id: { $in: ids } },
            { $addToSet: { enrolledGroups: groupId } }
        );
        
        res.redirect('/admin-mace/students?msg=bulk_added_to_group');
    } catch (err) {
        console.error('Bulk Add to Group Error:', err);
        res.redirect('/admin-mace/students?msg=bulk_error');
    }
});

// POST: Bulk Enroll by Enrollment Key
router.post('/students/bulk/enroll-by-key', async (req, res) => {
    try {
        const { studentIds, enrollmentKey } = req.body;
        if (!studentIds || !enrollmentKey) {
            return res.redirect('/admin-mace/students?msg=bulk_error');
        }
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
        
        // Cari group berdasarkan enrollment key
        const group = await Group.findOne({ enrollmentKey: enrollmentKey.trim() });
        if (!group) {
            return res.redirect('/admin-mace/students?msg=key_not_found');
        }
        
        // Tambah pelajar ke group
        await Group.findByIdAndUpdate(group._id, {
            $addToSet: { students: { $each: ids } }
        });
        
        // Update setiap User/Athlete
        await User.updateMany(
            { _id: { $in: ids }, role: 'student' },
            { $addToSet: { enrolledGroups: group._id } }
        );
        await Athlete.updateMany(
            { _id: { $in: ids } },
            { $addToSet: { enrolledGroups: group._id } }
        );
        
        res.redirect('/admin-mace/students?msg=bulk_enrolled&groupName=' + encodeURIComponent(group.name));
    } catch (err) {
        console.error('Bulk Enroll by Key Error:', err);
        res.redirect('/admin-mace/students?msg=bulk_error');
    }
});

// POST: Bulk Remove from Group
router.post('/students/bulk/remove-from-group', async (req, res) => {
    try {
        const { studentIds, groupId } = req.body;
        if (!studentIds || !groupId) {
            return res.redirect('/admin-mace/students?msg=bulk_error');
        }
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
        
        // Keluarkan pelajar dari group
        await Group.findByIdAndUpdate(groupId, {
            $pull: { students: { $in: ids } }
        });
        
        // Update setiap User/Athlete
        await User.updateMany(
            { _id: { $in: ids }, role: 'student' },
            { $pull: { enrolledGroups: groupId } }
        );
        await Athlete.updateMany(
            { _id: { $in: ids } },
            { $pull: { enrolledGroups: groupId } }
        );
        
        res.redirect('/admin-mace/students?msg=bulk_removed_from_group');
    } catch (err) {
        console.error('Bulk Remove from Group Error:', err);
        res.redirect('/admin-mace/students?msg=bulk_error');
    }
});

// POST: Bulk Delete Students
router.post('/students/bulk/delete', async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!studentIds) {
            return res.redirect('/admin-mace/students?msg=bulk_error');
        }
        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
        
        // Keluarkan dari semua group
        await Group.updateMany(
            { students: { $in: ids } },
            { $pull: { students: { $in: ids } } }
        );
        
        // Padam User accounts
        await User.deleteMany({ _id: { $in: ids }, role: 'student' });
        
        // Padam Athlete records
        await Athlete.deleteMany({ _id: { $in: ids } });
        
        res.redirect('/admin-mace/students?msg=bulk_deleted&count=' + ids.length);
    } catch (err) {
        console.error('Bulk Delete Error:', err);
        res.redirect('/admin-mace/students?msg=bulk_error');
    }
});

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

        // Cari user admin yang login untuk dijadikan guru penanggungjawab default
        let adminUserId = null;
        try {
            // Cuba cari dengan email format ADMIN_USER@mace.edu.my atau cari user dengan role admin
            const adminUser = await User.findOne({ 
                $or: [
                    { email: process.env.ADMIN_USER + "@mace.edu.my" },
                    { email: process.env.ADMIN_USER },
                    { role: 'admin' }
                ]
            });
            if (adminUser) {
                adminUserId = adminUser._id;
            }
        } catch (e) {
            console.error("Error finding admin user:", e);
        }

        // Jika tiada admin dijumpai, cuba dapatkan user pertama dalam sistem
        if (!adminUserId) {
            try {
                const firstUser = await User.findOne().sort({ createdAt: 1 });
                if (firstUser) {
                    adminUserId = firstUser._id;
                }
            } catch (e) {
                console.error("Error finding first user:", e);
            }
        }

        // Gunakan teacherId dari form jika ada, jika tidak guna adminUserId
        const finalTeacherId = teacherId || adminUserId;

        if (!finalTeacherId) {
            console.error("No teacher or admin user found to assign as group owner");
            return res.redirect("/admin-mace/groups?msg=no_teacher_available");
        }

        const groupData = {
            name,
            description: description || "",
            teacherId: finalTeacherId,
            createdBy: req.session && req.session.userId ? req.session.userId : finalTeacherId,
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

// ==========================================
// PENGURUSAN ATLET (LEGACY ATHLETE MODEL)
// ==========================================
// POST: Update Atlit (dari halaman students)
router.post('/athletes/update/:id', async (req, res) => {
    try {
        const { fullName, icNumber, jantina, umur, negeriWakil, sukan } = req.body;
        
        const updateData = {
            fullName,
            icNumber,
            jantina,
            umur: parseInt(umur),
            negeriWakil,
            sukan
        };
        
        await Athlete.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-mace/students?msg=athlete_updated');
    } catch (err) {
        console.error('Update Athlete Error:', err);
        res.redirect('/admin-mace/students?msg=update_error');
    }
});

// POST: Delete Atlit
router.post('/athletes/delete/:id', async (req, res) => {
    try {
        await Athlete.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/students?msg=athlete_deleted');
    } catch (err) {
        console.error('Delete Athlete Error:', err);
        res.redirect('/admin-mace/students?msg=delete_error');
    }
});

// POST: Convert Atlit to Student (buat akaun user)
router.post('/athletes/convert/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.params.id);
        if (!athlete) {
            return res.redirect('/admin-mace/students?msg=not_found');
        }
        
        // Check if user already exists with this athleteId
        const existingUser = await User.findOne({ athleteId: athlete._id });
        if (existingUser) {
            return res.redirect('/admin-mace/students?msg=already_converted');
        }
        
        // Generate random password
        const randomPassword = Math.random().toString(36).slice(-8);
        
        // Create user account
        const newUser = await User.create({
            fullName: athlete.fullName,
            username: athlete.icNumber.trim().toLowerCase(),
            email: `${athlete.icNumber}@athlete.local`, // Use IC as username
            password: randomPassword,
            role: 'student',
            athleteId: athlete._id,
            isActive: true
        });
        
        res.redirect('/admin-mace/students?msg=athlete_converted&newPassword=' + encodeURIComponent(randomPassword));
    } catch (err) {
        console.error('Convert Athlete Error:', err);
        res.redirect('/admin-mace/students?msg=convert_error');
    }
});

// ==========================================
// PENGURUSAN ADMIN (URUSETIA) & PROFIL SAYA
// ==========================================

// GET: Profil Saya
router.get('/profile', async (req, res) => {
    try {
        let adminUser = null;
        if (req.session && req.session.userId) {
            adminUser = await User.findById(req.session.userId);
        }
        res.render('admin', { page: 'profile', adminUser, msg: req.query.msg || null });
    } catch (err) {
        console.error('Profile Error:', err);
        res.redirect('/admin-mace?msg=error');
    }
});

// POST: Update Profil Saya
router.post('/profile', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.redirect('/admin-mace/profile?msg=not_db_admin');
        }
        const { fullName, username, email, password } = req.body;
        const updateData = { fullName, email: email.toLowerCase() };
        if (username) updateData.username = username.trim().toLowerCase();
        if (password && password.trim() !== '') {
            updateData.password = password;
        }
        
        if (email) {
            const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.session.userId } });
            if (existingEmail) return res.redirect('/admin-mace/profile?msg=email_exists');
        }

        if (username) {
            const existingUsername = await User.findOne({ username: username.trim().toLowerCase(), _id: { $ne: req.session.userId } });
            if (existingUsername) return res.redirect('/admin-mace/profile?msg=username_exists');
        }
        
        await User.findByIdAndUpdate(req.session.userId, updateData);
        req.session.userName = fullName;
        res.redirect('/admin-mace/profile?msg=profile_updated');
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.redirect('/admin-mace/profile?msg=error');
    }
});

// GET: Senarai Admin (Urusetia)
router.get('/admins', async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
        res.render('admin', { page: 'admins', admins, msg: req.query.msg || null });
    } catch (err) {
        console.error('Admins List Error:', err);
        res.redirect('/admin-mace?msg=error');
    }
});

// POST: Tambah Admin
router.post('/admins/add', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;
        if (!fullName || !username || !email || !password) return res.redirect('/admin-mace/admins?msg=error_empty');
        
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) return res.redirect('/admin-mace/admins?msg=email_exists');

        const existingUsername = await User.findOne({ username: username.trim().toLowerCase() });
        if (existingUsername) return res.redirect('/admin-mace/admins?msg=username_exists');
        
        await User.create({
            fullName,
            username: username.trim().toLowerCase(),
            email: email.toLowerCase(),
            password,
            role: 'admin',
            isActive: true
        });
        res.redirect('/admin-mace/admins?msg=admin_added');
    } catch (err) {
        console.error('Add Admin Error:', err);
        res.redirect('/admin-mace/admins?msg=error');
    }
});

// POST: Update Admin
router.post('/admins/edit/:id', async (req, res) => {
    try {
        const { fullName, username, email, password, isActive } = req.body;
        const updateData = { fullName, email: email.toLowerCase(), isActive: isActive === 'on' };
        if (username) updateData.username = username.trim().toLowerCase();
        if (password && password.trim() !== '') updateData.password = password;
        
        const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
        if (existingEmail) return res.redirect('/admin-mace/admins?msg=email_exists');

        if (username) {
            const existingUsername = await User.findOne({ username: username.trim().toLowerCase(), _id: { $ne: req.params.id } });
            if (existingUsername) return res.redirect('/admin-mace/admins?msg=username_exists');
        }
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-mace/admins?msg=admin_updated');
    } catch (err) {
        console.error('Update Admin Error:', err);
        res.redirect('/admin-mace/admins?msg=error');
    }
});

// POST: Delete Admin
router.post('/admins/delete/:id', async (req, res) => {
    try {
        if (req.session && req.session.userId === req.params.id) {
            return res.redirect('/admin-mace/admins?msg=error_self_delete');
        }
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin-mace/admins?msg=admin_deleted');
    } catch (err) {
        console.error('Delete Admin Error:', err);
        res.redirect('/admin-mace/admins?msg=error');
    }
});
router.use('/settings/media', require('./media-migration-logic'));

module.exports = router;
