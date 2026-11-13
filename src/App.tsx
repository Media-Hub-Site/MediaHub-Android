import { useState, useEffect } from 'react';
import type { AppView, Language } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { BentoGrid } from './components/BentoGrid.tsx';
import { ImageConverterView } from './components/ImageConverterView.tsx';
import { AudioLabView } from './components/AudioLabView.tsx';
import { DocumentConverterView } from './components/DocumentConverterView.tsx';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('hub');
  const [lang, setLang] = useState<Language>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mediahub_lang');
      if (saved === 'es' || saved === 'en') return saved;
    }
    return 'es';
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('mediahub_theme');
      if (savedTheme !== null) return savedTheme === 'dark';
    }
    return true;
  });

  // Update theme class and Android native status bar
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.lang = lang;

    try {
      void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      void StatusBar.setBackgroundColor({ color: isDark ? '#0F172A' : '#FFFFFF' });
    } catch {
      // Non-native environment fallback
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mediahub_theme', isDark ? 'dark' : 'light');
    }
  }, [isDark, lang]);

  // Handle Android hardware Back button: return to Hub before exiting
  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (currentView !== 'hub') {
        setCurrentView('hub');
      } else if (canGoBack) {
        window.history.back();
      } else {
        void CapacitorApp.exitApp();
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [currentView]);

  const handleToggleLang = () => {
    const nextLang = lang === 'es' ? 'en' : 'es';
    setLang(nextLang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mediahub_lang', nextLang);
    }
  };

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        lang={lang}
        onToggleLang={handleToggleLang}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {currentView === 'hub' && <BentoGrid onSelectApp={setCurrentView} lang={lang} />}
        {currentView === 'image-tools' && <ImageConverterView lang={lang} />}
        {currentView === 'audiolab' && <AudioLabView lang={lang} />}
        {currentView === 'document-converter' && <DocumentConverterView lang={lang} />}
      </main>

      <Footer lang={lang} />
    </div>
  );
}

export default App;
