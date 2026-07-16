require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.MONITOR_PORT || 4000;

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Auth Middleware
const requireAuth = (req, res, next) => {
    // Webhook endpoint does not need Basic Auth, it uses payload validation (or simple secret matching if we wanted, but we'll leave it open for now or use a query secret)
    if (req.path === '/webhook/github') return next();

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && login === process.env.ADMIN_USER && password && password === process.env.ADMIN_PASS) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="MACE MonitorPanel"');
    res.status(401).send('Akses Ditolak. Sila masukkan ID dan Kata Laluan MonitorPanel.');
};

app.use(requireAuth);

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Routes
app.get('/', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    
    const uptime = os.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    const systemInfo = {
        platform: os.platform(),
        release: os.release(),
        totalMem: formatBytes(totalMem),
        usedMem: formatBytes(usedMem),
        freeMem: formatBytes(freeMem),
        memPercent: memPercent,
        uptime: `${uptimeHours} jam, ${uptimeMinutes} minit`,
        cpus: os.cpus().length
    };

    res.render('monitorpanel', { systemInfo });
});

// API Execute Command
app.post('/api/exec', (req, res) => {
    const { cmd } = req.body;
    if (!cmd) return res.status(400).json({ error: 'Tiada arahan diberikan' });

    // Keselamatan Asas: Hanya benarkan arahan tertentu sahaja
    const allowedCommands = [
        'git pull origin main',
        'pm2 restart mace-system',
        'pm2 restart mace-system --update-env',
        'pm2 restart mace-monitor',
        'pm2 status',
        'pm2 logs mace-system --lines 50 --nostream',
        'npm install',
        'sudo systemctl status mongod',
        'sudo systemctl restart mongod'
    ];

    if (!allowedCommands.includes(cmd)) {
        return res.status(403).json({ error: 'Arahan ini tidak dibenarkan demi keselamatan pelayan.' });
    }

    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
        let output = stdout || '';
        if (stderr) output += '\n[Ralat/Amaran]:\n' + stderr;
        if (error) output += '\n[Ralat Sistem]:\n' + error.message;

        res.json({ output: output.trim() || 'Selesai tanpa output.' });
    });
});

// Webhook GitHub Auto-Deploy
app.post('/webhook/github', (req, res) => {
    console.log('GitHub Webhook Payload Diterima');
    
    // Only deploy on push to main branch
    const isPushToMain = req.body.ref === 'refs/heads/main';
    
    if (isPushToMain) {
        console.log('Push ke main branch dikesan. Memulakan Auto Deploy...');
        
        const deployCmd = 'git pull origin main && npm install && pm2 restart mace-system --update-env';
        
        exec(deployCmd, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Auto Deploy Ralat: ${error.message}`);
                return;
            }
            console.log(`Auto Deploy Berjaya:\n${stdout}`);
        });
        
        res.status(200).send('Deploy sedang dijalankan...');
    } else {
        res.status(200).send('Diabaikan: Bukan branch main');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 MonitorPanel Server running on port ${PORT}`);
});
