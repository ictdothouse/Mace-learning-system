const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_en: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  description_en: {
    type: String,
    trim: true
  },
  targetAudience: {
    type: String,
    trim: true
  },
  targetAudience_en: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  duration_en: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  // Settings khusus untuk level ini (optional override dari module)
  isLocked: {
    type: Boolean,
    default: false // Jika true, pelajar tak boleh akses langsung walau dah pass level sebelum
  }
}, { timestamps: true });

// Index untuk pastikan order dalam modul adalah unik
levelSchema.index({ moduleId: 1, order: 1 });

module.exports = mongoose.model('Level', levelSchema);
