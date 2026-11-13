import React from 'react';
import type { AppView, Language } from '../types/index.ts';
import { getTranslation } from '../i18n/translations.ts';
import { soundManager } from '../services/sound.ts';
import { ArrowLeft, Volume2, VolumeX, Globe, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
}) => {
  const [soundOn, setSoundOn] = React.useState(soundManager.isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundOn;
    soundManager.setSoundEnabled(next);
    soundManager.setHapticsEnabled(next);
    setSoundOn(next);
    if (next) soundManager.playClick();
  };

  const getTitle = () => {
    if (currentView === 'image-tools') return getTranslation(lang, 'img_title');
    if (currentView === 'audiolab') return getTranslation(lang, 'audio_title');
    if (currentView === 'document-converter') return getTranslation(lang, 'doc_title');
    return getTranslation(lang, 'app_title');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/85 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 transition-colors duration-200">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {currentView !== 'hub' ? (
            <button
              onClick={() => {
                soundManager.playClick();
                onNavigate('hub');
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0"
              aria-label={getTranslation(lang, 'btn_back')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{getTranslation(lang, 'btn_back')}</span>
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <span className="text-white font-black text-sm tracking-tighter">MH</span>
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">{getTitle()}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase shrink-0">
                Android
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px] sm:max-w-md">
              {currentView === 'hub'
                ? getTranslation(lang, 'app_subtitle')
                : getTranslation(lang, 'header_tool_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
            title={
              soundOn
                ? getTranslation(lang, 'header_sound_on')
                : getTranslation(lang, 'header_sound_off')
            }
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onToggleLang();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="uppercase">{lang}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onToggleTheme();
            }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
            title={getTranslation(lang, 'header_theme_toggle')}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
