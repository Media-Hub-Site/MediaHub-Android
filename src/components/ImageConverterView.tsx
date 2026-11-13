import React, { useState, useRef } from 'react';
import type { ImageProcessingOptions, ProcessedImageResult, Language } from '../types';
import { processImage } from '../utils/imageProcessor';
import { getTranslation } from '../i18n/translations';
import { soundManager } from '../utils/sound';
import { Share } from '@capacitor/share';
import {
  Upload,
  Sliders,
  CheckCircle2,
  Download,
  Share2,
  Trash2,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Minimize2,
  Eye
} from 'lucide-react';

interface ImageConverterViewProps {
  lang: Language;
}

export const ImageConverterView: React.FC<ImageConverterViewProps> = ({ lang }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ id: string; url: string; name: string; size: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedImageResult[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'results'>('settings');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [options, setOptions] = useState<ImageProcessingOptions>({
    format: 'image/webp',
    quality: 0.85,
    scalePercent: 100,
    maintainAspectRatio: true,
    grayscale: false,
    invert: false,
    sepia: false,
    brightness: 100,
    contrast: 100,
    watermarkText: '',
    watermarkOpacity: 0.6,
    watermarkPosition: 'bottom-right',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundManager.playClick();
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    soundManager.playClick();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleProcessAll = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    soundManager.playClick();

    const newResults: ProcessedImageResult[] = [];
    try {
      for (const file of selectedFiles) {
        const res = await processImage(file, options);
        newResults.push(res);
      }
      setResults(newResults);
      setActiveTab('results');
      soundManager.playSuccess();
    } catch (err) {
      alert(`Error al procesar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = (result: ProcessedImageResult) => {
    soundManager.playClick();
    const link = document.createElement('a');
    link.href = result.processedDataUrl;
    const baseName = result.originalName.replace(/\.[^/.]+$/, '');
    link.download = `${baseName}_converted.${result.formatExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareResult = async (result: ProcessedImageResult) => {
    soundManager.playClick();
    try {
      const baseName = result.originalName.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}_converted.${result.formatExt}`;

      // Convert dataURL to File for sharing if supported
      const file = new File([result.processedBlob], fileName, { type: result.processedBlob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: 'Imagen procesada con Media Hub Mobile',
        });
      } else {
        await Share.share({
          title: fileName,
          text: 'Media Hub Mobile Image',
          url: result.processedDataUrl,
          dialogTitle: 'Compartir imagen',
        });
      }
    } catch {
      // User cancelled share or fallback
      handleDownloadResult(result);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-900/60 cursor-pointer active:scale-[0.99] transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 mx-auto flex items-center justify-center mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">{getTranslation(lang, 'img_upload_btn')}</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          {getTranslation(lang, 'img_upload_hint')}
        </p>
      </div>

      {/* Selected Files Preview Strip */}
      {previews.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              {previews.length} {previews.length === 1 ? 'imagen cargada' : 'imágenes cargadas'}
            </span>
            <button
              onClick={() => {
                soundManager.playClick();
                setSelectedFiles([]);
                setPreviews([]);
                setResults([]);
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {getTranslation(lang, 'img_clear_all')}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {previews.map((item, idx) => (
              <div
                key={item.id}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group"
              >
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-red-400 active:scale-90"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/90 text-[9px] text-slate-300 px-1 py-0.5 truncate text-center">
                  {formatBytes(item.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('settings');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{getTranslation(lang, 'img_settings')}</span>
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('results');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'results' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {getTranslation(lang, 'img_results_title')} ({results.length})
          </span>
        </button>
      </div>

      {/* Settings View */}
      {activeTab === 'settings' && (
        <div className="space-y-3.5 bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800">
          {/* Format Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              {getTranslation(lang, 'img_output_format')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['image/webp', 'image/jpeg', 'image/png', 'image/bmp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    soundManager.playClick();
                    setOptions({ ...options, format: fmt });
                  }}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    options.format === fmt
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {fmt.split('/')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                {getTranslation(lang, 'img_quality')}
              </span>
              <span className="text-blue-400 font-mono">{Math.round(options.quality * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={options.quality}
              onChange={(e) => setOptions({ ...options, quality: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Resize Scale Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {getTranslation(lang, 'img_resize_scale')}
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-xs">
              {[25, 50, 75, 100, 150].map((scale) => (
                <button
                  key={scale}
                  onClick={() => {
                    soundManager.playClick();
                    setOptions({ ...options, scalePercent: scale });
                  }}
                  className={`py-1.5 rounded-lg font-semibold transition-all ${
                    options.scalePercent === scale
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scale}%
                </button>
              ))}
            </div>
          </div>

          {/* Filters & Color Corrections */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {getTranslation(lang, 'img_filters')}
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-medium">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setOptions({ ...options, grayscale: !options.grayscale });
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  options.grayscale
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                }`}
              >
                {getTranslation(lang, 'img_filter_grayscale')}
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setOptions({ ...options, sepia: !options.sepia });
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  options.sepia
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                }`}
              >
                {getTranslation(lang, 'img_filter_sepia')}
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setOptions({ ...options, invert: !options.invert });
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  options.invert
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                }`}
              >
                {getTranslation(lang, 'img_filter_invert')}
              </button>
            </div>
          </div>

          {/* Watermark Section */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {getTranslation(lang, 'img_watermark')}
            </label>
            <input
              type="text"
              value={options.watermarkText}
              onChange={(e) => setOptions({ ...options, watermarkText: e.target.value })}
              placeholder={getTranslation(lang, 'img_watermark_placeholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Process Action Button */}
          <button
            disabled={selectedFiles.length === 0 || isProcessing}
            onClick={handleProcessAll}
            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              selectedFiles.length > 0 && !isProcessing
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando {selectedFiles.length} imágenes…
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {selectedFiles.length > 1
                    ? `${getTranslation(lang, 'img_process_all_btn')} (${selectedFiles.length})`
                    : getTranslation(lang, 'img_process_btn')}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results View */}
      {activeTab === 'results' && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800">
              <Eye className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Aún no has procesado ninguna imagen.</p>
            </div>
          ) : (
            results.map((res) => {
              const diffPercent = Math.round(
                ((res.originalSize - res.processedSize) / res.originalSize) * 100
              );
              const isSaved = diffPercent > 0;

              return (
                <div
                  key={res.id}
                  className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img
                      src={res.processedDataUrl}
                      alt={res.originalName}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-950 flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                        {res.originalName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>{formatBytes(res.originalSize)}</span>
                        <span>→</span>
                        <span className="text-emerald-400 font-bold">{formatBytes(res.processedSize)}</span>
                        {isSaved && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            -{diffPercent}%
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {res.width}x{res.height} px • {res.formatExt.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleDownloadResult(res)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>{getTranslation(lang, 'img_btn_download')}</span>
                    </button>
                    <button
                      onClick={() => handleShareResult(res)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{getTranslation(lang, 'img_btn_share')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
