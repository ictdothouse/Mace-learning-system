const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Branding = require('../models/Branding');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const downloadFile = async (url, dest) => {
    try {
        const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 30000 });
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Failed to download ${url}:`, e.message);
        throw e;
    }
};

const getR2Client = () => {
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID) return null;
    return new S3Client({
        region: 'auto',
        forcePathStyle: true,
        endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
    });
};

const uploadToR2 = async (localPath, filename, contentType) => {
    const r2Client = getR2Client();
    if (!r2Client) throw new Error("R2 is not configured.");
    
    const fileStream = fs.createReadStream(localPath);
    const bucketName = process.env.R2_BUCKET_NAME || 'modulmace';
    
    await r2Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: fileStream,
        ContentType: contentType
    }));
    
    let publicUrlBase = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
    if (publicUrlBase && !publicUrlBase.startsWith('http://') && !publicUrlBase.startsWith('https://')) {
        publicUrlBase = 'https://' + publicUrlBase;
    }
    return `${publicUrlBase}/${filename}`;
};

// ONLOAD: Cloud to Local
router.post('/onload', async (req, res) => {
    try {
        console.log("Starting Onload: Cloud to Local Migration");
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const processUrl = async (url) => {
            if (!url || !url.startsWith('http')) return url; // Already local or empty
            
            const filename = path.basename(new URL(url).pathname);
            const localPath = path.join(uploadsDir, filename);
            const relativePath = `/uploads/${filename}`;
            
            if (fs.existsSync(localPath)) return relativePath; // Already downloaded
            
            await downloadFile(url, localPath);
            return relativePath;
        };

        // 1. Branding
        const brandings = await Branding.find();
        for (let b of brandings) {
            b.logoUrl = await processUrl(b.logoUrl);
            b.faviconUrl = await processUrl(b.faviconUrl);
            b.homeBannerImage = await processUrl(b.homeBannerImage);
            b.homeBgImage = await processUrl(b.homeBgImage);
            b.loginBgImage = await processUrl(b.loginBgImage);
            
            if (b.modulesConfig && Array.isArray(b.modulesConfig)) {
                for (let config of b.modulesConfig) {
                    if (config.imageUrl) config.imageUrl = await processUrl(config.imageUrl);
                }
            }
            await b.save();
        }

        // 2. Modules
        const modules = await Module.find();
        for (let m of modules) {
            m.thumbnail = await processUrl(m.thumbnail);
            await m.save();
        }

        // 3. Lessons
        const lessons = await Lesson.find();
        for (let l of lessons) {
            l.videoUrl = await processUrl(l.videoUrl);
            l.posterUrl = await processUrl(l.posterUrl);
            l.pdfUrl = await processUrl(l.pdfUrl);
            l.audioUrl = await processUrl(l.audioUrl);
            l.imageUrl = await processUrl(l.imageUrl);
            await l.save();
        }

        res.json({ success: true, message: 'Berjaya memuat turun semua fail ke Local Server.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// OFFLOAD: Local to Cloud
router.post('/offload', async (req, res) => {
    try {
        console.log("Starting Offload: Local to Cloud Migration");
        if (!getR2Client()) return res.status(400).json({ error: 'Tetapan Cloudflare R2 belum dikonfigurasi dalam fail .env' });
        
        const uploadsDir = path.join(__dirname, '../uploads');

        const processLocalUrl = async (url) => {
            if (!url || url.startsWith('http')) return url; // Already cloud or empty
            if (!url.startsWith('/uploads/')) return url; // Not in uploads folder
            
            const filename = url.replace('/uploads/', '');
            const localPath = path.join(uploadsDir, filename);
            
            if (!fs.existsSync(localPath)) return url; // File not found on disk, skip

            let contentType = 'application/octet-stream';
            if (filename.endsWith('.mp4')) contentType = 'video/mp4';
            else if (filename.endsWith('.webp')) contentType = 'image/webp';
            else if (filename.endsWith('.png')) contentType = 'image/png';
            else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (filename.endsWith('.pdf')) contentType = 'application/pdf';

            const cloudUrl = await uploadToR2(localPath, filename, contentType);
            return cloudUrl;
        };

        // 1. Branding
        const brandings = await Branding.find();
        for (let b of brandings) {
            b.logoUrl = await processLocalUrl(b.logoUrl);
            b.faviconUrl = await processLocalUrl(b.faviconUrl);
            b.homeBannerImage = await processLocalUrl(b.homeBannerImage);
            b.homeBgImage = await processLocalUrl(b.homeBgImage);
            b.loginBgImage = await processLocalUrl(b.loginBgImage);
            
            if (b.modulesConfig && Array.isArray(b.modulesConfig)) {
                for (let config of b.modulesConfig) {
                    if (config.imageUrl) config.imageUrl = await processLocalUrl(config.imageUrl);
                }
            }
            await b.save();
        }

        // 2. Modules
        const modules = await Module.find();
        for (let m of modules) {
            m.thumbnail = await processLocalUrl(m.thumbnail);
            await m.save();
        }

        // 3. Lessons
        const lessons = await Lesson.find();
        for (let l of lessons) {
            l.videoUrl = await processLocalUrl(l.videoUrl);
            l.posterUrl = await processLocalUrl(l.posterUrl);
            l.pdfUrl = await processLocalUrl(l.pdfUrl);
            l.audioUrl = await processLocalUrl(l.audioUrl);
            l.imageUrl = await processLocalUrl(l.imageUrl);
            await l.save();
        }

        res.json({ success: true, message: 'Berjaya memuat naik semua fail ke Cloudflare R2.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
