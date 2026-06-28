const express = require('express');
const router = express.Router();
const LessonProgress = require('../models/LessonProgress');
const LevelProgress = require('../models/LevelProgress');
const QuizResult = require('../models/QuizResult');
const Module = require('../models/Module');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const { authenticate } = require('../middleware/auth');

// Middleware untuk pelajar sahaja
const requireStudent = [authenticate, (req, res, next) => {
  if (req.user.role === 'pelajar') {
    next();
  } else {
    res.status(403).json({ message: 'Akses ditolak. Hanya untuk pelajar.' });
  }
}];

// ==================== GET PROGRESS PELAJAR ====================

// GET /api/progress/modules - Dapatkan semua modul yang boleh diakses pelajar dengan progress
router.get('/modules', requireStudent, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Dapatkan semua modul aktif
    const modules = await Module.find({ isActive: true }).sort({ order: 1 });
    
    const modulesWithProgress = await Promise.all(
      modules.map(async (module) => {
        let progressData = {
          moduleId: module._id,
          title: module.title,
          description: module.description,
          thumbnail: module.thumbnail,
          hasLevels: module.hasLevels,
          isSequential: module.isSequential,
          totalLessons: 0,
          completedLessons: 0,
          overallProgress: 0,
          bestScore: 0
        };
        
        if (module.hasLevels) {
          // Modul dengan level system
          const levels = await Level.find({ moduleId: module._id }).sort({ order: 1 });
          
          const levelsWithProgress = await Promise.all(
            levels.map(async (level) => {
              const lessonCount = await Lesson.countDocuments({ 
                moduleId: module._id, 
                levelId: level._id,
                isActive: true 
              });
              
              const completedCount = await LessonProgress.countDocuments({
                userId,
                moduleId: module._id,
                levelId: level._id,
                isCompleted: true
              });
              
              const levelProg = await LevelProgress.findOne({
                userId,
                levelId: level._id
              });
              
              return {
                levelId: level._id,
                name: level.name,
                description: level.description,
                order: level.order,
                isLocked: level.isLocked,
                totalLessons: lessonCount,
                completedLessons: completedCount,
                progress: lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0,
                isCompleted: levelProg?.isCompleted || false,
                bestScore: levelProg?.bestScore || 0,
                averageScore: levelProg?.averageScore || 0
              };
            })
          );
          
          const totalLessons = levelsWithProgress.reduce((sum, l) => sum + l.totalLessons, 0);
          const completedLessons = levelsWithProgress.reduce((sum, l) => sum + l.completedLessons, 0);
          
          progressData.levels = levelsWithProgress;
          progressData.totalLessons = totalLessons;
          progressData.completedLessons = completedLessons;
          progressData.overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
          
        } else {
          // Modul tanpa level (standalone lessons)
          const lessonCount = await Lesson.countDocuments({ 
            moduleId: module._id, 
            levelId: null,
            isActive: true 
          });
          
          const completedCount = await LessonProgress.countDocuments({
            userId,
            moduleId: module._id,
            levelId: null,
            isCompleted: true
          });
          
          progressData.totalLessons = lessonCount;
          progressData.completedLessons = completedCount;
          progressData.overallProgress = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;
        }
        
        return progressData;
      })
    );
    
    res.json({ success: true, data: modulesWithProgress });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// GET /api/progress/module/:moduleId - Progress detail untuk modul tertentu
router.get('/module/:moduleId', requireStudent, async (req, res) => {
  try {
    const userId = req.user._id;
    const { moduleId } = req.params;
    
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Modul tidak dijumpai' });
    }
    
    let response = {
      moduleId: module._id,
      title: module.title,
      hasLevels: module.hasLevels,
      isSequential: module.isSequential,
      minPassingScore: module.minPassingScore
    };
    
    if (module.hasLevels) {
      const levels = await Level.find({ moduleId }).sort({ order: 1 });
      
      const levelsData = await Promise.all(
        levels.map(async (level) => {
          const lessons = await Lesson.find({ 
            moduleId, 
            levelId: level._id,
            isActive: true 
          }).sort({ order: 1 });
          
          const lessonsWithProgress = await Promise.all(
            lessons.map(async (lesson) => {
              const progress = await LessonProgress.findOne({
                userId,
                lessonId: lesson._id
              });
              
              return {
                lessonId: lesson._id,
                title: lesson.title,
                order: lesson.order,
                isCompleted: progress?.isCompleted || false,
                bestScore: progress?.bestScore || 0,
                quizAttempts: progress?.quizAttempts || 0
              };
            })
          );
          
          const levelProg = await LevelProgress.findOne({ userId, levelId: level._id });
          
          return {
            levelId: level._id,
            name: level.name,
            description: level.description,
            order: level.order,
            isLocked: level.isLocked,
            lessons: lessonsWithProgress,
            progress: levelProg ? {
              isCompleted: levelProg.isCompleted,
              completedLessons: levelProg.completedLessons,
              totalLessons: levelProg.totalLessons,
              averageScore: levelProg.averageScore,
              bestScore: levelProg.bestScore
            } : null
          };
        })
      );
      
      response.levels = levelsData;
    } else {
      // Standalone lessons
      const lessons = await Lesson.find({ 
        moduleId, 
        levelId: null,
        isActive: true 
      }).sort({ order: 1 });
      
      const lessonsWithProgress = await Promise.all(
        lessons.map(async (lesson) => {
          const progress = await LessonProgress.findOne({
            userId,
            lessonId: lesson._id
          });
          
          return {
            lessonId: lesson._id,
            title: lesson.title,
            order: lesson.order,
            isCompleted: progress?.isCompleted || false,
            bestScore: progress?.bestScore || 0,
            quizAttempts: progress?.quizAttempts || 0
          };
        })
      );
      
      response.lessons = lessonsWithProgress;
    }
    
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching module detail progress:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

// GET /api/progress/check-access/:moduleId/:levelId - Check jika pelajar boleh akses level ini
router.get('/check-access/:moduleId/:levelId', requireStudent, async (req, res) => {
  try {
    const userId = req.user._id;
    const { moduleId, levelId } = req.params;
    
    const module = await Module.findById(moduleId);
    if (!module || !module.hasLevels) {
      return res.status(400).json({ message: 'Modul tidak wujud atau tidak menggunakan sistem level' });
    }
    
    const level = await Level.findById(levelId);
    if (!level) {
      return res.status(404).json({ message: 'Level tidak dijumpai' });
    }
    
    // Jika level locked manually
    if (level.isLocked) {
      return res.json({ 
        success: true, 
        canAccess: false, 
        reason: 'Level ini dikunci oleh pengajar' 
      });
    }
    
    // Jika tidak sequential, semua level boleh diakses
    if (!module.isSequential) {
      return res.json({ 
        success: true, 
        canAccess: true 
      });
    }
    
    // Sequential mode: check previous levels
    const currentLevelOrder = level.order;
    
    // Get all previous levels
    const previousLevels = await Level.find({
      moduleId,
      order: { $lt: currentLevelOrder }
    }).sort({ order: 1 });
    
    for (const prevLevel of previousLevels) {
      const levelProg = await LevelProgress.findOne({
        userId,
        levelId: prevLevel._id
      });
      
      // Check jika previous level belum completed
      if (!levelProg || !levelProg.isCompleted) {
        return res.json({ 
          success: true, 
          canAccess: false, 
          reason: `Sila siapkan ${prevLevel.name} dahulu`,
          requiredLevel: prevLevel.name
        });
      }
      
      // Check minimum passing score jika ada
      if (module.minPassingScore > 0 && levelProg.bestScore < module.minPassingScore) {
        return res.json({ 
          success: true, 
          canAccess: false, 
          reason: `Perlu skor minimum ${module.minPassingScore}% dalam ${prevLevel.name}`,
          requiredScore: module.minPassingScore,
          currentScore: levelProg.bestScore
        });
      }
    }
    
    // Semua check passed
    return res.json({ 
      success: true, 
      canAccess: true 
    });
    
  } catch (error) {
    console.error('Error checking access:', error);
    res.status(500).json({ message: 'Ralat server', error: error.message });
  }
});

module.exports = router;
