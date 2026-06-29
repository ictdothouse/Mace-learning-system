// models/Page.js - Model untuk dynamic CMS pages
const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  content: {
    type: String,
    default: ''
  },
  content_en: {
    type: String,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  showInNavigation: {
    type: Boolean,
    default: true
  },
  navigationOrder: {
    type: Number,
    default: 0
  },
  customTemplate: {
    type: String,
    default: 'default',
    enum: ['default', 'modules']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Page', pageSchema);
