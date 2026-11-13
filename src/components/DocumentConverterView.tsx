import React, { useState, useRef } from 'react';
import type { DocConversionMode, Language, PdfPageSize } from '../types/index.ts';
import {
  convertCsvToJson,
  convertJsonToCsv,
  generatePdfFromImages,
  generatePdfFromText,
} from '../utils/pdfGenerator.ts';
import { getTranslation } from '../i18n/translations.ts';
import { soundManager } from '../services/sound.ts';
import { saveBlobAsFile, shareOrSaveBlob } from '../services/fileExport.ts';
import {
  FileText,
  ImagePlus,
  Table2,
  Trash2,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileDown,
} from 'lucide-react';

interface DocumentConverterViewProps {
  lang: Language;
}

interface SelectedDocImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export const DocumentConverterView: React.FC<DocumentConverterViewProps> = ({ lang }) => {
  const [mode, setMode] = useState<DocConversionMode>('img-to-pdf');
  const [images, setImages] = useState<SelectedDocImage[]>([]);
  const [pageSize, setPageSize] = useState<PdfPageSize>('a4');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfBody, setPdfBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfName, setPdfName] = useState('MediaHub_Document.pdf');

  const [dataInput, setDataInput] = useState('name,category,size_mb\nImageTools,media,12\nAudioLab,audio,8');
  const [dataOutput, setDataOutput] = useState('');
  const [dataOutputExt, setDataOutputExt] = useState<'json' | 'csv'>('json');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const switchMode = (nextMode: DocConversionMode, resetPdf: boolean) => {
    soundManager.playClick();
    setMode(nextMode);
    setStatusMessage(null);
    if (resetPdf) {
      setPdfBlob(null);
    }
  };

  const loadImageDimensions = (file: File): Promise<SelectedDocImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const img = new Image();
        img.onerror = () => reject(new Error(`Invalid image: ${file.name}`));
        img.onload = () => {
          resolve({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    soundManager.playClick();
    setStatusMessage(null);

    try {
      const loaded = await Promise.all(Array.from(files).map(loadImageDimensions));
      setImages((prev) => [...prev, ...loaded]);
      setPdfBlob(null);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleGenerateImagesPdf = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    setStatusMessage(null);
    soundManager.playClick();

    try {
      const blob = await generatePdfFromImages(images, pageSize);
      setPdfBlob(blob);
      setPdfName(`MediaHub_Images_${Date.now()}.pdf`);
      setStatusMessage({ type: 'success', text: getTranslation(lang, 'doc_pdf_ready') });
      soundManager.playSuccess();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTextPdf = () => {
    if (!pdfBody.trim() && !pdfTitle.trim()) return;
    soundManager.playClick();
    setStatusMessage(null);

    try {
      const blob = generatePdfFromText(pdfTitle, pdfBody);
      setPdfBlob(blob);
      const safeTitle = (pdfTitle.trim() || 'MediaHub_Text').replace(/[^a-zA-Z0-9_-]+/g, '_');
      setPdfName(`${safeTitle}.pdf`);
      setStatusMessage({ type: 'success', text: getTranslation(lang, 'doc_pdf_ready') });
      soundManager.playSuccess();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleConvertData = (direction: 'csv2json' | 'json2csv') => {
    soundManager.playClick();
    setStatusMessage(null);
    try {
      if (direction === 'csv2json') {
        setDataOutput(convertCsvToJson(dataInput));
        setDataOutputExt('json');
      } else {
        setDataOutput(convertJsonToCsv(dataInput));
        setDataOutputExt('csv');
      }
      soundManager.playSuccess();
    } catch {
      setStatusMessage({ type: 'error', text: getTranslation(lang, 'doc_invalid_data') });
    }
  };

  const handleCopyOutput = async () => {
    if (!dataOutput) return;
    soundManager.playClick();
    try {
      await navigator.clipboard.writeText(dataOutput);
      setStatusMessage({ type: 'success', text: getTranslation(lang, 'doc_copied') });
    } catch {
      // Fallback ignored if clipboard unavailable
    }
  };

  const handleDownloadData = () => {
    if (!dataOutput) return;
    soundManager.playClick();
    const mime = dataOutputExt === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
    const blob = new Blob([dataOutput], { type: mime });
    saveBlobAsFile(blob, `MediaHub_Converted_${Date.now()}.${dataOutputExt}`);
  };

  const handleShareData = async () => {
    if (!dataOutput) return;
    soundManager.playClick();
    const mime = dataOutputExt === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
    const blob = new Blob([dataOutput], { type: mime });
    const fileName = `MediaHub_Converted_${Date.now()}.${dataOutputExt}`;
    await shareOrSaveBlob(blob, fileName, fileName, 'Media Hub Document Converter');
  };

  const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

  return (
    <div className="space-y-4 pb-6">
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

      {/* Mode Switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => switchMode('img-to-pdf', true)}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === 'img-to-pdf'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ImagePlus className="w-3.5 h-3.5" />
          <span className="truncate">{getTranslation(lang, 'doc_tab_img_pdf')}</span>
        </button>
        <button
          type="button"
          onClick={() => switchMode('txt-to-pdf', true)}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === 'txt-to-pdf'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate">{getTranslation(lang, 'doc_tab_txt_pdf')}</span>
        </button>
        <button
          type="button"
          onClick={() => switchMode('csv-json', false)}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === 'csv-json'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span className="truncate">{getTranslation(lang, 'doc_tab_csv_json')}</span>
        </button>
      </div>

      {/* Mode 1: Images to PDF */}
      {mode === 'img-to-pdf' && (
        <div className="space-y-4 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleImagePick(e)}
            />
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
              <ImagePlus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              {getTranslation(lang, 'doc_img_upload')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getTranslation(lang, 'doc_img_hint')}
            </p>
          </div>

          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
                >
                  <img src={img.dataUrl} alt={img.name} className="w-full h-20 object-cover" />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-bold">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setImages((prev) => prev.filter((_, i) => i !== idx));
                      setPdfBlob(null);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <span className="block text-[9px] text-center text-slate-500 dark:text-slate-400 truncate px-1">
                    {img.width}x{img.height}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {getTranslation(lang, 'doc_page_size')}
            </span>
            <div className="flex gap-2">
              {(['a4', 'fit'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setPageSize(sz);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    pageSize === sz
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {getTranslation(lang, sz === 'a4' ? 'doc_page_a4' : 'doc_page_fit')}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={images.length === 0 || isGenerating}
            onClick={() => void handleGenerateImagesPdf()}
            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              images.length > 0 && !isGenerating
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <FileDown className="w-4 h-4" />
            <span>
              {isGenerating
                ? getTranslation(lang, 'doc_generating')
                : getTranslation(lang, 'doc_generate_pdf')}
            </span>
          </button>
        </div>
      )}

      {/* Mode 2: Text to PDF */}
      {mode === 'txt-to-pdf' && (
        <div className="space-y-4 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {getTranslation(lang, 'doc_pdf_title_label')}
            </label>
            <input
              type="text"
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
              placeholder={getTranslation(lang, 'doc_pdf_title_placeholder')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {getTranslation(lang, 'doc_pdf_body_label')}
            </label>
            <textarea
              rows={7}
              value={pdfBody}
              onChange={(e) => setPdfBody(e.target.value)}
              placeholder={getTranslation(lang, 'doc_pdf_body_placeholder')}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          <button
            type="button"
            disabled={!pdfBody.trim() && !pdfTitle.trim()}
            onClick={handleGenerateTextPdf}
            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              pdfBody.trim() || pdfTitle.trim()
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <FileDown className="w-4 h-4" />
            <span>{getTranslation(lang, 'doc_generate_pdf')}</span>
          </button>
        </div>
      )}

      {/* PDF Ready Output Card */}
      {pdfBlob && mode !== 'csv-json' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {pdfName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                PDF 1.4 • {formatKb(pdfBlob.size)}
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                saveBlobAsFile(pdfBlob, pdfName);
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>{getTranslation(lang, 'doc_btn_download_file')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                void shareOrSaveBlob(pdfBlob, pdfName, pdfName, 'PDF created with Media Hub Mobile');
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{getTranslation(lang, 'doc_btn_share_file')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: CSV <-> JSON */}
      {mode === 'csv-json' && (
        <div className="space-y-3 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {getTranslation(lang, 'doc_csv_input_label')}
            </label>
            <textarea
              rows={5}
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-sky-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleConvertData('csv2json')}
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              {getTranslation(lang, 'doc_btn_csv_to_json')}
            </button>
            <button
              type="button"
              onClick={() => handleConvertData('json2csv')}
              className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              {getTranslation(lang, 'doc_btn_json_to_csv')}
            </button>
          </div>

          {dataOutput && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {getTranslation(lang, 'doc_csv_output_label')} (.{dataOutputExt})
                </label>
                <button
                  type="button"
                  onClick={() => void handleCopyOutput()}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {getTranslation(lang, 'doc_btn_copy')}
                </button>
              </div>
              <textarea
                rows={6}
                readOnly
                value={dataOutput}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-emerald-300"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadData}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{getTranslation(lang, 'doc_btn_download_file')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareData()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{getTranslation(lang, 'doc_btn_share_file')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
