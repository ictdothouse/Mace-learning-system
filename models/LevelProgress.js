const mongoose = require('mongoose');

const levelProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
    index: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
    index: true
  },
  
  // Status completion level
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  // Progress stats
  totalLessons: {
    type: Number,
    default: 0
  },
  completedLessons: {
    type: Number,
    default: 0
  },
  
  // Average score dari semua lesson dalam level ini
  averageScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Best quiz score dalam level ini
  bestScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Bilangan percubaan kuiz keseluruhan
  totalQuizAttempts: {
    type: Number,
    default: 0
  },
  
  // Completion timestamp
  completedAt: {
    type: Date,
    default: null
  },
  
  // Last accessed timestamp
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure unique user-level combination
levelProgressSchema.index({ userId: 1, levelId: 1 }, { unique: true });
levelProgressSchema.index({ userId: 1, moduleId: 1 });

module.exports = mongoose.model('LevelProgress', levelProgressSchema);
