import React, { useState } from 'react';
import type { AppCategory, AppRegistryItem, AppView, Language } from '../types/index.ts';
import { APP_REGISTRY } from '../config/appRegistry.ts';
import { getTranslation } from '../i18n/translations.ts';
import { soundManager } from '../services/sound.ts';
import {
  Image as ImageIcon,
  Headphones,
  FileText,
  Film,
  DownloadCloud,
  Captions,
  ShieldAlert,
  Radio,
  Compass,
  Wallet,
  Search,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface BentoGridProps {
  onSelectApp: (view: Exclude<AppView, 'hub'>) => void;
  lang: Language;
}

const CATEGORIES: AppCategory[] = ['all', 'active', 'media', 'audio', 'office', 'security', 'stream'];

export const BentoGrid: React.FC<BentoGridProps> = ({ onSelectApp, lang }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>('all');

  const renderIcon = (iconName: AppRegistryItem['icon'], isAvailable: boolean) => {
    const className = `w-7 h-7 ${
      isAvailable ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
    }`;
    switch (iconName) {
      case 'image':
        return <ImageIcon className={className} />;
      case 'audio':
        return <Headphones className={`w-7 h-7 ${isAvailable ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />;
      case 'docs':
        return <FileText className={`w-7 h-7 ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />;
      case 'media':
        return <Film className={className} />;
      case 'download':
        return <DownloadCloud className={className} />;
      case 'subtitle':
        return <Captions className={className} />;
      case 'shield':
        return <ShieldAlert className={className} />;
      case 'stream':
        return <Radio className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'wallet':
        return <Wallet className={className} />;
    }
  };

  const getCategoryLabel = (cat: AppCategory) => {
    switch (cat) {
      case 'all':
        return getTranslation(lang, 'cat_all');
      case 'active':
        return getTranslation(lang, 'cat_active');
      case 'media':
        return getTranslation(lang, 'cat_media');
      case 'audio':
        return getTranslation(lang, 'cat_audio');
      case 'office':
        return getTranslation(lang, 'cat_office');
      case 'security':
        return getTranslation(lang, 'cat_security');
      case 'stream':
        return getTranslation(lang, 'cat_stream');
    }
  };

  const activeCount = APP_REGISTRY.filter((item) => item.isAvailable).length;

  const filtered = APP_REGISTRY.filter((item) => {
    if (selectedCategory === 'active' && !item.isAvailable) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'active' && item.category !== selectedCategory) {
      return false;
    }

    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = lang === 'es' ? item.name_es : item.name_en;
    const desc = lang === 'es' ? item.desc_es : item.desc_en;
    const badge = lang === 'es' ? item.badge_es : item.badge_en;
    return (
      name.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      badge.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search + Active Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={getTranslation(lang, 'search_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm dark:shadow-inner"
          />
        </div>
        <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {activeCount}/{APP_REGISTRY.length} {getTranslation(lang, 'hub_active_count')}
          </span>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              soundManager.playClick();
              setSelectedCategory(cat);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Grid of Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          {getTranslation(lang, 'hub_empty_search')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((item) => {
            const isAvailable = item.isAvailable;
            const name = lang === 'es' ? item.name_es : item.name_en;
            const desc = lang === 'es' ? item.desc_es : item.desc_en;
            const badge = lang === 'es' ? item.badge_es : item.badge_en;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isAvailable && item.view) {
                    soundManager.playClick();
                    onSelectApp(item.view);
                  }
                }}
                className={`relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isAvailable
                    ? 'bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer active:scale-[0.98]'
                    : 'bg-slate-100/70 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/50 opacity-75 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                      {renderIcon(item.icon, isAvailable)}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {badge}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                          isAvailable
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {getTranslation(lang, 'badge_mobile_active')}
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5 inline" />
                            {getTranslation(lang, 'badge_coming_soon')}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                    {name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {desc}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {isAvailable
                      ? getTranslation(lang, 'status_ready')
                      : getTranslation(lang, 'status_desktop_only')}
                  </span>

                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAvailable && item.view) {
                        soundManager.playClick();
                        onSelectApp(item.view);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isAvailable
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 active:scale-95'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {isAvailable
                        ? getTranslation(lang, 'btn_open')
                        : getTranslation(lang, 'btn_coming_soon')}
                    </span>
                    {isAvailable && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
