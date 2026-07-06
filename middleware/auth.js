// middleware/auth.js - Middleware untuk authentication dan authorization

const User = require('../models/User');

// Middleware untuk check authentication
// ⚡ OPTIMIZED: Guna session cache untuk elak DB query setiap request
// Role & isActive disimpan dalam session semasa login (lihat routes/auth.js)
const authenticate = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Sila login terlebih dahulu' });
        }
        
        // ⚡ FAST PATH: Jika session ada data lengkap, bina user object tanpa query DB
        if (req.session.userRole && req.session.userIsActive !== undefined) {
            // Akaun dimatikan selepas login? Semak hanya jika flag isActive = false
            if (req.session.userIsActive === false) {
                req.session.destroy();
                return res.status(401).json({ message: 'Akaun anda telah dinyahaktifkan' });
            }
            // Bina objek user minimum dari session (tiada DB query diperlukan)
            req.user = {
                _id: req.session.userId,
                role: req.session.userRole,
                fullName: req.session.userName,
                isActive: req.session.userIsActive
            };
            return next();
        }
        
        // SLOW PATH: Fallback untuk sesi lama yang tidak ada cache (backward compat)
        const user = await User.findById(req.session.userId).select('role fullName isActive').lean();
        if (!user || !user.isActive) {
            req.session.destroy();
            return res.status(401).json({ message: 'Session tidak sah atau akaun tidak aktif' });
        }
        
        // Kemaskini session cache untuk request seterusnya
        req.session.userRole = user.role;
        req.session.userName = user.fullName;
        req.session.userIsActive = user.isActive;
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Authenticate Error:', error);
        res.status(500).json({ message: 'Ralat authentication', error: error.message });
    }
};

// Middleware untuk check authorization berdasarkan role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Sila login terlebih dahulu' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses ditolak. Tidak mempunyai keizinan.' });
        }
        
        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
