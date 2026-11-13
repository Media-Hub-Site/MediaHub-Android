import { useState, useEffect } from 'react';
import type { AppView, Language } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BentoGrid } from './components/BentoGrid';
import { ImageConverterView } from './components/ImageConverterView';
import { AudioLabView } from './components/AudioLabView';
import { StatusBar, Style } from '@capacitor/status-bar';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('hub');
  const [lang, setLang] = useState<Language>('es');
  const [isDark, setIsDark] = useState<boolean>(true);

  // Initialize language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('mediahub_lang') as Language;
    if (savedLang === 'es' || savedLang === 'en') {
      setLang(savedLang);
    }
    const savedTheme = localStorage.getItem('mediahub_theme');
    if (savedTheme !== null) {
      setIsDark(savedTheme === 'dark');
    }
  }, []);

  // Update theme and status bar
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      try {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#0F172A' });
      } catch {
        // non-native environment fallback
      }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#F8FAFC' });
      } catch {
        // non-native environment fallback
      }
    }
    localStorage.setItem('mediahub_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleToggleLang = () => {
    const nextLang = lang === 'es' ? 'en' : 'es';
    setLang(nextLang);
    localStorage.setItem('mediahub_lang', nextLang);
  };

  const handleToggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        lang={lang}
        onToggleLang={handleToggleLang}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {currentView === 'hub' && (
          <BentoGrid onSelectApp={setCurrentView} lang={lang} />
        )}
        {currentView === 'image-tools' && (
          <ImageConverterView lang={lang} />
        )}
        {currentView === 'audiolab' && (
          <AudioLabView lang={lang} />
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}

export default App;
