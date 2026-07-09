import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function LessonPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, changeLang, auth, setAuth, branding } = useApp();
  const isEmbedQuery = new URLSearchParams(window.location.search).get('embed') === 'true';
  if (isEmbedQuery) sessionStorage.setItem('isEmbed', 'true');
  const isEmbed = isEmbedQuery || sessionStorage.getItem('isEmbed') === 'true';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ athlete: {}, lesson: {}, secureVideoUrl: '', allLessons: [] });
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  
  const videoRef = useRef(null);

  const moduleId = parseInt(id);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSubmitError(null);
      setQuizResult(null);
      setUserAnswers({});
      setIsQuizOpen(false);
      setIsPracticeMode(false);

      const res = await axios.get(`/api/athlete/lesson/${id}`);
      setData(res.data);

      const { athlete, lesson } = res.data;
      
      // Check if athlete already watched this lesson
      const hasWatched = athlete.watchedLessons?.includes(moduleId);
      setVideoWatched(hasWatched);

      // Check if quiz already passed
      const scoreKey = `quiz${moduleId}`;
      const hasPassed = athlete.quizScores && athlete.quizScores[scoreKey] >= 80;
      if (hasPassed) {
        setIsQuizOpen(true);
        
        // Calculate correct earnedPoints and totalPoints based on the actual score
        const score = athlete.quizScores[scoreKey];
        const totalPoints = lesson.quizQuestions?.length || 0;
        const earnedPoints = Math.round((score / 100) * totalPoints);

        // Pre-fill quizResult to show completed status with correct score and points
        setQuizResult({
          passed: true,
          score: score,
          earnedPoints: earnedPoints, 
          totalPoints: totalPoints,
          isHistorical: true
        });
      }
    } catch (err) {
      console.error('Failed to load lesson:', err);
      setError(err.response?.data?.error || 'Gagal memuatkan data pembelajaran.');
      if (err.response?.status === 401) {
        setAuth({ authenticated: false, role: null, athlete: null, user: null });
        navigate(isEmbed ? '/login?embed=true' : '/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.authenticated || auth.role !== 'student') {
      navigate(isEmbed ? '/login?embed=true' : '/login');
    } else {
      fetchLessonData();
    }
  }, [auth.authenticated, auth.role, id, navigate, lang, isEmbed]);

  useEffect(() => {
    if (branding.siteName && data?.lesson) {
      const siteName = lang === 'en' ? (branding.siteName_en || branding.siteName) : branding.siteName;
      document.title = `${siteName} - ${data.lesson.title}`;
    }
  }, [branding, data, lang]);

  // Video time update event to trigger watched state when 95% complete
  const handleVideoTimeUpdate = () => {
    if (videoWatched || !videoRef.current) return;
    const video = videoRef.current;
    if (video.duration > 0 && video.currentTime >= (video.duration * 0.95)) {
      triggerMarkWatched();
    }
  };

  const triggerMarkWatched = async () => {
    if (videoWatched) return;
    try {
      await axios.post(`/api/athlete/mark-watched/${id}`);
      setVideoWatched(true);
      
      // Refresh local athlete state in AppContext
      const meRes = await axios.get('/api/auth/me');
      setAuth(meRes.data);
    } catch (err) {
      console.error('Failed to track video watched state:', err);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const questions = data.lesson.quizQuestions || [];
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < questions.length) {
      setSubmitError(lang === 'en' ? 'Please answer all questions before submitting.' : 'Sila jawab semua soalan sebelum menghantar.');
      return;
    }

    try {
      const res = await axios.post(`/api/athlete/submit-quiz/${id}`, { answers: userAnswers });
      setQuizResult(res.data);
      
      const scoreKey = `quiz${moduleId}`;
      const previousScore = auth.athlete?.quizScores?.[scoreKey] || 0;
      if (res.data.score > previousScore) {
        // Refresh local athlete state in AppContext
        const meRes = await axios.get('/api/auth/me');
        setAuth(meRes.data);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Gagal menghantar kuiz.');
    }
  };

  const handleQuizReset = () => {
    setQuizResult(null);
    setUserAnswers({});
    setSubmitError(null);
    
    const scoreKey = `quiz${moduleId}`;
    const hasPassed = auth.athlete?.quizScores?.[scoreKey] >= 80;
    if (hasPassed) {
      setIsPracticeMode(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 animate-pulse">
        {/* Navbar Skeleton */}
        <nav className="bg-[#0f172a] h-16 flex items-center justify-between px-6 md:px-12 border-b border-white/10 shadow-md">
          <div className="w-36 h-8 bg-white/10 rounded-lg"></div>
          <div className="flex gap-4">
            <div className="w-16 h-7 bg-white/10 rounded-lg"></div>
            <div className="w-20 h-7 bg-white/10 rounded-lg"></div>
          </div>
        </nav>

        {/* 2-Column Content Skeleton */}
        <div className="flex-grow flex flex-col md:flex-row max-w-6xl mx-auto w-full px-4 md:px-8 py-6 gap-6">
          {/* Sidebar Skeleton (hidden on mobile, width ~320px on desktop) */}
          <div className="hidden md:block w-80 space-y-4 shrink-0">
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded-full shrink-0"></div>
                  <div className="flex-grow space-y-1.5">
                    <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-1/4 h-2 bg-gray-100 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Video & Content Area Skeleton */}
          <div className="flex-grow bg-white border border-gray-100 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="w-2/3 h-8 bg-gray-300 rounded-xl"></div>
            <div className="aspect-video w-full bg-gray-200 rounded-2xl"></div>
            <div className="space-y-2">
              <div className="w-full h-4 bg-gray-200 rounded"></div>
              <div className="w-full h-4 bg-gray-200 rounded"></div>
              <div className="w-4/5 h-4 bg-gray-200 rounded"></div>
            </div>
            {/* Quiz accordion skeleton */}
            <div className="bg-gray-100 h-14 rounded-xl flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                <div className="w-32 h-4 bg-gray-300 rounded"></div>
              </div>
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 font-sans p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white border border-gray-200 p-8 rounded-3xl shadow-lg">
          <div className="text-5xl">??</div>
          <h2 className="text-xl font-bold">Akses Dihalang</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <Link to="/dashboard" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition duration-200">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { athlete, lesson, secureVideoUrl, allLessons } = data;

  // Filter lessons belonging to the same module
  const displayLessons = allLessons?.filter(l => 
    lesson.moduleId && l.moduleId && (l.moduleId._id === lesson.moduleId._id || l.moduleId === lesson.moduleId._id)
  ) || [lesson];

  const questions = lesson.quizQuestions || [];

  // Calculate Progress
  let completedCount = 0;
  displayLessons.forEach((l) => {
    const i = l.order;
    if (athlete.currentStage > i || (athlete.quizScores && athlete.quizScores[`quiz${i}`] >= 80)) {
      completedCount++;
    }
  });
  const totalCount = displayLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const moduleTitle = lesson.moduleId?.title || 'MODUL PEMBELAJARAN';
  const primaryColor = branding?.primaryColor || '#2563eb';

  return (
    <div className="bg-white min-h-screen text-gray-800 font-sans pb-20">
      
      {/* Top Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
            
            {/* Left side: Module Title & Progress Text */}
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wider text-gray-900 leading-tight truncate">
                {moduleTitle}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                {completedCount} {lang === 'en' ? 'of' : 'daripada'} {totalCount} {lang === 'en' ? 'lessons completed' : 'pelajaran selesai'} ({progressPercent}%)
              </p>
            </div>
            
            {/* Right side: Exit Button & Language Toggle */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-gray-100 sm:border-0">
              
              {/* Language Toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1 shrink-0">
                <button 
                  onClick={() => changeLang('ms')} 
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-semibold transition ${lang === 'ms' ? 'bg-white shadow text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  BM
                </button>
                <button 
                  onClick={() => changeLang('en')} 
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-semibold transition ${lang === 'en' ? 'bg-white shadow text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  EN
                </button>
              </div>
              
              {/* Exit Course / Back Button */}
              {isEmbed ? (
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 border border-gray-300/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                  </svg>
                  {lang === 'en' ? 'Back' : 'Kembali'}
                </Link>
              ) : (
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 border border-red-200/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  </svg>
                  {lang === 'en' ? 'Exit' : 'Keluar'}
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1">
          <div className="bg-[#34d399] h-1 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row border-x border-gray-200 min-h-[calc(100vh-80px)]">
        
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-gray-200 bg-gray-50 flex-shrink-0">
          <ul className="divide-y divide-gray-200">
            {displayLessons.map((l, idx) => {
              const i = l.order;
              const isLocked = athlete.currentStage < i;
              const isCompleted = athlete.currentStage > i || (athlete.quizScores && athlete.quizScores[`quiz${i}`] >= 80);
              const isCurrent = moduleId === i;
              
              return (
                <li key={l._id}>
                  {isLocked ? (
                    <div className="flex items-start justify-between p-4 px-6 opacity-50 cursor-not-allowed">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                        </div>
                        <span className="text-sm text-gray-500 font-medium leading-snug">{l.title}</span>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate(`/lesson/${i}`)} 
                      className={`w-full text-left flex items-start justify-between p-4 px-6 hover:bg-white transition ${isCurrent ? 'bg-white border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <svg className="w-4 h-4 text-gray-900" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-900 bg-gradient-to-b from-gray-900 from-50% to-transparent to-50%"></div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 leading-snug">{l.title}</span>
                      </div>
                      <span className="text-xs text-gray-400 mt-0.5 shrink-0">{lang === 'en' ? 'Quiz' : 'Kuiz'}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Main Content */}
        <div className="flex-grow p-6 md:p-10 lg:p-16 bg-white w-full max-w-4xl">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-8 leading-tight">{lesson.title}</h1>
          
          {/* Video Wrapper */}
          {secureVideoUrl ? (
            <div 
              className="relative pb-[56.25%] h-0 overflow-hidden bg-black rounded-xl shadow-md mb-8"
              style={{ contentVisibility: 'auto' }}
            >
              <video 
                ref={videoRef}
                controls 
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()} 
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoTimeUpdate}
                className="absolute top-0 left-0 w-full h-full object-contain"
                playsInline
              >
                <source src={secureVideoUrl} type="video/mp4" />
                {t('lesson_video_unsupported', 'Pemain video tidak disokong pada pelayar anda.')}
              </video>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-8">
              {t('lesson_video_unavailable', 'Video tidak ditemui.')}
            </div>
          )}
          
          {/* Content HTML Description */}
          <div 
            className="prose max-w-none text-gray-700 leading-relaxed text-lg mb-8"
            dangerouslySetInnerHTML={{ __html: lesson.contentHtml || `<p className="italic text-gray-500">${t('lesson_no_description', 'Tiada huraian disediakan.')}</p>` }}
          />

          {/* Accordion Quiz Container */}
          <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden mt-8">
            <button 
              onClick={() => {
                if (!videoWatched) return;
                setIsQuizOpen(!isQuizOpen);
              }}
              style={{ backgroundColor: primaryColor }}
              disabled={!videoWatched}
              className={`w-full px-6 py-4 flex items-center justify-between transition-colors select-none ${!videoWatched ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:brightness-95'}`}
            >
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/10 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold">{t('lesson_quiz_title', 'Kuiz Modul Penilaian')}</h3>
                  <p className="text-xs text-white/80">
                    {!videoWatched 
                      ? t('lesson_quiz_locked', 'Sila tonton video hingga akhir untuk membuka kuiz') 
                      : quizResult?.passed 
                        ? t('lesson_quiz_active', 'Kuiz Selesai & Lulus') 
                        : t('lesson_quiz_click', 'Klik untuk membuka kuiz')}
                  </p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-white transition-transform duration-300 ${isQuizOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Quiz Body */}
            <div className={`transition-all duration-500 overflow-hidden ${isQuizOpen && videoWatched ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <div className="p-6 md:p-8 border-t border-blue-100 min-h-[300px]">
                
                 {/* Practice Mode Active (answering) Alert */}
                 {isPracticeMode && !quizResult && (
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-start gap-3 text-blue-800 text-sm">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     <div className="flex-grow">
                       <strong>{lang === 'en' ? 'Practice Mode Active' : 'Sesi Latihan / Ulang Kaji Aktif'}</strong>
                       <p className="mt-1 text-xs opacity-90">
                         {lang === 'en'
                           ? `You are re-taking this quiz for practice. Your official score (${auth.athlete?.quizScores?.['quiz' + moduleId] || 0}%) will not be affected unless you achieve a higher score.`
                           : `Anda sedang menjawab semula kuiz ini untuk latihan. Markah rasmi tertinggi anda (${auth.athlete?.quizScores?.['quiz' + moduleId] || 0}%) tidak akan terjejas jika cubaan ini lebih rendah.`}
                       </p>
                     </div>
                     <button 
                       type="button" 
                       onClick={() => fetchLessonData()} 
                       className="text-xs font-bold text-blue-700 hover:text-blue-900 underline shrink-0"
                     >
                       {lang === 'en' ? 'Cancel' : 'Batal'}
                     </button>
                   </div>
                 )}

                 {/* Practice Mode Submitted Alert */}
                 {isPracticeMode && quizResult && !quizResult.isHistorical && (
                   <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-6 flex flex-col gap-2">
                     <div className="flex items-start gap-3">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <div>
                         <p className="font-bold text-lg">
                           {lang === 'en' ? 'Practice Attempt Completed' : 'Sesi Latihan (Ulang Kaji) Selesai'}
                         </p>
                         <p className="text-sm font-medium mt-1">
                           {lang === 'en' 
                             ? `You scored ${quizResult.score}% in this practice attempt.` 
                             : `Anda mendapat markah ${quizResult.score}% dalam percubaan latihan ini.`}
                         </p>
                         <p className="text-xs opacity-90 mt-1">
                           {lang === 'en'
                             ? `Your official highest score is preserved at ${auth.athlete?.quizScores?.['quiz' + moduleId] || 0}%.`
                             : `Markah rasmi tertinggi anda dikekalkan pada ${auth.athlete?.quizScores?.['quiz' + moduleId] || 0}%.`}
                         </p>
                       </div>
                     </div>
                     <div className="text-xs font-semibold border-t border-blue-200 pt-2 flex justify-between items-center">
                       <span>
                         {lang === 'en' 
                           ? `Correct: ${quizResult.earnedPoints}, Wrong: ${quizResult.totalPoints - quizResult.earnedPoints}`
                           : `Betul: ${quizResult.earnedPoints}, Salah: ${quizResult.totalPoints - quizResult.earnedPoints}`}
                       </span>
                       <button 
                         type="button" 
                         onClick={() => fetchLessonData()} 
                         className="text-blue-700 hover:text-blue-900 underline font-bold"
                       >
                         {lang === 'en' ? '← Back to Official Score' : '← Kembali ke Markah Asal'}
                       </button>
                     </div>
                   </div>
                 )}

                 {/* Official Score / Historical Passed Alert */}
                 {quizResult && (!isPracticeMode || quizResult.isHistorical) && (
                   <div className={`${quizResult.passed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} border p-4 rounded-lg mb-6 flex flex-col gap-3`}>
                     <div className="flex items-start gap-3">
                       {quizResult.passed ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       )}
                       <div>
                         <p className="font-bold text-lg">
                           {quizResult.passed ? t('lesson_passed_title', 'Tahniah! Anda Telah Berjaya!') : t('lesson_failed_title', 'Maaf! Anda tidak mencapai markah lulus.')}
                         </p>
                         <p className="text-sm">
                           {t('lesson_score_label', 'Markah anda:')} <span className="font-bold">{quizResult.score}%</span>. 
                           {!quizResult.passed && ` Kelayakan lulus minimum adalah ${lesson.passMark || 80}%.`}
                         </p>
                       </div>
                     </div>
                     {lesson.showPoints !== false && (
                       <div className="text-xs font-semibold border-t border-current/10 pt-2 opacity-90">
                         {lang === 'en' 
                           ? `Correct: ${quizResult.earnedPoints}, Wrong: ${quizResult.totalPoints - quizResult.earnedPoints}, Grade: ${quizResult.score}%`
                           : `Betul: ${quizResult.earnedPoints || 0}, Salah: ${(quizResult.totalPoints - quizResult.earnedPoints) || 0}, Keputusan: ${quizResult.score}%`}
                       </div>
                     )}
                     {quizResult.isHistorical && (
                       <p className="text-xs opacity-90 border-t border-green-200/50 pt-2">
                         {lang === 'en'
                           ? 'Correct answers are highlighted below for your review. To test yourself again, click Jawab Semula.'
                           : 'Jawapan betul ditandakan di bawah untuk rujukan anda. Sila klik Jawab Semula jika ingin mencuba semula kuiz ini.'}
                       </p>
                     )}
                   </div>
                 )}

                <p className="text-gray-600 mb-6 text-sm">
                  {t('lesson_quiz_intro', 'Sila selesaikan penilaian kuiz ini untuk meneruskan tahap berikutnya.')}
                </p>

                {submitError && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg mb-6 shadow-sm text-sm">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleQuizSubmit} className="space-y-8 pb-8">
                  {lesson.quizQuestions && lesson.quizQuestions.length > 0 ? (
                    lesson.quizQuestions.map((q, qIndex) => {
                      const qType = q.type || 'multiple-choice';
                      const points = q.points !== undefined ? q.points : 1;
                      const userAns = userAnswers[qIndex];
                      
                      let isCorrect = false;
                      if (quizResult) {
                        if (qType === 'multiple-choice' || qType === 'true-false') {
                          isCorrect = parseInt(userAns) === q.correctIndex;
                        } else if (qType === 'short-answer') {
                          const userAnsText = (userAns || '').toString().trim().toLowerCase();
                          const correctAnsText = (q.correctAnswerText || '').toString().trim().toLowerCase();
                          isCorrect = userAnsText && correctAnsText && userAnsText === correctAnsText;
                        }
                      }

                      return (
                        <div key={qIndex} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                          <div className="font-bold text-gray-900 mb-4 flex items-start gap-3 text-base md:text-lg leading-relaxed">
                            <span className="bg-gray-100 text-gray-600 text-sm font-bold px-2.5 py-1 rounded-full mt-0.5 shrink-0">{qIndex + 1}</span>
                            <span className="flex-grow">
                              {q.text}
                              {lesson.showPoints !== false && (
                                <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2">
                                  ({points} {t('lesson_points', 'mata')})
                                </span>
                              )}
                              {quizResult && userAns !== undefined && (
                                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ml-2 ${isCorrect ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                  {isCorrect ? `✓ ${t('lesson_correct', 'Betul')}` : `✗ ${t('lesson_wrong', 'Salah')}`}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="space-y-2 ml-0 md:ml-12">
                            {(qType === 'multiple-choice' || qType === 'true-false') && (
                              q.options.map((opt, optIndex) => {
                                const isChecked = userAns === optIndex.toString();
                                
                                let borderClass = 'border-transparent bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50';
                                let textClass = 'text-gray-700';

                                if (quizResult) {
                                  if (optIndex === q.correctIndex) {
                                    borderClass = 'border-green-500 bg-green-50/70';
                                    textClass = 'text-green-900 font-semibold';
                                  } else if (isChecked && optIndex !== q.correctIndex) {
                                    borderClass = 'border-red-500 bg-red-50/70';
                                    textClass = 'text-red-900';
                                  }
                                }

                                return (
                                  <label key={optIndex} className={`flex items-center p-3.5 rounded-lg cursor-pointer transition border ${borderClass}`}>
                                    <input
                                      type="radio"
                                      name={`answers_${qIndex}`}
                                      value={optIndex}
                                      checked={isChecked}
                                      disabled={!!quizResult}
                                      onChange={() => setUserAnswers({ ...userAnswers, [qIndex]: optIndex.toString() })}
                                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3 accent-blue-600 shrink-0"
                                    />
                                    <span className={`text-sm md:text-base ${textClass}`}>{opt}</span>
                                  </label>
                                );
                              })
                            )}

                            {qType === 'short-answer' && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  required
                                  value={userAns || ''}
                                  readOnly={!!quizResult}
                                  onChange={(e) => setUserAnswers({ ...userAnswers, [qIndex]: e.target.value })}
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm ${quizResult ? (isCorrect ? 'border-green-500 bg-green-50/30 text-green-900 font-semibold' : 'border-red-500 bg-red-50/30 text-red-900') : 'border-gray-300 bg-gray-50/30'}`}
                                  placeholder={t('lesson_short_answer_placeholder', 'Tulis jawapan anda di sini...')}
                                />
                                {quizResult && !isCorrect && (
                                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                    {t('lesson_correct_answer', 'Jawapan betul')}: <strong>{q.correctAnswerText}</strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800 text-center">
                      ⚠️ {t('lesson_no_quiz', 'Tiada soalan kuiz tersedia.')}
                    </div>
                  )}

                  {/* Submission Buttons */}
                  <div className="pt-6 mt-6 flex flex-col sm:flex-row gap-3">
                    {isPracticeMode && quizResult && !quizResult.isHistorical ? (
                      <>
                        <button 
                          type="button"
                          onClick={() => fetchLessonData()}
                          className="flex-grow bg-gray-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2"
                        >
                          {lang === 'en' ? '← Back to Official Score' : '← Kembali ke Markah Asal'}
                        </button>
                        <button 
                          type="button" 
                          onClick={handleQuizReset} 
                          className="flex-grow bg-blue-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                        >
                          {t('lesson_btn_retry_quiz', 'Jawab Semula Kuiz ↺')}
                        </button>
                        {moduleId !== 3 ? (
                          <button 
                            type="button"
                            onClick={() => navigate(`/lesson/${moduleId + 1}`)}
                            className="flex-grow bg-green-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex items-center justify-center gap-2"
                          >
                            {t('lesson_next_module', 'Pelajaran Seterusnya →')}
                          </button>
                        ) : (
                          <Link to="/dashboard" className="flex-grow bg-yellow-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-yellow-700 transition shadow-md flex items-center justify-center gap-2 text-center">
                            {t('lesson_go_dashboard', 'Pergi Ke Dashboard')} 🎓
                          </Link>
                        )}
                      </>
                    ) : quizResult && quizResult.passed ? (
                      <>
                        {moduleId === 3 ? (
                          <Link to="/dashboard" className="flex-grow bg-yellow-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-yellow-700 transition shadow-md flex items-center justify-center gap-2 text-center">
                            {t('lesson_go_dashboard', 'Pergi Ke Dashboard')} 🎓
                          </Link>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => navigate(`/lesson/${moduleId + 1}`)}
                            className="flex-grow bg-green-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex items-center justify-center gap-2 text-center"
                          >
                            {t('lesson_next_module', 'Pelajaran Seterusnya →')}
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={handleQuizReset} 
                          className="sm:w-auto bg-gray-100 text-gray-700 px-6 py-3.5 rounded-lg font-medium hover:bg-gray-200 transition border border-gray-200"
                        >
                          {t('lesson_btn_retry', 'Jawab Semula')}
                        </button>
                      </>
                    ) : quizResult ? (
                      <button 
                        type="button" 
                        onClick={handleQuizReset} 
                        className="flex-grow bg-blue-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                      >
                        {t('lesson_btn_retry_quiz', 'Jawab Semula Kuiz ↺')}
                      </button>
                    ) : (
                      questions.length > 0 && (
                        <button 
                          type="submit" 
                          className="flex-grow bg-blue-600 text-white px-6 py-3.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
                        >
                          {t('lesson_btn_submit', 'Hantar Jawapan & Semak Keputusan →')}
                        </button>
                      )
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
