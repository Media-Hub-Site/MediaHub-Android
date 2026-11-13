import test from 'node:test';
import assert from 'node:assert/strict';

import { encodeBMPFromRgba } from '../src/utils/imageProcessor.ts';
import {
  createWavBlobFromSamples,
  generateBytebeatSamples,
  generateProceduralSfxSamples,
} from '../src/utils/wavExport.ts';
import {
  convertCsvToJson,
  convertJsonToCsv,
  generatePdfFromText,
} from '../src/utils/pdfGenerator.ts';
import { translations } from '../src/i18n/translations.ts';
import { APP_REGISTRY } from '../src/config/appRegistry.ts';

test('encodeBMPFromRgba writes valid 24-bit BMP header and padded pixel rows', () => {
  // 3x2 image -> rowStride = ((3*3 + 3) / 4 | 0) * 4 = 12 bytes/row -> total 54 + 24 = 78 bytes
  const rgba = new Uint8ClampedArray(3 * 2 * 4);
  // Top-left pixel (row 0, col 0) = pure red (R=255, G=0, B=0, A=255)
  rgba[0] = 255;
  rgba[1] = 0;
  rgba[2] = 0;
  rgba[3] = 255;

  const bmp = encodeBMPFromRgba(rgba, 3, 2);
  assert.equal(bmp.byteLength, 78);
  assert.equal(String.fromCharCode(bmp[0], bmp[1]), 'BM');

  const view = new DataView(bmp.buffer);
  assert.equal(view.getUint32(2, true), 78);
  assert.equal(view.getInt32(18, true), 3);
  assert.equal(view.getInt32(22, true), 2);
  assert.equal(view.getUint16(28, true), 24);

  // Bottom-up DIB: row 0 in file is image row 1; row 1 in file (offset 54 + 12 = 66) is image row 0
  assert.equal(bmp[66], 0);   // B
  assert.equal(bmp[67], 0);   // G
  assert.equal(bmp[68], 255); // R
});

test('createWavBlobFromSamples and Bytebeat/SFX generators produce valid 16-bit PCM WAV', async () => {
  const samples = generateBytebeatSamples('t * ((t >> 12 | t >> 8) & 63)', 8000, 1);
  assert.equal(samples.length, 8000);

  const wavBlob = createWavBlobFromSamples(samples, 8000);
  const bytes = new Uint8Array(await wavBlob.arrayBuffer());
  assert.equal(bytes.byteLength, 44 + 8000 * 2);
  assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), 'RIFF');
  assert.equal(String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]), 'WAVE');

  const sfxTypes = ['bubble', 'coin', 'laser', 'jump', 'explosion', 'bell'] as const;
  for (const sfx of sfxTypes) {
    const sfxSamples = generateProceduralSfxSamples(sfx, 22050);
    assert.ok(sfxSamples.length > 0, `Expected samples for SFX ${sfx}`);
    for (let i = 0; i < sfxSamples.length; i++) {
      assert.ok(sfxSamples[i] >= -1 && sfxSamples[i] <= 1, `Out of range sample for ${sfx}`);
    }
  }
});

test('generatePdfFromText produces valid PDF 1.4 structure and EOF marker', async () => {
  const blob = generatePdfFromText('MediaHub Report', 'Line 1\nLine 2\nHello Android!');
  const text = await blob.text();
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.includes('/Type /Catalog'));
  assert.ok(text.includes('/Type /Page'));
  assert.ok(text.includes('MediaHub Report'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
});

test('convertCsvToJson and convertJsonToCsv round-trip structured data', () => {
  const csv = 'app,category,active\nImageTools,media,true\nAudioLab,audio,true';
  const json = convertCsvToJson(csv);
  const parsed = JSON.parse(json) as Array<Record<string, string>>;
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].app, 'ImageTools');
  assert.equal(parsed[1].category, 'audio');

  const backToCsv = convertJsonToCsv(json);
  assert.equal(backToCsv, csv);
});

test('translations ES/EN keys match and APP_REGISTRY contains all 10 MediaHub modules', () => {
  const esKeys = Object.keys(translations.es).sort();
  const enKeys = Object.keys(translations.en).sort();
  assert.deepEqual(esKeys, enKeys);

  assert.equal(APP_REGISTRY.length, 10);
  const active = APP_REGISTRY.filter((a) => a.isAvailable);
  assert.equal(active.length, 3);
});
