import { TAMALE_MUSIC_TRACKS, TAMALE_RADIO_STATIONS } from "../data/tamaleMusicAndRadio";
import { MusicTrack, RadioStation } from "../types/game";

export type PlaybackMode = "music" | "radio";
export type RepeatMode = "off" | "all" | "one";

export interface MusicPlayerSnapshot {
  isPlaying: boolean;
  mode: PlaybackMode;
  currentTrack: MusicTrack;
  currentStation: RadioStation;
  elapsedSec: number;
  durationSec: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  djSegment: string | null;
}

/**
 * Modular Web Audio Northern Ghana Groove & Multi-Station Radio Synthesizer.
 * Supports licensed external audioUrl files when supplied AND real procedural
 * Web Audio multi-track grooves (dondo drums, shakers, bass, chords, pentatonic plucks)
 * for copyright-safe procedural previews.
 */
export class TamaleMusicRadioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private htmlAudio: HTMLAudioElement | null = null;

  private isPlaying = false;
  private mode: PlaybackMode = "music";
  private trackIndex = 0;
  private stationIndex = 0;
  private stationTrackPos = 0;
  private elapsedSec = 0;
  private volume = 0.48;
  private duckFactor = 1.0;
  private shuffle = false;
  private repeat: RepeatMode = "all";
  private djSegment: string | null = null;

  private stepTimer: number | null = null;
  private progressTimer: number | null = null;
  private stepIdx = 0;
  private listeners = new Set<(snap: MusicPlayerSnapshot) => void>();

  private ensureCtx() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return;
    }
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume * this.duckFactor;
    this.masterGain.connect(this.ctx.destination);
  }

  public subscribe(fn: (snap: MusicPlayerSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) {
      fn(snap);
    }
  }

  public getCurrentTrack(): MusicTrack {
    if (this.mode === "radio") {
      const station = this.getCurrentStation();
      const tid = station.trackIds[this.stationTrackPos % station.trackIds.length];
      return TAMALE_MUSIC_TRACKS.find((t) => t.id === tid) || TAMALE_MUSIC_TRACKS[0];
    }
    return TAMALE_MUSIC_TRACKS[this.trackIndex] || TAMALE_MUSIC_TRACKS[0];
  }

  public getCurrentStation(): RadioStation {
    return TAMALE_RADIO_STATIONS[this.stationIndex] || TAMALE_RADIO_STATIONS[0];
  }

  public getSnapshot(): MusicPlayerSnapshot {
    const track = this.getCurrentTrack();
    return {
      isPlaying: this.isPlaying,
      mode: this.mode,
      currentTrack: track,
      currentStation: this.getCurrentStation(),
      elapsedSec: this.elapsedSec,
      durationSec: track.durationSec,
      volume: this.volume,
      shuffle: this.shuffle,
      repeat: this.repeat,
      djSegment: this.djSegment,
    };
  }

  public playTrackById(trackId: string) {
    const idx = TAMALE_MUSIC_TRACKS.findIndex((t) => t.id === trackId);
    if (idx < 0) return;
    this.mode = "music";
    this.djSegment = null;
    this.trackIndex = idx;
    this.elapsedSec = 0;
    this.play();
  }

  public tuneStation(stationId: string, djBroadcastText?: string) {
    const idx = TAMALE_RADIO_STATIONS.findIndex((s) => s.id === stationId);
    if (idx < 0) return;
    this.mode = "radio";
    this.stationIndex = idx;
    this.stationTrackPos = 0;
    this.elapsedSec = 0;
    this.djSegment =
      djBroadcastText ||
      `Now tuned to ${TAMALE_RADIO_STATIONS[idx].frequency} ${TAMALE_RADIO_STATIONS[idx].name} — ${TAMALE_RADIO_STATIONS[idx].tagline}`;
    this.play();
  }

  public setDjSegment(text: string | null) {
    this.djSegment = text;
    this.emit();
  }

  public play() {
    this.ensureCtx();
    this.isPlaying = true;
    this.startAudioLoop();
    this.emit();
  }

  public pause() {
    this.isPlaying = false;
    this.stopAudioLoop();
    this.emit();
  }

  public togglePlayPause() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public next(djBroadcastText?: string) {
    this.elapsedSec = 0;
    if (this.mode === "radio") {
      const station = this.getCurrentStation();
      this.stationTrackPos = (this.stationTrackPos + 1) % station.trackIds.length;
      if (djBroadcastText) this.djSegment = djBroadcastText;
    } else if (this.shuffle) {
      this.trackIndex = Math.floor(Math.random() * TAMALE_MUSIC_TRACKS.length);
    } else {
      this.trackIndex = (this.trackIndex + 1) % TAMALE_MUSIC_TRACKS.length;
    }
    if (this.isPlaying) {
      this.stopAudioLoop();
      this.startAudioLoop();
    }
    this.emit();
  }

  public previous() {
    this.elapsedSec = 0;
    if (this.mode === "radio") {
      const station = this.getCurrentStation();
      this.stationTrackPos =
        (this.stationTrackPos - 1 + station.trackIds.length) % station.trackIds.length;
    } else {
      this.trackIndex =
        (this.trackIndex - 1 + TAMALE_MUSIC_TRACKS.length) % TAMALE_MUSIC_TRACKS.length;
    }
    if (this.isPlaying) {
      this.stopAudioLoop();
      this.startAudioLoop();
    }
    this.emit();
  }

  public seek(sec: number) {
    const dur = this.getCurrentTrack().durationSec;
    this.elapsedSec = Math.max(0, Math.min(dur, Math.round(sec)));
    if (this.htmlAudio && Number.isFinite(this.htmlAudio.duration)) {
      this.htmlAudio.currentTime = this.elapsedSec;
    }
    this.emit();
  }

  public toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.emit();
  }

  public cycleRepeat() {
    this.repeat = this.repeat === "off" ? "all" : this.repeat === "all" ? "one" : "off";
    this.emit();
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume * this.duckFactor,
        this.ctx.currentTime,
        0.04
      );
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.volume * this.duckFactor;
    }
    this.emit();
  }

  public setDucking(factor: number) {
    this.duckFactor = Math.max(0.15, Math.min(1, factor));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume * this.duckFactor,
        this.ctx.currentTime,
        0.08
      );
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.volume * this.duckFactor;
    }
  }

  private stopAudioLoop() {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.progressTimer !== null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
  }

  private startAudioLoop() {
    this.stopAudioLoop();
    const track = this.getCurrentTrack();

    // Support cleared external audio URL if supplied; otherwise run procedural Northern Ghana groove synthesizer
    if (track.audioUrl && track.licenseStatus === "licensed-audio-file") {
      if (!this.htmlAudio || this.htmlAudio.src !== track.audioUrl) {
        this.htmlAudio = new Audio(track.audioUrl);
        this.htmlAudio.onended = () => this.handleTrackEnded();
      }
      this.htmlAudio.volume = this.volume * this.duckFactor;
      void this.htmlAudio.play().catch(() => undefined);
    } else {
      const stepMs = Math.max(115, Math.round((60 / track.bpm / 4) * 1000)); // 16th-note groove
      this.stepIdx = 0;
      this.stepTimer = window.setInterval(() => {
        if (this.isPlaying) {
          this.triggerGrooveStep(track, this.stepIdx);
          this.stepIdx = (this.stepIdx + 1) % 16;
        }
      }, stepMs);
    }

    this.progressTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.elapsedSec += 1;
      if (this.elapsedSec >= track.durationSec) {
        this.handleTrackEnded();
      } else {
        this.emit();
      }
    }, 1000);
  }

  private handleTrackEnded() {
    if (this.repeat === "one") {
      this.elapsedSec = 0;
      this.emit();
      return;
    }
    if (this.repeat === "off" && this.mode === "music" && this.trackIndex === TAMALE_MUSIC_TRACKS.length - 1) {
      this.pause();
      this.elapsedSec = 0;
      this.emit();
      return;
    }
    this.next();
  }

  private triggerGrooveStep(track: MusicTrack, step: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = track.scaleNotes;

    // 1. Kick / Gungon bass drum
    const isKick =
      track.grooveStyle === "reggae"
        ? step === 8
        : track.grooveStyle === "traditional_drum"
        ? step % 4 === 0 || step === 10
        : step === 0 || step === 6 || step === 8 || (track.grooveStyle === "afrobeat" && step === 11);

    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.19);
    }

    // 2. Dondo talking drum pitch-bend or Afrobeats rimshot
    const isDondo =
      track.grooveStyle === "traditional_drum"
        ? step === 2 || step === 4 || step === 7 || step === 12 || step === 14
        : step === 4 || step === 12 || (step === 15 && track.grooveStyle === "dondo_hiphop");
    if (isDondo) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = track.grooveStyle === "traditional_drum" ? "triangle" : "sine";
      const baseF = step % 4 === 0 ? 225 : 295;
      osc.frequency.setValueAtTime(baseF, now);
      osc.frequency.exponentialRampToValueAtTime(baseF * 0.68, now + 0.11);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    // 3. Soft hi-hat / gourd shaker pulse
    if (step % 2 === 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(4200 + (step % 4) * 380, now);
      gain.gain.setValueAtTime(0.022, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.035);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    // 4. Warm sub bassline
    if (step === 0 || step === 6 || step === 10) {
      const note = notes[(step === 10 ? 2 : 0) % notes.length] * 0.5;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    // 5. Melodic guitar / kologo / synth motif
    if (step === 0 || step === 3 || step === 6 || step === 9 || step === 12 || step === 14) {
      const note = notes[(step + this.trackIndex) % notes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type =
        track.grooveStyle === "highlife" || track.grooveStyle === "gospel"
          ? "sine"
          : "triangle";
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  public dispose() {
    this.stopAudioLoop();
    this.listeners.clear();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
