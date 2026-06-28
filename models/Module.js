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
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Module', moduleSchema);
