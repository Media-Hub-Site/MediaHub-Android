import React, { useState } from 'react';
import type { AppRegistryItem, AppView, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { soundManager } from '../utils/sound';
import { 
  Image as ImageIcon, 
  Headphones, 
  FileText, 
  DownloadCloud, 
  ShieldAlert, 
  Radio, 
  Compass, 
  Wallet, 
  Search, 
  Sparkles, 
  ArrowRight,
  Lock
} from 'lucide-react';

interface BentoGridProps {
  onSelectApp: (view: AppView) => void;
  lang: Language;
}

const REGISTRY: AppRegistryItem[] = [
  {
    id: 'image-tools',
    name_es: 'Convertidor de Imágenes',
    name_en: 'Image Converter',
    desc_es: 'Conversión de formatos (JPG, PNG, WEBP, BMP), compresión inteligente, reescalado, filtros visuales y marca de agua.',
    desc_en: 'Format conversion (JPG, PNG, WEBP, BMP), smart compression, resizing, visual filters and watermarking.',
    badge_es: 'CREATIVO',
    badge_en: 'CREATIVE',
    icon: 'image',
    isAvailable: true,
    view: 'image-tools',
    category: 'media',
  },
  {
    id: 'audiolab',
    name_es: 'AudioLab Mobile',
    name_en: 'AudioLab Mobile',
    desc_es: 'Laboratorio de síntesis matemática Bytebeat, generador procedural de SFX, osciloscopio en tiempo real y exportación WAV.',
    desc_en: 'Bytebeat mathematical synthesis studio, procedural SFX generator, real-time oscilloscope and WAV export.',
    badge_es: 'SÍNTESIS',
    badge_en: 'SYNTH',
    icon: 'audio',
    isAvailable: true,
    view: 'audiolab',
    category: 'audio',
  },
  {
    id: 'docs',
    name_es: 'Convertidor de Documentos',
    name_en: 'Document Converter',
    desc_es: 'Conversión inteligente entre PDF, Word, Excel, PowerPoint e imágenes a 300 DPI.',
    desc_en: 'Intelligent conversion between PDF, Word, Excel, PowerPoint and images at 300 DPI.',
    badge_es: 'OFICINA',
    badge_en: 'OFFICE',
    icon: 'docs',
    isAvailable: false,
    category: 'office',
  },
  {
    id: 'link',
    name_es: 'Convertidor de Links',
    name_en: 'Link Converter',
    desc_es: 'Descarga por lotes desde YouTube, TikTok, Instagram y playlists con soporte paralelo.',
    desc_en: 'Batch downloader from YouTube, TikTok, Instagram and playlists with parallel support.',
    badge_es: 'BATCH',
    badge_en: 'BATCH',
    icon: 'download',
    isAvailable: false,
    category: 'media',
  },
  {
    id: 'blueguard',
    name_es: 'BlueGuard Mobile',
    name_en: 'BlueGuard Mobile',
    desc_es: 'Asistente Blue Team de ciberseguridad, puertos, red y logs traducidos en tiempo real (ISO 27001, NIST, CIS).',
    desc_en: 'Blue Team cybersecurity assistant for network, ports and logs translated in real-time (ISO 27001, NIST, CIS).',
    badge_es: 'SEGURIDAD',
    badge_en: 'SECURITY',
    icon: 'shield',
    isAvailable: false,
    category: 'security',
  },
  {
    id: 'streamstudio',
    name_es: 'StreamStudio Mobile',
    name_en: 'StreamStudio Mobile',
    desc_es: 'Suite de alertas OBS, puntos de canal con Voces IA y analíticas en vivo para Twitch.',
    desc_en: 'OBS alerts suite, AI Voice channel points and live analytics for Twitch.',
    badge_es: 'STREAMING',
    badge_en: 'STREAMING',
    icon: 'stream',
    isAvailable: false,
    category: 'stream',
  },
  {
    id: 'chileplanos',
    name_es: 'ChilePlanos Mobile',
    name_en: 'ChilePlanos Mobile',
    desc_es: 'Hub de planimetría técnica y arquitectura para estudiantes y profesionales (RIDAA, SEC, NCh).',
    desc_en: 'Technical planimetry and architectural hub for students and professionals (RIDAA, SEC, NCh).',
    badge_es: 'PLANOS',
    badge_en: 'BLUEPRINTS',
    icon: 'compass',
    isAvailable: false,
    category: 'office',
  },
  {
    id: 'budget',
    name_es: 'Gestor Presupuestario',
    name_en: 'Budget Manager',
    desc_es: 'Gestión financiera, seguimiento de gastos, control de compras en cuotas y balance en tiempo real.',
    desc_en: 'Financial management, expense tracking, installment purchases tracking and real-time cash balance.',
    badge_es: 'FINANZAS',
    badge_en: 'FINANCE',
    icon: 'wallet',
    isAvailable: false,
    category: 'office',
  },
];

export const BentoGrid: React.FC<BentoGridProps> = ({ onSelectApp, lang }) => {
  const [search, setSearch] = useState('');

  const renderIcon = (iconName: string, isAvailable: boolean) => {
    const className = `w-7 h-7 ${isAvailable ? 'text-blue-400' : 'text-slate-500'}`;
    switch (iconName) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-blue-400" />;
      case 'audio':
        return <Headphones className="w-8 h-8 text-indigo-400" />;
      case 'docs':
        return <FileText className={className} />;
      case 'download':
        return <DownloadCloud className={className} />;
      case 'shield':
        return <ShieldAlert className={className} />;
      case 'stream':
        return <Radio className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'wallet':
        return <Wallet className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const filtered = REGISTRY.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = lang === 'es' ? item.name_es : item.name_en;
    const desc = lang === 'es' ? item.desc_es : item.desc_en;
    return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={getTranslation(lang, 'search_placeholder')}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
        />
      </div>

      {/* Grid of Cards */}
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
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-950/60 border-slate-800/50 opacity-70 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-md">
                    {renderIcon(item.icon, isAvailable)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {badge}
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                        isAvailable
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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

                <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
                  {name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  {isAvailable ? getTranslation(lang, 'status_ready') : 'v1.0 (Desktop)'}
                </span>

                <button
                  disabled={!isAvailable}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isAvailable
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>{isAvailable ? getTranslation(lang, 'btn_open') : getTranslation(lang, 'btn_coming_soon')}</span>
                  {isAvailable && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
