import React, { useMemo, useState } from "react";
import {
  Disc3,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import {
  TAMALE_MUSIC_TRACKS,
  TAMALE_PLAYLISTS,
  TAMALE_RADIO_STATIONS,
} from "../data/tamaleMusicAndRadio";
import { MusicPlayerSnapshot } from "../game/musicPlayer";
import { RadioStation } from "../types/game";

interface MusicRadioAppProps {
  section: "music" | "radio";
  snapshot: MusicPlayerSnapshot;
  onPlayTrack: (trackId: string) => void;
  onTuneStation: (station: RadioStation) => void;
  onRefreshDjSegment: (station: RadioStation) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (sec: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export const MusicRadioApp: React.FC<MusicRadioAppProps> = ({
  section,
  snapshot,
  onPlayTrack,
  onTuneStation,
  onRefreshDjSegment,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onSetVolume,
  onToggleShuffle,
  onCycleRepeat,
}) => {
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const genres = useMemo(() => {
    const set = new Set<string>(TAMALE_MUSIC_TRACKS.map((t) => t.genre));
    return ["all", ...Array.from(set)];
  }, []);

  const filteredTracks = useMemo(() => {
    let list = TAMALE_MUSIC_TRACKS;
    if (activePlaylistId) {
      const pl = TAMALE_PLAYLISTS.find((p) => p.id === activePlaylistId);
      if (pl) {
        const allowed = new Set<string>(pl.trackIds);
        list = list.filter((t) => allowed.has(t.id));
      }
    }
    if (genreFilter !== "all") {
      list = list.filter((t) => t.genre === genreFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activePlaylistId, genreFilter, search]);

  return (
    <div className="space-y-4">
      {/* Now Playing Transport Deck */}
      <div className="p-4 rounded-xl bg-[#120f0d] border border-amber-500/35 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
              {snapshot.mode === "radio" ? (
                <>
                  <Radio className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    LIVE RADIO · {snapshot.currentStation.frequency} {snapshot.currentStation.name}
                  </span>
                </>
              ) : (
                <>
                  <Disc3 className="w-3.5 h-3.5 shrink-0" />
                  <span>NORTHERN GHANA MUSIC PLAYER · {snapshot.currentTrack.genre}</span>
                </>
              )}
            </div>
            <div className="text-sm font-bold text-[#f8f5ef] truncate mt-0.5">
              {snapshot.currentTrack.title}
            </div>
            <div className="text-xs text-[#cfc8bc] truncate">
              {snapshot.currentTrack.artist} · {snapshot.currentTrack.mood}
            </div>
          </div>
          <div className="text-[10px] font-mono-num px-2 py-1 rounded bg-[#221d18] border border-white/10 text-[#bfb7aa]">
            {snapshot.currentTrack.licenseStatus === "licensed-audio-file"
              ? "Licensed Audio"
              : "Procedural Synth Groove"}
          </div>
        </div>

        {snapshot.mode === "radio" && snapshot.djSegment && (
          <div className="p-2.5 rounded-lg bg-[#1d1915] border border-white/10 text-xs text-amber-200 flex items-start justify-between gap-2">
            <div>
              <span className="font-bold text-amber-400">
                {snapshot.currentStation.hostName}:{" "}
              </span>
              <span>“{snapshot.djSegment}”</span>
            </div>
            <button
              type="button"
              onClick={() => onRefreshDjSegment(snapshot.currentStation)}
              title="Next live host update"
              className="min-h-[32px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-[#f8f5ef] shrink-0 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Update</span>
            </button>
          </div>
        )}

        {/* Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={snapshot.durationSec || 180}
            value={Math.min(snapshot.elapsedSec, snapshot.durationSec || 180)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Track seek bar"
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono-num text-[#9c9487]">
            <span>{formatSec(snapshot.elapsedSec)}</span>
            <span>{snapshot.currentTrack.bpm} BPM</span>
            <span>{formatSec(snapshot.durationSec)}</span>
          </div>
        </div>

        {/* Transport Controls + Volume */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleShuffle}
              title="Shuffle"
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border cursor-pointer ${
                snapshot.shuffle
                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                  : "bg-[#1f1a16] border-white/10 text-[#9c9487] hover:text-white"
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onPrev}
              title="Previous"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#1f1a16] border border-white/10 text-[#ede8de] hover:bg-white/10 cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              title={snapshot.isPlaying ? "Pause" : "Play"}
              className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {snapshot.isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Play</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onNext}
              title="Next"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#1f1a16] border border-white/10 text-[#ede8de] hover:bg-white/10 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCycleRepeat}
              title={`Repeat: ${snapshot.repeat}`}
              className={`min-h-[40px] px-2.5 flex items-center gap-1 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                snapshot.repeat !== "off"
                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                  : "bg-[#1f1a16] border-white/10 text-[#9c9487] hover:text-white"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="uppercase">{snapshot.repeat}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={snapshot.volume}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              aria-label="Music and radio volume"
              className="w-24 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* SECTION A: MUSIC LIBRARY & PLAYLISTS */}
      {section === "music" && (
        <div className="space-y-3">
          <div className="text-[11px] text-[#9c9487]">
            Built-in copyright-safe Northern Ghana groove synthesizer featuring Tamale &amp; Dagbon
            styles (Maccasio, Fancy Gadam, Wiz Child, Don Sigli, Dondo/Takai, Highlife &amp; Gospel).
          </div>

          {/* Playlists */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TAMALE_PLAYLISTS.map((pl) => {
              const active = activePlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setActivePlaylistId(active ? null : pl.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    active
                      ? "bg-amber-500/20 border-amber-500 text-[#f8f5ef]"
                      : "bg-[#1f1a16] border-white/10 text-[#d4cdc2] hover:bg-white/5"
                  }`}
                >
                  <div className="text-xs font-bold">{pl.name}</div>
                  <div className="text-[11px] text-[#9c9487] line-clamp-1">{pl.description}</div>
                </button>
              );
            })}
          </div>

          {/* Search & Genre Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-[#9c9487] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Maccasio, Fancy Gadam, Highlife..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[38px] bg-[#120f0d] border border-white/12 rounded-lg pl-8 pr-3 text-xs text-[#f8f5ef]"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
              {genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenreFilter(g)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                    genreFilter === g
                      ? "bg-amber-500 text-[#12100e] font-bold"
                      : "bg-[#1f1a16] text-[#cfc8bc] hover:bg-white/10"
                  }`}
                >
                  {g === "all" ? "All Genres" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Track List */}
          <div className="space-y-2">
            {filteredTracks.map((trk) => {
              const isCurrent =
                snapshot.mode === "music" && snapshot.currentTrack.id === trk.id;
              return (
                <button
                  key={trk.id}
                  type="button"
                  onClick={() => onPlayTrack(trk.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 cursor-pointer ${
                    isCurrent
                      ? "bg-[#251d13] border-amber-500/60"
                      : "bg-[#1f1a16] border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#f8f5ef] truncate">
                      {trk.title}
                    </div>
                    <div className="text-[11px] text-[#b5ada0] truncate">
                      {trk.artist} · {trk.genre} · {trk.region}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs font-mono-num text-amber-400">
                    <span>{formatSec(trk.durationSec)}</span>
                    <span className="px-2 py-1 rounded-lg bg-amber-500 text-[#12100e] font-bold">
                      {isCurrent && snapshot.isPlaying ? "Playing" : "Play"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION B: 7 TAMALE RADIO STATIONS */}
      {section === "radio" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TAMALE_RADIO_STATIONS.map((st) => {
            const tuned =
              snapshot.mode === "radio" && snapshot.currentStation.id === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onTuneStation(st)}
                className={`p-3.5 rounded-xl border text-left space-y-1.5 cursor-pointer ${
                  tuned
                    ? "bg-[#231d15] border-amber-500/70"
                    : "bg-[#1f1a16] border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-mono-num font-bold px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: st.color }}
                  >
                    {st.frequency}
                  </span>
                  <span className="text-[11px] text-amber-300 font-semibold">
                    {tuned && snapshot.isPlaying ? "ON AIR" : "Tune In"}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#f8f5ef]">{st.name}</div>
                <div className="text-xs text-[#cfc8bc]">{st.tagline}</div>
                <div className="text-[11px] text-[#9c9487]">
                  Host: {st.hostName} · {st.genreFocus}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface MiniMusicRadioBarProps {
  snapshot: MusicPlayerSnapshot;
  onTogglePlay: () => void;
  onNext: () => void;
  onStop: () => void;
  onOpenApp: () => void;
}

export const MiniMusicRadioBar: React.FC<MiniMusicRadioBarProps> = ({
  snapshot,
  onTogglePlay,
  onNext,
  onStop,
  onOpenApp,
}) => {
  return (
    <div className="pointer-events-auto flex items-center gap-2 bg-[#14110f]/94 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-lg max-w-[92vw]">
      <button
        type="button"
        onClick={onOpenApp}
        className="text-left min-w-0 flex-1 cursor-pointer"
        title="Open Tamale Music & Radio"
      >
        <div className="text-[10px] font-bold text-amber-400 truncate">
          {snapshot.mode === "radio"
            ? `${snapshot.currentStation.frequency} ${snapshot.currentStation.name}`
            : snapshot.currentTrack.genre}
        </div>
        <div className="text-xs font-semibold text-[#f8f5ef] truncate max-w-[170px] sm:max-w-[240px]">
          {snapshot.currentTrack.title}
        </div>
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={snapshot.isPlaying ? "Pause radio or music" : "Play radio or music"}
        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-amber-500 text-[#12100e] cursor-pointer"
      >
        {snapshot.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next track"
        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-[#f8f5ef] cursor-pointer"
      >
        <SkipForward className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onStop}
        aria-label="Close mini radio bar"
        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#9c9487] hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
