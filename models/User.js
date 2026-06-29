// models/User.js - Sistem Pengurusan Pengguna (Admin, Teacher, Student)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Maklumat Asas
    fullName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true,
        lowercase: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    },
    
    // Peranan: 'admin', 'teacher', 'student'
    role: { 
        type: String, 
        enum: ['admin', 'teacher', 'student'], 
        required: true,
        default: 'student'
    },
    
    // Untuk student sahaja - rujukan ke Athlete model
    athleteId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Athlete',
        default: null
    },
    
    // Untuk teacher & admin - group yang diuruskan
    managedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    
    // Untuk student - group yang disertai
    enrolledGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    
    // Status Akaun
    isActive: { 
        type: Boolean, 
        default: true 
    },
    
    // Reset Password Token
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Last Login
    lastLogin: Date
}, { 
    timestamps: true
});

// Hash password sebelum simpan
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

// Method untuk compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method untuk reset password
userSchema.methods.generateResetToken = function() {
    const crypto = require('crypto');
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // 1 jam
    return this.resetPasswordToken;
};

module.exports = mongoose.model('User', userSchema);
