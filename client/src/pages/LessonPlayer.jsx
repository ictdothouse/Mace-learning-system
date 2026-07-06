import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function LessonPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, changeLang, auth, setAuth, branding } = useApp();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ athlete: {}, lesson: {}, secureVideoUrl: '', allLessons: [] });
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  
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
        
        // Pre-fill correct answers so the UI renders green checkmarks
        const correctAnswers = {};
        lesson.quizQuestions?.forEach((q, qIdx) => {
          if (q.type === 'multiple-choice' || q.type === 'true-false') {
            correctAnswers[qIdx] = q.correctIndex !== undefined ? q.correctIndex.toString() : '0';
          } else if (q.type === 'short-answer') {
            correctAnswers[qIdx] = q.correctAnswerText || '';
          }
        });

        setUserAnswers(correctAnswers);

        // Pre-fill quizResult to show completed status
        setQuizResult({
          passed: true,
          score: athlete.quizScores[scoreKey],
          earnedPoints: lesson.quizQuestions?.length || 0, 
          totalPoints: lesson.quizQuestions?.length || 0,
          userAnswers: correctAnswers
        });
      }
    } catch (err) {
      console.error('Failed to load lesson:', err);
      setError(err.response?.data?.error || 'Gagal memuatkan data pembelajaran.');
      if (err.response?.status === 401) {
        setAuth({ authenticated: false, role: null, athlete: null, user: null });
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.authenticated || auth.role !== 'student') {
      navigate('/login');
    } else {
      fetchLessonData();
    }
  }, [auth, id, navigate]);

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
      
      // Refresh local athlete state in AppContext
      const meRes = await axios.get('/api/auth/me');
      setAuth(meRes.data);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Gagal menghantar kuiz.');
    }
  };

  const handleQuizReset = () => {
    setQuizResult(null);
    setUserAnswers({});
    setSubmitError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 text-sm font-medium animate-pulse">Memuatkan modul pembelajaran...</p>
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
              
              {/* Exit Course Button */}
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 border border-red-200/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                </svg>
                {lang === 'en' ? 'Exit' : 'Keluar'}
              </Link>
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
                
                {quizResult && (
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
                              {quizResult && (
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
                    {quizResult && quizResult.passed ? (
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
