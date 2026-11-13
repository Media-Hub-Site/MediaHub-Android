export type Language = 'es' | 'en';

export type AppView = 'hub' | 'image-tools' | 'audiolab' | 'document-converter';

export type AppCategory = 'all' | 'active' | 'media' | 'audio' | 'office' | 'security' | 'stream';

export interface AppRegistryItem {
  id: string;
  name_es: string;
  name_en: string;
  desc_es: string;
  desc_en: string;
  badge_es: string;
  badge_en: string;
  icon:
    | 'image'
    | 'audio'
    | 'docs'
    | 'media'
    | 'download'
    | 'subtitle'
    | 'wallet'
    | 'compass'
    | 'shield'
    | 'stream';
  isAvailable: boolean;
  view?: Exclude<AppView, 'hub'>;
  category: Exclude<AppCategory, 'all' | 'active'>;
}

export type ImageOutputMime = 'image/webp' | 'image/jpeg' | 'image/png' | 'image/bmp';

export type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

export interface ImageProcessingOptions {
  format: ImageOutputMime;
  quality: number; // 0.1 to 1.0
  scalePercent: number; // 25, 50, 75, 100, 150
  customWidth?: number;
  customHeight?: number;
  maintainAspectRatio: boolean;
  grayscale: boolean;
  invert: boolean;
  sepia: boolean;
  brightness: number; // 50 to 150
  contrast: number; // 50 to 150
  watermarkText: string;
  watermarkOpacity: number; // 0.1 to 1.0
  watermarkPosition: WatermarkPosition;
}

export interface ProcessedImageResult {
  id: string;
  originalName: string;
  originalSize: number;
  processedBlob: Blob;
  processedDataUrl: string;
  processedSize: number;
  width: number;
  height: number;
  formatExt: string;
}

export interface BytebeatPreset {
  id: string;
  name: string;
  author: string;
  formula: string;
  sampleRate: number;
  desc_es: string;
  desc_en: string;
}

export type VisualizerMode = 'waveform' | 'bars' | 'sweep';

export type SfxType = 'bubble' | 'coin' | 'laser' | 'jump' | 'explosion' | 'bell';

export type PdfPageSize = 'a4' | 'fit';

export type DocConversionMode = 'img-to-pdf' | 'txt-to-pdf' | 'csv-json';
