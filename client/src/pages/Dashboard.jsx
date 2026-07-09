import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { branding, t, lang, changeLang, setAuth, auth } = useApp();
  const navigate = useNavigate();
  const isEmbedQuery = new URLSearchParams(window.location.search).get('embed') === 'true';
  if (isEmbedQuery) sessionStorage.setItem('isEmbed', 'true');
  const isEmbed = isEmbedQuery || sessionStorage.getItem('isEmbed') === 'true';

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [data, setData] = useState({ athlete: {}, modules: [], lessons: [], levels: [] });
  const [error, setError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const res = await axios.get('/api/athlete/dashboard');
      setData(res.data);
      
      // Welcome Modal Logic
      if (res.data.athlete && res.data.athlete.currentStage === 1 && res.data.lessons?.length > 0) {
        const seenKey = 'hasSeenWelcome_' + res.data.athlete._id;
        if (!localStorage.getItem(seenKey)) {
          setShowWelcome(true);
        }
      }
    } catch (err) {
      console.error('Failed to load athlete dashboard:', err);
      setError(err.response?.data?.error || 'Gagal memuatkan data dashboard.');
      if (err.response?.status === 401) {
        setAuth({ authenticated: false, role: null, athlete: null, user: null });
        navigate(isEmbed ? '/login?embed=true' : '/login');
      }
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (!auth.authenticated || auth.role !== 'student') {
      navigate(isEmbed ? '/login?embed=true' : '/login');
    } else {
      fetchDashboardData();
    }
  }, [auth, navigate, lang, isEmbed]);

  useEffect(() => {
    if (branding.siteName) {
      const siteName = lang === 'en' ? (branding.siteName_en || branding.siteName) : branding.siteName;
      document.title = `${siteName} - ${t('dashboard_title_tab', 'Dashboard')}`;
    }
  }, [branding, lang]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setAuth({ authenticated: false, role: null, athlete: null, user: null });
      navigate(isEmbed ? '/login?embed=true' : '/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const closeWelcomeModal = () => {
    const seenKey = 'hasSeenWelcome_' + data.athlete._id;
    localStorage.setItem(seenKey, 'true');
    setShowWelcome(false);
  };

  if (loadingDashboard) {
    const primaryColor = branding?.primaryColor || '#0f0c29';
    return (
      <div 
        className="min-h-screen flex flex-col text-white font-sans pb-12 animate-pulse"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #302b63 50%, #24243e 100%)` }}
      >
        {/* Navbar Skeleton */}
        <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-full"></div>
              <div className="w-32 h-5 bg-white/10 rounded-md"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-7 bg-white/10 rounded-lg"></div>
              <div className="w-20 h-7 bg-white/10 rounded-lg"></div>
            </div>
          </div>
        </nav>

        {/* Main Content Skeleton */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-grow w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8 sm:mb-10">
            <div className="space-y-3 flex-grow">
              <div className="w-24 h-4 bg-white/10 rounded"></div>
              <div className="w-64 sm:w-96 h-10 bg-white/20 rounded-xl"></div>
              <div className="flex gap-2">
                <div className="w-24 h-6 bg-white/10 rounded-full"></div>
                <div className="w-24 h-6 bg-white/10 rounded-full"></div>
                <div className="w-20 h-6 bg-white/10 rounded-full"></div>
              </div>
            </div>
            <div className="w-28 h-28 bg-white/10 rounded-full flex items-center justify-center shrink-0">
              <div className="w-20 h-20 bg-white/5 rounded-full"></div>
            </div>
          </div>

          {/* Cards/Modules Skeleton */}
          <div className="space-y-6">
            <div className="w-48 h-6 bg-white/20 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl"></div>
                  <div className="space-y-2">
                    <div className="w-3/4 h-5 bg-white/10 rounded"></div>
                    <div className="w-1/2 h-3 bg-white/5 rounded"></div>
                  </div>
                  <div className="pt-2">
                    <div className="w-full h-8 bg-white/10 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { athlete, modules, lessons, levels } = data;

  const lessonList = (lessons && lessons.length > 0)
    ? lessons
    : [
        { title: 'Jom kuasai asas dulu sebelum jadi pro!', order: 1, moduleId: { title: 'MODUL 1 : PLAY SAFE WIN STRONG', _id: 'legacy', hasCertificate: true } }, 
        { title: 'Kenali kesalahan, elak jadi pelaku!', order: 2, moduleId: { title: 'MODUL 1 : PLAY SAFE WIN STRONG', _id: 'legacy', hasCertificate: true } }, 
        { title: 'Ambil tindakan yang betul, laporkan tanpa ragu!', order: 3, moduleId: { title: 'MODUL 1 : PLAY SAFE WIN STRONG', _id: 'legacy', hasCertificate: true } }
      ];

  const modulesMap = {};
  const modulesDataMap = {};
  lessonList.forEach((lesson, idx) => {
    const m = lesson.moduleId;
    const mName = m && m.title ? m.title : 'MODUL 1 : PLAY SAFE WIN STRONG';
    if (!modulesMap[mName]) {
      modulesMap[mName] = [];
      modulesDataMap[mName] = m;
    }
    modulesMap[mName].push({ ...lesson, idx });
  });

  const completedModules = [];
  let completedCount = 0;

  Object.keys(modulesMap).forEach(mName => {
    const mObj = modulesDataMap[mName];
    const isCompleted = modulesMap[mName].every(item => athlete.currentStage > (item.order || (item.idx + 1)));
    if (isCompleted && mObj) {
      completedCount++;
      if (mObj.hasCertificate) {
        completedModules.push({
          _id: mObj._id,
          title: mObj.title,
          hasCertificate: mObj.hasCertificate
        });
      }
    } else if (isCompleted) {
      completedCount++;
    }
  });

  if (completedModules.length === 0 && athlete.currentStage >= 4) {
    completedModules.push({
      _id: 'legacy',
      title: 'MODUL 1 : PLAY SAFE WIN STRONG',
      hasCertificate: true
    });
  }

  const totalModulesCount = Object.keys(modulesMap).length || 1;
  const overallPercent = Math.round((completedCount / totalModulesCount) * 100);

  const circumference = 2 * Math.PI * 38;
  const strokeDash = circumference - (overallPercent / 100) * circumference;

  let stageLabel = "";
  if (completedCount > 0) {
    stageLabel = lang === 'en' ? `🏆 Completed: Module ${completedCount}` : `🏆 Tamat: Modul ${completedCount}`;
  } else {
    stageLabel = lang === 'en' ? `Stage ${athlete.currentStage}` : `Peringkat ${athlete.currentStage}`;
  }
  const stageBg = completedCount > 0 ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300';

  const primaryColor = branding?.primaryColor || '#0f0c29';

  return (
    <div 
      className="min-h-screen flex flex-col text-white font-sans selection:bg-indigo-500 selection:text-white pb-12"
      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #302b63 50%, #24243e 100%)` }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #a78bfa, #60a5fa, #34d399, #a78bfa);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .module-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .module-card::before {
          content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
        .module-card:hover { transform: translateY(-6px); }
        .module-card:hover::before { opacity: 1; }
        .module-card.active::before { background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.08)); }
        .module-card.done::before { background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.08)); }
        .module-card.locked::before { background: linear-gradient(135deg, rgba(100,116,139,0.04), rgba(71,85,105,0.04)); }
      `}</style>

      {!isEmbed && (
        <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" width="128" height="32" className="h-7 sm:h-8 w-auto object-contain filter drop-shadow-md shrink-0" />
              ) : (
                <>
                  <span className="text-xl sm:text-2xl shrink-0">🏅</span>
                  <span className="font-bold text-white text-xs sm:text-base truncate">{branding.siteName || 'MACE eLearning'}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="flex gap-0.5 bg-white/10 rounded-lg p-0.5 sm:p-1 shrink-0">
                <button onClick={() => changeLang('ms')} className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded font-semibold transition-all ${lang === 'ms' ? 'bg-white text-indigo-900' : 'text-white/60 hover:text-white'}`}>BM</button>
                <button onClick={() => changeLang('en')} className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded font-semibold transition-all ${lang === 'en' ? 'bg-white text-indigo-900' : 'text-white/60 hover:text-white'}`}>EN</button>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-white/60 hover:text-red-400 transition-colors font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-red-500/10 whitespace-nowrap shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="whitespace-nowrap">{t('nav_logout', 'Log Keluar')}</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {isEmbed && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-black/40 backdrop-blur-md shadow-lg rounded-lg p-1 border border-white/10">
          <button
            onClick={() => changeLang('ms')}
            className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${lang === 'ms' ? 'bg-white text-indigo-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
          >
            BM
          </button>
          <button
            onClick={() => changeLang('en')}
            className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${lang === 'en' ? 'bg-white text-indigo-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
          >
            EN
          </button>
          <div className="w-[1px] h-4 bg-white/20 mx-1"></div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-white/80 hover:text-red-400 font-bold transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>{t('nav_logout', 'Keluar')}</span>
          </button>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-grow w-full">
        <div className="animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8 sm:mb-10">
            <div>
              <p className="text-white/50 text-sm font-medium mb-1 uppercase tracking-widest">
                {lang === 'en' ? 'Welcome back' : 'Selamat kembali'} 👋
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-3">
                <span className="shimmer-text">{athlete.fullName}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-white/80">
                  📍 {athlete.negeriWakil}
                </span>
                {athlete.sukan && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-white/80">
                    ⚡ {athlete.sukan}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full font-semibold ${stageBg}`}>
                  {stageLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="45"
                    cy="45"
                    r="38"
                    fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDash}
                    style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white">{overallPercent}%</span>
                </div>
              </div>
              <p className="text-white/50 text-xs mt-1 font-medium text-center">
                {lang === 'en' ? 'Overall Progress' : 'Kemajuan Keseluruhan'}
              </p>
            </div>
          </div>
        </div>

        <h2 className="animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0 text-white/60 text-xs uppercase tracking-widest font-semibold mb-4" style={{ animationDelay: '0.2s' }}>
          {t('dashboard_modules', 'LEARNING MODULES')}
        </h2>

        {Object.keys(modulesMap).map((mName, idx) => {
          const mObj = modulesDataMap[mName];
          return (
            <div key={mName} className="mb-8">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-400 rounded-full"></span>
                  {mName}
                </div>
                {mObj && mObj.hasCertificate && (
                  <>
                    {modulesMap[mName].every(item => athlete.currentStage > (item.order || (item.idx + 1))) ? (
                      <a href={`/certificate/module/${mObj._id}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                        🎓 {lang === 'en' ? 'Print Certificate' : 'Cetak Sijil'}
                      </a>
                    ) : (
                      <span className="text-xs text-white/40 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        🔒 {lang === 'en' ? 'Certificate Locked' : 'Sijil Dikunci'}
                      </span>
                    )}
                  </>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {modulesMap[mName].map((lesson, lIdx) => {
                  const i = lesson.order || (lesson.idx + 1);
                  const isLocked = athlete.currentStage < i;
                  const isCompleted = athlete.currentStage > i;
                  const quizScore = athlete.quizScores && athlete.quizScores['quiz' + i] ? athlete.quizScores['quiz' + i] : 0;
                  
                  const cardClass = isLocked ? 'locked' : (isCompleted ? 'done' : 'active');
                  const borderGrad = isLocked ? 'border-white/5' : (isCompleted ? 'border-emerald-500/30' : 'border-indigo-500/40');
                  const bgGrad = isLocked ? 'bg-white/5' : (isCompleted ? 'bg-emerald-950/40' : 'bg-indigo-950/50');
                  const delayNum = Math.min(lIdx + 2, 5) * 0.1;
                  
                  return (
                    <div key={lesson._id} className={`module-card ${cardClass} rounded-2xl p-5 sm:p-6 border ${borderGrad} ${bgGrad} animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0`} style={{ animationDelay: `${delayNum}s` }}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isLocked ? 'text-white/30' : (isCompleted ? 'text-emerald-400' : 'text-indigo-400')}`}>
                            {lang === 'en' ? 'Lesson' : 'Pelajaran'} {i}
                          </p>
                          <h3 className={`font-bold text-base leading-snug ${isLocked ? 'text-white/40' : 'text-white'}`}>
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="text-3xl flex-shrink-0 ml-2">
                          {isLocked ? '🔒' : (isCompleted ? '✅' : '📖')}
                        </div>
                      </div>

                      {!isLocked && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs font-medium mb-1.5">
                            <span className={isCompleted ? 'text-emerald-400' : 'text-white/60'}>
                              {isCompleted ? t('progress_completed', 'Selesai') : t('progress_in_progress', 'Dalam Proses')}
                            </span>
                            <span className={isCompleted ? 'text-emerald-300 font-bold' : 'text-white/60'}>
                              {isCompleted ? quizScore + '%' : '—'}
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-white/10">
                            <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-500 to-blue-400'}`} style={{ width: isCompleted ? `${quizScore}%` : '0%' }}></div>
                          </div>
                        </div>
                      )}

                      <p className={`text-xs mb-4 ${isLocked ? 'text-white/25' : (isCompleted ? 'text-emerald-400/80' : 'text-white/50')}`}>
                        {isLocked ? `🔐 ${t('dashboard_locked_hint', 'Selesaikan pelajaran sebelum ini')}` : isCompleted ? `🎯 ${lang === 'en' ? 'Score: ' + quizScore + '%' : 'Skor: ' + quizScore + '%'}` : `▶ ${t('dashboard_active_hint', 'Sedia untuk dimulakan')}`}
                      </p>

                      {!isLocked ? (
                        <button onClick={() => navigate(`/lesson/${i}`)} className={`w-full relative z-10 block text-center py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isCompleted ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:shadow-indigo-800/50'}`}>
                          {isCompleted ? t('dashboard_btn_review', 'ULANG KAJI') : t('dashboard_btn_start', 'MULA BELAJAR')}
                        </button>
                      ) : (
                        <button disabled className="w-full relative z-10 block text-center py-2.5 rounded-xl text-sm font-bold bg-white/5 text-white/20 cursor-not-allowed border border-white/10">
                          {t('dashboard_btn_locked', 'DIKUNCI')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {completedModules.length > 0 && (
          <div className="space-y-6 mb-8">
            {completedModules.map((m) => {
              const certUrl = m._id === 'legacy' ? `/certificate/${athlete._id}` : `/certificate/module/${m._id}`;
              return (
                <div key={m._id} className="animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0 relative overflow-hidden rounded-3xl p-6 sm:p-10 text-center bg-slate-900/60 backdrop-blur-xl border border-amber-500/20 shadow-[0_8px_30px_rgba(245,158,11,0.05)]" style={{ animationDelay: '0.5s' }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <svg className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32 4C24.268 4 18 10.268 18 18C18 24.363 22.242 29.743 28 31.4V48L32 52L36 48V31.4C41.758 29.743 46 24.363 46 18C46 10.268 39.732 4 32 4Z" fill="url(#goldGradDash)" />
                      <circle cx="32" cy="18" r="8" fill="#FFF" fillOpacity="0.2" />
                      <path d="M26 18L30 22L38 14" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 50L14 58H50L42 50" stroke="url(#goldGradDash)" strokeWidth="2" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="goldGradDash" x1="18" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FBBF24" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-wide">
                      {lang === 'en' ? 'Congratulations! You Have Succeeded!' : 'Tahniah! Anda Telah Berjaya!'}
                    </h2>
                    
                    <p className="text-white/80 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed">
                      {lang === 'en' ? 'You have successfully completed all requirements for ' : 'Anda telah berjaya menyelesaikan semua pembelajaran bagi '}
                      <strong>{m.title}</strong>. {lang === 'en' ? 'Your official certificate of achievement is now ready.' : 'Sijil pencapaian rasmi anda kini sedia untuk dimuat turun.'}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a href={certUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-900 font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.45)] transform hover:-translate-y-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {lang === 'en' ? 'Download Certificate' : 'Muat Turun Sijil'}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.5s' }}>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6">
            <h3 className="font-bold text-white/80 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
              💡 {lang === 'en' ? 'How It Works' : 'Cara Pembelajaran'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">1</div>
                <p className="text-white/60 pt-1.5 leading-relaxed">{lang === 'en' ? 'Watch the full video lessons to activate the module evaluation' : 'Tonton video pelajaran secara keseluruhan untuk mengaktifkan sesi penilaian'}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">2</div>
                <p className="text-white/60 pt-1.5 leading-relaxed">{lang === 'en' ? 'Complete the evaluation quiz with a minimum score of 80% to pass' : 'Jawab kuiz dengan mencapai markah minimum 80% untuk kelayakan lulus'}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">3</div>
                <p className="text-white/60 pt-1.5 leading-relaxed">{lang === 'en' ? 'Complete all lessons within the module to be awarded your certificate of achievement' : 'Sempurnakan semua pembelajaran dalam modul untuk dianugerahkan sijil pencapaian'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Welcome Modal for First Timers */}
      {showWelcome && lessons[0] && lessons[0].moduleId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative max-h-[85vh] md:max-h-[90vh] flex flex-col scale-100">
            <div className="overflow-y-auto flex-1">
              {lessons[0].moduleId.thumbnail ? (
                <img src={lessons[0].moduleId.thumbnail} alt="Cover" className="w-full h-48 sm:h-64 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              )}
              <div className="p-6 sm:p-8 text-gray-900">
                <h2 className="text-xl sm:text-2xl font-black mb-4 uppercase text-gray-900 leading-tight">
                  {lessons[0].moduleId.title || lessons[0].title || ''}
                </h2>
                <div 
                  className="prose max-w-none text-gray-700 leading-relaxed text-sm sm:text-base"
                  dangerouslySetInnerHTML={{ __html: lessons[0].moduleId.description || (lang === 'en' ? 'Please start your learning...' : 'Sila mulakan pembelajaran anda...') }}
                />
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={closeWelcomeModal} className="w-full sm:w-auto px-10 py-3 bg-[#e87a14] hover:bg-[#d66c11] text-white text-base sm:text-lg font-bold rounded-xl transition-all shadow-md active:scale-95">
                {lang === 'en' ? 'Start Module' : 'Mulakan Modul'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
