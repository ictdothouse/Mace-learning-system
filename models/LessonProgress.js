const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema({
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
  
  // Status completion
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  // Best quiz score untuk lesson ini
  bestScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Bilangan percubaan kuiz
  quizAttempts: {
    type: Number,
    default: 0
  },
  
  // Last accessed timestamp
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  
  // Completion timestamp (bila dah pass kuiz)
  completedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Ensure unique user-lesson combination
lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, moduleId: 1, levelId: 1 });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);
