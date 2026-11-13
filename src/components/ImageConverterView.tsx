import React, { useState, useRef, useEffect } from 'react';
import type {
  ImageProcessingOptions,
  ProcessedImageResult,
  Language,
  WatermarkPosition,
} from '../types/index.ts';
import { processImage } from '../utils/imageProcessor.ts';
import { getTranslation } from '../i18n/translations.ts';
import { soundManager } from '../services/sound.ts';
import { saveBlobAsFile, shareOrSaveBlob } from '../services/fileExport.ts';
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
  Eye,
  Sun,
  Contrast,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface ImageConverterViewProps {
  lang: Language;
}

const WATERMARK_POSITIONS: { id: WatermarkPosition; key: 'img_pos_br' | 'img_pos_bl' | 'img_pos_tr' | 'img_pos_tl' | 'img_pos_center' }[] = [
  { id: 'bottom-right', key: 'img_pos_br' },
  { id: 'bottom-left', key: 'img_pos_bl' },
  { id: 'top-right', key: 'img_pos_tr' },
  { id: 'top-left', key: 'img_pos_tl' },
  { id: 'center', key: 'img_pos_center' },
];

export const ImageConverterView: React.FC<ImageConverterViewProps> = ({ lang }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ id: string; url: string; name: string; size: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedImageResult[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'results'>('settings');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

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

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundManager.playClick();
    setStatusMessage(null);
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    soundManager.playClick();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    soundManager.playClick();
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setSelectedFiles([]);
    setPreviews([]);
    setResults([]);
    setStatusMessage(null);
  };

  const resetColorAdjustments = () => {
    soundManager.playClick();
    setOptions((prev) => ({
      ...prev,
      grayscale: false,
      sepia: false,
      invert: false,
      brightness: 100,
      contrast: 100,
    }));
  };

  const handleProcessAll = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);
    soundManager.playClick();

    const newResults: ProcessedImageResult[] = [];
    try {
      for (const file of selectedFiles) {
        const res = await processImage(file, options);
        newResults.push(res);
      }
      setResults(newResults);
      setActiveTab('results');
      setStatusMessage({ type: 'success', text: getTranslation(lang, 'img_done_toast') });
      soundManager.playSuccess();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: 'error',
        text: `${getTranslation(lang, 'img_error_prefix')}: ${detail}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const buildOutputName = (result: ProcessedImageResult) => {
    const baseName = result.originalName.replace(/\.[^/.]+$/, '');
    return `${baseName}_converted.${result.formatExt}`;
  };

  const handleDownloadResult = (result: ProcessedImageResult) => {
    soundManager.playClick();
    saveBlobAsFile(result.processedBlob, buildOutputName(result));
  };

  const handleShareResult = async (result: ProcessedImageResult) => {
    soundManager.playClick();
    const fileName = buildOutputName(result);
    await shareOrSaveBlob(
      result.processedBlob,
      fileName,
      fileName,
      'Processed with Media Hub Mobile'
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const isLosslessFormat = options.format === 'image/png' || options.format === 'image/bmp';

  return (
    <div className="space-y-4 pb-6">
      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-medium flex items-center gap-2 border ${
            statusMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center bg-white dark:bg-slate-900/60 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          {getTranslation(lang, 'img_upload_btn')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          {getTranslation(lang, 'img_upload_hint')}
        </p>
      </div>

      {/* Selected Files Preview Strip */}
      {previews.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              {previews.length}{' '}
              {previews.length === 1
                ? getTranslation(lang, 'img_loaded_single')
                : getTranslation(lang, 'img_loaded_plural')}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {getTranslation(lang, 'img_clear_all')}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {previews.map((item, idx) => (
              <div
                key={item.id}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
              >
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-red-400 active:scale-90"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[9px] text-slate-200 px-1 py-0.5 truncate text-center">
                  {formatBytes(item.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('settings');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{getTranslation(lang, 'img_settings')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('results');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
        <div className="space-y-4 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Format Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              {getTranslation(lang, 'img_output_format')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['image/webp', 'image/jpeg', 'image/png', 'image/bmp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setOptions({ ...options, format: fmt });
                  }}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    options.format === fmt
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {fmt.split('/')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Minimize2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                {getTranslation(lang, 'img_quality')}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-mono">
                {isLosslessFormat ? '100%' : `${Math.round(options.quality * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              disabled={isLosslessFormat}
              value={isLosslessFormat ? 1.0 : options.quality}
              onChange={(e) => setOptions({ ...options, quality: parseFloat(e.target.value) })}
              className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
            />
            {isLosslessFormat && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {getTranslation(lang, 'img_quality_lossless_note')}
              </p>
            )}
          </div>

          {/* Resize Scale Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {getTranslation(lang, 'img_resize_scale')}
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-xs">
              {[25, 50, 75, 100, 150].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setOptions({ ...options, scalePercent: scale });
                  }}
                  className={`py-1.5 rounded-lg font-semibold transition-all ${
                    options.scalePercent === scale
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {scale}%
                </button>
              ))}
            </div>
          </div>

          {/* Filters & Color Corrections */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                {getTranslation(lang, 'img_filters')}
              </label>
              <button
                type="button"
                onClick={resetColorAdjustments}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {getTranslation(lang, 'img_reset_adjustments')}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setOptions({ ...options, grayscale: !options.grayscale });
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  options.grayscale
                    ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                {getTranslation(lang, 'img_filter_grayscale')}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setOptions({ ...options, sepia: !options.sepia });
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  options.sepia
                    ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                {getTranslation(lang, 'img_filter_sepia')}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setOptions({ ...options, invert: !options.invert });
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  options.invert
                    ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                {getTranslation(lang, 'img_filter_invert')}
              </button>
            </div>

            {/* Brightness & Contrast Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    {getTranslation(lang, 'img_brightness')}
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{options.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={options.brightness}
                  onChange={(e) => setOptions({ ...options, brightness: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3.5 h-3.5 text-indigo-500" />
                    {getTranslation(lang, 'img_contrast')}
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{options.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={options.contrast}
                  onChange={(e) => setOptions({ ...options, contrast: parseInt(e.target.value, 10) })}
                  className="w-full accent-indigo-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Watermark Section */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {getTranslation(lang, 'img_watermark')}
            </label>
            <input
              type="text"
              value={options.watermarkText}
              onChange={(e) => setOptions({ ...options, watermarkText: e.target.value })}
              placeholder={getTranslation(lang, 'img_watermark_placeholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            {options.watermarkText.trim() && (
              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>{getTranslation(lang, 'img_watermark_opacity')}</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {Math.round(options.watermarkOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={options.watermarkOpacity}
                    onChange={(e) =>
                      setOptions({ ...options, watermarkOpacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {getTranslation(lang, 'img_watermark_pos')}
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {WATERMARK_POSITIONS.map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setOptions({ ...options, watermarkPosition: pos.id });
                        }}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all ${
                          options.watermarkPosition === pos.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {getTranslation(lang, pos.key)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Process Action Button */}
          <button
            type="button"
            disabled={selectedFiles.length === 0 || isProcessing}
            onClick={() => void handleProcessAll()}
            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              selectedFiles.length > 0 && !isProcessing
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 active:scale-[0.98]'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {getTranslation(lang, 'img_processing')}
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
            <div className="text-center py-12 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Eye className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getTranslation(lang, 'img_no_results')}
              </p>
            </div>
          ) : (
            results.map((res) => {
              const diffPercent = Math.round(
                ((res.originalSize - res.processedSize) / Math.max(1, res.originalSize)) * 100
              );
              const isSaved = diffPercent > 0;

              return (
                <div
                  key={res.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img
                      src={res.processedDataUrl}
                      alt={res.originalName}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {res.originalName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>{formatBytes(res.originalSize)}</span>
                        <span>→</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatBytes(res.processedSize)}
                        </span>
                        {isSaved && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
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
                      type="button"
                      onClick={() => handleDownloadResult(res)}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{getTranslation(lang, 'img_btn_download')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShareResult(res)}
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
