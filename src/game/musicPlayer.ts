import {
  TAMALE_MUSIC_TRACKS,
  TAMALE_PLAYLISTS,
  TAMALE_RADIO_STATIONS,
  validateTrackLicense,
} from "../data/tamaleMusicAndRadio";
import {
  MusicTrack,
  RadioStation,
  SavedMusicLibraryState,
  UserPlaylist,
} from "../types/game";

export type PlaybackMode = "music" | "radio";
export type RepeatMode = "off" | "all" | "one";
export type PlaybackContext = "phone" | "vehicle" | "room";

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
  favorites: string[];
  recentTrackIds: string[];
  customPlaylists: UserPlaylist[];
  activePlaylistId: string | null;
  playbackContext: PlaybackContext;
  vehicleRadioEnabled: boolean;
  indoorMode: boolean;
  licenseDisclosure: string;
}

/**
 * Modular Web Audio Northern Ghana Groove & Multi-Station Radio Synthesizer.
 * Enforces strict license validation before attempting external audio playback,
 * provides real multi-track Northern Ghanaian Web Audio synthesis for every track,
 * supports playlists, favourites, recents, vehicle radio HUD & smooth indoor transitions.
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
  private environmentGainFactor = 1.0;
  private shuffle = false;
  private repeat: RepeatMode = "all";
  private djSegment: string | null = null;

  private favorites: Set<string> = new Set([
    "trk_maccasio_zero_to_hero",
    "trk_fancy_gadam_total_cheat",
    "trk_dagbon_dondo_damba",
  ]);
  private recentTrackIds: string[] = [];
  private customPlaylists: UserPlaylist[] = [];
  private activePlaylistId: string | null = null;
  private playbackContext: PlaybackContext = "phone";
  private vehicleRadioEnabled = false;
  private indoorMode = false;

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
    this.masterGain.gain.value = this.effectiveGain();
    this.masterGain.connect(this.ctx.destination);
  }

  private effectiveGain(): number {
    return Math.max(0, Math.min(1, this.volume * this.duckFactor * this.environmentGainFactor));
  }

  private applyGainSmooth(tau = 0.08) {
    const g = this.effectiveGain();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(g, this.ctx.currentTime, tau);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = g;
    }
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

  private pushRecent(trackId: string) {
    this.recentTrackIds = [
      trackId,
      ...this.recentTrackIds.filter((id) => id !== trackId),
    ].slice(0, 12);
  }

  public getAllPlaylists(): UserPlaylist[] {
    return [...TAMALE_PLAYLISTS, ...this.customPlaylists];
  }

  private getActivePlaylistTracks(): MusicTrack[] {
    if (!this.activePlaylistId) return TAMALE_MUSIC_TRACKS;
    const pl = this.getAllPlaylists().find((p) => p.id === this.activePlaylistId);
    if (!pl || pl.trackIds.length === 0) return TAMALE_MUSIC_TRACKS;
    const set = new Set(pl.trackIds);
    const filtered = TAMALE_MUSIC_TRACKS.filter((t) => set.has(t.id));
    return filtered.length > 0 ? filtered : TAMALE_MUSIC_TRACKS;
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
    const validation = validateTrackLicense(track);
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
      favorites: Array.from(this.favorites),
      recentTrackIds: [...this.recentTrackIds],
      customPlaylists: this.customPlaylists.map((p) => ({ ...p, trackIds: [...p.trackIds] })),
      activePlaylistId: this.activePlaylistId,
      playbackContext: this.playbackContext,
      vehicleRadioEnabled: this.vehicleRadioEnabled,
      indoorMode: this.indoorMode,
      licenseDisclosure: validation.disclosureLabel,
    };
  }

  public playTrackById(trackId: string, playlistId: string | null = null) {
    const idx = TAMALE_MUSIC_TRACKS.findIndex((t) => t.id === trackId);
    if (idx < 0) return;
    this.mode = "music";
    this.djSegment = null;
    if (playlistId !== undefined) {
      this.activePlaylistId = playlistId;
    }
    this.trackIndex = idx;
    this.elapsedSec = 0;
    this.pushRecent(trackId);
    this.play();
  }

  public playPlaylist(playlistId: string, startTrackId?: string) {
    const pl = this.getAllPlaylists().find((p) => p.id === playlistId);
    if (!pl || pl.trackIds.length === 0) return;
    this.activePlaylistId = playlistId;
    const targetId = startTrackId && pl.trackIds.includes(startTrackId) ? startTrackId : pl.trackIds[0];
    this.playTrackById(targetId, playlistId);
  }

  public setActivePlaylistFilter(playlistId: string | null) {
    this.activePlaylistId = playlistId;
    this.emit();
  }

  public tuneStation(stationId: string, djBroadcastText?: string) {
    const idx = TAMALE_RADIO_STATIONS.findIndex((s) => s.id === stationId);
    if (idx < 0) return;
    this.mode = "radio";
    this.stationIndex = idx;
    this.stationTrackPos = 0;
    this.elapsedSec = 0;
    const track = this.getCurrentTrack();
    this.pushRecent(track.id);
    this.djSegment =
      djBroadcastText ||
      `Now tuned to ${TAMALE_RADIO_STATIONS[idx].frequency} ${TAMALE_RADIO_STATIONS[idx].name} — ${TAMALE_RADIO_STATIONS[idx].tagline}`;
    if (this.playbackContext === "vehicle") {
      this.vehicleRadioEnabled = true;
    }
    this.play();
  }

  public cycleStation(djBroadcastBuilder?: (station: RadioStation) => string) {
    const nextIdx = (this.stationIndex + 1) % TAMALE_RADIO_STATIONS.length;
    const st = TAMALE_RADIO_STATIONS[nextIdx];
    this.tuneStation(st.id, djBroadcastBuilder ? djBroadcastBuilder(st) : undefined);
  }

  public setMode(mode: PlaybackMode, djBroadcastText?: string) {
    this.mode = mode;
    if (mode === "radio" && !this.djSegment) {
      const st = this.getCurrentStation();
      this.djSegment = djBroadcastText || `${st.frequency} ${st.name} · ${st.tagline}`;
    } else if (mode === "music") {
      this.djSegment = null;
    }
    if (this.isPlaying) {
      this.stopAudioLoop();
      this.startAudioLoop();
    }
    this.emit();
  }

  public setVehicleMode(isDriving: boolean) {
    this.playbackContext = isDriving ? "vehicle" : this.indoorMode ? "room" : "phone";
    this.environmentGainFactor = isDriving ? 1.05 : this.indoorMode ? 0.92 : 1.0;
    this.applyGainSmooth(0.18);
    this.emit();
  }

  public toggleVehicleRadio(djBroadcastText?: string) {
    if (this.isPlaying) {
      this.vehicleRadioEnabled = false;
      this.pause();
    } else {
      this.vehicleRadioEnabled = true;
      if (this.mode === "radio" && !this.djSegment && djBroadcastText) {
        this.djSegment = djBroadcastText;
      }
      this.play();
    }
  }

  public setIndoorTransition(indoor: boolean) {
    this.indoorMode = indoor;
    if (this.playbackContext !== "vehicle") {
      this.playbackContext = indoor ? "room" : "phone";
    }
    this.environmentGainFactor =
      this.playbackContext === "vehicle" ? 1.05 : indoor ? 0.92 : 1.0;
    this.applyGainSmooth(0.22);
    this.emit();
  }

  public toggleFavorite(trackId: string) {
    if (this.favorites.has(trackId)) {
      this.favorites.delete(trackId);
    } else {
      this.favorites.add(trackId);
    }
    this.emit();
  }

  public createCustomPlaylist(name: string, description = "Personal Tamale playlist"): UserPlaylist | null {
    const clean = name.trim();
    if (!clean) return null;
    const pl: UserPlaylist = {
      id: `pl_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean.slice(0, 42),
      description: description.trim() || "Personal Tamale playlist",
      trackIds: [],
      isCustom: true,
    };
    this.customPlaylists = [pl, ...this.customPlaylists];
    this.emit();
    return pl;
  }

  public addTrackToPlaylist(playlistId: string, trackId: string) {
    this.customPlaylists = this.customPlaylists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      if (pl.trackIds.includes(trackId)) return pl;
      return { ...pl, trackIds: [...pl.trackIds, trackId] };
    });
    this.emit();
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string) {
    this.customPlaylists = this.customPlaylists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) };
    });
    this.emit();
  }

  public deleteCustomPlaylist(playlistId: string) {
    this.customPlaylists = this.customPlaylists.filter((pl) => pl.id !== playlistId);
    if (this.activePlaylistId === playlistId) {
      this.activePlaylistId = null;
    }
    this.emit();
  }

  public setDjSegment(text: string | null) {
    this.djSegment = text;
    this.emit();
  }

  public play() {
    this.ensureCtx();
    this.isPlaying = true;
    this.pushRecent(this.getCurrentTrack().id);
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
    } else {
      const pool = this.getActivePlaylistTracks();
      const current = this.getCurrentTrack();
      if (this.shuffle && pool.length > 1) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const globalIdx = TAMALE_MUSIC_TRACKS.findIndex((t) => t.id === pick.id);
        this.trackIndex = globalIdx >= 0 ? globalIdx : 0;
      } else {
        const posInPool = pool.findIndex((t) => t.id === current.id);
        const nextInPool = pool[(posInPool + 1 + pool.length) % pool.length] ?? TAMALE_MUSIC_TRACKS[0];
        const globalIdx = TAMALE_MUSIC_TRACKS.findIndex((t) => t.id === nextInPool.id);
        this.trackIndex = globalIdx >= 0 ? globalIdx : (this.trackIndex + 1) % TAMALE_MUSIC_TRACKS.length;
      }
    }
    this.pushRecent(this.getCurrentTrack().id);
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
      const pool = this.getActivePlaylistTracks();
      const current = this.getCurrentTrack();
      const posInPool = pool.findIndex((t) => t.id === current.id);
      const prevInPool =
        pool[(posInPool - 1 + pool.length) % pool.length] ?? TAMALE_MUSIC_TRACKS[0];
      const globalIdx = TAMALE_MUSIC_TRACKS.findIndex((t) => t.id === prevInPool.id);
      this.trackIndex =
        globalIdx >= 0
          ? globalIdx
          : (this.trackIndex - 1 + TAMALE_MUSIC_TRACKS.length) % TAMALE_MUSIC_TRACKS.length;
    }
    this.pushRecent(this.getCurrentTrack().id);
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
    this.applyGainSmooth(0.04);
    this.emit();
  }

  public setDucking(factor: number) {
    this.duckFactor = Math.max(0.15, Math.min(1, factor));
    this.applyGainSmooth(0.08);
  }

  public getPersistedState(): SavedMusicLibraryState {
    return {
      favorites: Array.from(this.favorites),
      recentTrackIds: [...this.recentTrackIds],
      customPlaylists: this.customPlaylists.map((p) => ({
        ...p,
        trackIds: [...p.trackIds],
      })),
      volume: this.volume,
      lastTrackId: this.getCurrentTrack().id,
      lastStationId: this.getCurrentStation().id,
    };
  }

  public hydratePersistedState(state?: SavedMusicLibraryState | null) {
    if (!state) return;
    if (Array.isArray(state.favorites)) {
      const validIds = new Set(TAMALE_MUSIC_TRACKS.map((t) => t.id));
      this.favorites = new Set(state.favorites.filter((id) => validIds.has(id)));
    }
    if (Array.isArray(state.recentTrackIds)) {
      const validIds = new Set(TAMALE_MUSIC_TRACKS.map((t) => t.id));
      this.recentTrackIds = state.recentTrackIds.filter((id) => validIds.has(id)).slice(0, 12);
    }
    if (Array.isArray(state.customPlaylists)) {
      this.customPlaylists = state.customPlaylists
        .filter((p) => p && typeof p.name === "string")
        .map((p) => ({ ...p, isCustom: true }));
    }
    if (typeof state.volume === "number" && Number.isFinite(state.volume)) {
      this.setVolume(state.volume);
    }
    if (state.lastTrackId) {
      const tIdx = TAMALE_MUSIC_TRACKS.findIndex((t) => t.id === state.lastTrackId);
      if (tIdx >= 0) this.trackIndex = tIdx;
    }
    if (state.lastStationId) {
      const sIdx = TAMALE_RADIO_STATIONS.findIndex((s) => s.id === state.lastStationId);
      if (sIdx >= 0) this.stationIndex = sIdx;
    }
    this.emit();
  }

  private stopAudioLoop() {
    if (typeof window !== "undefined") {
      if (this.stepTimer !== null) {
        window.clearInterval(this.stepTimer);
        this.stepTimer = null;
      }
      if (this.progressTimer !== null) {
        window.clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
    }
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
  }

  private startAudioLoop() {
    this.stopAudioLoop();
    const track = this.getCurrentTrack();
    const validation = validateTrackLicense(track);

    if (validation.validForExternalAudio && track.audioUrl) {
      if (!this.htmlAudio || this.htmlAudio.src !== track.audioUrl) {
        this.htmlAudio = new Audio(track.audioUrl);
        this.htmlAudio.onended = () => this.handleTrackEnded();
      }
      this.htmlAudio.volume = this.effectiveGain();
      void this.htmlAudio.play().catch(() => undefined);
    } else if (typeof window !== "undefined") {
      const stepMs = Math.max(105, Math.round((60 / track.bpm / 4) * 1000)); // 16th-note groove
      this.stepIdx = 0;
      this.stepTimer = window.setInterval(() => {
        if (this.isPlaying) {
          this.triggerGrooveStep(track, this.stepIdx);
          this.stepIdx = (this.stepIdx + 1) % 16;
        }
      }, stepMs);
    }

    if (typeof window !== "undefined") {
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
  }

  private handleTrackEnded() {
    if (this.repeat === "one") {
      this.elapsedSec = 0;
      this.emit();
      return;
    }
    const pool = this.getActivePlaylistTracks();
    const lastId = pool[pool.length - 1]?.id;
    if (this.repeat === "off" && this.mode === "music" && this.getCurrentTrack().id === lastId) {
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

    // 1. Kick / Gungon / Kalangu bass drum
    const isKick =
      track.grooveStyle === "reggae"
        ? step === 8
        : track.grooveStyle === "traditional_drum"
        ? step % 4 === 0 || step === 10
        : track.grooveStyle === "hausa_percussion"
        ? step === 0 || step === 3 || step === 8 || step === 11
        : track.grooveStyle === "instrumental_kologo"
        ? step === 0 || step === 8
        : step === 0 || step === 6 || step === 8 || (track.grooveStyle === "afrobeat" && step === 11);

    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(
        track.grooveStyle === "hausa_percussion" ? 132 : 118,
        now
      );
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      gain.gain.setValueAtTime(
        track.grooveStyle === "instrumental_kologo" ? 0.18 : 0.3,
        now
      );
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.19);
    }

    // 2. Dondo talking drum / Kalangu pitch bend or Afrobeat rimshot
    const isDondo =
      track.grooveStyle === "traditional_drum"
        ? step === 2 || step === 4 || step === 7 || step === 12 || step === 14
        : track.grooveStyle === "hausa_percussion"
        ? step === 2 || step === 5 || step === 9 || step === 13 || step === 15
        : step === 4 || step === 12 || (step === 15 && track.grooveStyle === "dondo_hiphop");
    if (isDondo) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type =
        track.grooveStyle === "traditional_drum" || track.grooveStyle === "hausa_percussion"
          ? "triangle"
          : "sine";
      const baseF =
        track.grooveStyle === "hausa_percussion"
          ? step % 3 === 0
            ? 275
            : 340
          : step % 4 === 0
          ? 225
          : 295;
      osc.frequency.setValueAtTime(baseF, now);
      osc.frequency.exponentialRampToValueAtTime(baseF * 0.68, now + 0.11);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    // 3. Soft hi-hat / gourd shaker / metallic bell pulse
    if (step % 2 === 1 || (track.grooveStyle === "hausa_percussion" && step % 4 === 0)) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = track.grooveStyle === "hausa_percussion" ? "triangle" : "square";
      osc.frequency.setValueAtTime(
        track.grooveStyle === "hausa_percussion" ? 1850 : 4200 + (step % 4) * 380,
        now
      );
      gain.gain.setValueAtTime(track.grooveStyle === "hausa_percussion" ? 0.032 : 0.02, now);
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
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    // 5. Melodic guitar / kologo lute / synth motif
    const playMelody =
      track.grooveStyle === "instrumental_kologo"
        ? step % 2 === 0 || step === 7 || step === 13
        : step === 0 || step === 3 || step === 6 || step === 9 || step === 12 || step === 14;
    if (playMelody) {
      const note = notes[(step + this.trackIndex) % notes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type =
        track.grooveStyle === "highlife" ||
        track.grooveStyle === "gospel" ||
        track.grooveStyle === "instrumental_kologo"
          ? "sine"
          : "triangle";
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(
        track.grooveStyle === "instrumental_kologo" ? 0.125 : 0.095,
        now
      );
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
