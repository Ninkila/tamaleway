export type LanguageMode = "dagbani" | "english" | "mixed";

export type WeatherType = "clear" | "harmattan" | "rain";

export type TimePeriod = "morning" | "afternoon" | "evening" | "night";

export type CameraMode = "third-person" | "wide" | "overhead";

export type OutfitStyle = "batakari" | "casual" | "kaba" | "polo";
export type HeadwearStyle = "none" | "kufi" | "headwrap" | "braids";

export interface PlayerCustomization {
  name: string;
  outfit: OutfitStyle;
  headwear: HeadwearStyle;
  primaryColor: string;
  accentColor: string;
  skinTone: string;
}

export interface DagbaniEntry {
  id: string;
  dagbani: string;
  english: string;
  phoneticGuide: string;
  category: "greetings" | "market" | "directions" | "food_culture" | "proverbs";
  usageNote: string;
  verificationStatus: "verified-orthography" | "community-review";
  audioStatus: "text-only-awaiting-native-recording";
}

export interface DialogueTurn {
  id: string;
  speaker: string;
  dagbani: string;
  english: string;
  mixed: string;
  vocabTags?: string[];
  source?: "curated" | "gemini" | "offline";
}

export interface ShopItem {
  id: string;
  name: string;
  dagbaniName: string;
  category: "food" | "clothing" | "craft";
  price: number;
  energyRestore?: number;
  description: string;
  unlockOutfit?: OutfitStyle;
}

export interface InventoryItem {
  id: string;
  name: string;
  dagbaniName: string;
  category: "food" | "clothing" | "craft";
  quantity: number;
  energyRestore?: number;
  description: string;
}

export interface ErrandQuest {
  id: string;
  title: string;
  dagbaniTitle: string;
  giverNpcId: string;
  targetLandmarkId: string;
  targetLandmarkName: string;
  description: string;
  rewardCedis: number;
  rewardCultureXp: number;
  completed: boolean;
  active: boolean;
}

export type LandmarkType =
  | "market"
  | "mosque"
  | "cultural"
  | "park"
  | "school"
  | "compound"
  | "transport"
  | "hospital"
  | "palace"
  | "stadium"
  | "airport"
  | "art_centre"
  | "commercial";

export interface LandmarkData {
  id: string;
  name: string;
  dagbaniLabel: string;
  district: string;
  authenticityNote: string;
  osmCoords?: string;
  x: number;
  z: number;
  radius: number;
  enterable?: boolean;
  interiorTitle?: string;
  interiorDescription?: string;
  shopId?: string;
  type: LandmarkType;
}

export interface CommunityZone {
  id: string;
  name: string;
  dagbaniName?: string;
  osmCoords: string;
  bearingFromInterchange: string;
  x: number;
  z: number;
  radius: number;
  character: string;
  architectureMix: string[];
  keyActivities: string[];
}

export type ActiveCityEventMode =
  | "ordinary_day"
  | "damba_festival"
  | "bugum_chugu"
  | "eid_celebration"
  | "ramadan_evening"
  | "market_peak"
  | "stadium_match";

export type CityEventCategory =
  | "traditional"
  | "religious"
  | "social"
  | "educational"
  | "business"
  | "sports_entertainment";

export type CityEventVerification =
  | "verified-historical"
  | "annual-recurring"
  | "date-announced"
  | "lunar-dependent-no-fixed-date"
  | "fictional-simulation";

export interface TamaleEventRecord {
  id: string;
  name: string;
  dagbaniName?: string;
  category: CityEventCategory;
  description: string;
  location: string;
  landmarkId?: string;
  organisingInstitution: string;
  dateOrCycle: string;
  isRecurring: boolean;
  verificationStatus: CityEventVerification;
  sourceUrl: string;
  referenceImagePath?: string;
  cityEffectSummary: string;
  activeModeId?: ActiveCityEventMode;
}

export interface HistoricalMilestone {
  year: string;
  title: string;
  description: string;
  location: string;
  sourceNote: string;
}

export type SubmissionCategory =
  | "photograph"
  | "location"
  | "event"
  | "historical_record"
  | "dagbani_expression"
  | "architectural_reference";

export interface CommunitySubmission {
  id: string;
  contributorName: string;
  contributorAffiliation: string;
  category: SubmissionCategory;
  title: string;
  community: string;
  description: string;
  dagbaniTerm?: string;
  sourceAndPermission: string;
  mediaUrl?: string;
  status: "pending_review" | "approved" | "needs_revision";
  reviewerNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export type NpcInteractionState =
  | "trading"
  | "working"
  | "commuting"
  | "praying"
  | "resting"
  | "socializing";

export interface NpcScheduleSlot {
  id: string;
  startMinute: number; // 0..1439
  endMinute: number;   // 0..1440 (can be < startMinute when wrapping midnight)
  destinationLabel: string;
  district: string;
  targetX: number;
  targetZ: number;
  patrolPoints: Array<{ x: number; z: number }>;
  interactionState: NpcInteractionState;
  activityLabel: string;
  shopOpen: boolean;
  canTalk: boolean;
}

export interface NpcRuntimeSnapshot {
  npcId: string;
  x: number;
  z: number;
  state: NpcInteractionState;
  activityLabel: string;
  destinationLabel: string;
  district: string;
  shopOpen: boolean;
  canTalk: boolean;
  isMoving: boolean;
}

export interface NpcProfile {
  id: string;
  name: string;
  role: string;
  dagbaniRole: string;
  district: string;
  homeDistrict: string;
  homeArea: { x: number; z: number };
  personality: string;
  homeX: number;
  homeZ: number;
  patrolPoints: Array<{ x: number; z: number }>;
  schedule: NpcScheduleSlot[];
  outfitColor: string;
  accentColor: string;
  skinTone: string;
  headwear: HeadwearStyle;
  shopId?: string;
  greetings: {
    morning: { dagbani: string; english: string; mixed: string };
    afternoon: { dagbani: string; english: string; mixed: string };
    evening: { dagbani: string; english: string; mixed: string };
    night: { dagbani: string; english: string; mixed: string };
  };
  topics: Array<{
    id: string;
    label: string;
    dagbaniPrompt: string;
    response: { dagbani: string; english: string; mixed: string };
    vocabUsed: string[];
  }>;
}

export interface NearbyInteractable {
  kind: "npc" | "vehicle" | "building" | "delivery";
  id: string;
  label: string;
  sublabel?: string;
}

export interface NearbyChatter {
  speaker: string;
  dagbani: string;
  english: string;
  district: string;
}

export interface GameSettings {
  languageMode: LanguageMode;
  showSubtitles: boolean;
  audioEnabled: boolean;
  soundVolume: number;
  cameraMode: CameraMode;
}

export interface SavedGameState {
  version: number;
  moneyCedis: number;
  energy: number;
  cultureXp: number;
  gameMinutes: number; // 0 - 1440
  weather: WeatherType;
  activeCityEvent: ActiveCityEventMode;
  customization: PlayerCustomization;
  settings: GameSettings;
  inventory: InventoryItem[];
  friendships: Record<string, number>;
  discoveredLandmarks: string[];
  learnedVocabIds: string[];
  activeErrandId: string | null;
  completedErrands: string[];
  playerPos: { x: number; z: number; rotY: number };
}
