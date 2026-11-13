import type { ImageProcessingOptions, ProcessedImageResult } from '../types';

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

          // Apply scale percentage if custom dimensions are not specified
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

          // Build filter string
          const filters: string[] = [];
          if (options.grayscale) filters.push('grayscale(100%)');
          if (options.invert) filters.push('invert(100%)');
          if (options.sepia) filters.push('sepia(100%)');
          if (options.brightness !== 100) filters.push(`brightness(${options.brightness}%)`);
          if (options.contrast !== 100) filters.push(`contrast(${options.contrast}%)`);

          ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

          // For JPEG or BMP, fill white background if transparency was present
          if (options.format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Reset filter for watermark
          ctx.filter = 'none';

          // Apply text watermark if provided
          if (options.watermarkText && options.watermarkText.trim()) {
            const text = options.watermarkText.trim();
            const fontSize = Math.max(14, Math.round(canvas.width * 0.04));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = `rgba(255, 255, 255, ${options.watermarkOpacity})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${options.watermarkOpacity * 0.8})`;
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
            } else if (options.watermarkPosition === 'center') {
              x = (canvas.width - textWidth) / 2;
              y = (canvas.height + fontSize) / 2;
            }

            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
          }

          const formatMime = options.format;
          let ext = 'jpg';
          if (formatMime === 'image/png') ext = 'png';
          else if (formatMime === 'image/webp') ext = 'webp';
          else if (formatMime === 'image/bmp') ext = 'bmp';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Fallo al generar el archivo final.'));
              }
              const processedDataUrl = canvas.toDataURL(formatMime, options.quality);
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
