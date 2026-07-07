import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { branding, t, lang, changeLang, setAuth, auth, loading } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState('new'); // 'new' or 'resume'
  const [sports, setSports] = useState([
    { _id: '1', name: 'Bola Sepak (Football)' },
    { _id: '2', name: 'Badminton' },
    { _id: '3', name: 'Akuatik (Aquatics)' },
    { _id: '4', name: 'Olahraga (Athletics)' },
    { _id: '5', name: 'Basikal (Cycling)' },
    { _id: '6', name: 'Gimnastik (Gymnastics)' },
    { _id: '7', name: 'Hoki (Hockey)' },
    { _id: '8', name: 'Karate' },
    { _id: '9', name: 'Lawn Bowls' },
    { _id: '10', name: 'Memanah (Archery)' },
    { _id: '11', name: 'Menembak (Shooting)' },
    { _id: '12', name: 'Silat (Pencak Silat)' },
    { _id: '13', name: 'Angkat Berat (Weightlifting)' },
    { _id: '14', name: 'Wushu' },
    { _id: '15', name: 'Bola Jaring (Netball)' },
    { _id: '16', name: 'Ragbi (Rugby)' },
    { _id: '17', name: 'Bola Tampar (Volleyball)' },
    { _id: '18', name: 'Sepak Takraw' },
    { _id: '19', name: 'E-Sukan (Esports)' },
    { _id: '20', name: 'Catur (Chess)' },
    { _id: '21', name: 'Petanque' },
    { _id: '22', name: 'Kabaddi' },
    { _id: '23', name: 'Silambam' },
    { _id: '24', name: 'Muay Thai' },
    { _id: '25', name: 'Kriket (Cricket)' },
    { _id: '26', name: 'Memanah Tradisional' }
  ]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showNameHint, setShowNameHint] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [jantina, setJantina] = useState('');
  const [umur, setUmur] = useState('');
  const [negeri, setNegeri] = useState('');
  const [sukan, setSukan] = useState('');

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (auth.authenticated && auth.role === 'student') {
      navigate('/dashboard');
    }
  }, [auth, navigate]);

  useEffect(() => {
    // Optionally fetch in the background to update the list, but not blocking
    axios.get('/api/sports')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSports(res.data);
        }
      })
      .catch(err => console.error('Failed to load sports list update:', err));
  }, []);
  useEffect(() => {
    // Only apply for 'new' tab pendaftaran
    if (tab !== 'new') return;

    // Clean IC number to digit-only and limit length to 12
    const digits = icNumber.replace(/[^0-9]/g, '').slice(0, 12);
    if (digits !== icNumber) {
      setIcNumber(digits);
      return;
    }

    // Auto calculate age if at least 2 digits
    if (digits.length >= 2) {
      const yy = parseInt(digits.substring(0, 2), 10);
      const currentYear = new Date().getFullYear();
      // Cutoff year 30 (e.g. 35 -> 1935, 05 -> 2005)
      const birthYear = yy > 30 ? 1900 + yy : 2000 + yy;
      const calculatedAge = currentYear - birthYear;
      setUmur(calculatedAge.toString());
    } else {
      setUmur('');
    }

    // Auto select gender if 12 digits
    if (digits.length === 12) {
      const lastDigit = parseInt(digits.substring(11, 12), 10);
      setJantina(lastDigit % 2 === 0 ? 'Perempuan' : 'Lelaki');
    } else {
      setJantina('');
    }
  }, [icNumber, tab]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        action: tab,
        fullName: fullName.toUpperCase().trim(),
        icNumber: icNumber.trim(),
        jantina,
        umur: parseInt(umur),
        negeri,
        sukan: sukan.toUpperCase().trim()
      };

      const res = await axios.post('/api/auth/access', payload);
      if (res.data.success) {
        setAuth({ authenticated: true, role: 'student', athlete: res.data.athlete });
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || t('entry_error_label', 'Ralat sistem. Sila cuba lagi.'));
    }
  };

  // Header Banner Background Styling
  const bannerImg = branding.homeBannerImage || 'https://images.unsplash.com/photo-1540747737956-37872f747802?q=80&w=1200&auto=format&fit=crop';
  const headerStyle = {
    backgroundImage: `url('${bannerImg}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  // Page background style
  const bodyBgStyle = branding.homeBgImage
    ? { backgroundImage: `url('${branding.homeBgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : {};

  // Custom intro text
  const introHtml = lang === 'en'
    ? (branding.homeLeftColumnHtml_en || `<p>This learning module is prepared starting from the basic learning stage, covering various aspects of athlete well-being topics to strengthen the high-performance sports ecosystem.</p><br><p>Upon completing the quiz at the end of each module, you can print or download the Certificate of Participation.</p>`)
    : (branding.homeLeftColumnHtml || `<p>Modul pembelajaran ini disediakan dari peringkat pembelajaran asas yang merangkumi pelbagai aspek topik kesejahteraan atlet dalam mengukuhkan ekosistem sukan berprestasi tinggi.</p><br><p>Setelah melengkapkan kuiz di akhir setiap modul, anda boleh mencetak atau memuat turun Sijil Penyertaan.</p>`);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans" style={bodyBgStyle}>
      {branding.homeBgImage && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-0 pointer-events-none"></div>
      )}

      {/* Top Navbar */}
      <nav className="bg-[#0f172a] text-white py-4 px-6 md:px-12 z-20 relative shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-3">
              {loading ? (
                <div className="h-6 w-24 bg-white/20 rounded animate-pulse" />
              ) : branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 md:h-10 w-auto object-contain" />
              ) : (
                <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-wider">
                  {branding.siteName || 'MACE'}
                </h1>
              )}
            </span>

            {/* Desktop Menu Links */}
            {!loading && ((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
              <div className="hidden md:flex items-center gap-6 ml-8">
                {branding.showMenu && branding.menuLinks?.map((link, index) => {
                  const label = lang === 'en'
                    ? (link.label_en || (link.label?.toLowerCase() === 'modul' ? 'Modules' : link.label?.toLowerCase() === 'hubungi kami' ? 'Contact Us' : link.label))
                    : link.label;
                  return (
                    <a key={index} href={link.url} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
                      {label}
                    </a>
                  );
                })}
                {branding.navPages?.map((p, index) => (
                  <a key={index} href={`/page/${p.slug}`} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
                    {lang === 'en' ? (p.title_en || p.title) : p.title}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Button */}
            {!loading && ((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white/80 hover:text-white focus:outline-none p-1 rounded-lg hover:bg-white/10 transition"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}

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
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {!loading && mobileMenuOpen && ((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
          <div className="md:hidden bg-[#0f172a] border-t border-white/10 text-white py-3 px-6 space-y-1 transition-all duration-300 absolute left-0 right-0 z-30">
            {branding.showMenu && branding.menuLinks?.map((link, index) => {
              const label = lang === 'en'
                ? (link.label_en || (link.label?.toLowerCase() === 'modul' ? 'Modules' : link.label?.toLowerCase() === 'hubungi kami' ? 'Contact Us' : link.label))
                : link.label;
              return (
                <a key={index} href={link.url} className="block text-sm font-medium py-2 border-b border-white/5 hover:text-orange-400 transition-colors">
                  {label}
                </a>
              );
            })}
            {branding.navPages?.map((p, index) => (
              <a key={index} href={`/page/${p.slug}`} className="block text-sm font-medium py-2 border-b border-white/5 hover:text-orange-400 transition-colors">
                {lang === 'en' ? (p.title_en || p.title) : p.title}
              </a>
            ))}
          </div>
        )}
      </nav>
 
      {/* Hero Banner Section */}
      <header className="bg-slate-900 pt-12 pb-24 md:pb-32 px-6 md:px-12 relative shadow-inner flex items-center min-h-[180px] z-10 overflow-hidden">
        {bannerImg && (
          <img 
            src={bannerImg} 
            alt="Hero Banner" 
            fetchpriority="high"
            className="absolute inset-0 w-full h-full object-cover z-0" 
          />
        )}
        <div className="absolute inset-0 bg-red-900/40 mix-blend-multiply z-0"></div>
        <div className="relative z-10 max-w-6xl mx-auto w-full">
          {branding.showBannerTitle !== false && (
            loading ? (
              <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse" />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">
                {lang === 'en' ? (branding.homeBannerTitle_en || 'Modules') : (branding.homeBannerTitle || 'Modul')}
              </h1>
            )
          )}
        </div>
      </header>
 
      {/* Access Form Layout */}
      <main className="flex-1 relative py-8 px-4 sm:px-6 z-10">
        <div className="max-w-6xl mx-auto -mt-20 md:-mt-28 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/80 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
            
            {/* Left Registration Form Column */}
            {branding.showRegistrationForm !== false && (
              <div className="lg:col-span-5 bg-white border-r border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-6 text-center text-white relative">
                    <p className="text-xs text-slate-300 font-medium">
                      {loading ? (
                        <span className="inline-block h-3 w-48 bg-white/20 rounded animate-pulse" />
                      ) : (
                        lang === 'en' ? (branding.homeFormSubtitle_en || 'Register or resume your athlete learning path') : (branding.homeFormSubtitle || 'Daftar atau sambung modul latihan atlet anda')
                      )}
                    </p>
                  </div>

                  {/* Errors */}
                  {error && (
                    <div className="mx-6 mt-4 p-4 rounded-2xl border bg-red-50/50 border-red-200 text-red-800">
                      <div className="flex items-start gap-2.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-bold text-xs">{t('entry_error_label', 'Ralat Masuk')}</p>
                          <p className="text-xs mt-0.5 text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex bg-slate-100 rounded-xl p-1 mx-6 mt-6 border border-slate-200/50">
                    <button
                      onClick={() => setTab('new')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${tab === 'new' ? 'bg-white text-gray-900 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t('entry_tab_new', 'Daftar Baru')}
                    </button>
                    <button
                      onClick={() => setTab('resume')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${tab === 'resume' ? 'bg-white text-gray-900 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t('entry_tab_resume', 'Semak Akaun')}
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        {t('entry_field_fullname', 'Nama Penuh')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFullName(val);
                          setShowNameHint(val.trim().length > 0);
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm text-slate-800 placeholder-slate-400 font-medium uppercase"
                        placeholder={tab === 'new' ? t('entry_field_fullname_placeholder', 'NAMA PENUH SEPERTI DALAM KAD PENGENALAN') : t('entry_resume_name_placeholder', 'NAMA PENUH PENDAFTARAN')}
                      />
                      {tab === 'new' && showNameHint && (
                        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50/50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>
                            <strong>{t('entry_important', 'Penting')}:</strong> {t('entry_field_fullname_hint', 'Sila masukkan nama penuh mengikut Kad Pengenalan untuk cetakan sijil penyertaan.')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        {t('entry_field_ic', 'No. Kad Pengenalan')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={icNumber}
                        maxLength={12}
                        pattern="[0-9]{12}"
                        onChange={(e) => setIcNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm text-slate-800 placeholder-slate-400 font-medium"
                        placeholder={tab === 'new' ? t('entry_field_ic_placeholder', 'CONTOH: 020815145566 (TANPA -)') : t('entry_resume_ic_placeholder', 'MASUKKAN NO. IC 12 DIGIT')}
                      />
                    </div>

                    {tab === 'new' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                              {t('entry_field_gender', 'Jantina')} *
                            </label>
                            <select
                              required
                              value={jantina}
                              onChange={(e) => setJantina(e.target.value)}
                              disabled={icNumber.length === 12}
                              className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm text-slate-800 font-medium bg-white ${icNumber.length === 12 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            >
                              <option value="">{t('entry_field_gender_select', 'Pilih Jantina')}</option>
                              <option value="Lelaki">{t('entry_field_gender_male', 'Lelaki')}</option>
                              <option value="Perempuan">{t('entry_field_gender_female', 'Perempuan')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                              {t('entry_field_age', 'Umur')} *
                            </label>
                            <input
                              type="number"
                              required
                              min="10"
                              max="60"
                              value={umur}
                              onChange={(e) => setUmur(e.target.value)}
                              readOnly={icNumber.length >= 2}
                              className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm text-slate-800 placeholder-slate-400 font-medium ${icNumber.length >= 2 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              placeholder={t('entry_field_age_placeholder', 'UMUR')}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                            {t('entry_field_state', 'Negeri Diwakili')} *
                          </label>
                          <select
                            required
                            value={negeri}
                            onChange={(e) => setNegeri(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm text-slate-800 font-medium bg-white"
                          >
                            <option value="">{t('entry_field_state_select', 'Pilih Negeri')}</option>
                            <option>Johor</option>
                            <option>Kedah</option>
                            <option>Kelantan</option>
                            <option>Melaka</option>
                            <option>Negeri Sembilan</option>
                            <option>Pahang</option>
                            <option>Perak</option>
                            <option>Perlis</option>
                            <option>Pulau Pinang</option>
                            <option>Sabah</option>
                            <option>Sarawak</option>
                            <option>Selangor</option>
                            <option>Terengganu</option>
                            <option>W.P. Kuala Lumpur</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                            {t('entry_field_sport', 'Sukan')} *
                          </label>
                          <input
                            type="text"
                            required
                            value={sukan}
                            onChange={(e) => setSukan(e.target.value)}
                            list="sportsList"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm text-slate-800 placeholder-slate-400 font-medium uppercase"
                            placeholder={t('entry_field_sport_placeholder', 'CONTOH: OLAHRAGA')}
                            autoComplete="off"
                          />
                          <datalist id="sportsList">
                            {sports.map((sport) => (
                              <option key={sport._id} value={sport.name.toUpperCase()} />
                            ))}
                          </datalist>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      className={`w-full bg-gradient-to-r text-white font-bold py-3.5 mt-2 rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] text-xs flex items-center justify-center gap-2 ${tab === 'new' ? 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-500/20' : 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {tab === 'new' ? t('entry_btn_start', 'MULA BELAJAR') : t('entry_btn_resume', 'SEMAK & SAMBUNG')}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Right Information Intro Column */}
            <div className={`${branding.showRegistrationForm !== false ? 'lg:col-span-7' : 'lg:col-span-12'} bg-slate-50 p-6 sm:p-10 flex flex-col justify-center`}>
              <div
                className="prose text-gray-700 leading-relaxed text-sm sm:text-base mx-auto max-w-3xl"
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
