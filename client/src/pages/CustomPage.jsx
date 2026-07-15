import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export default function CustomPage() {
  const { slug } = useParams();
  const { branding, t, lang, changeLang, loading: globalLoading } = useApp();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ page: {}, module1: null });
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!loading && !globalLoading && data.page) {
      const pageTitle = lang === 'en' 
        ? (data.page.title_en || translateText(data.page.title))
        : data.page.title;
      document.title = `${pageTitle} | ${branding.siteName || 'MACE'}`;
    }
  }, [loading, globalLoading, data.page, lang, branding.siteName]);

  if (loading || globalLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 animate-pulse font-sans">
        {/* Navbar Skeleton */}
        <nav className="bg-[#0f172a] h-16 flex items-center justify-between px-6 md:px-12 border-b border-white/10 shadow-md">
          <div className="w-36 h-8 bg-white/10 rounded-lg"></div>
          <div className="flex gap-4">
            <div className="w-16 h-7 bg-white/10 rounded-lg"></div>
            <div className="w-20 h-7 bg-white/10 rounded-lg"></div>
          </div>
        </nav>

        {/* Banner Skeleton */}
        <div className="bg-[#0f172a]/90 py-16 sm:py-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto w-full">
            <div className="w-64 h-10 bg-white/20 rounded-xl"></div>
          </div>
        </div>

        {/* Content Section Skeleton */}
        <div className="flex-grow py-16 px-6 md:px-12 flex items-center justify-center">
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="space-y-6">
              <div className="w-full h-4 bg-gray-200 rounded"></div>
              <div className="w-4/5 h-4 bg-gray-200 rounded"></div>
              <div className="w-2/3 h-10 bg-gray-200 rounded-xl pt-2"></div>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-[280px] aspect-square bg-gray-100 rounded-2xl"></div>
            </div>
          </div>
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

  const translateStatus = (text, language) => {
    if (!text) return '';
    if (language !== 'en') return text;
    
    const lowerText = text.trim().toLowerCase();
    const mapping = {
      'akan datang': 'Coming Soon',
      'belum mula': 'Not Started',
      'sedang berjalan': 'In Progress',
      'tamat': 'Completed',
      'mula': 'Start',
      'selesai': 'Completed'
    };
    
    if (mapping[lowerText]) {
      return mapping[lowerText];
    }
    
    if (lowerText.includes('akan datang')) return text.replace(/akan datang/gi, 'Coming Soon');
    if (lowerText.includes('belum mula')) return text.replace(/belum mula/gi, 'Not Started');
    if (lowerText.includes('sedang berjalan')) return text.replace(/sedang berjalan/gi, 'In Progress');
    if (lowerText.includes('tamat')) return text.replace(/tamat/gi, 'Completed');
    
    return text;
  };

  const translateText = (text) => {
    if (!text || lang !== 'en') return text;
    let result = text;
    const mappings = [
      {
        ms: /Sebarang pertanyaan atau maklumbalas, hubungi kami menerusi email\s*:/gi,
        en: "For any inquiries or feedback, contact us via email:"
      },
      {
        ms: /^Hubungi$/gi,
        en: "Contact Us"
      },
      {
        ms: /Hubungi Kami/gi,
        en: "Contact Us"
      }
    ];
    for (const m of mappings) {
      result = result.replace(m.ms, m.en);
    }
    return result;
  };

  const defaultCards = [
    {
      title: 'CAREER BOOST',
      statusText: lang === 'en' ? 'Coming Soon' : 'Akan Datang',
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600&auto=format&fit=crop'
    },
    {
      title: 'POCKET POWER',
      statusText: lang === 'en' ? 'Coming Soon' : 'Akan Datang',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop'
    },
    {
      title: 'MODE ON!',
      statusText: lang === 'en' ? 'Coming Soon' : 'Akan Datang',
      imageUrl: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?q=80&w=600&auto=format&fit=crop'
    },
    {
      title: 'SMART ATHLETE',
      statusText: lang === 'en' ? 'Coming Soon' : 'Akan Datang',
      imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop'
    }
  ];

  const cards = [...defaultCards];
  if (page.modulesConfig && Array.isArray(page.modulesConfig)) {
    page.modulesConfig.forEach((card, idx) => {
      if (idx < cards.length) {
        // Clone card object to avoid mutating original defaultCards array
        cards[idx] = {
          ...cards[idx],
          title: card.title || cards[idx].title,
          statusText: card.statusText ? translateStatus(card.statusText, lang) : cards[idx].statusText,
          imageUrl: card.imageUrl || cards[idx].imageUrl
        };
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      
      {/* Top Navbar */}
      <nav className="bg-[#0f172a] text-white py-4 px-6 md:px-12 z-50 relative shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" width="160" height="40" className="h-8 md:h-10 w-auto object-contain" />
              ) : (
                <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-wider">
                  {branding.siteName || 'MACE'}
                </h1>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-6">
            {/* Desktop Menu Links */}
            {((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
              <div className="hidden md:flex items-center gap-6">
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

            {/* Mobile Hamburger Button */}
            {((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
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

        {/* Mobile Menu Drawer (Right-aligned popover with blur & icons) */}
        {mobileMenuOpen && ((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
          <div className="md:hidden absolute right-6 top-full mt-2 w-56 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl py-3 px-4 z-50 flex flex-col gap-1.5 animate-fade-in">
            {branding.showMenu && branding.menuLinks?.map((link, index) => {
              const label = lang === 'en'
                ? (link.label_en || (link.label?.toLowerCase() === 'modul' ? 'Modules' : link.label?.toLowerCase() === 'hubungi kami' ? 'Contact Us' : link.label))
                : link.label;
              const isContact = label.toLowerCase().includes('hubung') || label.toLowerCase().includes('contact');
              const isModule = label.toLowerCase().includes('modul') || label.toLowerCase().includes('module');
              
              return (
                <a key={index} href={link.url} className="flex items-center gap-3 text-sm font-medium py-2 px-3 rounded-xl hover:bg-white/10 hover:text-orange-400 transition-all text-white">
                  {isModule && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  {isContact && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {!isModule && !isContact && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span>{label}</span>
                </a>
              );
            })}
            {branding.navPages?.map((p, index) => {
              const isContact = p.customTemplate === 'contact' || p.title.toLowerCase().includes('hubung') || p.title.toLowerCase().includes('contact');
              const isModule = p.customTemplate === 'modules' || p.title.toLowerCase().includes('modul') || p.title.toLowerCase().includes('module');
              const title = lang === 'en' ? (p.title_en || p.title) : p.title;
              
              return (
                <a key={index} href={`/page/${p.slug}`} className="flex items-center gap-3 text-sm font-medium py-2 px-3 rounded-xl hover:bg-white/10 hover:text-orange-400 transition-all text-white">
                  {isModule && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  {isContact && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {!isModule && !isContact && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span>{title}</span>
                </a>
              );
            })}
          </div>
        )}
      </nav>

      {/* RENDER TEMPLATES */}
      {page.customTemplate === 'modules' ? (
        <>
          {/* BANNER SECTION FOR MODULES */}
          <div className="relative bg-gradient-to-r from-blue-900 to-indigo-950 text-white py-16 px-6 md:px-12 text-center shadow-lg overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop" 
              alt="Banner Background" 
              width="1200" 
              height="300"
              fetchpriority="high"
              className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-overlay z-0" 
            />
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
                <div className="group bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.14)] hover:-translate-y-2 flex flex-col h-full text-center p-6 animate-fade-in">
                  <div className="rounded-xl overflow-hidden aspect-[1.6] mb-6 bg-gray-100 relative">
                    <img src={module1?.thumbnail || 'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?q=80&w=600&auto=format&fit=crop'} alt="Modul 1" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                    {lang === 'en' ? 'MODULE 1' : 'MODUL 1'}
                  </h3>
                  <h4 className="text-xl font-bold text-red-600 uppercase tracking-tight leading-snug mb-6 flex-grow transition-colors duration-300 group-hover:text-red-700">
                    {module1 ? module1.title : 'PLAY SAFE, WIN STRONG'}
                  </h4>
                  <div>
                    <a href={module1 ? `/module/${module1._id}` : '/'} className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-2.5 rounded-lg transition shadow-md hover:shadow-lg transform active:scale-95 duration-200">
                      {lang === 'en' ? 'Start' : 'Mula'}
                    </a>
                  </div>
                </div>

                {/* Modules 2 to 5 (Customizable from CMS) */}
                {cards.map((card, idx) => (
                  <div key={idx} className="group bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] hover:-translate-y-2 flex flex-col h-full text-center p-6 opacity-75 hover:opacity-100">
                    <div className="rounded-xl overflow-hidden aspect-[1.6] mb-6 bg-gray-100">
                      <img src={card.imageUrl} alt={`Modul ${idx + 2}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-widest mb-2">
                      {lang === 'en' ? 'MODULE' : 'MODUL'} {idx + 2}
                    </h3>
                    <h4 className="text-xl font-bold text-gray-400 uppercase tracking-tight leading-snug mb-4 transition-colors duration-300 group-hover:text-slate-500">
                      {card.title || (lang === 'en' ? 'Coming Soon' : 'Akan Datang')}
                    </h4>
                    <p className="text-sm italic text-gray-400 font-medium mt-auto">
                      {card.statusText || (lang === 'en' ? 'Coming Soon' : 'Akan Datang')}
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
            const bannerTitle = translateText(contact.bannerTitle || (lang === 'en' ? 'Contact Us' : 'Hubungi'));
            const bannerImg = contact.bannerImage || 'https://images.unsplash.com/photo-1540747737956-37872f747802?q=80&w=1200&auto=format&fit=crop';
            const description = translateText(contact.description || (lang === 'en' ? 'For any inquiries or feedback, contact us via email:' : 'Sebarang pertanyaan atau maklumbalas, hubungi kami menerusi email :'));
            const email = contact.email || 'mace@nsc.gov.my';
            const illusImg = contact.imageUrl || '';

            return (
              <>
                 {/* Hero Banner Section */}
                <div className="relative bg-[#0f172a] text-white py-16 sm:py-20 px-6 md:px-12 shadow-lg overflow-hidden">
                  {bannerImg && (
                    <img 
                      src={bannerImg} 
                      alt="Banner Background" 
                      width="1200"
                      height="300"
                      fetchpriority="high"
                      className="absolute inset-0 w-full h-full object-cover z-0" 
                    />
                  )}
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
                      <a href={`mailto:${email}`} className="block text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black text-gray-900 hover:text-orange-500 transition-colors tracking-tight break-words w-full">
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
