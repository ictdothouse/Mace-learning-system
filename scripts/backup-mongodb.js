#!/usr/bin/env node

// ==============================================================================
// 🚀 SKRIP BACKUP MONGODB KE CLOUDFLARE R2
// ==============================================================================
// Skrip ini memampatkan database menggunakan mongodump dan memuat naik ke R2.
// Bersesuaian dijalankan sebagai Cron Job harian.
// ==============================================================================

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load environment variables dari fail .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI;
const bucketName = process.env.R2_BUCKET_NAME || 'modulmace';

if (!mongoUri) {
    console.error('❌ Ralat: MONGO_URI tidak dijumpai di dalam .env');
    process.exit(1);
}

// Inisialisasi Cloudflare R2 client
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

// Penentuan nama fail backup berdasarkan masa semasa (YYYY-MM-DD_HH-MM-SS)
const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
const backupFilename = `mongodb_backup_${timestamp}.archive.gz`;
const backupLocalPath = path.join(__dirname, `../data/${backupFilename}`);

// Pastikan direktori data/ wujud
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`⏳ Memulakan proses backup database...`);

// Gunakan mongodump dengan --archive dan --gzip untuk hasil mampat yang optimum
const backupCommand = `mongodump --uri="${mongoUri}" --archive="${backupLocalPath}" --gzip`;

exec(backupCommand, async (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Ralat semasa menjalankan mongodump: ${error.message}`);
        process.exit(1);
    }
    
    console.log(`✅ Fail backup tempatan berjaya dibina: ${backupLocalPath}`);

    try {
        console.log(`⏳ Memuat naik ${backupFilename} ke Cloudflare R2 (Bucket: ${bucketName})...`);
        
        // Membaca fail backup
        const fileContent = fs.readFileSync(backupLocalPath);
        
        // Menghantar fail ke Cloudflare R2
        const uploadParams = {
            Bucket: bucketName,
            Key: `backups/${backupFilename}`,
            Body: fileContent,
            ContentType: 'application/gzip'
        };
        
        await r2Client.send(new PutObjectCommand(uploadParams));
        console.log(`✅ Fail backup berjaya dimuat naik ke R2! Path: backups/${backupFilename}`);
        
        // Padam fail backup tempatan untuk menjimatkan disk space
        console.log(`🧹 Memadam fail backup tempatan...`);
        fs.unlinkSync(backupLocalPath);
        console.log(`🎉 Proses backup dan kemasan selesai sepenuhnya!`);
        process.exit(0);
        
    } catch (uploadError) {
        console.error(`❌ Ralat semasa memuat naik ke Cloudflare R2:`, uploadError);
        
        // Cuba padam fail tempatan jika gagal
        if (fs.existsSync(backupLocalPath)) {
            try {
                fs.unlinkSync(backupLocalPath);
            } catch (cleanupErr) {
                console.error(`🧹 Gagal memadam fail tempatan semasa cleanup:`, cleanupErr);
            }
        }
        process.exit(1);
    }
});
