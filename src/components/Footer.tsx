import React from 'react';
import type { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { soundManager } from '../utils/sound';
import { MessageSquareHeart, ShieldCheck } from 'lucide-react';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const handleFeedback = () => {
    soundManager.playClick();
    window.open('https://forms.gle/ECL2mwc8iH5UXkos9', '_blank');
  };

  return (
    <footer className="w-full mt-auto py-3 px-4 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
            {getTranslation(lang, 'dock_installed')} • v1.0.0
          </span>
        </div>

        <button
          onClick={handleFeedback}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/20 text-xs font-semibold active:scale-95 transition-all"
        >
          <MessageSquareHeart className="w-3.5 h-3.5 text-blue-400" />
          <span>{getTranslation(lang, 'dock_feedback')}</span>
        </button>
      </div>
    </footer>
  );
};
