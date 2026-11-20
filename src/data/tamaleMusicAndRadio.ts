import { MusicTrack, RadioStation, WeatherType } from "../types/game";

/**
 * Northern Ghana & Tamale Music Player Catalog + Multi-Station Radio Metadata
 *
 * Licensing & Honesty Notice:
 * - No unlicensed commercial MP3 recordings are bundled in this build.
 * - Each track includes a `licenseStatus` field (`"procedural-preview"` out-of-the-box)
 *   powered by a real multi-layer Web Audio Dagbon rhythm/melody synthesizer so
 *   players experience live Northern Ghanaian grooves while exploring or driving.
 * - Tracks also support an optional `audioUrl` when a cleared/licensed file is supplied.
 */
export const TAMALE_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "trk_maccasio_zero_to_hero",
    title: "Tamale Rising (Zero to Hero Tribute)",
    artist: "Maccasio (Northern Hip-Hop Style)",
    region: "Tamale",
    genre: "Northern Hip-Hop",
    mood: "Energetic · Street Anthem",
    bpm: 106,
    durationSec: 175,
    scaleNotes: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66], // D minor pentatonic
    grooveStyle: "dondo_hiphop",
    licenseStatus: "procedural-preview",
    notes: "Northern Hip-Hop procedural groove inspired by Tamale Zola / rap cadence and dondo drums.",
  },
  {
    id: "trk_maccasio_dagbon_bounce",
    title: "Dagbon King Bounce",
    artist: "Maccasio ft. Tamale Youth",
    region: "Dagbon",
    genre: "Northern Hip-Hop",
    mood: "Confident · Driving",
    bpm: 112,
    durationSec: 168,
    scaleNotes: [130.81, 155.56, 174.61, 196.0, 233.08, 261.63],
    grooveStyle: "dondo_hiphop",
    licenseStatus: "procedural-preview",
    notes: "Crisp kick-snare hip-hop pocket layered with synthesized talking-drum accent hits.",
  },
  {
    id: "trk_fancy_gadam_total_cheat",
    title: "Gadam Nation (Interchange Groove)",
    artist: "Fancy Gadam (Afrobeats Style)",
    region: "Tamale",
    genre: "Afrobeats",
    mood: "Upbeat · Celebration",
    bpm: 118,
    durationSec: 184,
    scaleNotes: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63],
    grooveStyle: "afrobeat",
    licenseStatus: "procedural-preview",
    notes: "Bright Afrobeats log-drum & guitar pluck groove inspired by Tamale stadium concerts.",
  },
  {
    id: "trk_fancy_gadam_yuli",
    title: "Sagnarigu Sunset",
    artist: "Fancy Gadam",
    region: "Tamale",
    genre: "Afrobeats",
    mood: "Warm · Evening",
    bpm: 104,
    durationSec: 190,
    scaleNotes: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23],
    grooveStyle: "afrobeat",
    licenseStatus: "procedural-preview",
    notes: "Smooth evening Afropop melody suited for High Street drives and Jubilee Park nights.",
  },
  {
    id: "trk_wiz_child_choggu",
    title: "Choggu Nights",
    artist: "Wiz Child",
    region: "Tamale",
    genre: "Afrobeats",
    mood: "Smooth · Chill",
    bpm: 100,
    durationSec: 162,
    scaleNotes: [146.83, 164.81, 196.0, 220.0, 261.63, 293.66],
    grooveStyle: "afrobeat",
    licenseStatus: "procedural-preview",
    notes: "Melodic Tamale Afrobeats pulse with warm synth chords.",
  },
  {
    id: "trk_don_sigli_savannah",
    title: "Savannah Hustle (Pragya Anthem)",
    artist: "Don Sigli",
    region: "Tamale",
    genre: "Northern Hip-Hop",
    mood: "Motivating · Urban",
    bpm: 108,
    durationSec: 170,
    scaleNotes: [130.81, 146.83, 174.61, 196.0, 220.0, 261.63],
    grooveStyle: "dondo_hiphop",
    licenseStatus: "procedural-preview",
    notes: "Street-wise Tamale rap rhythm built for delivery runs from Aboabo to Lamashegu.",
  },
  {
    id: "trk_dagbon_dondo_damba",
    title: "Damba Chugu · Dondo & Gungon",
    artist: "Dakpema Royal Drummers (Trad.)",
    region: "Dagbon",
    genre: "Dagbon Traditional",
    mood: "Ceremonial · Cultural",
    bpm: 122,
    durationSec: 210,
    scaleNotes: [146.83, 174.61, 196.0, 220.0, 261.63],
    grooveStyle: "traditional_drum",
    licenseStatus: "procedural-preview",
    notes: "Hourglass talking-drum (dondo) & bass gungon cadence honoring Dagbon festival traditions.",
  },
  {
    id: "trk_takai_ensemble",
    title: "Takai Courtyard Rhythm",
    artist: "Yendi & Tamale Percussion Guild",
    region: "Dagbon",
    genre: "Dagbon Traditional",
    mood: "Proud · Heritage",
    bpm: 116,
    durationSec: 196,
    scaleNotes: [164.81, 196.0, 220.0, 246.94, 293.66],
    grooveStyle: "traditional_drum",
    licenseStatus: "procedural-preview",
    notes: "Syncopated percussion and wooden flute motif celebrating Dagbon dance.",
  },
  {
    id: "trk_highlife_palmwine",
    title: "Gbewaa Highlife Breeze",
    artist: "Northern Star Highlife Band",
    region: "Ghana",
    genre: "Highlife",
    mood: "Relaxed · Classic",
    bpm: 98,
    durationSec: 188,
    scaleNotes: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
    grooveStyle: "highlife",
    licenseStatus: "procedural-preview",
    notes: "Classic Ghanaian guitar-picking highlife cadence heard at roadside chop bars.",
  },
  {
    id: "trk_kologo_folk",
    title: "Savannah Kologo Morning",
    artist: "Bolga-Tamale String Collective",
    region: "Northern Ghana",
    genre: "Folk",
    mood: "Acoustic · Dawn",
    bpm: 94,
    durationSec: 172,
    scaleNotes: [174.61, 196.0, 220.0, 261.63, 293.66],
    grooveStyle: "highlife",
    licenseStatus: "procedural-preview",
    notes: "Plucked northern gourd-lute inspired folk motif for quiet mornings.",
  },
  {
    id: "trk_northern_gospel",
    title: "Morning Grace (Choggu Choir)",
    artist: "Tamale Savannah Voices",
    region: "Northern Ghana",
    genre: "Northern Gospel",
    mood: "Uplifting · Peaceful",
    bpm: 96,
    durationSec: 194,
    scaleNotes: [196.0, 246.94, 261.63, 293.66, 329.63, 392.0],
    grooveStyle: "gospel",
    licenseStatus: "procedural-preview",
    notes: "Warm praise chord progression with steady tambourine pulse.",
  },
  {
    id: "trk_tamale_reggae",
    title: "Harmattan Dub (Vittin Sunset)",
    artist: "Savannah Roots Collective",
    region: "Ghana",
    genre: "Reggae/Dancehall",
    mood: "Laid-back · Roots",
    bpm: 86,
    durationSec: 204,
    scaleNotes: [130.81, 155.56, 174.61, 196.0, 233.08],
    grooveStyle: "reggae",
    licenseStatus: "procedural-preview",
    notes: "Off-beat skank chords and deep bassline tailored for Vittin & Nyohini evenings.",
  },
];

export const TAMALE_PLAYLISTS = [
  {
    id: "pl_tamale_hits",
    name: "Tamale Street & Stadium",
    description: "Maccasio, Fancy Gadam, Wiz Child & Don Sigli styles",
    trackIds: [
      "trk_maccasio_zero_to_hero",
      "trk_fancy_gadam_total_cheat",
      "trk_wiz_child_choggu",
      "trk_don_sigli_savannah",
      "trk_maccasio_dagbon_bounce",
    ],
  },
  {
    id: "pl_dagbon_heritage",
    name: "Dagbon Roots & Highlife",
    description: "Dondo talking drums, Takai, Kologo folk & Highlife",
    trackIds: [
      "trk_dagbon_dondo_damba",
      "trk_takai_ensemble",
      "trk_kologo_folk",
      "trk_highlife_palmwine",
    ],
  },
  {
    id: "pl_night_cruise",
    name: "Gbewaa Night Cruise",
    description: "Smooth Afrobeats, Reggae & late-night vibes",
    trackIds: [
      "trk_fancy_gadam_yuli",
      "trk_wiz_child_choggu",
      "trk_tamale_reggae",
      "trk_northern_gospel",
    ],
  },
] as const;

export const TAMALE_RADIO_STATIONS: RadioStation[] = [
  {
    id: "rad_northern_hits",
    name: "Northern Hits FM",
    frequency: "98.7 MHz",
    tagline: "Tamale's #1 Street & Stadium Sound",
    genreFocus: "Northern Hip-Hop & Afrobeats",
    hostName: "DJ Gbewaa",
    hostStyle: "High-energy Tamale music & shoutouts",
    trackIds: [
      "trk_maccasio_zero_to_hero",
      "trk_fancy_gadam_total_cheat",
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
    genreFocus: "Dagbon Traditional & Highlife",
    hostName: "Maalam Fuseini",
    hostStyle: "Respectful cultural storytelling & proverbs",
    trackIds: ["trk_dagbon_dondo_damba", "trk_takai_ensemble", "trk_highlife_palmwine", "trk_kologo_folk"],
    color: "#059669",
  },
  {
    id: "rad_tamale_urban",
    name: "Tamale Urban 101",
    frequency: "101.5 MHz",
    tagline: "Nonstop Rap, Afropop & Nightlife",
    genreFocus: "Tamale Urban & Dancehall",
    hostName: "Bintou Vibes",
    hostStyle: "Fast-paced city nightlife updates",
    trackIds: [
      "trk_maccasio_dagbon_bounce",
      "trk_fancy_gadam_yuli",
      "trk_tamale_reggae",
      "trk_don_sigli_savannah",
    ],
    color: "#ea580c",
  },
  {
    id: "rad_traditional_sounds",
    name: "Traditional Sounds",
    frequency: "89.1 MHz",
    tagline: "Dondo, Gungon & Northern Folk",
    genreFocus: "Cultural Percussion & Kologo",
    hostName: "Elder Alhassan",
    hostStyle: "Acoustic heritage & festival announcements",
    trackIds: ["trk_dagbon_dondo_damba", "trk_takai_ensemble", "trk_kologo_folk"],
    color: "#b45309",
  },
  {
    id: "rad_ghana_mix",
    name: "Ghana Mix 95",
    frequency: "95.5 MHz",
    tagline: "Highlife, Gospel, Reggae & Afrobeats",
    genreFocus: "All-Ghana Variety",
    hostName: "Amina S.",
    hostStyle: "Warm daytime commuter companion",
    trackIds: ["trk_highlife_palmwine", "trk_northern_gospel", "trk_tamale_reggae", "trk_fancy_gadam_yuli"],
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
    trackIds: ["trk_wiz_child_choggu", "trk_kologo_folk", "trk_northern_gospel", "trk_maccasio_zero_to_hero"],
    color: "#7c3aed",
  },
  {
    id: "rad_news_talk",
    name: "Savannah News & Talk",
    frequency: "96.1 MHz",
    tagline: "Traffic, Weather & Metropolitan Updates",
    genreFocus: "Talk, Weather & Transit Advisories",
    hostName: "Abdul-Malik Newsdesk",
    hostStyle: "Clear civic reports, weather & traffic updates",
    trackIds: ["trk_highlife_palmwine", "trk_kologo_folk"],
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
  const hour = Math.floor(((gameMinutes % 1440) + 1440) % 1440 / 60);
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
    `Northern music pride on ${station.frequency}: celebrating Tamale sounds from Maccasio and Fancy Gadam to timeless Dagbon dondo rhythms.`,
  ];

  const filtered = lastLine ? candidates.filter((c) => c !== lastLine) : candidates;
  const pool = filtered.length > 0 ? filtered : candidates;
  const idx = Math.floor((gameMinutes + station.name.length) % pool.length);
  return pool[idx];
}
