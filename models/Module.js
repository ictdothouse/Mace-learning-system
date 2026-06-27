const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true }, // TinyMCE content
  thumbnail: { type: String, default: '' }, // URL or Cloudflare R2
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Module', moduleSchema);
