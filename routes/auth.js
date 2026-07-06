// routes/auth.js - Sistem Pengurusan Pengguna (Login, Register, Teacher Management)
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Athlete = require('../models/Athlete');
const Group = require('../models/Group');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ==========================================
// RATE LIMITER KHUSUS: LOGIN BRUTE-FORCE PROTECTION
// ==========================================
// Lebih ketat dari limiter global: hanya 10 cubaan login per 15 minit per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minit
    max: 10,                   // 10 cubaan sahaja
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Kiraan hanya untuk cubaan GAGAL
    message: {
        error: 'Terlalu banyak cubaan log masuk. Sila cuba lagi selepas 15 minit.'
    },
    handler: (req, res) => {
        // HTML response untuk browser (bukan API)
        res.status(429).render('auth-login', {
            error: 'Terlalu banyak cubaan log masuk. Sila cuba lagi selepas 15 minit.',
            success: null
        });
    }
});

// Middleware untuk check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/auth/login');
};

// Middleware untuk check admin role
const requireAdmin = (req, res, next) => {
    if (req.session.userId && req.session.userRole === 'admin') return next();
    res.status(403).send('Akses ditolak. Hanya admin dibenarkan.');
};

// Middleware untuk check teacher/admin role
const requireTeacherOrAdmin = (req, res, next) => {
    if (req.session.userId && (req.session.userRole === 'teacher' || req.session.userRole === 'admin')) return next();
    res.status(403).send('Akses ditolak. Hanya guru/admin dibenarkan.');
};

// ==========================================
// LOGIN & LOGOUT
// ==========================================

// GET: Login Page
router.get('/login', (req, res) => {
    res.render('auth-login', { error: null, success: req.query.success });
});

// POST: Process Login — dilindungi oleh loginLimiter
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.render('auth-login', { error: 'Sila masukkan email/username dan password', success: null });
        }
        
        // Cuba cari user melalui email atau username
        const loginInput = email.trim().toLowerCase();
        let user = await User.findOne({ 
            $or: [
                { email: loginInput },
                { username: loginInput }
            ], 
            isActive: true 
        });
        
        // Jika tidak dijumpai, cuba cari melalui fullName (untuk admin/teacher)
        if (!user) {
            user = await User.findOne({ 
                fullName: { $regex: new RegExp('^' + email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
                role: { $in: ['admin', 'teacher'] },
                isActive: true 
            });
        }
        
        if (!user) {
            return res.render('auth-login', { error: 'Email/username tidak dijumpai atau akaun tidak aktif', success: null });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('auth-login', { error: 'Password salah', success: null });
        }
        
        // Update last login - guna updateOne untuk elak trigger bcrypt pre-save hook
        await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
        
        // Set session — simpan role & isActive dalam session supaya middleware
        // authenticate() tidak perlu query DB setiap request
        req.session.userId = user._id.toString();
        req.session.userRole = user.role;
        req.session.userName = user.fullName;
        req.session.userIsActive = true; // cached — elak extra DB query
        
        // Redirect based on role
        if (user.role === 'admin') {
            res.redirect('/admin-mace');
        } else if (user.role === 'teacher') {
            res.redirect('/teacher/dashboard');
        } else if (user.role === 'student') {
            // Student redirect to athlete dashboard
            res.redirect('/dashboard');
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.render('auth-login', { error: 'Ralat sistem. Sila cuba lagi.', success: null });
    }
});

// GET: Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout Error:', err);
        res.redirect('/auth/login');
    });
});

// ==========================================
// ADMIN: PENGURUSAN TEACHER (Hanya Admin)
// ==========================================

// GET: Senarai Teacher (Admin Only)
router.get('/admin/teachers', requireAdmin, async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 });
        res.render('admin-teachers', { teachers, msg: req.query.msg || null, error: null });
    } catch (err) {
        console.error('Get Teachers Error:', err);
        res.render('admin-teachers', { teachers: [], msg: null, error: 'Ralat memuatkan senarai guru.' });
    }
});

// GET: Form Tambah Teacher Baru (Admin Only)
router.get('/admin/teachers/new', requireAdmin, (req, res) => {
    res.render('admin-teacher-form', { teacher: null, editMode: false, msg: null });
});

// POST: Cipta Teacher Baru (Admin Only)
router.post('/admin/teachers/create', requireAdmin, async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;
        
        // Validation
        if (!fullName || !email || !password) {
            return res.render('admin-teacher-form', { teacher: null, editMode: false, msg: 'Sila lengkapkan semua maklumat.' });
        }
        
        if (password !== confirmPassword) {
            return res.render('admin-teacher-form', { teacher: null, editMode: false, msg: 'Password tidak sepadan.' });
        }
        
        // Check if email already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.render('admin-teacher-form', { teacher: null, editMode: false, msg: 'Email sudah berdaftar.' });
        }
        
        // Create teacher account
        await User.create({
            fullName,
            email: email.toLowerCase(),
            password, // Will be hashed by pre-save hook
            role: 'teacher',
            isActive: true
        });
        
        res.redirect('/auth/admin/teachers?msg=teacher_created');
    } catch (err) {
        console.error('Create Teacher Error:', err);
        res.render('admin-teacher-form', { teacher: null, editMode: false, msg: 'Ralat mencipta guru.' });
    }
});

// GET: Form Edit Teacher (Admin Only)
router.get('/admin/teachers/edit/:id', requireAdmin, async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/auth/admin/teachers?msg=not_found');
        }
        res.render('admin-teacher-form', { teacher, editMode: true, msg: null });
    } catch (err) {
        console.error('Edit Teacher Form Error:', err);
        res.redirect('/auth/admin/teachers?msg=error');
    }
});

// POST: Update Teacher (Admin Only)
router.post('/admin/teachers/update/:id', requireAdmin, async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword, isActive } = req.body;
        
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/auth/admin/teachers?msg=not_found');
        }
        
        // Check if email changed and already exists
        if (email.toLowerCase() !== teacher.email) {
            const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
            if (existing) {
                return res.render('admin-teacher-form', { teacher, editMode: true, msg: 'Email sudah berdaftar.' });
            }
        }
        
        const updateData = {
            fullName,
            email: email.toLowerCase(),
            isActive: isActive === 'on'
        };
        
        // Update password if provided
        if (password && password.length > 0) {
            if (password !== confirmPassword) {
                return res.render('admin-teacher-form', { teacher, editMode: true, msg: 'Password tidak sepadan.' });
            }
            updateData.password = password;
        }
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/auth/admin/teachers?msg=teacher_updated');
    } catch (err) {
        console.error('Update Teacher Error:', err);
        res.redirect('/auth/admin/teachers?msg=update_error');
    }
});

// POST: Delete Teacher (Admin Only)
router.post('/admin/teachers/delete/:id', requireAdmin, async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/auth/admin/teachers?msg=not_found');
        }
        
        // Remove teacher reference from groups
        await Group.updateMany({ teacherId: teacher._id }, { $unset: { teacherId: "" } });
        
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/auth/admin/teachers?msg=teacher_deleted');
    } catch (err) {
        console.error('Delete Teacher Error:', err);
        res.redirect('/auth/admin/teachers?msg=delete_error');
    }
});

// POST: Reset Password Teacher (Admin Only)
router.post('/admin/teachers/reset-password/:id', requireAdmin, async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            return res.redirect('/auth/admin/teachers/edit/' + req.params.id + '?msg=password_mismatch');
        }
        
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') {
            return res.redirect('/auth/admin/teachers?msg=not_found');
        }
        
        teacher.password = newPassword; // Will be hashed by pre-save hook
        await teacher.save();
        
        res.redirect('/auth/admin/teachers?msg=password_reset');
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.redirect('/auth/admin/teachers?msg=reset_error');
    }
});

// ==========================================
// ADMIN: PENGURUSAN STUDENT (Hanya Admin)
// ==========================================

// GET: Senarai Student untuk Admin (Admin Only) — dengan Pagination
router.get('/admin/students', requireAdmin, async (req, res) => {
    try {
        const PAGE_SIZE = 50;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const search = req.query.search ? req.query.search.trim() : '';
        
        // Build search filter
        let filter = { role: 'student' };
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const [students, total, groups] = await Promise.all([
            User.find(filter)
                .populate('athleteId', 'fullName icNumber sukan negeriWakil')
                .populate('enrolledGroups', 'name')
                .sort({ createdAt: -1 })
                .skip((page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE)
                .lean(),
            User.countDocuments(filter),
            Group.find({ isActive: true }).select('name').sort({ name: 1 }).lean()
        ]);
        
        const totalPages = Math.ceil(total / PAGE_SIZE);
        res.render('admin-students', { 
            students, groups, 
            msg: req.query.msg || null, 
            error: null,
            pagination: { page, totalPages, total, search }
        });
    } catch (err) {
        console.error('Get Students Error:', err);
        res.render('admin-students', { students: [], groups: [], msg: null, error: 'Ralat memuatkan senarai pelajar.', pagination: null });
    }
});

// POST: Update Student Info & Group (Admin Only)
router.post('/admin/students/update/:id', requireAdmin, async (req, res) => {
    try {
        const { fullName, email, groupIds, isActive } = req.body;
        
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.redirect('/auth/admin/students?msg=not_found');
        }
        
        const updateData = {
            fullName,
            email: email.toLowerCase(),
            isActive: isActive === 'on'
        };
        
        // Update enrolled groups
        if (groupIds) {
            const groupArray = Array.isArray(groupIds) ? groupIds : [groupIds];
            updateData.enrolledGroups = groupArray;
        } else {
            updateData.enrolledGroups = [];
        }
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/auth/admin/students?msg=student_updated');
    } catch (err) {
        console.error('Update Student Error:', err);
        res.redirect('/auth/admin/students?msg=update_error');
    }
});

// POST: Reset Password Student (Admin Only)
router.post('/admin/students/reset-password/:id', requireAdmin, async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            return res.redirect('/auth/admin/students?msg=password_mismatch');
        }
        
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.redirect('/auth/admin/students?msg=not_found');
        }
        
        student.password = newPassword; // Will be hashed by pre-save hook
        await student.save();
        
        res.redirect('/auth/admin/students?msg=password_reset');
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.redirect('/auth/admin/students?msg=reset_error');
    }
});

// POST: Delete Student (Admin Only)
router.post('/admin/students/delete/:id', requireAdmin, async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.redirect('/auth/admin/students?msg=not_found');
        }
        
        // Remove student from groups
        await Group.updateMany({ students: student._id }, { $pull: { students: student._id } });
        
        // Delete user account
        await User.findByIdAndDelete(req.params.id);
        
        // Optionally delete athlete record too
        if (student.athleteId) {
            await Athlete.findByIdAndDelete(student.athleteId);
        }
        
        res.redirect('/auth/admin/students?msg=student_deleted');
    } catch (err) {
        console.error('Delete Student Error:', err);
        res.redirect('/auth/admin/students?msg=delete_error');
    }
});

module.exports = router;
