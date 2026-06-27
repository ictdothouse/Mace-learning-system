const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true }, // TinyMCE content
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'General' },
  explanation: { type: String, default: '' }, // TinyMCE explanation
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionBank', questionSchema);
