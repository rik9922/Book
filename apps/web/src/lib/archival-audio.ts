/**
 * Archival Web Audio API Engine for Memoria 3D Book Experience
 * Generates tactile, museum-grade synthetic acoustic feedback without external asset dependencies:
 * - Archival 140gsm cotton rag paper turn whoosh and edge release
 * - Vegetable-tanned Moroccan leather hinge flex and creasing friction
 * - Archival hardcover closure thud with cushion acoustics
 *
 * Adheres to zero-budget local execution, cardless policy, and respectful subtle amplitude.
 */

const AUDIO_STORAGE_KEY = "memoria_archival_audio_enabled";

export function isAudioFeedbackEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function setAudioFeedbackEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent("memoria:audio-change", { detail: { enabled } }));
  } catch (err) {
    void err;
  }
}

class ArchivalAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    // Pink-weighted noise generator for natural paper fiber friction
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = lastOut * 0.92 + white * 0.08;
      data[i] = lastOut * 1.8;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Synthesize crisp, tactile paper-turn whoosh of 140gsm acid-free cotton paper
   */
  public playPageTurn(direction: 1 | -1 = 1): void {
    if (!isAudioFeedbackEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      const startFreq = direction > 0 ? 1900 : 2200;
      const endFreq = direction > 0 ? 1200 : 1450;
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.22);
      filter.Q.setValueAtTime(1.6, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.25);

      // Subtle edge-release snap
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = "sine";
      snapOsc.frequency.setValueAtTime(2600, now + 0.04);
      snapOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);

      snapGain.gain.setValueAtTime(0.0001, now);
      snapGain.gain.setValueAtTime(0.035, now + 0.04);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now + 0.04);
      snapOsc.stop(now + 0.09);

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(8);
      }
    } catch (err) {
      void err;
    }
  }

  /**
   * Synthesize supple Moroccan leather hinge friction and creasing resistance
   */
  public playCoverOpen(): void {
    if (!isAudioFeedbackEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Resonant leather spine flex
      const osc = ctx.createOscillator();
      const oscFilter = ctx.createBiquadFilter();
      const oscGain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.32);

      oscFilter.type = "lowpass";
      oscFilter.frequency.setValueAtTime(280, now);
      oscFilter.Q.setValueAtTime(2.8, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.09, now + 0.06);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);

      // 2. Leather friction texture
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();

      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(520, now);
      noiseFilter.Q.setValueAtTime(2.2, now);

      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.35);

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([6, 12]);
      }
    } catch (err) {
      void err;
    }
  }

  /**
   * Synthesize warm, muffled archival hardcover closure onto book block
   */
  public playCoverClose(): void {
    if (!isAudioFeedbackEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Low frequency thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);

      // Air cushion whoosh
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.14);

      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.07, now + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.16);

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(14);
      }
    } catch (err) {
      void err;
    }
  }
}

export const archivalAudio = new ArchivalAudioEngine();
