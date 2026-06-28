const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const { authenticate, authorize } = require('../middleware/auth');

// Middleware untuk check role (Admin atau Teacher sahaja)
const requireAdminOrTeacher = [authenticate, (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: 'Akses ditolak. Hanya Admin dan Teacher.' });
  }
}];

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
    const { moduleId, name, description, order } = req.body;
    
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
      description: description || '',
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
    const { name, description, order, isLocked } = req.body;
    
    const level = await Level.findById(id);
    if (!level) {
      return res.status(404).json({ message: 'Level tidak dijumpai' });
    }
    
    // Update fields
    if (name !== undefined) level.name = name;
    if (description !== undefined) level.description = description;
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
