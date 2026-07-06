import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { branding, t, lang, changeLang, setAuth, auth } = useApp();
  const navigate = useNavigate();

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [data, setData] = useState({ athlete: {}, modules: [], lessons: [], levels: [] });
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const res = await axios.get('/api/athlete/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load athlete dashboard:', err);
      setError(err.response?.data?.error || 'Gagal memuatkan data dashboard.');
      if (err.response?.status === 401) {
        setAuth({ authenticated: false, role: null, athlete: null, user: null });
        navigate('/login');
      }
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (!auth.authenticated || auth.role !== 'student') {
      navigate('/login');
    } else {
      fetchDashboardData();
    }
  }, [auth, navigate]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setAuth({ authenticated: false, role: null, athlete: null, user: null });
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-white/60 text-sm font-medium animate-pulse">Memuatkan dashboard...</p>
        </div>
      </div>
    );
  }

  const { athlete, modules, lessons, levels } = data;

  // Group lessons by Module Title/ID
  const modulesMap = {};
  const modulesDataMap = {};
  lessons.forEach((lesson, idx) => {
    const m = lesson.moduleId;
    const mName = m && m.title ? m.title : 'MODUL 1 : PLAY SAFE WIN STRONG';
    if (!modulesMap[mName]) {
      modulesMap[mName] = [];
      modulesDataMap[mName] = m;
    }
    modulesMap[mName].push({ ...lesson, idx });
  });

  // Calculate completed modules and overall percentage
  const completedModules = [];
  let completedCount = 0;

  Object.keys(modulesMap).forEach(mName => {
    const mObj = modulesDataMap[mName];
    // A module is completed if the athlete's currentStage is greater than all lessons in the module
    const isCompleted = modulesMap[mName].every(item => athlete.currentStage > (item.order || (item.idx + 1)));
    if (isCompleted && mObj) {
      completedCount++;
      completedModules.push({
        _id: mObj._id,
        title: mObj.title,
        hasCertificate: mObj.hasCertificate
      });
    }
  });

  // Legacy fallback for completed modules
  if (completedModules.length === 0 && athlete.currentStage >= 4) {
    completedModules.push({
      _id: 'legacy',
      title: 'MODUL 1 : PLAY SAFE WIN STRONG',
      hasCertificate: true
    });
  }

  const totalModulesCount = Object.keys(modulesMap).length || 1;
  const overallPercent = Math.round((completedCount / totalModulesCount) * 100);

  // Dynamic progress circle calculation
  const circumference = 2 * Math.PI * 38;
  const strokeDash = circumference - (overallPercent / 100) * circumference;

  let stageLabel = "";
  if (completedCount > 0) {
    stageLabel = lang === 'en' ? `🏆 Completed: Module ${completedCount}` : `🏆 Tamat: Modul ${completedCount}`;
  } else {
    stageLabel = lang === 'en' ? `Stage ${athlete.currentStage}` : `Peringkat ${athlete.currentStage}`;
  }
  const stageBg = completedCount > 0 ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <h1 className="text-lg font-extrabold uppercase tracking-wider">
                {branding.siteName || 'MACE'}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1 border border-white/20">
              <button
                onClick={() => changeLang('ms')}
                className={`text-xs px-2 py-1 rounded font-semibold transition-all ${lang === 'ms' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'}`}
              >
                BM
              </button>
              <button
                onClick={() => changeLang('en')}
                className={`text-xs px-2 py-1 rounded font-semibold transition-all ${lang === 'en' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-4 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition duration-200"
            >
              {t('logout', 'Log Keluar')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Space */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 md:py-12 flex-grow">
        
        {/* Hero Greeting Section */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-white/50 text-sm font-medium mb-1 uppercase tracking-widest">
                {lang === 'en' ? 'Welcome back' : 'Selamat kembali'} 👋
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-3 tracking-tight">
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  {athlete.fullName}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/80">
                  📍 {athlete.negeriWakil}
                </span>
                {athlete.sukan && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/80">
                    ⚡ {athlete.sukan}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full font-semibold ${stageBg}`}>
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
                      <stop offset="0%" stopColor="#f97316" /> {/* orange-500 */}
                      <stop offset="100%" stopColor="#facc15" /> {/* yellow-400 */}
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white">{overallPercent}%</span>
                </div>
              </div>
              <p className="text-white/50 text-xs mt-1.5 font-medium text-center">
                {lang === 'en' ? 'Overall Progress' : 'Kemajuan Keseluruhan'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Congratulations Certificate Banner */}
        {completedModules.length > 0 && (
          <div className="space-y-6 mb-10">
            {completedModules.map((m) => {
              const certUrl = m._id === 'legacy' ? `/certificate/${athlete._id}` : `/certificate/module/${m._id}`;
              return (
                <div key={m._id} className="relative overflow-hidden rounded-3xl p-6 sm:p-10 text-center bg-slate-900/60 border border-amber-500/20 shadow-2xl">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <svg className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32 4C24.268 4 18 10.268 18 18C18 24.363 22.242 29.743 28 31.4V48L32 52L36 48V31.4C41.758 29.743 46 24.363 46 18C46 10.268 39.732 4 32 4Z" fill="url(#goldGrad)" />
                      <circle cx="32" cy="18" r="8" fill="#FFF" fillOpacity="0.2" />
                      <path d="M26 18L30 22L38 14" stroke="#FFF" stroke-width="3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 50L14 58H50L42 50" stroke="url(#goldGrad)" stroke-width="2" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="goldGrad" x1="18" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
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
                      {lang === 'en'
                        ? `You have successfully completed all requirements for `
                        : `Anda telah berjaya menyelesaikan semua pembelajaran bagi `}
                      <strong>{m.title}</strong>.{' '}
                      {lang === 'en'
                        ? 'Your official certificate of achievement is now ready.'
                        : 'Sijil pencapaian rasmi anda kini sedia untuk dimuat turun.'}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a
                        href={certUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-900 font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.45)] transform hover:-translate-y-0.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {lang === 'en' ? 'Download Certificate' : 'Muat Turun Sijil'}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modules Accordions Grid */}
        <h2 className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-4">
          {t('dashboard_modules', 'MODUL PEMBELAJARAN')}
        </h2>

        {Object.keys(modulesMap).map((mName) => {
          const mObj = modulesDataMap[mName];
          return (
            <div key={mName} className="mb-10">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center justify-between gap-2 flex-wrap border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                  {mName}
                </div>
                {mObj && mObj.hasCertificate && (
                  <>
                    {modulesMap[mName].every(item => athlete.currentStage > (item.order || (item.idx + 1))) ? (
                      <a
                        href={`/certificate/module/${mObj._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                      >
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {modulesMap[mName].map((lesson) => {
                  const i = lesson.order || (lesson.idx + 1);
                  const isLocked = athlete.currentStage < i;
                  const isCompleted = athlete.currentStage > i;
                  const quizScore = athlete.quizScores && athlete.quizScores['quiz' + i] ? athlete.quizScores['quiz' + i] : 0;
                  
                  const borderGrad = isLocked ? 'border-white/5' : (isCompleted ? 'border-emerald-500/30' : 'border-indigo-500/40');
                  const bgGrad = isLocked ? 'bg-white/3' : (isCompleted ? 'bg-emerald-950/40' : 'bg-indigo-950/50');
                  
                  return (
                    <div key={lesson._id} className={`rounded-2xl p-5 sm:p-6 border ${borderGrad} ${bgGrad} flex flex-col justify-between h-full`}>
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isLocked ? 'text-white/30' : (isCompleted ? 'text-emerald-400' : 'text-indigo-400')}`}>
                              {lang === 'en' ? 'Lesson' : 'Pelajaran'} {i}
                            </p>
                            <h4 className={`font-bold text-base leading-snug ${isLocked ? 'text-white/40' : 'text-white'}`}>
                              {lesson.title}
                            </h4>
                          </div>
                          <div className="text-2xl flex-shrink-0 ml-2">
                            {isLocked ? '🔒' : (isCompleted ? '✅' : '📖')}
                          </div>
                        </div>

                        {/* Progress Bar */}
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
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-500 to-blue-400'}`}
                                style={{ width: isCompleted ? `${quizScore}%` : '0%' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className={`text-xs mb-4 ${isLocked ? 'text-white/25' : (isCompleted ? 'text-emerald-400/80' : 'text-white/50')}`}>
                          {isLocked ? (
                            `🔐 ${t('dashboard_locked_hint', 'Selesaikan pelajaran sebelum ini')}`
                          ) : isCompleted ? (
                            `🎯 ${lang === 'en' ? 'Score: ' + quizScore + '%' : 'Skor: ' + quizScore + '%'}`
                          ) : (
                            `▶ ${t('dashboard_active_hint', 'Sedia untuk dimulakan')}`
                          )}
                        </p>

                        {!isLocked ? (
                          <button
                            onClick={() => navigate(`/lesson/${i}`)}
                            className={`w-full block text-center py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isCompleted ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:shadow-indigo-800/50'}`}
                          >
                            {isCompleted ? t('dashboard_btn_review', 'ULANG KAJI') : t('dashboard_btn_start', 'MULA BELAJAR')}
                          </button>
                        ) : (
                          <button disabled className="w-full block text-center py-2.5 rounded-xl text-sm font-bold bg-white/3 text-white/20 cursor-not-allowed border border-white/5">
                            {t('dashboard_btn_locked', 'DIKUNCI')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Dynamic Learning Guide */}
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/40 border border-white/5 shadow-inner mt-8">
          <h3 className="font-bold text-white/80 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
            💡 {lang === 'en' ? 'How It Works' : 'Cara Pembelajaran'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold shrink-0">1</div>
              <div>
                <h4 className="font-bold mb-1 text-white">{lang === 'en' ? 'Watch Learning Videos' : 'Tonton Video Pembelajaran'}</h4>
                <p className="text-white/60 leading-relaxed text-xs">{lang === 'en' ? 'Understand all lessons and slides provided in each module.' : 'Fahami setiap isi kandungan dan slaid pembelajaran yang dipaparkan dalam video.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold shrink-0">2</div>
              <div>
                <h4 className="font-bold mb-1 text-white">{lang === 'en' ? 'Answer Module Quiz' : 'Jawab Kuiz Modul'}</h4>
                <p className="text-white/60 leading-relaxed text-xs">{lang === 'en' ? 'Earn a minimum score of 80% to pass the module successfully.' : 'Selesaikan kuiz di akhir modul dengan memperoleh markah lulus sekurang-kurangnya 80%.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold shrink-0">3</div>
              <div>
                <h4 className="font-bold mb-1 text-white">{lang === 'en' ? 'Download Certificate' : 'Muat Turun Sijil'}</h4>
                <p className="text-white/60 leading-relaxed text-xs">{lang === 'en' ? 'Obtain a Certificate of Participation after passing the module.' : 'Sijil Penyertaan rasmi akan dijana secara automatik selepas anda menyelesaikan modul pembelajaran.'}</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
