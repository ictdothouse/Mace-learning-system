const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const { authenticate, authorize } = require('../middleware/auth');

// Middleware untuk check role (Admin atau Teacher sahaja) atau Master Admin (Basic Auth)
const requireAdminOrTeacher = async (req, res, next) => {
  // 1. Cuba check session dlu
  if (req.session && req.session.userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.session.userId);
      if (user && user.isActive && (user.role === 'admin' || user.role === 'teacher')) {
        req.user = user;
        return next();
      }
    } catch (e) {
      console.error('Session user check error in levels API:', e);
    }
  }
  
  // 2. Cuba check Basic Auth (untuk Master Admin)
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (login && password && login === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.user = { role: 'admin', fullName: 'Master Admin' };
    return next();
  }
  
  res.status(401).json({ message: 'Sila login terlebih dahulu' });
};

// ==================== LEVEL MANAGEMENT ====================

// GET /api/levels/:moduleId - Dapatkan semua level untuk modul tertentu
router.get('/module/:moduleId', requireAdminOrTeacher, async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Modul tidak dijumpai' });
    }
    
    // Get all levels for this module, sorted by order
    const levels = await Level.find({ moduleId }).sort({ order: 1 });
    
    res.json({ success: true, data: levels });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// POST /api/levels - Create new level dalam modul
router.post('/', requireAdminOrTeacher, async (req, res) => {
  try {
    const { moduleId, name, name_en, description, description_en, targetAudience, targetAudience_en, duration, duration_en, order } = req.body;
    
    // Validation
    if (!moduleId || !name) {
      return res.status(400).json({ message: 'Module ID dan Name diperlukan' });
    }
    
    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Modul tidak dijumpai' });
    }
    
    // Check if module has levels enabled
    if (!module.hasLevels) {
      return res.status(400).json({ 
        message: 'Modul ini tidak mempunyai sistem Level diaktifkan. Sila enable dalam setting modul.' 
      });
    }
    
    // Auto-generate order jika tidak diberikan
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const lastLevel = await Level.findOne({ moduleId }).sort({ order: -1 });
      finalOrder = lastLevel ? lastLevel.order + 1 : 1;
    }
    
    const level = new Level({
      moduleId,
      name,
      name_en: name_en || '',
      description: description || '',
      description_en: description_en || '',
      targetAudience: targetAudience || '',
      targetAudience_en: targetAudience_en || '',
      duration: duration || '',
      duration_en: duration_en || '',
      order: finalOrder
    });
    
    await level.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Level berjaya dicipta',
      data: level 
    });
  } catch (error) {
    console.error('Error creating level:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// PUT /api/levels/:id - Update level
router.put('/:id', requireAdminOrTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_en, description, description_en, targetAudience, targetAudience_en, duration, duration_en, order, isLocked } = req.body;
    
    const level = await Level.findById(id);
    if (!level) {
      return res.status(404).json({ message: 'Level tidak dijumpai' });
    }
    
    // Update fields
    if (name !== undefined) level.name = name;
    if (name_en !== undefined) level.name_en = name_en;
    if (description !== undefined) level.description = description;
    if (description_en !== undefined) level.description_en = description_en;
    if (targetAudience !== undefined) level.targetAudience = targetAudience;
    if (targetAudience_en !== undefined) level.targetAudience_en = targetAudience_en;
    if (duration !== undefined) level.duration = duration;
    if (duration_en !== undefined) level.duration_en = duration_en;
    if (order !== undefined) level.order = order;
    if (isLocked !== undefined) level.isLocked = isLocked;
    
    await level.save();
    
    res.json({ 
      success: true, 
      message: 'Level berjaya dikemaskini',
      data: level 
    });
  } catch (error) {
    console.error('Error updating level:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// DELETE /api/levels/:id - Delete level
router.delete('/:id', requireAdminOrTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    
    const level = await Level.findById(id);
    if (!level) {
      return res.status(404).json({ message: 'Level tidak dijumpai' });
    }
    
    // Optional: Check if there are lessons in this level
    const lessonCount = await Lesson.countDocuments({ levelId: id });
    if (lessonCount > 0) {
      return res.status(400).json({ 
        message: `Level ini mempunyai ${lessonCount} lesson. Sila pindah atau delete lesson dahulu.` 
      });
    }
    
    await Level.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'Level berjaya dipadam'
    });
  } catch (error) {
    console.error('Error deleting level:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// PUT /api/levels/reorder - Reorder levels dalam modul
router.put('/reorder', requireAdminOrTeacher, async (req, res) => {
  try {
    const { moduleId, levels } = req.body;
    
    if (!moduleId || !Array.isArray(levels)) {
      return res.status(400).json({ message: 'Module ID dan levels array diperlukan' });
    }
    
    // Update order untuk setiap level
    const updatePromises = levels.map(({ _id, order }) => 
      Level.findByIdAndUpdate(_id, { order })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ 
      success: true, 
      message: 'Susunan level berjaya dikemaskini'
    });
  } catch (error) {
    console.error('Error reordering levels:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// ==================== MODULE LEVEL SETTINGS ====================

// PUT /api/modules/:id/level-settings - Update level settings untuk modul
router.put('/modules/:id/level-settings', requireAdminOrTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const { hasLevels, isSequential, minPassingScore } = req.body;
    
    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).json({ message: 'Modul tidak dijumpai' });
    }
    
    // Update settings
    if (hasLevels !== undefined) module.hasLevels = hasLevels;
    if (isSequential !== undefined) module.isSequential = isSequential;
    if (minPassingScore !== undefined) {
      if (minPassingScore < 0 || minPassingScore > 100) {
        return res.status(400).json({ message: 'Minimum passing score mesti antara 0-100' });
      }
      module.minPassingScore = minPassingScore;
    }
    
    await module.save();
    
    res.json({ 
      success: true, 
      message: 'Setting level berjaya dikemaskini',
      data: {
        hasLevels: module.hasLevels,
        isSequential: module.isSequential,
        minPassingScore: module.minPassingScore
      }
    });
  } catch (error) {
    console.error('Error updating module level settings:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

module.exports = router;
