import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function ModuleLanding() {
  const { id } = useParams();
  const { branding, lang, changeLang, loading: globalLoading } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(0);

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
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <p className="text-white/60 text-sm font-medium animate-pulse">Memuatkan modul...</p>
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
    const cls = `inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold ${px} py-3 rounded-lg transition shadow-md hover:shadow-lg`;
    const label = lang === "en" ? "Start Module" : "Mula Modul";
    if (!lessonId) return null;
    if (isLoggedIn) return <a href={`/lesson/${lessonId}`} className={cls}><GearIcon />{label}</a>;
    return (
      <a href="/" onClick={e => { e.preventDefault(); alert(lang === "en" ? "Please register or check your account to start the module." : "Sila daftar atau semak akaun untuk memulakan modul."); }} className={cls}>
        <GearIcon />{label}
      </a>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Navbar */}
      <nav className="bg-[#0f172a] text-white py-4 px-6 md:px-12 z-20 relative shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-3">
              {branding.logoUrl
                ? <img src={branding.logoUrl} alt="Logo" className="h-8 md:h-10 w-auto object-contain" />
                : <span className="text-lg md:text-xl font-extrabold uppercase tracking-wider">{branding.siteName || "MACE"}</span>
              }
            </a>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:flex items-center gap-6">
              <a href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </a>
              {branding.showMenu && branding.menuLinks?.map((link, i) => (
                <a key={i} href={link.url} className="text-sm font-medium hover:text-gray-300 transition-colors">{translateMenuLabel(link)}</a>
              ))}
              {branding.navPages?.map((p, i) => (
                <a key={i} href={`/page/${p.slug}`} className="text-sm font-medium hover:text-gray-300 transition-colors pb-1">
                  {lang === "en" ? (p.title_en || p.title) : p.title}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1 border border-white/20">
              <button onClick={() => changeLang("ms")} className={`text-xs px-2 py-1 rounded font-semibold transition-all ${lang === "ms" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"}`}>BM</button>
              <button onClick={() => changeLang("en")} className={`text-xs px-2 py-1 rounded font-semibold transition-all ${lang === "en" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"}`}>EN</button>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white hover:text-gray-300 p-1 rounded-lg hover:bg-white/10 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0f172a] border-t border-white/10 text-white py-3 px-6 space-y-1 z-10">
          <a href="/" className="block text-sm font-medium py-2 border-b border-white/5 hover:text-orange-400 transition-colors">{lang === "en" ? "Home" : "Laman Utama"}</a>
          {branding.showMenu && branding.menuLinks?.map((link, i) => (
            <a key={i} href={link.url} className="block text-sm font-medium py-2 border-b border-white/5 hover:text-orange-400 transition-colors">
              {lang === "en" ? (link.label_en || link.label) : link.label}
            </a>
          ))}
        </div>
      )}

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
    </div>
  );
}
