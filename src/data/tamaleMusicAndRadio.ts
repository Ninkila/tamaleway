import {
  AlbumCollection,
  ArtistProfileSummary,
  MusicTrack,
  RadioStation,
  UserPlaylist,
  WeatherType,
} from "../types/game";

/**
 * Generates an offline, zero-external-network SVG album artwork data URI
 * styled with Northern Ghanaian fugu/batakari geometric weave bands.
 */
export function buildTrackCoverSvg(
  title: string,
  artist: string,
  palette: [string, string, string]
): string {
  const [bg, accent, hi] = palette;
  const safeTitle = title.replace(/[<>&"']/g, "").slice(0, 22);
  const safeArtist = artist.replace(/[<>&"']/g, "").slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#120f0d"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="18" fill="url(#g)"/>
    <rect x="0" y="18" width="200" height="10" fill="${accent}" opacity="0.88"/>
    <rect x="0" y="34" width="200" height="4" fill="${hi}" opacity="0.72"/>
    <polygon points="100,48 144,96 100,144 56,96" fill="none" stroke="${hi}" stroke-width="5" opacity="0.85"/>
    <circle cx="100" cy="96" r="24" fill="${accent}" opacity="0.9"/>
    <circle cx="100" cy="96" r="8" fill="#120f0d"/>
    <rect x="0" y="152" width="200" height="48" fill="#0d0b09" opacity="0.86"/>
    <text x="14" y="172" font-family="sans-serif" font-size="12" font-weight="700" fill="#f8f5ef">${safeTitle}</text>
    <text x="14" y="189" font-family="sans-serif" font-size="10" fill="${hi}">${safeArtist}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface LicenseValidationResult {
  validForExternalAudio: boolean;
  isClearedForPublicDistribution: boolean;
  disclosureLabel: string;
  shouldFallbackToSynth: boolean;
}

/**
 * Strictly validates track licensing & copyright honesty.
 * Tracks marked "awaiting-authorization" or lacking cleared audio files NEVER
 * claim artist clearance or attempt unauthorized external audio playback.
 */
export function validateTrackLicense(track: MusicTrack): LicenseValidationResult {
  const hasAudioUrl = Boolean(track.audioUrl && track.audioUrl.trim().length > 0);
  const isClearedStatus =
    track.licenseStatus === "licensed-audio-file" ||
    track.licenseStatus === "artist-approved" ||
    track.licenseStatus === "royalty-free";

  if (
    isClearedStatus &&
    track.permissionStatus === "cleared-for-distribution" &&
    hasAudioUrl
  ) {
    return {
      validForExternalAudio: true,
      isClearedForPublicDistribution: true,
      disclosureLabel:
        track.licenseStatus === "royalty-free"
          ? "Royalty-Free Cleared Audio"
          : "Licensed / Artist-Approved Audio",
      shouldFallbackToSynth: false,
    };
  }

  if (track.licenseStatus === "awaiting-authorization") {
    return {
      validForExternalAudio: false,
      isClearedForPublicDistribution: false,
      disclosureLabel: "Awaiting Artist Authorization · Synth Groove Preview",
      shouldFallbackToSynth: true,
    };
  }

  return {
    validForExternalAudio: false,
    isClearedForPublicDistribution: track.permissionStatus === "procedural-original",
    disclosureLabel: "Procedural Northern Synth Groove",
    shouldFallbackToSynth: true,
  };
}

export function canDistributeTrackPublicly(track: MusicTrack): boolean {
  return validateTrackLicense(track).isClearedForPublicDistribution;
}

interface RawTrackSeed
  extends Omit<MusicTrack, "coverArt" | "playlistIds"> {
  playlistIds?: string[];
}

const RAW_TRACKS: RawTrackSeed[] = [
  {
    id: "trk_maccasio_zero_to_hero",
    title: "Tamale Rising (Zero to Hero Tribute)",
    artist: "Maccasio",
    album: "69 Boss Tape",
    releaseYear: 2019,
    explicit: false,
    region: "Tamale",
    genre: "Northern Hip-Hop",
    mood: "Energetic · Street Anthem",
    bpm: 106,
    durationSec: 175,
    scaleNotes: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66],
    grooveStyle: "dondo_hiphop",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "69 Fans / Zola Management",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#78350f", "#f59e0b", "#fef08a"],
    featured: true,
    chartRank: 1,
    notes: "Northern Hip-Hop procedural groove honoring Tamale rap cadence and dondo percussion.",
  },
  {
    id: "trk_fancy_gadam_total_cheat",
    title: "Total Cheat Tribute (Gadam Nation)",
    artist: "Fancy Gadam",
    album: "Dream Album",
    releaseYear: 2018,
    explicit: false,
    region: "Tamale",
    genre: "Afrobeat",
    mood: "Upbeat · Celebration",
    bpm: 118,
    durationSec: 184,
    scaleNotes: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63],
    grooveStyle: "afrobeat",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Gadam Nation Music",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#064e3b", "#10b981", "#a7f3d0"],
    featured: true,
    chartRank: 2,
    notes: "Bright Afrobeat log-drum & guitar pluck groove inspired by Aliu Mahama Stadium nights.",
  },
  {
    id: "trk_fad_lan_dagbon_rap",
    title: "Gbewaa Street Bars",
    artist: "Fad Lan",
    featuredArtist: "Tamale Cypher",
    album: "Dagbon Chronicles",
    releaseYear: 2024,
    explicit: false,
    region: "Dagbon",
    genre: "Dagbon Rap",
    mood: "Fierce · Lyrical",
    bpm: 102,
    durationSec: 168,
    scaleNotes: [130.81, 155.56, 174.61, 196.0, 233.08, 261.63],
    grooveStyle: "dondo_hiphop",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Northern Rap Collective",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#4c1d95", "#a855f7", "#e9d5ff"],
    isNewRelease: true,
    chartRank: 3,
    notes: "Hard-hitting Dagbani rap cadence over dondo talking-drum kicks.",
  },
  {
    id: "trk_ataaka_sagnarigu_bars",
    title: "Sagnarigu Concrete",
    artist: "Ataaka",
    album: "North Side Volume II",
    releaseYear: 2023,
    explicit: false,
    region: "Tamale",
    genre: "Dagbon Rap",
    mood: "Confident · Street",
    bpm: 110,
    durationSec: 166,
    scaleNotes: [146.83, 164.81, 196.0, 220.0, 261.63],
    grooveStyle: "dondo_hiphop",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Ataaka Music",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#7c2d12", "#ea580c", "#fed7aa"],
    chartRank: 5,
    notes: "Crisp kick-snare Dagbon Rap bounce tailored for Sagnarigu & Choggu avenues.",
  },
  {
    id: "trk_fancy_gadam_yuli",
    title: "Yuli Sunset",
    artist: "Fancy Gadam",
    album: "Dream Album",
    releaseYear: 2020,
    explicit: false,
    region: "Tamale",
    genre: "Afrobeat",
    mood: "Warm · Evening",
    bpm: 104,
    durationSec: 190,
    scaleNotes: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23],
    grooveStyle: "afrobeat",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Gadam Nation Music",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#0f766e", "#14b8a6", "#ccfbf1"],
    chartRank: 6,
    notes: "Smooth evening Afrobeat pulse suited for High Street drives and Jubilee Park nights.",
  },
  {
    id: "trk_wiz_child_choggu",
    title: "Choggu Nights",
    artist: "Wiz Child",
    album: "Savannah Gold",
    releaseYear: 2022,
    explicit: false,
    region: "Tamale",
    genre: "Hiplife",
    mood: "Smooth · Chill",
    bpm: 100,
    durationSec: 162,
    scaleNotes: [146.83, 164.81, 196.0, 220.0, 261.63, 293.66],
    grooveStyle: "afrobeat",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Wiz Child Records",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#1e3a8a", "#3b82f6", "#bfdbfe"],
    chartRank: 4,
    notes: "Melodic Northern Hiplife groove with warm synth chords.",
  },
  {
    id: "trk_sapashini_hiplife",
    title: "Aboabo Market Hustle",
    artist: "Sapashini",
    album: "Savannah Gold",
    releaseYear: 2024,
    explicit: false,
    region: "Tamale",
    genre: "Hiplife",
    mood: "Gritty · Optimistic",
    bpm: 106,
    durationSec: 174,
    scaleNotes: [164.81, 196.0, 220.0, 261.63, 329.63],
    grooveStyle: "highlife",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Sapashini Music",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#831843", "#ec4899", "#fbcfe8"],
    isNewRelease: true,
    chartRank: 9,
    notes: "Syncopated Ghanaian Hiplife guitar pocket for midday market deliveries.",
  },
  {
    id: "trk_don_sigli_savannah",
    title: "Pragya Ride Anthem",
    artist: "Don Sigli",
    album: "Northern Express",
    releaseYear: 2021,
    explicit: false,
    region: "Tamale",
    genre: "Northern Hip-Hop",
    mood: "Motivating · Urban",
    bpm: 108,
    durationSec: 170,
    scaleNotes: [130.81, 146.83, 174.61, 196.0, 220.0, 261.63],
    grooveStyle: "dondo_hiphop",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Sigli Entertainment",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#713f12", "#eab308", "#fef08a"],
    chartRank: 7,
    notes: "Street-wise Tamale rap rhythm built for delivery runs from Aboabo to Lamashegu.",
  },
  {
    id: "trk_sherif_ghale_dancehall",
    title: "Savelugu Road Dub",
    artist: "Sherif Ghale",
    album: "Red Clay Roots",
    releaseYear: 2020,
    explicit: false,
    region: "Northern Ghana",
    genre: "Dancehall",
    mood: "Roots · Steady",
    bpm: 92,
    durationSec: 204,
    scaleNotes: [130.81, 155.56, 174.61, 196.0, 233.08],
    grooveStyle: "reggae",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Sherif Ghale Roots",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#14532d", "#22c55e", "#bbf7d0"],
    featured: true,
    chartRank: 8,
    notes: "Off-beat Northern Roots Dancehall skank chords and deep savannah bassline.",
  },
  {
    id: "trk_kawastone_dancehall",
    title: "Vittin Night Riddim",
    artist: "Kawastone",
    album: "Red Clay Roots",
    releaseYear: 2024,
    explicit: false,
    region: "Tamale",
    genre: "Dancehall",
    mood: "Nightlife · Heavy",
    bpm: 98,
    durationSec: 186,
    scaleNotes: [146.83, 174.61, 196.0, 233.08, 293.66],
    grooveStyle: "reggae",
    licenseStatus: "awaiting-authorization",
    licenseOwner: "Kawastone Yard",
    permissionStatus: "pending-artist-clearance",
    coverPalette: ["#312e81", "#6366f1", "#c7d2fe"],
    isNewRelease: true,
    chartRank: 10,
    notes: "Late-evening Tamale dancehall riddim for Vittin & Kalpohin lounges.",
  },
  {
    id: "trk_dagbon_dondo_damba",
    title: "Damba Chugu · Dondo & Gungon",
    artist: "Dakpema Royal Drummers",
    album: "Dagbon Palace Heritage",
    releaseYear: 2021,
    explicit: false,
    region: "Dagbon",
    genre: "Traditional",
    mood: "Ceremonial · Cultural",
    bpm: 122,
    durationSec: 210,
    scaleNotes: [146.83, 174.61, 196.0, 220.0, 261.63],
    grooveStyle: "traditional_drum",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Cultural Archive",
    permissionStatus: "procedural-original",
    coverPalette: ["#92400e", "#d97706", "#fde68a"],
    featured: true,
    chartRank: 11,
    notes: "Procedural talking-drum (dondo) & gungon cadence honoring Dagbon festival traditions.",
  },
  {
    id: "trk_takai_ensemble",
    title: "Takai Courtyard Rhythm",
    artist: "Yendi & Tamale Percussion Guild",
    album: "Dagbon Palace Heritage",
    releaseYear: 2022,
    explicit: false,
    region: "Dagbon",
    genre: "Traditional",
    mood: "Proud · Heritage",
    bpm: 116,
    durationSec: 196,
    scaleNotes: [164.81, 196.0, 220.0, 246.94, 293.66],
    grooveStyle: "traditional_drum",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Cultural Archive",
    permissionStatus: "procedural-original",
    coverPalette: ["#7c2d12", "#f97316", "#ffedd5"],
    notes: "Syncopated festival percussion and flute motif celebrating Takai dance.",
  },
  {
    id: "trk_kologo_folk",
    title: "Savannah Kologo Morning",
    artist: "Bolga-Tamale String Collective",
    album: "Dawn Over Red Clay",
    releaseYear: 2023,
    explicit: false,
    region: "Northern Ghana",
    genre: "Folk",
    mood: "Acoustic · Dawn",
    bpm: 94,
    durationSec: 172,
    scaleNotes: [174.61, 196.0, 220.0, 261.63, 293.66],
    grooveStyle: "instrumental_kologo",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Acoustic Studio",
    permissionStatus: "procedural-original",
    coverPalette: ["#57534e", "#a8a29e", "#fde68a"],
    notes: "Plucked northern two-string kologo folk motif for calm Harmattan dawns.",
  },
  {
    id: "trk_ayisoba_folk_tribute",
    title: "Frafra & Dagbon Folk Strings",
    artist: "Lamashegu Youth Kologo",
    album: "Dawn Over Red Clay",
    releaseYear: 2024,
    explicit: false,
    region: "Northern Ghana",
    genre: "Folk",
    mood: "Earthy · Storytelling",
    bpm: 100,
    durationSec: 178,
    scaleNotes: [146.83, 174.61, 196.0, 220.0, 293.66],
    grooveStyle: "instrumental_kologo",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Acoustic Studio",
    permissionStatus: "procedural-original",
    coverPalette: ["#44403c", "#d97706", "#fef3c7"],
    isNewRelease: true,
    notes: "Northern gourd-lute groove celebrating market storytellers.",
  },
  {
    id: "trk_northern_gospel",
    title: "Morning Grace (Choggu Choir)",
    artist: "Tamale Savannah Voices",
    album: "Choggu Praise Hymns",
    releaseYear: 2022,
    explicit: false,
    region: "Northern Ghana",
    genre: "Gospel",
    mood: "Uplifting · Peaceful",
    bpm: 96,
    durationSec: 194,
    scaleNotes: [196.0, 246.94, 261.63, 293.66, 329.63, 392.0],
    grooveStyle: "gospel",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Choir Collective",
    permissionStatus: "procedural-original",
    coverPalette: ["#0369a1", "#38bdf8", "#e0f2fe"],
    notes: "Warm praise chord progression with steady tambourine pulse.",
  },
  {
    id: "trk_nyohini_gospel",
    title: "Sunday Bell in Nyohini",
    artist: "Tamale Savannah Voices",
    album: "Choggu Praise Hymns",
    releaseYear: 2024,
    explicit: false,
    region: "Tamale",
    genre: "Gospel",
    mood: "Joyful · Worship",
    bpm: 104,
    durationSec: 182,
    scaleNotes: [164.81, 196.0, 246.94, 261.63, 329.63],
    grooveStyle: "gospel",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Choir Collective",
    permissionStatus: "procedural-original",
    coverPalette: ["#1e40af", "#60a5fa", "#dbeafe"],
    isNewRelease: true,
    notes: "Bright uplifting northern gospel groove with rhythmic handclap cadence.",
  },
  {
    id: "trk_hausa_zongo_kalangu",
    title: "Aboabo Zongo Kalangu Groove",
    artist: "Suhuyini Zongo Ensemble",
    album: "Zongo Crossroads",
    releaseYear: 2023,
    explicit: false,
    region: "Tamale",
    genre: "Hausa Music",
    mood: "Festive · Rhythmic",
    bpm: 118,
    durationSec: 185,
    scaleNotes: [146.83, 174.61, 207.65, 220.0, 261.63, 293.66],
    grooveStyle: "hausa_percussion",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Heritage Archive",
    permissionStatus: "procedural-original",
    coverPalette: ["#065f46", "#34d399", "#fef08a"],
    featured: true,
    chartRank: 12,
    notes: "Hausa kalangu talking drum & metallic bell celebration heard across Aboabo & Sakasaka.",
  },
  {
    id: "trk_malam_gariba_hausa",
    title: "Alhamdulillah (Zongo Evening)",
    artist: "Malam Gariba Hausa Band",
    album: "Zongo Crossroads",
    releaseYear: 2024,
    explicit: false,
    region: "Northern Ghana",
    genre: "Hausa Music",
    mood: "Serene · Devotional",
    bpm: 108,
    durationSec: 192,
    scaleNotes: [164.81, 196.0, 220.0, 261.63, 311.13],
    grooveStyle: "hausa_percussion",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Heritage Archive",
    permissionStatus: "procedural-original",
    coverPalette: ["#047857", "#10b981", "#d1fae5"],
    notes: "Melodic Hausa acoustic cadence with gourd shaker and gentle percussion.",
  },
  {
    id: "trk_highlife_palmwine",
    title: "Gbewaa Highlife Breeze",
    artist: "Northern Star Highlife Band",
    album: "High Street Classics",
    releaseYear: 2019,
    explicit: false,
    region: "Ghana",
    genre: "Highlife",
    mood: "Relaxed · Classic",
    bpm: 98,
    durationSec: 188,
    scaleNotes: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
    grooveStyle: "highlife",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Studio Ensemble",
    permissionStatus: "procedural-original",
    coverPalette: ["#854d0e", "#facc15", "#fef9c3"],
    notes: "Classic Ghanaian guitar-picking Highlife cadence heard at roadside chop bars.",
  },
  {
    id: "trk_tamale_golden_highlife",
    title: "Piccadilly Circle Highlife",
    artist: "Northern Star Highlife Band",
    album: "High Street Classics",
    releaseYear: 2023,
    explicit: false,
    region: "Tamale",
    genre: "Highlife",
    mood: "Warm · Nostalgic",
    bpm: 102,
    durationSec: 176,
    scaleNotes: [174.61, 220.0, 261.63, 293.66, 349.23],
    grooveStyle: "highlife",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Studio Ensemble",
    permissionStatus: "procedural-original",
    coverPalette: ["#9a3412", "#fb923c", "#ffedd5"],
    notes: "Horn-inspired synth highlife bounce celebrating central Tamale shops.",
  },
  {
    id: "trk_kologo_instrumental",
    title: "Red Clay Sunset (Instrumental)",
    artist: "Tamale Instrumental Collective",
    album: "Savannah Horizons",
    releaseYear: 2024,
    explicit: false,
    region: "Tamale",
    genre: "Instrumental",
    mood: "Meditative · Focus",
    bpm: 90,
    durationSec: 200,
    scaleNotes: [146.83, 196.0, 220.0, 261.63, 293.66, 349.23],
    grooveStyle: "instrumental_kologo",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Studio Ensemble",
    permissionStatus: "procedural-original",
    coverPalette: ["#7f1d1d", "#ef4444", "#fecaca"],
    isNewRelease: true,
    notes: "Pure instrumental gourd-string and warm Rhodes progression for cruising Tamale.",
  },
  {
    id: "trk_shea_breeze_instrumental",
    title: "Kukuo Shea Grove (Instrumental)",
    artist: "Tamale Instrumental Collective",
    album: "Savannah Horizons",
    releaseYear: 2023,
    explicit: false,
    region: "Dagbon",
    genre: "Instrumental",
    mood: "Ambient · Breezy",
    bpm: 84,
    durationSec: 188,
    scaleNotes: [164.81, 196.0, 246.94, 293.66, 329.63],
    grooveStyle: "instrumental_kologo",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Studio Ensemble",
    permissionStatus: "procedural-original",
    coverPalette: ["#3f6212", "#84cc16", "#ecfccb"],
    notes: "Calm savannah instrumental motif for morning studies at UDS Dungu.",
  },
  {
    id: "trk_contemporary_afro_fusion",
    title: "Savannah Neon (Afro-Fusion)",
    artist: "Nadia K. & Tamale Fusion",
    album: "Urban North",
    releaseYear: 2024,
    explicit: false,
    region: "Tamale",
    genre: "Contemporary African",
    mood: "Modern · Stylish",
    bpm: 114,
    durationSec: 179,
    scaleNotes: [164.81, 196.0, 220.0, 261.63, 329.63, 392.0],
    grooveStyle: "afrobeat",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Studio Ensemble",
    permissionStatus: "procedural-original",
    coverPalette: ["#6b21a8", "#d946ef", "#fae8ff"],
    isNewRelease: true,
    notes: "Contemporary Northern African fusion blending electronic plucks with Dagbon rhythms.",
  },
  {
    id: "trk_dungu_campus_fusion",
    title: "UDS Dungu Nights",
    artist: "Nadia K. & Tamale Fusion",
    album: "Urban North",
    releaseYear: 2024,
    explicit: false,
    region: "Northern Ghana",
    genre: "Contemporary African",
    mood: "Youthful · Chill",
    bpm: 105,
    durationSec: 171,
    scaleNotes: [146.83, 174.61, 220.0, 261.63, 329.63],
    grooveStyle: "afrobeat",
    licenseStatus: "procedural-preview",
    licenseOwner: "Tamale 3D Studio Ensemble",
    permissionStatus: "procedural-original",
    coverPalette: ["#0f172a", "#38bdf8", "#bae6fd"],
    notes: "Smooth contemporary African groove popular around UDS Dungu hostels and cafés.",
  },
];

const PLAYLIST_MEMBERSHIP: Record<string, string[]> = {
  pl_tamale_hits: [
    "trk_maccasio_zero_to_hero",
    "trk_fancy_gadam_total_cheat",
    "trk_fad_lan_dagbon_rap",
    "trk_wiz_child_choggu",
    "trk_don_sigli_savannah",
    "trk_ataaka_sagnarigu_bars",
  ],
  pl_dagbon_heritage: [
    "trk_dagbon_dondo_damba",
    "trk_takai_ensemble",
    "trk_kologo_folk",
    "trk_ayisoba_folk_tribute",
    "trk_hausa_zongo_kalangu",
    "trk_highlife_palmwine",
  ],
  pl_night_cruise: [
    "trk_fancy_gadam_yuli",
    "trk_kawastone_dancehall",
    "trk_sherif_ghale_dancehall",
    "trk_contemporary_afro_fusion",
    "trk_dungu_campus_fusion",
    "trk_kologo_instrumental",
  ],
  pl_zongo_market_energy: [
    "trk_hausa_zongo_kalangu",
    "trk_malam_gariba_hausa",
    "trk_sapashini_hiplife",
    "trk_tamale_golden_highlife",
    "trk_northern_gospel",
    "trk_nyohini_gospel",
  ],
};

export const TAMALE_MUSIC_TRACKS: MusicTrack[] = RAW_TRACKS.map((raw) => {
  const playlistIds = Object.entries(PLAYLIST_MEMBERSHIP)
    .filter(([, ids]) => ids.includes(raw.id))
    .map(([plId]) => plId);
  return {
    ...raw,
    coverArt: buildTrackCoverSvg(raw.title, raw.artist, raw.coverPalette),
    playlistIds,
  };
});

export const TAMALE_PLAYLISTS: UserPlaylist[] = [
  {
    id: "pl_tamale_hits",
    name: "Tamale Street & Stadium",
    description: "Maccasio, Fancy Gadam, Fad Lan, Wiz Child, Ataaka & Don Sigli",
    trackIds: PLAYLIST_MEMBERSHIP.pl_tamale_hits,
  },
  {
    id: "pl_dagbon_heritage",
    name: "Dagbon Roots, Dondo & Folk",
    description: "Damba talking drums, Takai, Kologo folk & classic Highlife",
    trackIds: PLAYLIST_MEMBERSHIP.pl_dagbon_heritage,
  },
  {
    id: "pl_night_cruise",
    name: "Gbewaa Night Cruise",
    description: "Smooth Afrobeat, Dancehall dubs, Contemporary Fusion & Instrumentals",
    trackIds: PLAYLIST_MEMBERSHIP.pl_night_cruise,
  },
  {
    id: "pl_zongo_market_energy",
    name: "Zongo, Hiplife & Morning Praise",
    description: "Aboabo Hausa Kalangu, Market Hiplife & Choggu Gospel",
    trackIds: PLAYLIST_MEMBERSHIP.pl_zongo_market_energy,
  },
];

export const TAMALE_FEATURED_ARTISTS: ArtistProfileSummary[] = [
  {
    id: "art_maccasio",
    name: "Maccasio",
    origin: "Tamale · 69 Fans",
    primaryGenre: "Northern Hip-Hop",
    spotlightTag: "Featured Northern Artist",
    bio: "Trailblazing Tamale hip-hop voice uniting Northern pride with arena-scale Zola & dondo percussion energy.",
    palette: ["#78350f", "#f59e0b", "#fef08a"],
    trackIds: ["trk_maccasio_zero_to_hero"],
  },
  {
    id: "art_fancy_gadam",
    name: "Fancy Gadam",
    origin: "Tamale · Gadam Nation",
    primaryGenre: "Afrobeat",
    spotlightTag: "Artist of the Week",
    bio: "Stadium-filling Tamale Afrobeat star bringing Northern Ghana melodies to the national stage.",
    palette: ["#064e3b", "#10b981", "#a7f3d0"],
    trackIds: ["trk_fancy_gadam_total_cheat", "trk_fancy_gadam_yuli"],
  },
  {
    id: "art_fad_lan",
    name: "Fad Lan",
    origin: "Tamale · Dagbon Cypher",
    primaryGenre: "Dagbon Rap",
    spotlightTag: "Upcoming Artist",
    bio: "Sharp Dagbani lyricist blending rapid-fire street storytelling with traditional percussion pockets.",
    palette: ["#4c1d95", "#a855f7", "#e9d5ff"],
    trackIds: ["trk_fad_lan_dagbon_rap"],
  },
  {
    id: "art_suhuyini_zongo",
    name: "Suhuyini Zongo Ensemble",
    origin: "Aboabo Zongo, Tamale",
    primaryGenre: "Hausa Music",
    spotlightTag: "Heritage Custodian",
    bio: "Acoustic kalangu, gourd shaker, and praise vocal collective rooted in Aboabo market crossroads.",
    palette: ["#065f46", "#34d399", "#fef08a"],
    trackIds: ["trk_hausa_zongo_kalangu"],
  },
  {
    id: "art_sherif_ghale",
    name: "Sherif Ghale",
    origin: "Tamale · Northern Ghana",
    primaryGenre: "Dancehall",
    spotlightTag: "Featured Northern Artist",
    bio: "Reggae and dancehall pioneer voicing Northern Ghanaian resilience and conscious savannah grooves.",
    palette: ["#14532d", "#22c55e", "#bbf7d0"],
    trackIds: ["trk_sherif_ghale_dancehall"],
  },
  {
    id: "art_nadia_fusion",
    name: "Nadia K. & Tamale Fusion",
    origin: "UDS Dungu & Sagnarigu",
    primaryGenre: "Contemporary African",
    spotlightTag: "Upcoming Artist",
    bio: "Fresh university-district afro-fusion sound combining modern synths with northern acoustic phrasing.",
    palette: ["#6b21a8", "#d946ef", "#fae8ff"],
    trackIds: ["trk_contemporary_afro_fusion", "trk_dungu_campus_fusion"],
  },
];

export const TAMALE_ALBUMS: AlbumCollection[] = (() => {
  const byAlbum = new Map<string, MusicTrack[]>();
  for (const trk of TAMALE_MUSIC_TRACKS) {
    const arr = byAlbum.get(trk.album) ?? [];
    arr.push(trk);
    byAlbum.set(trk.album, arr);
  }
  const albums: AlbumCollection[] = [];
  let idx = 0;
  for (const [albumTitle, tracks] of byAlbum.entries()) {
    const first = tracks[0];
    albums.push({
      id: `alb_${idx++}`,
      title: albumTitle,
      artist: first.artist,
      releaseYear: first.releaseYear,
      genre: first.genre,
      coverPalette: first.coverPalette,
      coverArt: first.coverArt,
      trackIds: tracks.map((t) => t.id),
      featured: Boolean(first.featured || tracks.length > 1),
    });
  }
  return albums;
})();

export const TAMALE_LOCAL_CHARTS: MusicTrack[] = TAMALE_MUSIC_TRACKS.filter(
  (t) => typeof t.chartRank === "number"
).sort((a, b) => (a.chartRank ?? 999) - (b.chartRank ?? 999));

export const TAMALE_RADIO_STATIONS: RadioStation[] = [
  {
    id: "rad_northern_hits",
    name: "Northern Hits FM",
    frequency: "98.7 MHz",
    tagline: "Tamale's #1 Street & Stadium Sound",
    genreFocus: "Northern Hip-Hop, Dagbon Rap & Afrobeat",
    hostName: "DJ Gbewaa",
    hostStyle: "High-energy Tamale music & shoutouts",
    trackIds: [
      "trk_maccasio_zero_to_hero",
      "trk_fancy_gadam_total_cheat",
      "trk_fad_lan_dagbon_rap",
      "trk_don_sigli_savannah",
      "trk_wiz_child_choggu",
    ],
    color: "#f59e0b",
  },
  {
    id: "rad_dagbon_classics",
    name: "Dagbon Classics",
    frequency: "92.3 MHz",
    tagline: "Celebrating Dagbon Culture & Proverbs",
    genreFocus: "Traditional, Folk & Highlife",
    hostName: "Maalam Fuseini",
    hostStyle: "Respectful cultural storytelling & proverbs",
    trackIds: [
      "trk_dagbon_dondo_damba",
      "trk_takai_ensemble",
      "trk_highlife_palmwine",
      "trk_kologo_folk",
      "trk_tamale_golden_highlife",
    ],
    color: "#059669",
  },
  {
    id: "rad_tamale_urban",
    name: "Tamale Urban 101",
    frequency: "101.5 MHz",
    tagline: "Nonstop Rap, Dancehall & Nightlife",
    genreFocus: "Dagbon Rap, Dancehall & Contemporary African",
    hostName: "Bintou Vibes",
    hostStyle: "Fast-paced city nightlife updates",
    trackIds: [
      "trk_ataaka_sagnarigu_bars",
      "trk_fancy_gadam_yuli",
      "trk_kawastone_dancehall",
      "trk_sherif_ghale_dancehall",
      "trk_contemporary_afro_fusion",
    ],
    color: "#ea580c",
  },
  {
    id: "rad_traditional_sounds",
    name: "Traditional & Zongo Sounds",
    frequency: "89.1 MHz",
    tagline: "Dondo, Kalangu, Gungon & Northern Folk",
    genreFocus: "Traditional, Hausa Music & Kologo Folk",
    hostName: "Elder Alhassan",
    hostStyle: "Acoustic heritage & festival announcements",
    trackIds: [
      "trk_dagbon_dondo_damba",
      "trk_hausa_zongo_kalangu",
      "trk_malam_gariba_hausa",
      "trk_takai_ensemble",
      "trk_ayisoba_folk_tribute",
    ],
    color: "#b45309",
  },
  {
    id: "rad_ghana_mix",
    name: "Ghana Mix 95",
    frequency: "95.5 MHz",
    tagline: "Highlife, Hiplife, Gospel & Afrobeat",
    genreFocus: "All-Ghana Variety",
    hostName: "Amina S.",
    hostStyle: "Warm daytime commuter companion",
    trackIds: [
      "trk_highlife_palmwine",
      "trk_sapashini_hiplife",
      "trk_northern_gospel",
      "trk_sherif_ghale_dancehall",
      "trk_dungu_campus_fusion",
    ],
    color: "#0284c7",
  },
  {
    id: "rad_community",
    name: "Tamale Community FM",
    frequency: "90.9 MHz",
    tagline: "Neighbourhood Markets, Youth & Voices",
    genreFocus: "Community Announcements & Local Artists",
    hostName: "Sadia Issah",
    hostStyle: "Local market & district bulletin",
    trackIds: [
      "trk_wiz_child_choggu",
      "trk_kologo_folk",
      "trk_nyohini_gospel",
      "trk_maccasio_zero_to_hero",
      "trk_hausa_zongo_kalangu",
    ],
    color: "#7c3aed",
  },
  {
    id: "rad_news_talk",
    name: "Savannah News & Talk",
    frequency: "96.1 MHz",
    tagline: "Traffic, Weather & Metropolitan Updates",
    genreFocus: "Talk, Instrumentals & Transit Advisories",
    hostName: "Abdul-Malik Newsdesk",
    hostStyle: "Clear civic reports, weather & traffic updates",
    trackIds: [
      "trk_kologo_instrumental",
      "trk_shea_breeze_instrumental",
      "trk_highlife_palmwine",
    ],
    color: "#0f766e",
    isTalkFocused: true,
  },
];

/**
 * Generates non-repeating dynamic DJ / broadcast commentary reflecting
 * current game time, weather, active city event, and Tamale road conditions.
 */
export function buildDynamicRadioSegment(params: {
  station: RadioStation;
  gameMinutes: number;
  weather: WeatherType;
  district: string;
  activeCityEventLabel: string;
  lastLine?: string;
}): string {
  const { station, gameMinutes, weather, district, activeCityEventLabel, lastLine } = params;
  const hour = Math.floor((((gameMinutes % 1440) + 1440) % 1440) / 60);
  const greeting =
    hour >= 5 && hour < 12
      ? "Dasuba Tamale!"
      : hour >= 12 && hour < 17
      ? "Wuntanga Northern Ghana!"
      : hour >= 17 && hour < 20
      ? "Zaawuni good evening!"
      : "Aniniwula — late night on the savannah!";

  const weatherNote =
    weather === "harmattan"
      ? "Dry Harmattan haze is sweeping across Bolga Road — Pragya riders, keep a bottle of water close."
      : weather === "thunderstorm"
      ? "Heavy thunderstorm cells over Sagnarigu and Central Market — pull under shelter if on a moto!"
      : weather === "rain" || weather === "light_rain"
      ? "Cool rains across Tamale today; watch slick corners around the Naa Gbewaa Interchange."
      : weather === "heat"
      ? "Strong savannah sunshine this afternoon — grab chilled sobolo or baobab juice."
      : weather === "cloudy"
      ? "Calm overcast skies drifting over Jubilee Park and Dabokpaa."
      : "Clear bright savannah skies across all seventeen Tamale communities.";

  const trafficNote =
    hour >= 7 && hour <= 10
      ? "Morning Pragya & commuter flow is brisk around Central Market, Aboabo, and Gbewaa High Street."
      : hour >= 15 && hour <= 18
      ? "Late-afternoon bustle building at Lamashegu Salaga Road and Tamale Interchange."
      : "Smooth traffic along Vittin Ring, Kalpohin Road, and Teaching Hospital Avenue.";

  const candidates = [
    `${greeting} You're locked into ${station.frequency} ${station.name} with ${station.hostName}. ${weatherNote}`,
    `${station.name} city check: ${trafficNote} Currently broadcasting across ${district}.`,
    `Civic pulse on ${station.name}: ${activeCityEventLabel} energy is in the air — stay safe and greet your neighbours with Antire!`,
    `${station.hostName} on the mic: Respect to every Pragya rider, shea trader, student, and artisan keeping Tamale moving today.`,
    `Northern music pride on ${station.frequency}: celebrating Tamale sounds from Maccasio, Fancy Gadam, and Fad Lan to timeless Dagbon dondo & Zongo kalangu rhythms.`,
  ];

  const filtered = lastLine ? candidates.filter((c) => c !== lastLine) : candidates;
  const pool = filtered.length > 0 ? filtered : candidates;
  const idx = Math.floor((gameMinutes + station.name.length) % pool.length);
  return pool[idx];
}
