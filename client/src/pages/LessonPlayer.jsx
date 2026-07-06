import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function LessonPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, auth, setAuth } = useApp();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ athlete: {}, lesson: {}, secureVideoUrl: '' });
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const moduleId = parseInt(id);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSubmitError(null);
      setQuizResult(null);
      setUserAnswers({});

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
        // Pre-fill quizResult to show completed status
        setQuizResult({
          passed: true,
          score: athlete.quizScores[scoreKey],
          earnedPoints: 0, // Mock points for display
          totalPoints: lesson.quizQuestions?.length || 0,
          userAnswers: {}
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

  const handleVideoEnded = async () => {
    if (videoWatched) return;

    try {
      await axios.post(`/api/athlete/mark-watched/${id}`);
      setVideoWatched(true);
      
      // Refresh local athlete state in AppContext so navbar/sidebar knows
      const meRes = await axios.get('/api/auth/me');
      setAuth(meRes.data);
    } catch (err) {
      console.error('Failed to track video watched state:', err);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate that all questions are answered
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-white/60 text-sm font-medium animate-pulse">Memuatkan modul pembelajaran...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-white/10 p-8 rounded-3xl">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold">Akses Dihalang</h2>
          <p className="text-white/60 text-sm">{error}</p>
          <Link to="/dashboard" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition duration-200">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { athlete, lesson, secureVideoUrl } = data;
  const questions = lesson.quizQuestions || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 to-indigo-900 border-b border-white/5 py-12 px-6 sm:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url('${lesson.moduleId?.thumbnail || ''}')` }}></div>
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <Link to="/dashboard" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors tracking-widest uppercase flex items-center gap-1.5 mb-2">
              ← {lang === 'en' ? 'Back to Dashboard' : 'Kembali Ke Dashboard'}
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase">
              {lesson.title}
            </h1>
            <p className="text-white/50 text-xs mt-1 font-semibold uppercase tracking-widest">
              {lesson.moduleId?.title || 'MODUL'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-10">
        
        {/* Video Player Card */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="aspect-video relative bg-black">
            {secureVideoUrl ? (
              <video
                src={secureVideoUrl}
                controls
                controlsList="nodownload"
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain"
                poster={lesson.moduleId?.thumbnail || ''}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/40">
                {lang === 'en' ? 'Video not available' : 'Video tidak ditemui'}
              </div>
            )}
          </div>
          <div className="p-6 sm:p-8">
            <h3 className="font-extrabold text-lg mb-3">
              {lang === 'en' ? 'Learning Guide & Notes' : 'Nota Pembelajaran & Panduan'}
            </h3>
            <div
              className="prose prose-invert text-sm text-white/70 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: lesson.contentHtml || '' }}
            />
          </div>
        </div>

        {/* Interactive Quiz Accordion Box */}
        <div className="border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header toggle */}
          <button
            onClick={() => {
              if (!videoWatched) return;
              setIsQuizOpen(!isQuizOpen);
            }}
            disabled={!videoWatched}
            className={`w-full flex justify-between items-center px-6 py-5 text-left font-bold transition select-none ${!videoWatched ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-900 to-blue-900 text-white hover:opacity-95'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📝</span>
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                {lang === 'en' ? 'MODULE KUIZ' : 'KUIZ MODUL'}
              </span>
              {!videoWatched && (
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                  🔒 {lang === 'en' ? 'Locked (Watch Video)' : 'Dikunci (Tonton Video)'}
                </span>
              )}
              {videoWatched && !quizResult && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  🔓 {lang === 'en' ? 'Unlocked' : 'Terbuka'}
                </span>
              )}
              {quizResult && quizResult.passed && (
                <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">
                  ✓ {lang === 'en' ? 'Passed' : 'Lulus'}
                </span>
              )}
            </div>
            {videoWatched && (
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-white transition-transform duration-200 ${isQuizOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Accordion Content Body */}
          {isQuizOpen && videoWatched && (
            <div className="bg-white text-gray-900 p-6 sm:p-8 border-t border-indigo-100">
              
              {/* Quiz Results Panel */}
              {quizResult && (
                <div className={`${quizResult.passed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} border p-4 rounded-xl mb-6 flex flex-col gap-3`}>
                  <div className="flex items-start gap-3">
                    {quizResult.passed ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div>
                      <p className="font-bold text-lg">
                        {quizResult.passed 
                          ? t('lesson_passed_title', 'Tahniah! Anda telah lulus kuiz ini!') 
                          : t('lesson_failed_title', 'Maaf! Anda tidak lulus kuiz.')}
                      </p>
                      <p className="text-sm">
                        {t('lesson_score_label', 'Markah anda:')} <span className="font-bold">{quizResult.score}%</span>. 
                        {!quizResult.passed && ` Kelayakan lulus minimum adalah ${lesson.passMark || 80}%.`}
                      </p>
                    </div>
                  </div>
                  {lesson.showPoints !== false && quizResult.totalPoints > 0 && (
                    <div className="text-xs font-semibold border-t border-current/10 pt-2 opacity-90">
                      {lang === 'en'
                        ? `Correct: ${quizResult.earnedPoints}, Wrong: ${quizResult.totalPoints - quizResult.earnedPoints}, Grade: ${quizResult.score}%`
                        : `Betul: ${quizResult.earnedPoints}, Salah: ${quizResult.totalPoints - quizResult.earnedPoints}, Keputusan: ${quizResult.score}%`}
                    </div>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-6 text-sm">
                {t('lesson_quiz_intro', 'Sila jawab semua soalan kuiz di bawah dengan betul.')}
              </p>

              {/* Submit Error */}
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                  ⚠️ {submitError}
                </div>
              )}

              {/* Questions Form */}
              <form onSubmit={handleQuizSubmit} className="space-y-8">
                {questions.length > 0 ? (
                  questions.map((q, qIndex) => {
                    const qType = q.type || 'multiple-choice';
                    const points = q.points !== undefined ? q.points : 1;
                    const userAns = userAnswers[qIndex];
                    
                    // Evaluation highlighting state
                    let isCorrect = false;
                    if (quizResult) {
                      if (qType === 'multiple-choice' || qType === 'true-false') {
                        isCorrect = parseInt(userAnswers[qIndex] || athlete.quizScores?.[`quiz${moduleId}`] ? q.correctIndex : -1) === q.correctIndex;
                      } else if (qType === 'short-answer') {
                        const userAnsText = (userAnswers[qIndex] || '').toString().trim().toLowerCase();
                        const correctAnsText = (q.correctAnswerText || '').toString().trim().toLowerCase();
                        isCorrect = userAnsText && correctAnsText && userAnsText === correctAnsText;
                      }
                    }

                    return (
                      <div key={qIndex} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                        <p className="font-bold text-gray-900 mb-4 flex items-start gap-3 text-base md:text-lg leading-relaxed">
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
                        </p>

                        <div className="space-y-2 ml-0 md:ml-12">
                          {(qType === 'multiple-choice' || qType === 'true-false') && (
                            q.options.map((opt, optIndex) => {
                              const isChecked = userAnswers[qIndex] === optIndex.toString();
                              
                              let borderClass = 'border-gray-200 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50';
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
                                value={userAnswers[qIndex] || ''}
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

                {/* Submission Actions */}
                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  {quizResult && quizResult.passed ? (
                    <>
                      {moduleId === 3 ? (
                        <Link to="/dashboard" className="flex-grow bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 text-center">
                          {t('lesson_go_dashboard', 'Pergi Ke Dashboard')} 🎓
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/lesson/${moduleId + 1}`)}
                          className="flex-grow bg-green-600 hover:bg-green-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 text-center"
                        >
                          {t('lesson_next_module', 'Pelajaran Seterusnya →')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleQuizReset}
                        className="sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3.5 rounded-xl font-semibold transition border border-gray-200"
                      >
                        {t('lesson_btn_retry', 'Jawab Semula')}
                      </button>
                    </>
                  ) : quizResult ? (
                    <button
                      type="button"
                      onClick={handleQuizReset}
                      className="flex-grow bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2"
                    >
                      {t('lesson_btn_retry_quiz', 'Jawab Semula Kuiz ↺')}
                    </button>
                  ) : (
                    questions.length > 0 && (
                      <button
                        type="submit"
                        className="flex-grow bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2"
                      >
                        {t('lesson_btn_submit', 'Hantar Jawapan & Semak Keputusan →')}
                      </button>
                    )
                  )}
                </div>
              </form>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
