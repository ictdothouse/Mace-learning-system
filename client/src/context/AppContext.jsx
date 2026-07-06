import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import WaitingRoom from '../components/WaitingRoom';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [auth, setAuth] = useState({ authenticated: false, role: null, athlete: null, user: null });
  const [branding, setBranding] = useState({});
  const [translations, setTranslations] = useState({});
  const [lang, setLang] = useState(() => {
    // Get language from cookies or localStorage or navigator
    const match = document.cookie.match(/lang=([^;]+)/);
    return match ? match[1] : (localStorage.getItem('lang') || 'ms');
  });
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState(null);

  // Setup Axios interceptor to catch 503 Queue errors globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 503 && error.response.data?.error === 'queue') {
          setQueueStatus(error.response.data);
          return new Promise(() => {}); // Suspend the promise so components don't crash
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const updateBrandingMetadata = (metadata, currentLang) => {
    if (!metadata) return;
    const titleVal = currentLang === 'en' 
      ? (metadata.siteName_en || metadata.siteName || 'MACE Learning System')
      : (metadata.siteName || 'MACE Learning System');

    if (document.title !== titleVal) {
      document.title = titleVal;
    }

    if (metadata.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = metadata.faviconUrl;
    }
  };

  const fetchStatus = async () => {
    try {
      // Parallel requests for optimal loading speed
      const [authRes, brandingRes, localesRes] = await Promise.all([
        axios.get('/api/auth/me'),
        axios.get('/api/branding'),
        axios.get(`/api/locales/${lang}`)
      ]);

      setAuth(authRes.data);
      setBranding(brandingRes.data);
      setTranslations(localesRes.data);
      updateBrandingMetadata(brandingRes.data, lang);
    } catch (err) {
      console.error('Error initializing MACE app context:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeLang = async (newLang) => {
    try {
      document.cookie = `lang=${newLang}; max-age=${30 * 24 * 60 * 60}; path=/`;
      localStorage.setItem('lang', newLang);
      setLang(newLang);
      
      const localesRes = await axios.get(`/api/locales/${newLang}`);
      setTranslations(localesRes.data);
    } catch (err) {
      console.error('Failed to change language:', err);
    }
  };

  const t = (key, fallback = '') => {
    return translations[key] || fallback || key;
  };

  useEffect(() => {
    fetchStatus();
  }, [lang]);

  return (
    <AppContext.Provider value={{ auth, setAuth, branding, translations, lang, changeLang, t, loading, fetchStatus }}>
      {queueStatus ? (
        <WaitingRoom 
          lang={lang} 
          queueData={queueStatus} 
          onEnter={() => { setQueueStatus(null); fetchStatus(); }} 
        />
      ) : (
        children
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
