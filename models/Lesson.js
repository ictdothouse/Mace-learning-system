// models/Lesson.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'General' } // Untuk bank soalan
});

const lessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    contentHtml: { type: String, required: true }, // Simpan HTML/Teks & Video Embed
    videoUrl: { type: String, default: '' }, // URL Cloudflare R2
    quizQuestions: [questionSchema],
    passMark: { type: Number, default: 80 },
    order: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);