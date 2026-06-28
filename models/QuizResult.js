const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
    index: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
    index: true
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    default: null,
    index: true
  },
  
  // Score dan status
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    required: true,
    default: false
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  
  // Jawapan pelajar (untuk review)
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  
  // Masa yang diambil (dalam saat)
  timeTaken: {
    type: Number,
    default: 0
  },
  
  // Bilangan percubaan untuk lesson ini
  attemptNumber: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Index composite untuk query progress pelajar
quizResultSchema.index({ userId: 1, moduleId: 1, levelId: 1 });
quizResultSchema.index({ userId: 1, lessonId: 1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);
