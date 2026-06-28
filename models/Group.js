// models/Group.js - Pengurusan Group Pelajar untuk E-Learning
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    // Nama Group (contoh: "SUKMA 2024 - Bola Sepak", "Kumpulan A")
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    
    // Deskripsi Group
    description: { 
        type: String, 
        trim: true 
    },
    
    // Enrollment Key (untuk pelajar join sendiri)
    enrollmentKey: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    
    // Guru/Instruktor yang menguruskan group ini
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: false  // Optional untuk auto-assign
    },
    
    // Admin yang mencipta group (optional)
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    
    // Modul yang diakses oleh group ini
    modules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module'
    }],
    
    // Pelajar dalam group ini
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Status Group
    isActive: { 
        type: Boolean, 
        default: true 
    },
    
    // Tarikh Mula & Tamat (optional)
    startDate: Date,
    endDate: Date,
    
    // Bilangan pelajar maksimum (optional, 0 = unlimited)
    maxStudents: { 
        type: Number, 
        default: 0 
    }
}, { 
    timestamps: true
});

// Generate enrollment key secara automatik sebelum validasi
groupSchema.pre('validate', function() {
    if (!this.enrollmentKey) {
        const crypto = require('crypto');
        this.enrollmentKey = 'GRP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    }
});

module.exports = mongoose.model('Group', groupSchema);
