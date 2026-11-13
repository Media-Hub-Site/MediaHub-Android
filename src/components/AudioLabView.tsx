import React, { useState, useEffect, useRef } from 'react';
import type { BytebeatPreset, Language } from '../types';
import { createWavBlobFromSamples } from '../utils/wavExport';
import { getTranslation } from '../i18n/translations';
import { soundManager } from '../utils/sound';
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
  Sliders
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
    description: 'La melodía algorítmica clásica de 8 bits más famosa del mundo.',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Arp',
    author: 'MediaHub',
    formula: '((t * ("36364689"[t >> 13 & 7] & 15)) / 12 & 128) + (((t >> 10 ^ t >> 12) % 11) * 12)',
    sampleRate: 11025,
    description: 'Arpegio sintetizado futurista con ritmo sincopado.',
  },
  {
    id: 'techno',
    name: 'Techno Beat',
    author: 'kometbomb',
    formula: '(t * 5 & t >> 7) | (t * 3 & t >> 10)',
    sampleRate: 8000,
    description: 'Bajo y percusión sintética rítmica de club electrónico.',
  },
  {
    id: 'glitch',
    name: 'Glitch Machine',
    author: 'tejeez',
    formula: '(t >> 6 | t | t >> (t >> 16)) * 10 + ((t >> 11) & 7)',
    sampleRate: 8000,
    description: 'Complejidad matemática glitchy y microtonal.',
  },
  {
    id: 'space',
    name: 'Space Siren',
    author: 'MediaHub',
    formula: '(t * (t >> 8 | t >> 9) & 46 & t >> 8) ^ (t & t >> 13 | t >> 6)',
    sampleRate: 11025,
    description: 'Efecto cósmico envolvente modulado en frecuencia.',
  },
];

export const AudioLabView: React.FC<AudioLabViewProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'bytebeat' | 'sfx'>('bytebeat');
  const [currentFormula, setCurrentFormula] = useState(BYTEBEAT_PRESETS[0].formula);
  const [sampleRate, setSampleRate] = useState<number>(8000);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.5);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const tRef = useRef<number>(0);
  const waveDataRef = useRef<number[]>(new Array(128).fill(0));
  const animationFrameRef = useRef<number | null>(null);

  // Initialize or resume audio context
  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const stopAudio = () => {
    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    setIsPlaying(false);
    tRef.current = 0;
  };

  const playBytebeat = () => {
    soundManager.playClick();
    if (isPlaying) {
      stopAudio();
      return;
    }

    try {
      const ctx = getAudioContext();
      const bufferSize = 2048;
      const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
      const gainNode = ctx.createGain();

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNodeRef.current = gainNode;

      // Compile formula safely
      const compiledFunc = new Function('t', `return (${currentFormula}) | 0;`);

      const playbackSpeedRatio = sampleRate / ctx.sampleRate;
      let virtualT = 0;

      scriptNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        const wave = [];

        for (let i = 0; i < bufferSize; i++) {
          try {
            const rawVal = compiledFunc(Math.floor(virtualT)) & 255;
            // Map 0..255 to -1.0 .. 1.0
            const floatVal = (rawVal / 128.0) - 1.0;
            output[i] = floatVal;

            if (i % 16 === 0) {
              wave.push(floatVal);
            }
          } catch {
            output[i] = 0;
          }
          virtualT += playbackSpeedRatio;
        }

        if (wave.length > 0) {
          waveDataRef.current = wave;
        }

        if (!isLooping && virtualT > sampleRate * 10) {
          stopAudio();
        }
      };

      scriptNode.connect(gainNode);
      gainNode.connect(ctx.destination);
      scriptNodeRef.current = scriptNode;

      setIsPlaying(true);
    } catch (err) {
      alert(`Error en la fórmula: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Real-time canvas oscilloscope renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const width = canvas.width;
      const height = canvas.height;

      // Dark translucent background for phosphor trail
      ctx.fillStyle = 'rgba(11, 17, 32, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Grid line
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Oscilloscope line
      const wave = waveDataRef.current;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const sliceWidth = width / wave.length;
      let x = 0;

      for (let i = 0; i < wave.length; i++) {
        const v = wave[i];
        const y = (v * (height / 2.6)) + (height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Procedural SFX generator triggers
  const playProceduralSFX = (type: string) => {
    soundManager.triggerHaptic();
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'bubble') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
      gain.gain.setValueAtTime(0.4 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'coin') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.25 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(0.3 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } else if (type === 'jump') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.16);
      gain.gain.setValueAtTime(0.3 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (type === 'bell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.4 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    } else if (type === 'explosion') {
      // Noise buffer for explosion
      const bufferSize = ctx.sampleRate * 0.4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.35);

      gain.gain.setValueAtTime(0.6 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + 0.42);
    }

    // Push simulated wave
    waveDataRef.current = new Array(128).fill(0).map(() => (Math.random() * 2 - 1) * 0.7);
  };

  // Export 5-second synthesized WAV file
  const handleExportWav = async (andShare = false) => {
    soundManager.playClick();
    const durationSec = 6;
    const totalSamples = sampleRate * durationSec;
    const samples = new Float32Array(totalSamples);

    try {
      const compiledFunc = new Function('t', `return (${currentFormula}) | 0;`);
      for (let t = 0; t < totalSamples; t++) {
        const raw = compiledFunc(t) & 255;
        samples[t] = (raw / 128.0) - 1.0;
      }

      const blob = createWavBlobFromSamples(samples, sampleRate);
      const fileName = `AudioLab_Bytebeat_${Date.now()}.wav`;

      if (andShare) {
        const file = new File([blob], fileName, { type: 'audio/wav' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: 'Audio sintetizado con AudioLab Mobile (Media Hub)',
          });
          soundManager.playSuccess();
          return;
        }
      }

      // Download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      soundManager.playSuccess();
    } catch (err) {
      alert(`Error al exportar audio WAV: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Oscilloscope Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-36 object-contain block"
        />
        <div className="absolute top-2.5 left-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-widest">
            {getTranslation(lang, 'audio_oscilloscope')}
          </span>
        </div>
        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-500">
          {sampleRate} Hz • 1-CH PCM
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('bytebeat');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'bytebeat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>{getTranslation(lang, 'audio_bytebeat_tab')}</span>
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('sfx');
          }}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'sfx' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{getTranslation(lang, 'audio_sfx_tab')}</span>
        </button>
      </div>

      {/* Bytebeat View */}
      {activeTab === 'bytebeat' && (
        <div className="space-y-4 bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800">
          {/* Presets Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {getTranslation(lang, 'audio_presets')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {BYTEBEAT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    soundManager.playClick();
                    stopAudio();
                    setCurrentFormula(p.formula);
                    setSampleRate(p.sampleRate);
                  }}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    currentFormula === p.formula
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-400'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{p.sampleRate} Hz</div>
                </button>
              ))}
            </div>
          </div>

          {/* Formula Editor */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
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
            <div className="text-xs font-bold text-slate-300">
              {getTranslation(lang, 'audio_sample_rate')}
            </div>
            <div className="flex gap-1.5">
              {[8000, 11025, 22050, 44100].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    soundManager.playClick();
                    setSampleRate(rate);
                    if (isPlaying) stopAudio();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    sampleRate === rate
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate < 10000 ? `${rate / 1000}k` : `${Math.round(rate / 1000)}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Volume and Loop Controls */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-400 w-8">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                setIsLooping(!isLooping);
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isLooping
                  ? 'bg-indigo-600/20 border border-indigo-500 text-indigo-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title="Bucle infinito"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{getTranslation(lang, 'audio_infinite_loop')}</span>
            </button>
          </div>

          {/* Main Playback and Export Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
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
              onClick={() => handleExportWav(false)}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>{getTranslation(lang, 'audio_btn_export_wav')}</span>
            </button>

            <button
              onClick={() => handleExportWav(true)}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span>{getTranslation(lang, 'audio_btn_share_wav')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Procedural SFX View */}
      {activeTab === 'sfx' && (
        <div className="space-y-4 bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800">
          <p className="text-xs text-slate-400 leading-relaxed">
            {getTranslation(lang, 'audio_sfx_hint')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'bubble', name: getTranslation(lang, 'audio_sfx_bubble'), color: 'from-cyan-600 to-blue-600' },
              { id: 'coin', name: getTranslation(lang, 'audio_sfx_coin'), color: 'from-amber-500 to-yellow-600' },
              { id: 'laser', name: getTranslation(lang, 'audio_sfx_laser'), color: 'from-pink-600 to-rose-600' },
              { id: 'jump', name: getTranslation(lang, 'audio_sfx_jump'), color: 'from-emerald-600 to-teal-600' },
              { id: 'explosion', name: getTranslation(lang, 'audio_sfx_explosion'), color: 'from-orange-600 to-red-600' },
              { id: 'bell', name: getTranslation(lang, 'audio_sfx_bell'), color: 'from-violet-600 to-purple-600' },
            ].map((sfx) => (
              <button
                key={sfx.id}
                onClick={() => playProceduralSFX(sfx.id)}
                className={`p-4 rounded-2xl bg-gradient-to-br ${sfx.color} text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all`}
              >
                <Zap className="w-5 h-5 text-white/90" />
                <span>{sfx.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
