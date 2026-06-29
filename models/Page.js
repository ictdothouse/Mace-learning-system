// models/Page.js - Model untuk dynamic CMS pages
const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  title_en: {
    type: String,
    trim: true,
    default: ''
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
    enum: ['default', 'modules', 'contact']
  },
  modulesConfig: {
    type: Array,
    default: []
  },
  contactConfig: {
    bannerTitle: { type: String, default: 'Hubungi' },
    bannerImage: { type: String, default: '' },
    description: { type: String, default: 'Sebarang pertanyaan atau maklumbalas, hubungi kami menerusi email :' },
    email: { type: String, default: 'mace@nsc.gov.my' },
    imageUrl: { type: String, default: '' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Page', pageSchema);
