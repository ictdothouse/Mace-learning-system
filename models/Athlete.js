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

// ⚡ Index untuk carian & filter yang kerap digunakan dalam admin dashboard
// Elak full collection scan ke atas 8,000 rekod
athleteSchema.index({ negeriWakil: 1 });           // Filter by state
athleteSchema.index({ sukan: 1 });                  // Filter by sport
athleteSchema.index({ currentStage: 1 });           // Filter by stage
athleteSchema.index({ jantina: 1 });               // Filter by gender
athleteSchema.index({ completedAt: 1 });           // Sort by completion date
athleteSchema.index({ negeriWakil: 1, sukan: 1 }); // Compound: state + sport filter

module.exports = mongoose.model('Athlete', athleteSchema);