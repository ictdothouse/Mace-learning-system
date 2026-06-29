const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true }, // TinyMCE content
  thumbnail: { type: String, default: '' }, // URL or Cloudflare R2
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  // Group yang mempunyai akses kepada modul ini (untuk sistem e-learning)
  accessibleByGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  
  // Jika empty = semua pelajar boleh akses, jika ada group = hanya group tertentu
  isRestricted: { type: Boolean, default: false },
  
  // === NEW: Certificate Settings ===
  hasCertificate: { type: Boolean, default: false },
  certificateTemplate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CertificateTemplate',
    default: null 
  },
  
  // === NEW: Level System Settings ===
  hasLevels: { 
    type: Boolean, 
    default: false // Jika true, lesson akan diorganisasi dalam levels. Jika false, lesson standalone dalam modul
  },
  
  // Sequential access: Pelajar wajib ikut turutan level (Level 1 -> Level 2 -> Level 3)
  // Hanya berfungsi jika hasLevels = true
  isSequential: { 
    type: Boolean, 
    default: false 
  },
  
  // Minimum passing score untuk unlock level seterusnya (jika sequential)
  minPassingScore: { 
    type: Number, 
    default: 0, // 0-100, 0 bermaksud tiada requirement
    min: 0,
    max: 100
  },
  
  createdAt: { type: Date, default: Date.now }
});

// Index untuk query optimization
moduleSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Module', moduleSchema);
