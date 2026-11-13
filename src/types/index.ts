export type Language = 'es' | 'en';

export type AppView = 'hub' | 'image-tools' | 'audiolab';

export interface AppRegistryItem {
  id: string;
  name_es: string;
  name_en: string;
  desc_es: string;
  desc_en: string;
  badge_es: string;
  badge_en: string;
  icon: string;
  isAvailable: boolean;
  view?: AppView;
  category: 'media' | 'audio' | 'office' | 'security' | 'stream';
}

export interface ImageProcessingOptions {
  format: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/bmp';
  quality: number; // 0.1 to 1.0
  scalePercent: number; // 25, 50, 75, 100, 150, 200
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
  watermarkPosition: 'bottom-right' | 'bottom-left' | 'center' | 'top-right';
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
  description: string;
}

