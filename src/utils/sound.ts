import { Haptics, ImpactStyle } from '@capacitor/haptics';

class SoundController {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;

  constructor() {
    const savedSound = localStorage.getItem('mediahub_sound_enabled');
    if (savedSound !== null) {
      this.soundEnabled = savedSound === 'true';
    }
    const savedHaptics = localStorage.getItem('mediahub_haptics_enabled');
    if (savedHaptics !== null) {
      this.hapticsEnabled = savedHaptics === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('mediahub_sound_enabled', String(enabled));
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    localStorage.setItem('mediahub_haptics_enabled', String(enabled));
  }

  public async triggerHaptic(style: ImpactStyle = ImpactStyle.Light) {
    if (!this.hapticsEnabled) return;
    try {
      await Haptics.impact({ style });
    } catch {
      // Ignore if not on physical mobile device
    }
  }

  public playClick() {
    this.triggerHaptic(ImpactStyle.Light);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // audio error ignore
    }
  }

  public playSuccess() {
    this.triggerHaptic(ImpactStyle.Medium);
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.16);
      });
    } catch {
      // audio error ignore
    }
  }
}

export const soundManager = new SoundController();
