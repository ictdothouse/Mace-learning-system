// routes/teacher.js - Routes untuk Teacher/Instruktor
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');

// Middleware untuk check teacher authentication
const requireTeacher = (req, res, next) => {
    if (req.session.userId && (req.session.userRole === 'teacher' || req.session.userRole === 'admin')) return next();
    res.redirect('/auth/login');
};

// ==========================================
// DASHBOARD TEACHER
// ==========================================

router.get('/dashboard', requireTeacher, async (req, res) => {
    try {
        const teacherId = req.session.userId;
        
        // Get groups managed by this teacher
        const groups = await Group.find({ teacherId }).populate('students', 'fullName email');
        
        // Get modules accessible by these groups
        const groupIds = groups.map(g => g._id);
        const modules = await Module.find({ 
            $or: [
                { isRestricted: false },
                { accessibleByGroups: { $in: groupIds } }
            ]
        }).sort({ order: 1 });
        
        // Stats
        const totalStudents = groups.reduce((sum, g) => sum + (g.students ? g.students.length : 0), 0);
        const totalLessons = await Lesson.countDocuments({ moduleId: { $in: modules.map(m => m._id) } });
        
        res.render('teacher-dashboard', { 
            groups, 
            modules, 
            stats: { 
                totalGroups: groups.length, 
                totalStudents, 
                totalModules: modules.length,
                totalLessons 
            },
            msg: req.query.msg || null 
        });
    } catch (err) {
        console.error('Teacher Dashboard Error:', err);
        res.render('teacher-dashboard', { groups: [], modules: [], stats: {}, msg: null });
    }
});

// ==========================================
// PENGURUSAN GROUP (Teacher)
// ==========================================

// GET: Senarai Group
router.get('/groups', requireTeacher, async (req, res) => {
    try {
        const teacherId = req.session.userId;
        const groups = await Group.find({ teacherId })
            .populate('students', 'fullName email')
            .populate('modules', 'title')
            .sort({ createdAt: -1 });
        res.render('teacher-groups', { groups, msg: req.query.msg || null });
    } catch (err) {
        console.error('Get Groups Error:', err);
        res.render('teacher-groups', { groups: [], msg: 'Ralat memuatkan group.' });
    }
});

// GET: Form Cipta Group Baru
router.get('/groups/new', requireTeacher, (req, res) => {
    res.render('teacher-group-form', { group: null, editMode: false, msg: null });
});

// POST: Cipta Group Baru
router.post('/groups/create', requireTeacher, async (req, res) => {
    try {
        const { name, description, enrollmentKey, maxStudents } = req.body;
        
        if (!name) {
            return res.render('teacher-group-form', { group: null, editMode: false, msg: 'Nama group diperlukan.' });
        }
        
        await Group.create({
            name,
            description,
            enrollmentKey: enrollmentKey || undefined, // Auto-generated if empty
            maxStudents: parseInt(maxStudents) || 0,
            teacherId: req.session.userId,
            isActive: true
        });
        
        res.redirect('/teacher/groups?msg=group_created');
    } catch (err) {
        console.error('Create Group Error:', err);
        res.render('teacher-group-form', { group: null, editMode: false, msg: 'Ralat mencipta group.' });
    }
});

// GET: Form Edit Group
router.get('/groups/edit/:id', requireTeacher, async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        res.render('teacher-group-form', { group, editMode: true, msg: null });
    } catch (err) {
        console.error('Edit Group Form Error:', err);
        res.redirect('/teacher/groups?msg=error');
    }
});

// POST: Update Group
router.post('/groups/update/:id', requireTeacher, async (req, res) => {
    try {
        const { name, description, enrollmentKey, maxStudents, isActive } = req.body;
        
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        const updateData = {
            name,
            description,
            maxStudents: parseInt(maxStudents) || 0,
            isActive: isActive === 'on'
        };
        
        // Only update enrollmentKey if provided
        if (enrollmentKey && enrollmentKey.trim() !== '') {
            updateData.enrollmentKey = enrollmentKey.trim();
        }
        
        await Group.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/teacher/groups?msg=group_updated');
    } catch (err) {
        console.error('Update Group Error:', err);
        res.redirect('/teacher/groups?msg=update_error');
    }
});

// POST: Delete Group
router.post('/groups/delete/:id', requireTeacher, async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        await Group.findByIdAndDelete(req.params.id);
        res.redirect('/teacher/groups?msg=group_deleted');
    } catch (err) {
        console.error('Delete Group Error:', err);
        res.redirect('/teacher/groups?msg=delete_error');
    }
});

// ==========================================
// PENGURUSAN MODULE ACCESS (Teacher)
// ==========================================

// GET: Assign Modules to Group
router.get('/groups/:id/modules', requireTeacher, async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        const allModules = await Module.find().sort({ order: 1 });
        const assignedModuleIds = group.modules.map(m => m.toString());
        
        res.render('teacher-group-modules', { group, allModules, assignedModuleIds, msg: req.query.msg || null });
    } catch (err) {
        console.error('Group Modules Error:', err);
        res.redirect('/teacher/groups?msg=error');
    }
});

// POST: Assign Modules to Group
router.post('/groups/:id/modules', requireTeacher, async (req, res) => {
    try {
        const { moduleIds } = req.body;
        
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        const modules = Array.isArray(moduleIds) ? moduleIds : (moduleIds ? [moduleIds] : []);
        group.modules = modules;
        await group.save();
        
        res.redirect('/teacher/groups/' + req.params.id + '/modules?msg=modules_assigned');
    } catch (err) {
        console.error('Assign Modules Error:', err);
        res.redirect('/teacher/groups?msg=assign_error');
    }
});

// ==========================================
// PENGURUSAN PELAJAR DALAM GROUP (Teacher)
// ==========================================

// GET: Senarai Pelajar dalam Group
router.get('/groups/:id/students', requireTeacher, async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId })
            .populate('students', 'fullName email lastLogin');
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        // Get all students not in this group
        const allStudents = await User.find({ role: 'student', isActive: true })
            .find({ _id: { $nin: group.students.map(s => s._id) } })
            .select('fullName email');
        
        res.render('teacher-group-students', { group, allStudents, msg: req.query.msg || null });
    } catch (err) {
        console.error('Group Students Error:', err);
        res.redirect('/teacher/groups?msg=error');
    }
});

// POST: Add Student to Group
router.post('/groups/:id/students/add', requireTeacher, async (req, res) => {
    try {
        const { studentId } = req.body;
        
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        if (!group.students.includes(studentId)) {
            group.students.push(studentId);
            await group.save();
            
            // Also update student's enrolledGroups
            await User.findByIdAndUpdate(studentId, { $addToSet: { enrolledGroups: group._id } });
        }
        
        res.redirect('/teacher/groups/' + req.params.id + '/students?msg=student_added');
    } catch (err) {
        console.error('Add Student Error:', err);
        res.redirect('/teacher/groups?msg=add_error');
    }
});

// POST: Remove Student from Group
router.post('/groups/:id/students/remove/:studentId', requireTeacher, async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.session.userId });
        if (!group) {
            return res.redirect('/teacher/groups?msg=not_found');
        }
        
        group.students = group.students.filter(s => s.toString() !== req.params.studentId);
        await group.save();
        
        // Also update student's enrolledGroups
        await User.findByIdAndUpdate(req.params.studentId, { $pull: { enrolledGroups: group._id } });
        
        res.redirect('/teacher/groups/' + req.params.id + '/students?msg=student_removed');
    } catch (err) {
        console.error('Remove Student Error:', err);
        res.redirect('/teacher/groups?msg=remove_error');
    }
});

// ==========================================
// ENROLLMENT KEY (Pelajar Join Sendiri)
// ==========================================

// GET: Halaman Join Group dengan Enrollment Key
router.get('/join', requireTeacher, (req, res) => {
    res.render('teacher-join-group', { msg: req.query.msg || null, error: null });
});

// POST: Join Group dengan Enrollment Key
router.post('/join', requireTeacher, async (req, res) => {
    try {
        const { enrollmentKey } = req.body;
        const studentId = req.session.userId;
        
        const group = await Group.findOne({ enrollmentKey: enrollmentKey.trim(), isActive: true });
        if (!group) {
            return res.render('teacher-join-group', { msg: null, error: 'Enrollment key tidak sah.' });
        }
        
        // Check if already enrolled
        if (group.students.includes(studentId)) {
            return res.render('teacher-join-group', { msg: null, error: 'Anda sudah mendaftar dalam group ini.' });
        }
        
        // Check max students
        if (group.maxStudents > 0 && group.students.length >= group.maxStudents) {
            return res.render('teacher-join-group', { msg: null, error: 'Group ini sudah penuh.' });
        }
        
        // Add student to group
        group.students.push(studentId);
        await group.save();
        
        // Update student's enrolledGroups
        await User.findByIdAndUpdate(studentId, { $addToSet: { enrolledGroups: group._id } });
        
        res.redirect('/teacher/dashboard?msg=joined_group');
    } catch (err) {
        console.error('Join Group Error:', err);
        res.render('teacher-join-group', { msg: null, error: 'Ralat menyertai group.' });
    }
});

module.exports = router;
