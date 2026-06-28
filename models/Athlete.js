// models/Athlete.js
const mongoose = require('mongoose');

const athleteSchema = new mongoose.Schema({
    // Maklumat Peribadi Atlet
    fullName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    icNumber: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    jantina: { 
        type: String, 
        enum: ['Lelaki', 'Perempuan'], 
        required: true 
    },
    umur: { 
        type: Number, 
        required: true 
    },
    negeriWakil: { 
        type: String, 
        required: true 
    },
    sukan: { 
        type: String, 
        required: true,
        trim: true 
    },

    // Kemajuan Pembelajaran (Sequential Guard)
    enrolledGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    currentStage: { 
        type: Number, 
        default: 1 
    },
    
    // Tracking Video Tontonan (Wajib tonton sebelum kuiz)
    watchedLessons: { 
        type: [Number], 
        default: [] 
    },

    // Markah Kuiz Setiap Modul
    quizScores: {
        quiz1: { type: Number, default: 0 },
        quiz2: { type: Number, default: 0 },
        quiz3: { type: Number, default: 0 }
    },

    // Status Penyelesaian Kursus
    completedAt: { 
        type: Date, 
        default: null 
    }
}, { 
    timestamps: true // Auto-generate createdAt & updatedAt
});

module.exports = mongoose.model('Athlete', athleteSchema);