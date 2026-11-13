import type { SfxType } from '../types/index.ts';

/**
 * Converts audio sample data into a standard 16-bit PCM WAV Blob.
 */
export function createWavBlobFromSamples(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function compileBytebeatFormula(formula: string): (t: number) => number {
  const trimmed = formula.trim();
  if (!trimmed) {
    throw new Error('Empty formula');
  }
  const fn = new Function('t', `return (${trimmed}) | 0;`) as (t: number) => number;
  // Smoke-test t = 0 and t = 1 to fail early on syntax/reference errors
  void fn(0);
  void fn(1);
  return fn;
}

export function generateBytebeatSamples(
  formula: string,
  sampleRate: number,
  durationSec: number
): Float32Array {
  const compiled = compileBytebeatFormula(formula);
  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSec));
  const samples = new Float32Array(totalSamples);
  for (let t = 0; t < totalSamples; t++) {
    const raw = compiled(t) & 255;
    samples[t] = raw / 128.0 - 1.0;
  }
  return samples;
}

/**
 * Generates deterministic 16-bit ready PCM samples for procedural SFX so they can
 * both be inspected and exported/shared as standard WAV files.
 */
export function generateProceduralSfxSamples(type: SfxType, sampleRate: number = 44100): Float32Array {
  const durations: Record<SfxType, number> = {
    bubble: 0.18,
    coin: 0.36,
    laser: 0.22,
    jump: 0.2,
    explosion: 0.45,
    bell: 1.2,
  };

  const duration = durations[type];
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  let phase = 0;
  let lpState = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;
    let sample = 0;

    if (type === 'bubble') {
      const freq = 300 * Math.pow(1400 / 300, Math.min(1, t / 0.12));
      phase += (2 * Math.PI * freq) / sampleRate;
      const env = Math.max(0, 1 - progress);
      sample = Math.sin(phase) * env * 0.65;
    } else if (type === 'coin') {
      const freq = t < 0.08 ? 987.77 : 1318.51;
      phase += (2 * Math.PI * freq) / sampleRate;
      const env = Math.exp(-progress * 5);
      sample = (Math.sin(phase) >= 0 ? 1 : -1) * env * 0.4;
    } else if (type === 'laser') {
      const freq = 1800 * Math.pow(80 / 1800, progress);
      phase += (2 * Math.PI * freq) / sampleRate;
      const saw = ((phase / Math.PI) % 2) - 1;
      const env = Math.max(0, 1 - progress);
      sample = saw * env * 0.5;
    } else if (type === 'jump') {
      const freq = 150 + (600 - 150) * Math.min(1, t / 0.16);
      phase += (2 * Math.PI * freq) / sampleRate;
      const tri = 2 * Math.abs(((phase / Math.PI) % 2) - 1) - 1;
      const env = Math.max(0, 1 - progress);
      sample = tri * env * 0.55;
    } else if (type === 'bell') {
      const env = Math.exp(-t * 3.8);
      sample =
        (Math.sin(2 * Math.PI * 880 * t) * 0.6 +
          Math.sin(2 * Math.PI * 1760 * t) * 0.25 +
          Math.sin(2 * Math.PI * 2640 * t) * 0.1) *
        env;
    } else if (type === 'explosion') {
      // Deterministic PRNG noise with exponential low-pass decay
      const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const white = (x - Math.floor(x)) * 2 - 1;
      const cutoff = 0.08 + 0.35 * Math.max(0, 1 - progress);
      lpState = lpState + cutoff * (white - lpState);
      const env = Math.pow(Math.max(0, 1 - progress), 1.4);
      sample = lpState * env * 0.9;
    }

    samples[i] = Math.max(-1, Math.min(1, sample));
  }

  return samples;
}
