import type { PdfPageSize } from '../types/index.ts';

export interface PdfImageInput {
  dataUrl: string;
  width: number;
  height: number;
}

const encoder = new TextEncoder();

function toPdfAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, ' ');
}

function escapePdfText(str: string): string {
  return toPdfAscii(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function dataUrlToJpegBytes(
  dataUrl: string,
  width: number,
  height: number
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para el PDF.'));
    img.onload = () => {
      const w = Math.max(1, img.naturalWidth || width);
      const h = Math.max(1, img.naturalHeight || height);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('No se pudo crear el contexto para el PDF.'));
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const jpegUrl = canvas.toDataURL('image/jpeg', 0.9);
      const base64Part = jpegUrl.split(',')[1] || '';
      resolve({ bytes: base64ToUint8Array(base64Part), width: w, height: h });
    };
    img.src = dataUrl;
  });
}

function buildPdfDocument(objects: (string | Uint8Array)[]): Blob {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let totalBytes = 0;

  const pushBytes = (arr: Uint8Array) => {
    chunks.push(arr);
    totalBytes += arr.byteLength;
  };

  const pushText = (text: string) => {
    pushBytes(encoder.encode(text));
  };

  pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  for (let i = 0; i < objects.length; i++) {
    offsets.push(totalBytes);
    const objNum = i + 1;
    pushText(`${objNum} 0 obj\n`);
    const item = objects[i];
    if (typeof item === 'string') {
      pushText(item);
      if (!item.endsWith('\n')) pushText('\n');
    } else {
      pushBytes(item);
      pushText('\n');
    }
    pushText('endobj\n');
  }

  const xrefOffset = totalBytes;
  pushText(`xref\n0 ${objects.length + 1}\n`);
  pushText('0000000000 65535 f \n');
  for (let i = 1; i <= objects.length; i++) {
    pushText(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const merged = new Uint8Array(totalBytes);
  let pos = 0;
  for (const chunk of chunks) {
    merged.set(chunk, pos);
    pos += chunk.byteLength;
  }

  return new Blob([merged.buffer], { type: 'application/pdf' });
}

/**
 * Assembles a multi-page PDF 1.4 document from an array of images using DCTDecode (JPEG).
 */
export async function generatePdfFromImages(
  images: PdfImageInput[],
  pageSize: PdfPageSize = 'a4'
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error('No images provided for PDF generation.');
  }

  const decoded = await Promise.all(
    images.map((item) => dataUrlToJpegBytes(item.dataUrl, item.width, item.height))
  );

  // Object 1: Catalog, Object 2: Pages
  const objects: (string | Uint8Array)[] = ['', ''];
  const pageRefs: string[] = [];

  for (let i = 0; i < decoded.length; i++) {
    const img = decoded[i];
    const pageObjId = objects.length + 1;
    const contentObjId = objects.length + 2;
    const imageObjId = objects.length + 3;
    const imageName = `/Im${i + 1}`;

    let pageW = 595.28; // A4 width pt
    let pageH = 841.89; // A4 height pt
    let drawW = img.width;
    let drawH = img.height;
    let drawX = 0;
    let drawY = 0;

    if (pageSize === 'fit') {
      pageW = img.width;
      pageH = img.height;
    } else {
      const margin = 24;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const ratio = Math.min(availW / img.width, availH / img.height);
      drawW = img.width * ratio;
      drawH = img.height * ratio;
      drawX = (pageW - drawW) / 2;
      drawY = (pageH - drawH) / 2;
    }

    const streamContent = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n${imageName} Do\nQ\n`;

    const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << ${imageName} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`;
    const contentObj = `<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream`;

    const imgHeader = encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.byteLength} >>\nstream\n`
    );
    const imgFooter = encoder.encode('\nendstream');
    const imgObj = new Uint8Array(imgHeader.byteLength + img.bytes.byteLength + imgFooter.byteLength);
    imgObj.set(imgHeader, 0);
    imgObj.set(img.bytes, imgHeader.byteLength);
    imgObj.set(imgFooter, imgHeader.byteLength + img.bytes.byteLength);

    objects.push(pageObj, contentObj, imgObj);
    pageRefs.push(`${pageObjId} 0 R`);
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  return buildPdfDocument(objects);
}

function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= maxCharsPerLine) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Generates a paginated A4 PDF 1.4 document from plain text and an optional title.
 */
export function generatePdfFromText(title: string, content: string): Blob {
  const lines = wrapTextLines(content, 82);
  const linesPerPage = 46;
  const pageChunks: string[][] = [];

  for (let i = 0; i < lines.length; i += linesPerPage) {
    pageChunks.push(lines.slice(i, i + linesPerPage));
  }

  // Object 1: Catalog, Object 2: Pages, Object 3: Standard Helvetica Font
  const objects: (string | Uint8Array)[] = [
    '',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const pageRefs: string[] = [];

  pageChunks.forEach((chunk, pageIndex) => {
    const pageObjId = objects.length + 1;
    const contentObjId = objects.length + 2;

    const commands: string[] = ['BT'];
    let y = 785;

    if (pageIndex === 0 && title.trim()) {
      commands.push('/F1 16 Tf');
      commands.push(`1 0 0 1 52 ${y} Tm`);
      commands.push(`(${escapePdfText(title.trim())}) Tj`);
      y -= 28;
    }

    commands.push('/F1 11 Tf');
    for (const line of chunk) {
      commands.push(`1 0 0 1 52 ${y} Tm`);
      commands.push(`(${escapePdfText(line)}) Tj`);
      y -= 15;
    }
    commands.push('ET');

    const streamStr = commands.join('\n');
    const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjId} 0 R >>`;
    const contentObj = `<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream`;

    objects.push(pageObj, contentObj);
    pageRefs.push(`${pageObjId} 0 R`);
  });

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  return buildPdfDocument(objects);
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function convertCsvToJson(csvText: string): string {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h || `col_${idx + 1}`] = cols[idx] ?? '';
    });
    return obj;
  });

  return JSON.stringify(rows, null, 2);
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function convertJsonToCsv(jsonText: string): string {
  const parsed: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('JSON must be a non-empty array of objects.');
  }

  const headersSet = new Set<string>();
  for (const row of parsed) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('Each JSON element must be an object.');
    }
    Object.keys(row).forEach((k) => headersSet.add(k));
  }

  const headers = Array.from(headersSet);
  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const row of parsed) {
    const rec = row as Record<string, unknown>;
    lines.push(headers.map((h) => escapeCsvCell(rec[h])).join(','));
  }

  return lines.join('\n');
}
