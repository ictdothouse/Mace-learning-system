import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function ModuleLanding() {
  const { id } = useParams();
  const { branding, lang, changeLang, loading: globalLoading } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/api/module/${id}`);
        setData(res.data);
      } catch (err) {
        setError("Modul tidak dijumpai.");
      } finally {
        setLoading(false);
      }
    };
    fetchModule();
  }, [id]);

  useEffect(() => {
    if (data?.module) {
      const title = lang === "en" ? (data.module.title_en || data.module.title) : data.module.title;
      document.title = `${title} - ${branding.siteName || "MACE eLearning"}`;
    }
  }, [data, lang, branding.siteName]);

  const translateLevel = (level) => {
    if (lang !== "en") return level;
    return {
      ...level,
      name: level.name_en || level.name,
      description: level.description_en || level.description,
      targetAudience: level.targetAudience_en || level.targetAudience,
      duration: level.duration_en || level.duration,
    };
  };

  const translateMenuLabel = (link) => {
    if (lang !== "en") return link.label;
    if (link.label_en) return link.label_en;
    const lower = (link.label || "").trim().toLowerCase();
    if (lower === "modul") return "Modules";
    if (lower === "hubungi kami") return "Contact Us";
    return link.label;
  };

  const GearIcon = () => (
    React.createElement("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", strokeWidth: "2.5", viewBox: "0 0 24 24" },
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }),
      React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })
    )
  );

  if (loading || globalLoading) {
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

        {/* Hero Banner Skeleton */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-20 px-6 md:px-12 shadow-lg">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="w-24 h-4 bg-white/10 rounded"></div>
            <div className="w-2/3 h-12 bg-white/20 rounded-xl"></div>
          </div>
        </div>

        {/* Main Content Area Skeleton */}
        <div className="flex-grow py-12 px-6 md:px-12 bg-white">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200 shadow-sm">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white p-6 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                    <div className="w-48 h-5 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl shadow-md border border-gray-100">
          <h2 className="text-xl font-bold text-slate-800">Modul Tidak Dijumpai</h2>
          <p className="text-gray-500 text-sm">Maaf, modul yang anda cari tiada atau telah dipadam.</p>
          <a href="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition">Laman Utama</a>
        </div>
      </div>
    );
  }

  const { module, levels, firstLessonId, isLoggedIn } = data;
  const moduleTitle = lang === "en" ? (module.title_en || module.title) : module.title;
  const moduleDesc = lang === "en" ? (module.description_en || module.description) : module.description;
  const translatedLevels = levels.map(translateLevel);
  const footerText = branding.footerText || "\u00a9 2026 Majlis Sukan Negara Malaysia. Sistem eLearning Atlet MACE v2.0";

  const StartButton = ({ lessonId, size }) => {
    const px = size === "large" ? "px-8" : "px-6";
    const cls = `inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold ${px} py-3 rounded-lg transition shadow-md hover:shadow-lg cursor-pointer`;
    const label = lang === "en" ? "Enter Module" : "Masuk Modul";
    if (!lessonId) return null;
    if (isLoggedIn) return <a href={`/lesson/${lessonId}`} className={cls}><GearIcon />{label}</a>;
    return (
      <button onClick={() => setShowLoginModal(true)} className={cls}>
        <GearIcon />{label}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Navbar */}
      <nav className="bg-[#0f172a] text-white py-4 px-6 md:px-12 z-50 relative shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" width="160" height="40" className="h-8 md:h-10 w-auto object-contain" />
              ) : (
                <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-wider">
                  {branding.siteName || "MACE"}
                </h1>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-6">
            {/* Desktop Menu Links */}
            {((branding.showMenu && branding.menuLinks?.length > 0) || branding.navPages?.length > 0) && (
              <div className="hidden md:flex items-center gap-6">
                {branding.showMenu && branding.menuLinks?.map((link, index) => {
                  const label = lang === "en"
                    ? (link.label_en || (link.label?.toLowerCase() === "modul" ? "Modules" : link.label?.toLowerCase() === "hubungi kami" ? "Contact Us" : link.label))
                    : link.label;
                  return (
                    <a key={index} href={link.url} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
                      {label}
                    </a>
                  );
                })}
                {branding.navPages?.map((p, index) => (
                  <a key={index} href={`/page/${p.slug}`} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
                    {lang === "en" ? (p.title_en || p.title) : p.title}
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
                onClick={() => changeLang("ms")}
                className={`text-xs px-2 py-1 rounded font-semibold transition-all ${lang === "ms" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"}`}
              >
                BM
              </button>
              <button
                onClick={() => changeLang("en")}
                className={`text-xs px-2 py-1 rounded font-semibold transition-all ${lang === "en" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"}`}
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
              const label = lang === "en"
                ? (link.label_en || (link.label?.toLowerCase() === "modul" ? "Modules" : link.label?.toLowerCase() === "hubungi kami" ? "Contact Us" : link.label))
                : link.label;
              const isContact = label.toLowerCase().includes("hubung") || label.toLowerCase().includes("contact");
              const isModule = label.toLowerCase().includes("modul") || label.toLowerCase().includes("module");
              
              return (
                <a key={index} href={link.url} className="flex items-center gap-3 text-sm font-medium py-2 px-3 rounded-xl hover:bg-white/10 hover:text-orange-400 transition-all text-white">
                  {isModule && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  {isContact && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
              const isContact = p.customTemplate === "contact" || p.title.toLowerCase().includes("hubung") || p.title.toLowerCase().includes("contact");
              const isModule = p.customTemplate === "modules" || p.title.toLowerCase().includes("modul") || p.title.toLowerCase().includes("module");
              const title = lang === "en" ? (p.title_en || p.title) : p.title;
              
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

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-blue-950 to-indigo-900 text-white py-20 px-6 md:px-12 text-left shadow-lg overflow-hidden">
        {module.thumbnail
          ? <img src={module.thumbnail} alt={moduleTitle} fetchpriority="high" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" style={{ zIndex: 0 }} />
          : <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop')" }} />
        }
        <div className="relative z-10 max-w-5xl mx-auto">
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-2">{lang === "en" ? "MODULE 1" : "MODUL 1"}</h3>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase mb-4 drop-shadow-md">{moduleTitle}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow py-12 px-6 md:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          {translatedLevels.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-200">
              {translatedLevels.map((lvl, index) => (
                <div key={lvl._id || index} className="bg-white">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === index ? -1 : index)}
                    className={`w-full flex justify-between items-center px-6 py-5 text-left font-bold transition hover:bg-gray-50 select-none ${index === 0 ? "bg-orange-50/80 text-orange-800" : "text-gray-800"}`}
                  >
                    <div className="flex items-center gap-3">
                      {index === 0
                        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" /></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 fill-orange-500" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      }
                      <span className="text-sm md:text-base font-extrabold uppercase tracking-wide">
                        {lvl.name}{index === 0 ? ` ${lang === "en" ? "- ACTIVE MODULE" : "- MODUL AKTIF"}` : ""}
                      </span>
                    </div>
                    <span className={`${index === 0 ? "text-orange-500" : "text-gray-400"} text-lg transition-transform duration-200 inline-block ${openAccordion === index ? "rotate-180" : ""}`}>&#9662;</span>
                  </button>
                  {openAccordion === index && (
                    <div className="bg-gray-50 border-t border-gray-100 px-8 py-6">
                      <div className="max-w-xl space-y-5">
                        {lvl.description && <p className="text-sm text-gray-600 mb-4">{lvl.description}</p>}
                        <div>
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === "en" ? "Who to complete? / Who needs to participate" : "Siapa yang perlu menyertai?"}</h5>
                          <p className="text-sm font-extrabold text-gray-700">- {lvl.targetAudience || (lang === "en" ? "General athlete" : "Atlet umum")}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{lang === "en" ? "Estimate time to complete / Module duration" : "Anggaran masa pembelajaran / Tempoh modul"}</h5>
                          <p className="text-sm font-extrabold text-gray-700">- {lvl.duration || (lang === "en" ? "15 mins" : "15 minit")}</p>
                        </div>
                        <div className="pt-4">
                          {lvl.firstLessonId
                            ? <StartButton lessonId={lvl.firstLessonId} />
                            : <p className="text-xs text-gray-400 italic">{lang === "en" ? "No lessons registered for this level yet." : "Tiada pelajaran didaftarkan untuk peringkat ini lagi."}</p>
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center max-w-xl mx-auto shadow-sm">
              <div className="prose max-w-none mb-6 text-gray-700 text-left" dangerouslySetInnerHTML={{ __html: moduleDesc }} />
              <div className="pt-4 flex justify-center"><StartButton lessonId={firstLessonId} size="large" /></div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white px-5 py-6 text-center border-t border-gray-200 z-10 relative mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-2 text-xs text-gray-500 font-medium">
          <div dangerouslySetInnerHTML={{ __html: footerText }} />
          {branding.footerLinks?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {branding.footerLinks.map((link, idx) => (
                <React.Fragment key={idx}>
                  <a href={link.url} className="hover:underline transition-colors">{lang === "en" ? (link.label_en || link.label) : link.label}</a>
                  {idx < branding.footerLinks.length - 1 && <span className="text-gray-300">|</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </footer>
      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-slate-100">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {lang === "en" ? "Account Verification" : "Daftar / Semak Akaun"}
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
              {lang === "en" 
                ? "Please register or check your account first to access this module." 
                : "Sila daftar atau semak akaun anda terlebih dahulu untuk memasuki modul ini."}
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => window.location.href = "/login"}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer"
              >
                {lang === "en" ? "Go to Login Page" : "Log Masuk"}
              </button>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl transition cursor-pointer"
              >
                {lang === "en" ? "Cancel" : "Batal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
