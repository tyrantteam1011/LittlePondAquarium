/**
 * Cozy Web Audio Synthesizer — Soft aquatic chimes, gentle bubbles, and relaxing tactile feedback.
 * Zero external audio assets required; gracefully handles browser autoplay policies.
 */
class AudioServiceImpl {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private ambientEnabled = true;
  private ambientTimer: number | null = null;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setAmbientEnabled(enabled: boolean): void {
    this.ambientEnabled = enabled;
    if (!enabled && this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    } else if (enabled) {
      this.ensureAmbientLoop();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
    freqEnd?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  playClick(): void {
    this.playTone(520, 0.07, 'triangle', 0.055, 0, 620);
  }

  playBubble(): void {
    this.playTone(340 + Math.random() * 140, 0.11, 'sine', 0.045, 0, 760 + Math.random() * 180);
  }

  playCoin(): void {
    this.playTone(660, 0.14, 'sine', 0.065, 0);
    this.playTone(880, 0.18, 'sine', 0.055, 0.06);
  }

  playPlaceDecor(): void {
    this.playTone(280, 0.12, 'triangle', 0.07, 0, 420);
    this.playTone(520, 0.14, 'sine', 0.05, 0.05);
  }

  playFeed(): void {
    for (let i = 0; i < 3; i++) {
      this.playTone(420 + i * 90, 0.09, 'sine', 0.05, i * 0.055, 680 + i * 90);
    }
  }

  playDiscovery(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.32, 'sine', 0.07, idx * 0.085);
    });
  }

  playLevelUp(): void {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.38, 'triangle', 0.065, idx * 0.08);
    });
  }

  playReward(): void {
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.25, 'sine', 0.06, idx * 0.065);
    });
  }

  ensureAmbientLoop(): void {
    if (this.ambientTimer !== null || typeof window === 'undefined') return;
    this.ambientTimer = window.setInterval(() => {
      if (!this.enabled || !this.ambientEnabled) return;
      if (this.ctx && this.ctx.state === 'running' && Math.random() < 0.45) {
        this.playTone(
          260 + Math.random() * 140,
          0.14,
          'sine',
          0.018,
          0,
          560 + Math.random() * 180
        );
      }
    }, 3400);
  }
}

export const AudioService = new AudioServiceImpl();
