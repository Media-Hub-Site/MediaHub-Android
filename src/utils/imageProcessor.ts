import type { ImageProcessingOptions, ProcessedImageResult } from '../types/index.ts';

/**
 * Encodes raw RGBA pixel buffer into a true uncompressed 24-bit Windows BMP Blob.
 * Rows are stored bottom-up and padded to 4-byte boundaries per BMP spec.
 */
export function encodeBMPFromRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const rowStride = Math.floor((width * 3 + 3) / 4) * 4;
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // BITMAPFILEHEADER (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true); // pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = bottom-up DIB
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // 24-bit BGR
  view.setUint32(30, 0, true); // BI_RGB (no compression)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // 72 DPI horizontal
  view.setInt32(42, 2835, true); // 72 DPI vertical
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    const dstRowOffset = 54 + y * rowStride;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 4;
      const dstIdx = dstRowOffset + x * 3;
      const alpha = rgba[srcIdx + 3] / 255;
      // Blend transparent pixels onto white background
      const r = Math.round(rgba[srcIdx] * alpha + 255 * (1 - alpha));
      const g = Math.round(rgba[srcIdx + 1] * alpha + 255 * (1 - alpha));
      const b = Math.round(rgba[srcIdx + 2] * alpha + 255 * (1 - alpha));
      bytes[dstIdx] = b;
      bytes[dstIdx + 1] = g;
      bytes[dstIdx + 2] = r;
    }
  }

  return bytes;
}

export function encodeBMPFromImageData(imageData: ImageData): Blob {
  const bytes = encodeBMPFromRgba(imageData.data, imageData.width, imageData.height);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'image/bmp' });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to encode output data URL.'));
    reader.readAsDataURL(blob);
  });
}

export async function processImage(
  file: File,
  options: ImageProcessingOptions
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado o archivo dañado.'));
      img.onload = () => {
        try {
          let targetWidth = img.naturalWidth;
          let targetHeight = img.naturalHeight;

          if (options.scalePercent && options.scalePercent !== 100) {
            const factor = options.scalePercent / 100;
            targetWidth = Math.round(targetWidth * factor);
            targetHeight = Math.round(targetHeight * factor);
          }

          if (options.customWidth && options.customWidth > 0) {
            targetWidth = options.customWidth;
            if (options.maintainAspectRatio) {
              targetHeight = Math.round((targetWidth / img.naturalWidth) * img.naturalHeight);
            }
          }

          if (options.customHeight && options.customHeight > 0 && !options.maintainAspectRatio) {
            targetHeight = options.customHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, targetWidth);
          canvas.height = Math.max(1, targetHeight);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('No se pudo inicializar el contexto 2D de procesamiento.'));
          }

          const filters: string[] = [];
          if (options.grayscale) filters.push('grayscale(100%)');
          if (options.invert) filters.push('invert(100%)');
          if (options.sepia) filters.push('sepia(100%)');
          if (options.brightness !== 100) filters.push(`brightness(${options.brightness}%)`);
          if (options.contrast !== 100) filters.push(`contrast(${options.contrast}%)`);

          ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

          if (options.format === 'image/jpeg' || options.format === 'image/bmp') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';

          if (options.watermarkText && options.watermarkText.trim()) {
            const text = options.watermarkText.trim();
            const fontSize = Math.max(14, Math.round(canvas.width * 0.04));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = `rgba(255, 255, 255, ${options.watermarkOpacity})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${Math.min(1, options.watermarkOpacity * 0.85)})`;
            ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.08));

            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const margin = fontSize;

            let x = canvas.width - textWidth - margin;
            let y = canvas.height - margin;

            if (options.watermarkPosition === 'bottom-left') {
              x = margin;
              y = canvas.height - margin;
            } else if (options.watermarkPosition === 'top-right') {
              x = canvas.width - textWidth - margin;
              y = margin + fontSize;
            } else if (options.watermarkPosition === 'top-left') {
              x = margin;
              y = margin + fontSize;
            } else if (options.watermarkPosition === 'center') {
              x = (canvas.width - textWidth) / 2;
              y = (canvas.height + fontSize) / 2;
            }

            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
          }

          if (options.format === 'image/bmp') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const bmpBlob = encodeBMPFromImageData(imageData);
            void blobToDataUrl(bmpBlob)
              .then((processedDataUrl) => {
                resolve({
                  id: Math.random().toString(36).substring(2, 9),
                  originalName: file.name,
                  originalSize: file.size,
                  processedBlob: bmpBlob,
                  processedDataUrl,
                  processedSize: bmpBlob.size,
                  width: canvas.width,
                  height: canvas.height,
                  formatExt: 'bmp',
                });
              })
              .catch(reject);
            return;
          }

          const formatMime = options.format;
          let ext = 'jpg';
          if (formatMime === 'image/png') ext = 'png';
          else if (formatMime === 'image/webp') ext = 'webp';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Fallo al generar el archivo final.'));
              }
              void blobToDataUrl(blob)
                .then((processedDataUrl) => {
                  resolve({
                    id: Math.random().toString(36).substring(2, 9),
                    originalName: file.name,
                    originalSize: file.size,
                    processedBlob: blob,
                    processedDataUrl,
                    processedSize: blob.size,
                    width: canvas.width,
                    height: canvas.height,
                    formatExt: ext,
                  });
                })
                .catch(reject);
            },
            formatMime,
            options.quality
          );
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
