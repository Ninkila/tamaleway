import React, { useMemo, useState } from "react";
import {
  Clock,
  Disc3,
  Heart,
  ListMusic,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Volume2,
  X,
} from "lucide-react";
import {
  TAMALE_ALBUMS,
  TAMALE_FEATURED_ARTISTS,
  TAMALE_LOCAL_CHARTS,
  TAMALE_MUSIC_TRACKS,
  TAMALE_PLAYLISTS,
  TAMALE_RADIO_STATIONS,
} from "../data/tamaleMusicAndRadio";
import { MusicPlayerSnapshot } from "../game/musicPlayer";
import { MusicTrack, RadioStation } from "../types/game";

type MusicSubTab =
  | "discover"
  | "library"
  | "artists"
  | "albums"
  | "playlists"
  | "favorites"
  | "recent";

interface MusicRadioAppProps {
  section: "music" | "radio";
  snapshot: MusicPlayerSnapshot;
  onPlayTrack: (trackId: string, playlistId?: string | null) => void;
  onPlayPlaylist: (playlistId: string, startTrackId?: string) => void;
  onTuneStation: (station: RadioStation) => void;
  onRefreshDjSegment: (station: RadioStation) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (sec: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (trackId: string) => void;
  onCreatePlaylist: (name: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
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
  onPlayPlaylist,
  onTuneStation,
  onRefreshDjSegment,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onSetVolume,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onCreatePlaylist,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onDeletePlaylist,
}) => {
  const [subTab, setSubTab] = useState<MusicSubTab>("discover");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [pickerTrackId, setPickerTrackId] = useState<string | null>(null);

  const favSet = useMemo(() => new Set(snapshot.favorites), [snapshot.favorites]);
  const allPlaylists = useMemo(
    () => [...TAMALE_PLAYLISTS, ...snapshot.customPlaylists],
    [snapshot.customPlaylists]
  );

  const genres = useMemo(() => {
    const set = new Set<string>(TAMALE_MUSIC_TRACKS.map((t) => t.genre));
    return ["all", ...Array.from(set)];
  }, []);

  const newReleases = useMemo(
    () => TAMALE_MUSIC_TRACKS.filter((t) => t.isNewRelease),
    []
  );

  const recentTracks = useMemo(() => {
    const map = new Map(TAMALE_MUSIC_TRACKS.map((t) => [t.id, t]));
    return snapshot.recentTrackIds
      .map((id) => map.get(id))
      .filter((t): t is MusicTrack => Boolean(t));
  }, [snapshot.recentTrackIds]);

  const favoriteTracks = useMemo(
    () => TAMALE_MUSIC_TRACKS.filter((t) => favSet.has(t.id)),
    [favSet]
  );

  const filteredTracks = useMemo(() => {
    let list = TAMALE_MUSIC_TRACKS;
    if (subTab === "favorites") {
      list = favoriteTracks;
    } else if (subTab === "recent") {
      list = recentTracks;
    } else if (subTab === "playlists" && selectedPlaylistId) {
      const pl = allPlaylists.find((p) => p.id === selectedPlaylistId);
      if (pl) {
        const map = new Map(TAMALE_MUSIC_TRACKS.map((t) => [t.id, t]));
        list = pl.trackIds.map((id) => map.get(id)).filter((t): t is MusicTrack => Boolean(t));
      }
    } else if (subTab === "albums" && selectedAlbumId) {
      const alb = TAMALE_ALBUMS.find((a) => a.id === selectedAlbumId);
      if (alb) {
        const allowed = new Set(alb.trackIds);
        list = list.filter((t) => allowed.has(t.id));
      }
    }

    if (genreFilter !== "all" && subTab === "library") {
      list = list.filter((t) => t.genre === genreFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q) ||
          t.region.toLowerCase().includes(q)
      );
    }
    return list;
  }, [
    allPlaylists,
    favoriteTracks,
    genreFilter,
    recentTracks,
    search,
    selectedAlbumId,
    selectedPlaylistId,
    subTab,
  ]);

  const activeCustomPlaylist =
    selectedPlaylistId
      ? snapshot.customPlaylists.find((p) => p.id === selectedPlaylistId) ?? null
      : null;

  const isCurrentFav = favSet.has(snapshot.currentTrack.id);

  const renderTrackRow = (
    trk: MusicTrack,
    opts?: { rank?: number; playlistContextId?: string | null; removablePlaylistId?: string }
  ) => {
    const isCurrent = snapshot.mode === "music" && snapshot.currentTrack.id === trk.id;
    const isFav = favSet.has(trk.id);
    return (
      <div
        key={`${opts?.removablePlaylistId ?? "row"}_${trk.id}`}
        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${
          isCurrent
            ? "bg-[#251d13] border-amber-500/65"
            : "bg-[#1f1a16] border-white/10 hover:bg-white/5"
        }`}
      >
        <button
          type="button"
          onClick={() => onPlayTrack(trk.id, opts?.playlistContextId ?? null)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer min-h-[44px]"
        >
          {typeof opts?.rank === "number" && (
            <span className="w-5 text-center font-mono-num text-xs font-bold text-amber-400 shrink-0">
              {opts.rank}
            </span>
          )}
          <img
            src={trk.coverArt}
            alt={trk.album}
            className="w-11 h-11 rounded-lg object-cover shrink-0 border border-white/10"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#f8f5ef] truncate">
              {trk.title}
              {trk.featuredArtist ? ` ft. ${trk.featuredArtist}` : ""}
            </div>
            <div className="text-[11px] text-[#b5ada0] truncate">
              {trk.artist} · {trk.album} · {trk.genre}
            </div>
            <div className="text-[10px] text-[#8d8578] truncate">
              {trk.licenseStatus === "awaiting-authorization"
                ? "Synth Preview · Awaiting Authorization"
                : "Procedural Synth Original"}{" "}
              · {trk.releaseYear}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden sm:inline text-[11px] font-mono-num text-[#b5ada0] mr-1">
            {formatSec(trk.durationSec)}
          </span>
          <button
            type="button"
            onClick={() => onToggleFavorite(trk.id)}
            aria-label={isFav ? `Remove ${trk.title} from favourites` : `Add ${trk.title} to favourites`}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg cursor-pointer ${
              isFav ? "text-rose-400 bg-rose-500/15" : "text-[#9c9487] hover:text-white hover:bg-white/10"
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-rose-400" : ""}`} />
          </button>
          {snapshot.customPlaylists.length > 0 && !opts?.removablePlaylistId && (
            <button
              type="button"
              onClick={() => setPickerTrackId((cur) => (cur === trk.id ? null : trk.id))}
              title="Add to custom playlist"
              aria-label={`Add ${trk.title} to playlist`}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#b5ada0] hover:text-amber-300 hover:bg-white/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {opts?.removablePlaylistId && (
            <button
              type="button"
              onClick={() => onRemoveTrackFromPlaylist(opts.removablePlaylistId!, trk.id)}
              title="Remove from playlist"
              aria-label={`Remove ${trk.title} from playlist`}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#9c9487] hover:text-red-300 hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onPlayTrack(trk.id, opts?.playlistContextId ?? null)}
            className="min-h-[40px] px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#12100e] text-xs font-bold cursor-pointer"
          >
            {isCurrent && snapshot.isPlaying ? "Playing" : "Play"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Now Playing Transport Deck */}
      <div className="p-4 rounded-xl bg-[#120f0d] border border-amber-500/35 space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={snapshot.currentTrack.coverArt}
            alt={snapshot.currentTrack.album}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-white/15 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5 truncate">
                {snapshot.mode === "radio" ? (
                  <>
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {snapshot.currentStation.frequency} · {snapshot.currentStation.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Disc3 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {snapshot.currentTrack.genre} ·{" "}
                      {snapshot.playbackContext === "vehicle"
                        ? "Vehicle Audio"
                        : snapshot.playbackContext === "room"
                        ? "Indoor Speaker"
                        : "City Phone"}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(snapshot.currentTrack.id)}
                aria-label="Favourite current track"
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg cursor-pointer ${
                  isCurrentFav
                    ? "text-rose-400 bg-rose-500/15"
                    : "text-[#9c9487] hover:text-white hover:bg-white/10"
                }`}
              >
                <Heart className={`w-4 h-4 ${isCurrentFav ? "fill-rose-400" : ""}`} />
              </button>
            </div>

            <div className="text-sm sm:text-base font-bold text-[#f8f5ef] truncate mt-0.5">
              {snapshot.currentTrack.title}
            </div>
            <div className="text-xs text-[#cfc8bc] truncate">
              {snapshot.currentTrack.artist} · {snapshot.currentTrack.album} ·{" "}
              {snapshot.currentTrack.mood}
            </div>
            <div className="text-[10px] text-[#9c9487] mt-1 truncate">
              {snapshot.licenseDisclosure} · Owner: {snapshot.currentTrack.licenseOwner}
            </div>
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
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-[#f8f5ef] shrink-0 cursor-pointer flex items-center gap-1"
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
              aria-label="Toggle shuffle"
              className={`min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border cursor-pointer ${
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
              aria-label="Previous track"
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-[#1f1a16] border border-white/10 text-[#ede8de] hover:bg-white/10 cursor-pointer"
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
              aria-label="Next track"
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-[#1f1a16] border border-white/10 text-[#ede8de] hover:bg-white/10 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCycleRepeat}
              title={`Repeat: ${snapshot.repeat}`}
              aria-label={`Repeat mode ${snapshot.repeat}`}
              className={`min-h-[42px] px-2.5 flex items-center gap-1 rounded-xl border text-[11px] font-semibold cursor-pointer ${
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

      {/* Add-to-playlist quick picker bar */}
      {pickerTrackId && snapshot.customPlaylists.length > 0 && (
        <div className="p-3 rounded-xl bg-[#1c1610] border border-amber-500/45 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-amber-200 font-semibold">
            Add “{TAMALE_MUSIC_TRACKS.find((t) => t.id === pickerTrackId)?.title}” to:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {snapshot.customPlaylists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => {
                  onAddTrackToPlaylist(pl.id, pickerTrackId);
                  setPickerTrackId(null);
                }}
                className="min-h-[36px] px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-xs font-semibold text-amber-200 cursor-pointer"
              >
                + {pl.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPickerTrackId(null)}
              className="min-h-[36px] px-2 rounded-lg text-xs text-[#9c9487] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SECTION A: NORTHERN GHANA MUSIC LIBRARY & DISCOVERY */}
      {section === "music" && (
        <div className="space-y-3">
          {/* Music Sub-Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: "discover", label: "Discover & Charts", Icon: Sparkles },
                { id: "library", label: `All Songs (${TAMALE_MUSIC_TRACKS.length})`, Icon: Disc3 },
                { id: "artists", label: "Northern Artists", Icon: UserCheck },
                { id: "albums", label: "Albums", Icon: ListMusic },
                { id: "playlists", label: `Playlists (${allPlaylists.length})`, Icon: ListMusic },
                { id: "favorites", label: `Favourites (${favoriteTracks.length})`, Icon: Heart },
                { id: "recent", label: `Recent (${recentTracks.length})`, Icon: Clock },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSubTab(id);
                  if (id !== "playlists") setSelectedPlaylistId(null);
                  if (id !== "albums") setSelectedAlbumId(null);
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  subTab === id
                    ? "bg-amber-500 text-[#12100e]"
                    : "bg-[#1f1a16] text-[#cfc8bc] border border-white/10 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Search Bar (works across Discover, Library, Favourites, Recent) */}
          {(subTab === "library" ||
            subTab === "favorites" ||
            subTab === "recent" ||
            subTab === "discover") && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9c9487] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Maccasio, Fancy Gadam, Fad Lan, Hausa, Kologo, Dancehall..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (subTab === "discover" && e.target.value.trim()) {
                    setSubTab("library");
                  }
                }}
                className="w-full min-h-[42px] bg-[#120f0d] border border-white/12 rounded-xl pl-9 pr-3 text-xs text-[#f8f5ef]"
              />
            </div>
          )}

          {/* SUBTAB 1: DISCOVER & CHARTS */}
          {subTab === "discover" && (
            <div className="space-y-4">
              {/* Featured Artists & Artist of the Week */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Featured Northern Artists &amp; Rising Voices
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TAMALE_FEATURED_ARTISTS.slice(0, 4).map((art) => (
                    <div
                      key={art.id}
                      className="p-3 rounded-xl bg-[#1f1a16] border border-white/10 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                          {art.spotlightTag} · {art.primaryGenre}
                        </div>
                        <div className="text-sm font-bold text-[#f8f5ef] truncate">{art.name}</div>
                        <div className="text-[11px] text-[#b5ada0] line-clamp-2 mt-0.5">
                          {art.bio}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => art.trackIds[0] && onPlayTrack(art.trackIds[0], null)}
                        className="min-h-[40px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Play
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tamale Local Top Charts */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Tamale Top Street Charts</span>
                </div>
                <div className="space-y-2">
                  {TAMALE_LOCAL_CHARTS.slice(0, 6).map((trk, idx) =>
                    renderTrackRow(trk, { rank: idx + 1 })
                  )}
                </div>
              </div>

              {/* New Releases */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  New Northern Releases
                </div>
                <div className="space-y-2">
                  {newReleases.slice(0, 4).map((trk) => renderTrackRow(trk))}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: FULL LIBRARY & GENRES */}
          {subTab === "library" && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {genres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenreFilter(g)}
                    className={`min-h-[38px] px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      genreFilter === g
                        ? "bg-amber-500 text-[#12100e]"
                        : "bg-[#1f1a16] text-[#cfc8bc] hover:bg-white/10"
                    }`}
                  >
                    {g === "all" ? "All Genres" : g}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredTracks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 text-xs text-[#9c9487]">
                    No Northern Ghana tracks match your current filter.
                  </div>
                ) : (
                  filteredTracks.map((trk) => renderTrackRow(trk))
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 3: ARTISTS DIRECTORY */}
          {subTab === "artists" && (
            <div className="space-y-2.5">
              {TAMALE_FEATURED_ARTISTS.map((art) => (
                <div
                  key={art.id}
                  className="p-3.5 rounded-xl bg-[#1f1a16] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-amber-400">
                        {art.spotlightTag} · {art.origin}
                      </div>
                      <div className="text-sm font-bold text-[#f8f5ef]">{art.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => art.trackIds[0] && onPlayTrack(art.trackIds[0], null)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs cursor-pointer"
                    >
                      Play Artist
                    </button>
                  </div>
                  <div className="text-xs text-[#cfc8bc]">{art.bio}</div>
                </div>
              ))}
            </div>
          )}

          {/* SUBTAB 4: FEATURED ALBUMS */}
          {subTab === "albums" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TAMALE_ALBUMS.map((alb) => {
                  const active = selectedAlbumId === alb.id;
                  return (
                    <button
                      key={alb.id}
                      type="button"
                      onClick={() => setSelectedAlbumId(active ? null : alb.id)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer ${
                        active
                          ? "bg-[#251d13] border-amber-500"
                          : "bg-[#1f1a16] border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <img
                        src={alb.coverArt}
                        alt={alb.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#f8f5ef] truncate">
                          {alb.title}
                        </div>
                        <div className="text-[11px] text-[#b5ada0] truncate">
                          {alb.artist} · {alb.genre} · {alb.releaseYear}
                        </div>
                        <div className="text-[10px] text-amber-300 font-mono-num">
                          {alb.trackIds.length} tracks
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedAlbumId && (
                <div className="space-y-2 pt-1">
                  {filteredTracks.map((trk) => renderTrackRow(trk))}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 5: PLAYLISTS & CUSTOM PLAYLIST CREATOR */}
          {subTab === "playlists" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#120f0d] border border-white/10 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Create custom playlist (e.g. Lamashegu Ride Mix)..."
                  className="flex-1 min-h-[42px] bg-[#1f1a16] border border-white/15 rounded-xl px-3 text-xs text-[#f8f5ef]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = newPlaylistName.trim();
                    if (!clean) return;
                    onCreatePlaylist(clean);
                    setNewPlaylistName("");
                  }}
                  className="min-h-[42px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Playlist</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allPlaylists.map((pl) => {
                  const active = selectedPlaylistId === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        active
                          ? "bg-[#251d13] border-amber-500"
                          : "bg-[#1f1a16] border-white/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistId(active ? null : pl.id)}
                        className="min-w-0 flex-1 text-left cursor-pointer min-h-[40px]"
                      >
                        <div className="text-xs font-bold text-[#f8f5ef] truncate">
                          {pl.name} {pl.isCustom ? "· Custom" : ""}
                        </div>
                        <div className="text-[11px] text-[#9c9487] truncate">
                          {pl.trackIds.length} songs · {pl.description}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {pl.trackIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onPlayPlaylist(pl.id)}
                            className="min-h-[38px] px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#12100e] text-xs font-bold cursor-pointer"
                          >
                            Play
                          </button>
                        )}
                        {pl.isCustom && (
                          <button
                            type="button"
                            onClick={() => onDeletePlaylist(pl.id)}
                            aria-label={`Delete ${pl.name}`}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#9c9487] hover:text-red-300 hover:bg-white/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPlaylistId && (
                <div className="space-y-2 pt-1">
                  {filteredTracks.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 text-xs text-[#9c9487]">
                      This playlist is empty. Tap the + icon on any track in Library or Discover to add songs.
                    </div>
                  ) : (
                    filteredTracks.map((trk) =>
                      renderTrackRow(trk, {
                        playlistContextId: selectedPlaylistId,
                        removablePlaylistId: activeCustomPlaylist ? activeCustomPlaylist.id : undefined,
                      })
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 6 & 7: FAVOURITES & RECENTLY PLAYED */}
          {(subTab === "favorites" || subTab === "recent") && (
            <div className="space-y-2">
              {filteredTracks.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 text-xs text-[#9c9487]">
                  {subTab === "favorites"
                    ? "Tap the heart button on any Tamale track to save your favourites."
                    : "Play any Northern Ghana track or radio station to build your listening history."}
                </div>
              ) : (
                filteredTracks.map((trk) => renderTrackRow(trk))
              )}
            </div>
          )}
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
      <img
        src={snapshot.currentTrack.coverArt}
        alt={snapshot.currentTrack.album}
        className="w-8 h-8 rounded-md object-cover shrink-0 border border-white/10"
      />
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
        <div className="text-xs font-semibold text-[#f8f5ef] truncate max-w-[165px] sm:max-w-[235px]">
          {snapshot.currentTrack.title}
        </div>
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={snapshot.isPlaying ? "Pause radio or music" : "Play radio or music"}
        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-amber-500 text-[#12100e] cursor-pointer"
      >
        {snapshot.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next track"
        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-[#f8f5ef] cursor-pointer"
      >
        <SkipForward className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onStop}
        aria-label="Close mini radio bar"
        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#9c9487] hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
