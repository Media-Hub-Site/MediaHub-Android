import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { BytebeatPreset, Language, SfxType, VisualizerMode } from '../types/index.ts';
import {
  compileBytebeatFormula,
  createWavBlobFromSamples,
  generateBytebeatSamples,
  generateProceduralSfxSamples,
} from '../utils/wavExport.ts';
import { getTranslation } from '../i18n/translations.ts';
import { soundManager } from '../services/sound.ts';
import { shareOrSaveBlob, saveBlobAsFile } from '../services/fileExport.ts';
import {
  Play,
  Square,
  Repeat,
  Volume2,
  Download,
  Share2,
  Sparkles,
  Activity,
  Code2,
  Zap,
  Sliders,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface AudioLabViewProps {
  lang: Language;
}

const BYTEBEAT_PRESETS: BytebeatPreset[] = [
  {
    id: 'classic42',
    name: 'Classic 42 (viznut)',
    author: 'viznut',
    formula: 't * (((t >> 12) | (t >> 8)) & (63 & (t >> 4)))',
    sampleRate: 8000,
    desc_es: 'Melodía algorítmica clásica de 8 bits.',
    desc_en: 'Classic 8-bit algorithmic chiptune melody.',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Arp',
    author: 'MediaHub',
    formula: '((t * ("36364689"[t >> 13 & 7] & 15)) / 12 & 128) + (((t >> 10 ^ t >> 12) % 11) * 12)',
    sampleRate: 11025,
    desc_es: 'Arpegio sintetizado futurista.',
    desc_en: 'Futuristic synthesized arpeggio.',
  },
  {
    id: 'techno',
    name: 'Techno Beat',
    author: 'kometbomb',
    formula: '(t * 5 & t >> 7) | (t * 3 & t >> 10)',
    sampleRate: 8000,
    desc_es: 'Bajo y percusión sintética rítmica.',
    desc_en: 'Rhythmic synthetic bass and percussion.',
  },
  {
    id: 'glitch',
    name: 'Glitch Machine',
    author: 'tejeez',
    formula: '(t >> 6 | t | t >> (t >> 16)) * 10 + ((t >> 11) & 7)',
    sampleRate: 8000,
    desc_es: 'Complejidad matemática glitchy.',
    desc_en: 'Glitchy microtonal mathematical texture.',
  },
  {
    id: 'space',
    name: 'Space Siren',
    author: 'MediaHub',
    formula: '(t * (t >> 8 | t >> 9) & 46 & t >> 8) ^ (t & t >> 13 | t >> 6)',
    sampleRate: 11025,
    desc_es: 'Efecto cósmico modulado en frecuencia.',
    desc_en: 'Frequency-modulated cosmic sweep.',
  },
];

export const AudioLabView: React.FC<AudioLabViewProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'bytebeat' | 'sfx'>('bytebeat');
  const [currentFormula, setCurrentFormula] = useState(BYTEBEAT_PRESETS[0].formula);
  const [sampleRate, setSampleRate] = useState<number>(8000);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(false);
  const [exportDuration, setExportDuration] = useState<number>(6);
  const [volume, setVolume] = useState<number>(0.5);
  const [vizMode, setVizMode] = useState<VisualizerMode>('waveform');
  const [zoom, setZoom] = useState<number>(1);
  const [lastSfx, setLastSfx] = useState<SfxType>('bubble');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isInfiniteRef = useRef<boolean>(isInfiniteLoop);
  const exportDurationRef = useRef<number>(exportDuration);
  const vizModeRef = useRef<VisualizerMode>(vizMode);
  const zoomRef = useRef<number>(zoom);
  const sweepColumnRef = useRef<number>(0);

  useEffect(() => {
    isInfiniteRef.current = isInfiniteLoop;
    exportDurationRef.current = exportDuration;
    vizModeRef.current = vizMode;
    zoomRef.current = zoom;
  }, [isInfiniteLoop, exportDuration, vizMode, zoom]);

  const ensureAudioGraph = useCallback((): { ctx: AudioContext; analyser: AnalyserNode } => {
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    }
    return { ctx, analyser: analyserRef.current };
  }, []);

  const stopAudio = useCallback(() => {
    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current.onaudioprocess = null;
      scriptNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playBytebeat = () => {
    soundManager.playClick();
    setErrorMsg(null);
    if (isPlaying) {
      stopAudio();
      return;
    }

    try {
      const compiledFunc = compileBytebeatFormula(currentFormula);
      const { ctx, analyser } = ensureAudioGraph();
      const bufferSize = 2048;
      const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
      const gainNode = ctx.createGain();

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNodeRef.current = gainNode;

      const playbackSpeedRatio = sampleRate / ctx.sampleRate;
      let virtualT = 0;

      scriptNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          try {
            const rawVal = compiledFunc(Math.floor(virtualT)) & 255;
            output[i] = rawVal / 128.0 - 1.0;
          } catch {
            output[i] = 0;
          }
          virtualT += playbackSpeedRatio;
        }

        if (!isInfiniteRef.current && virtualT >= sampleRate * exportDurationRef.current) {
          stopAudio();
        }
      };

      scriptNode.connect(gainNode);
      gainNode.connect(analyser);
      scriptNodeRef.current = scriptNode;
      setIsPlaying(true);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(`${getTranslation(lang, 'audio_formula_error')}: ${detail}`);
    }
  };

  // Real-time AnalyserNode canvas renderer (Waveform / FFT Bars / Continuous Sweep)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    let running = true;
    let rafId = 0;
    const timeData = new Uint8Array(1024);
    const freqData = new Uint8Array(512);

    const render = () => {
      if (!running) return;
      const width = canvas.width;
      const height = canvas.height;
      const mode = vizModeRef.current;
      const analyser = analyserRef.current;

      if (mode === 'sweep') {
        // Scroll canvas left by 2px and paint newest peak column on the right
        ctx2d.drawImage(canvas, -2, 0);
        ctx2d.fillStyle = '#070d1a';
        ctx2d.fillRect(width - 2, 0, 2, height);

        let peak = 0;
        if (analyser) {
          analyser.getByteTimeDomainData(timeData);
          for (let i = 0; i < timeData.length; i++) {
            const v = Math.abs((timeData[i] - 128) / 128);
            if (v > peak) peak = v;
          }
        }
        const barH = Math.max(2, peak * height * 0.9 * zoomRef.current);
        const yTop = (height - barH) / 2;
        ctx2d.fillStyle = peak > 0.05 ? '#38bdf8' : '#1e293b';
        ctx2d.fillRect(width - 2, yTop, 2, barH);
        sweepColumnRef.current = (sweepColumnRef.current + 1) % width;
      } else {
        ctx2d.fillStyle = 'rgba(7, 13, 26, 0.45)';
        ctx2d.fillRect(0, 0, width, height);

        ctx2d.strokeStyle = 'rgba(30, 41, 59, 0.7)';
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.moveTo(0, height / 2);
        ctx2d.lineTo(width, height / 2);
        ctx2d.stroke();

        if (mode === 'bars') {
          if (analyser) {
            analyser.getByteFrequencyData(freqData);
          } else {
            freqData.fill(0);
          }
          const barCount = 48;
          const step = Math.floor(freqData.length / barCount);
          const barWidth = width / barCount;
          for (let i = 0; i < barCount; i++) {
            const val = freqData[i * step] / 255;
            const barHeight = Math.max(3, val * height * 0.85);
            const hue = 195 + (i / barCount) * 60;
            ctx2d.fillStyle = `hsl(${hue}, 85%, 58%)`;
            ctx2d.fillRect(i * barWidth + 1, height - barHeight, barWidth - 3, barHeight);
          }
        } else {
          if (analyser) {
            analyser.getByteTimeDomainData(timeData);
          } else {
            timeData.fill(128);
          }
          const sampleWindow = Math.max(64, Math.floor(timeData.length / zoomRef.current));
          ctx2d.strokeStyle = '#38bdf8';
          ctx2d.shadowColor = '#0284c7';
          ctx2d.shadowBlur = 8;
          ctx2d.lineWidth = 2.2;
          ctx2d.beginPath();

          const sliceWidth = width / sampleWindow;
          let x = 0;
          for (let i = 0; i < sampleWindow; i++) {
            const norm = (timeData[i] - 128) / 128.0;
            const y = norm * (height / 2.4) + height / 2;
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
            x += sliceWidth;
          }
          ctx2d.stroke();
          ctx2d.shadowBlur = 0;
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const playProceduralSFX = (type: SfxType) => {
    soundManager.triggerHaptic();
    setLastSfx(type);
    setErrorMsg(null);
    const { ctx, analyser } = ensureAudioGraph();
    const samples = generateProceduralSfxSamples(type, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    source.connect(gain);
    gain.connect(analyser);
    source.start();
  };

  const handleExportBytebeatWav = async (andShare: boolean) => {
    if (isInfiniteLoop) return;
    soundManager.playClick();
    setErrorMsg(null);

    try {
      const samples = generateBytebeatSamples(currentFormula, sampleRate, exportDuration);
      const blob = createWavBlobFromSamples(samples, sampleRate);
      const fileName = `AudioLab_Bytebeat_${Date.now()}.wav`;

      if (andShare) {
        await shareOrSaveBlob(blob, fileName, fileName, 'AudioLab Bytebeat WAV');
      } else {
        saveBlobAsFile(blob, fileName);
      }
      soundManager.playSuccess();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(`${getTranslation(lang, 'audio_formula_error')}: ${detail}`);
    }
  };

  const handleExportSfxWav = async (andShare: boolean) => {
    soundManager.playClick();
    const sfxRate = 44100;
    const samples = generateProceduralSfxSamples(lastSfx, sfxRate);
    const blob = createWavBlobFromSamples(samples, sfxRate);
    const fileName = `AudioLab_SFX_${lastSfx}_${Date.now()}.wav`;
    if (andShare) {
      await shareOrSaveBlob(blob, fileName, fileName, `AudioLab SFX (${lastSfx})`);
    } else {
      saveBlobAsFile(blob, fileName);
    }
    soundManager.playSuccess();
  };

  return (
    <div className="space-y-4 pb-6">
      {errorMsg && (
        <div className="rounded-2xl px-4 py-3 text-xs font-medium flex items-center gap-2 border bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Real-time Analyzer Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-[#070d1a] shadow-inner">
        <canvas ref={canvasRef} width={600} height={170} className="w-full h-40 object-contain block" />
        <div className="absolute top-2.5 left-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-widest">
            {getTranslation(lang, 'audio_oscilloscope')}
          </span>
        </div>
        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-400">
          {sampleRate} Hz • 16-bit PCM
        </div>
      </div>

      {/* Visualizer Mode + Zoom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'waveform', key: 'audio_viz_waveform' },
              { id: 'bars', key: 'audio_viz_bars' },
              { id: 'sweep', key: 'audio_viz_sweep' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setVizMode(mode.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                vizMode === mode.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {getTranslation(lang, mode.key)}
            </button>
          ))}
        </div>

        {vizMode !== 'bars' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
              {getTranslation(lang, 'audio_zoom')}:
            </span>
            {[1, 2, 4].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setZoom(z);
                }}
                className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold ${
                  zoom === z
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('bytebeat');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'bytebeat'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>{getTranslation(lang, 'audio_bytebeat_tab')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('sfx');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'sfx'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{getTranslation(lang, 'audio_sfx_tab')}</span>
        </button>
      </div>

      {/* Bytebeat View */}
      {activeTab === 'bytebeat' && (
        <div className="space-y-4 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Presets Grid */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              {getTranslation(lang, 'audio_presets')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {BYTEBEAT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    stopAudio();
                    setErrorMsg(null);
                    setCurrentFormula(p.formula);
                    setSampleRate(p.sampleRate);
                  }}
                  title={lang === 'es' ? p.desc_es : p.desc_en}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    currentFormula === p.formula
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {p.sampleRate} Hz
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Formula Editor */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              {getTranslation(lang, 'audio_formula_label')}
            </label>
            <textarea
              rows={3}
              value={currentFormula}
              onChange={(e) => {
                setCurrentFormula(e.target.value);
                if (isPlaying) stopAudio();
              }}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-sky-300 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed resize-none shadow-inner"
            />
          </div>

          {/* Sample Rate Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {getTranslation(lang, 'audio_sample_rate')}
            </div>
            <div className="flex gap-1.5">
              {[8000, 11025, 22050, 44100].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setSampleRate(rate);
                    if (isPlaying) stopAudio();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    sampleRate === rate
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {rate < 10000 ? `${rate / 1000}k` : `${Math.round(rate / 1000)}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Volume, Duration and Infinite Loop Controls */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs">
                <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-9">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsInfiniteLoop(!isInfiniteLoop);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  isInfiniteLoop
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{getTranslation(lang, 'audio_infinite_loop')}</span>
              </button>
            </div>

            {!isInfiniteLoop ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {getTranslation(lang, 'audio_duration')}
                </span>
                <div className="flex gap-1.5">
                  {[3, 6, 10, 15].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setExportDuration(sec);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        exportDuration === sec
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{getTranslation(lang, 'audio_infinite_lock_hint')}</span>
              </div>
            )}
          </div>

          {/* Main Playback and Export Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={playBytebeat}
              className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>
                {isPlaying
                  ? getTranslation(lang, 'audio_btn_stop')
                  : getTranslation(lang, 'audio_btn_play')}
              </span>
            </button>

            <button
              type="button"
              disabled={isInfiniteLoop}
              onClick={() => void handleExportBytebeatWav(false)}
              className={`py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                isInfiniteLoop
                  ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95'
              }`}
            >
              <Download className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>{getTranslation(lang, 'audio_btn_export_wav')}</span>
            </button>

            <button
              type="button"
              disabled={isInfiniteLoop}
              onClick={() => void handleExportBytebeatWav(true)}
              className={`py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                isInfiniteLoop
                  ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95'
              }`}
            >
              <Share2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>{getTranslation(lang, 'audio_btn_share_wav')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Procedural SFX View */}
      {activeTab === 'sfx' && (
        <div className="space-y-4 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {getTranslation(lang, 'audio_sfx_hint')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(
              [
                { id: 'bubble', name: getTranslation(lang, 'audio_sfx_bubble'), color: 'from-cyan-600 to-blue-600' },
                { id: 'coin', name: getTranslation(lang, 'audio_sfx_coin'), color: 'from-amber-500 to-yellow-600' },
                { id: 'laser', name: getTranslation(lang, 'audio_sfx_laser'), color: 'from-pink-600 to-rose-600' },
                { id: 'jump', name: getTranslation(lang, 'audio_sfx_jump'), color: 'from-emerald-600 to-teal-600' },
                { id: 'explosion', name: getTranslation(lang, 'audio_sfx_explosion'), color: 'from-orange-600 to-red-600' },
                { id: 'bell', name: getTranslation(lang, 'audio_sfx_bell'), color: 'from-violet-600 to-purple-600' },
              ] as const
            ).map((sfx) => (
              <button
                key={sfx.id}
                type="button"
                onClick={() => playProceduralSFX(sfx.id)}
                className={`p-4 rounded-2xl bg-gradient-to-br ${sfx.color} text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${
                  lastSfx === sfx.id ? 'ring-2 ring-white/80 dark:ring-sky-300' : ''
                }`}
              >
                <Zap className="w-5 h-5 text-white/90" />
                <span>{sfx.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {getTranslation(lang, 'audio_sfx_export_selected')}:{' '}
              <span className="uppercase text-indigo-600 dark:text-indigo-400 font-mono">
                {lastSfx}
              </span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleExportSfxWav(false)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-sky-500" />
                <span>{getTranslation(lang, 'audio_btn_export_wav')}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExportSfxWav(true)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{getTranslation(lang, 'audio_btn_share_wav')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
