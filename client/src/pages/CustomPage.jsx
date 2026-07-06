import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function CustomPage() {
  const { slug } = useParams();
  const { branding, t, lang, changeLang } = useApp();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ page: {}, module1: null });
  const [error, setError] = useState(null);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/pages/${slug}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError('Halaman tidak dijumpai.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-white/60 text-sm font-medium animate-pulse">Memuatkan halaman...</p>
        </div>
      </div>
    );
  }

  if (error || !data.page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-sans p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold">404 - Halaman Tidak Dijumpai</h2>
          <p className="text-gray-500 text-sm">Maaf, kandungan halaman yang anda cari tiada.</p>
          <Link to="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition duration-200">
            Laman Utama
          </Link>
        </div>
      </div>
    );
  }

  const { page, module1 } = data;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      
      {/* Top Navbar */}
      <nav className="bg-[#0f172a] text-white py-4 px-6 md:px-12 z-20 relative shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 md:h-10 w-auto object-contain" />
              ) : (
                <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-wider">
                  {branding.siteName || 'MACE'}
                </h1>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
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
      </nav>

      {/* RENDER TEMPLATES */}
      {page.customTemplate === 'modules' ? (
        <>
          {/* BANNER SECTION FOR MODULES */}
          <div className="relative bg-gradient-to-r from-blue-900 to-indigo-950 text-white py-16 px-6 md:px-12 text-center shadow-lg overflow-hidden">
            <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop')" }}></div>
            <div className="relative z-10 max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-wider uppercase drop-shadow-md">
                {lang === 'en' ? 'MY ATHLETE MODULE' : 'MODUL MY ATHLETE'}
              </h1>
            </div>
          </div>

          {/* MODULES GRID */}
          <div className="flex-grow py-16 px-6 md:px-12 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
                
                {/* Module 1 (Active) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 flex flex-col h-full text-center p-6 animate-fade-in">
                  <div className="rounded-xl overflow-hidden aspect-[1.6] mb-6 bg-gray-100 relative">
                    <img src={module1?.thumbnail || 'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?q=80&w=600&auto=format&fit=crop'} alt="Modul 1" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                    {lang === 'en' ? 'MODULE 1' : 'MODUL 1'}
                  </h3>
                  <h4 className="text-xl font-bold text-red-600 uppercase tracking-tight leading-snug mb-6 flex-grow">
                    {module1 ? module1.title : 'PLAY SAFE, WIN STRONG'}
                  </h4>
                  <div>
                    <Link to={module1 ? `/module/${module1._id}` : '/'} className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-2.5 rounded-lg transition shadow-md hover:shadow-lg">
                      {lang === 'en' ? 'Start' : 'Mula'}
                    </Link>
                  </div>
                </div>

                {/* Modules 2 to 5 (Coming Soon) */}
                {[2, 3, 4, 5].map((num) => (
                  <div key={num} className="bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full text-center p-6 opacity-60">
                    <div className="rounded-xl overflow-hidden aspect-[1.6] mb-6 bg-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-3xl font-extrabold">MODUL {num}</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-widest mb-2">
                      {lang === 'en' ? `MODULE ${num}` : `MODUL ${num}`}
                    </h3>
                    <h4 className="text-xl font-bold text-gray-400 uppercase tracking-tight leading-snug mb-4">
                      Akan Datang
                    </h4>
                    <p className="text-sm italic text-gray-400 font-medium mt-auto">
                      {lang === 'en' ? 'Coming Soon' : 'Akan Datang'}
                    </p>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </>
      ) : page.customTemplate === 'contact' ? (
        <>
          {/* CONTACT US TEMPLATE */}
          {(() => {
            const contact = page.contactConfig || {};
            const bannerTitle = contact.bannerTitle || (lang === 'en' ? 'Contact Us' : 'Hubungi');
            const bannerImg = contact.bannerImage || 'https://images.unsplash.com/photo-1540747737956-37872f747802?q=80&w=1200&auto=format&fit=crop';
            const description = contact.description || (lang === 'en' ? 'For any inquiries or feedback, contact us via email:' : 'Sebarang pertanyaan atau maklumbalas, hubungi kami menerusi email :');
            const email = contact.email || 'mace@nsc.gov.my';
            const illusImg = contact.imageUrl || '';

            return (
              <>
                {/* Hero Banner Section */}
                <div className="relative bg-[#0f172a] text-white py-16 sm:py-20 px-6 md:px-12 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url('${bannerImg}')` }}></div>
                  <div className="absolute inset-0 bg-[#0f172a]/85 z-10"></div>
                  
                  <div className="relative z-20 max-w-6xl mx-auto w-full text-left">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
                      {bannerTitle}
                    </h1>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-grow py-16 px-6 md:px-12 bg-gray-50 flex items-center justify-center">
                  <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    {/* Left details */}
                    <div className="space-y-6">
                      <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed">
                        {description}
                      </p>
                      <a href={`mailto:${email}`} className="block text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black text-gray-900 hover:text-orange-500 transition-colors tracking-tight whitespace-nowrap overflow-x-auto">
                        {email}
                      </a>
                    </div>
                    
                    {/* Right side Illustration */}
                    <div className="flex justify-center md:justify-end">
                      {illusImg ? (
                        <img src={illusImg} alt="Hubungi Kami" className="max-w-full h-auto object-contain max-h-[300px]" />
                      ) : (
                        <div className="w-full max-w-[280px] text-orange-500 drop-shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-auto">
                            <path d="M19.5 22.5a3 3 0 003-3v-8.197a3 3 0 00-.789-2.041l-2.457-2.69A3 3 0 0017.022 5.5H12V2.25a.75.75 0 00-1.5 0V5.5H3.978a3 3 0 00-2.233 1.072l-2.457 2.69A3 3 0 00.5 11.303v8.197a3 3 0 003 3h16zM12 11.25a.75.75 0 01.342.082l9 4.5a.75.75 0 01-.684 1.336l-8.658-4.329-8.658 4.329a.75.75 0 01-.684-1.336l9-4.5a.75.75 0 01.342-.082z" />
                            <path d="M18 4V1.5A1.5 1.5 0 0016.5 0h-9A1.5 1.5 0 006 1.5V4h12z" opacity="0.4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </>
      ) : (
        /* STANDARD CMS PAGE */
        <div className="flex-grow py-12 px-6 md:px-12">
          <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-4 mb-6">{page.title}</h1>
            <div
              className="prose max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: lang === 'en' ? (page.content_en || page.content) : page.content }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-8 border-t border-gray-200/10 bg-[#0f172a]">
        <div
          className="max-w-6xl mx-auto w-full px-6 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: branding.footerText || '&copy; 2026 Majlis Sukan Negara Malaysia. e-Learning MACE.' }}
        />
      </footer>

    </div>
  );
}
