// models/Lesson.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['multiple-choice', 'true-false', 'short-answer'], 
        default: 'multiple-choice' 
    },
    options: [{ type: String }],
    correctIndex: { type: Number, min: 0 },
    correctAnswerText: { type: String, trim: true },
    points: { type: Number, default: 1, min: 0 },
    category: { type: String, default: 'General' }
});

const lessonSchema = new mongoose.Schema({
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    title: { type: String, required: true },
    contentHtml: { type: String, required: true }, // TinyMCE HTML content
    videoUrl: { type: String, default: '' },
    quizQuestions: [questionSchema],
    passMark: { type: Number, default: 80 },
    showPoints: { type: Boolean, default: true },
    order: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    resources: [{
        title: String,
        url: String,
        type: String // 'pdf', 'doc', 'link', etc.
    }],
    
    // === NEW: Level Association (Optional) ===
    // Jika null/undefined, lesson ini adalah standalone dalam modul (untuk modul tanpa level)
    // Jika ada value, lesson ini berada dalam level tertentu (untuk modul dengan hasLevels=true)
    levelId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Level', 
        default: null 
    }
}, { timestamps: true });

// Index untuk query optimization
lessonSchema.index({ moduleId: 1, order: 1 });
lessonSchema.index({ levelId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);