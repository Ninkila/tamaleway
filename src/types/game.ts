export type LanguageMode = "dagbani" | "english" | "mixed";

export type WeatherType =
  | "clear"
  | "cloudy"
  | "heat"
  | "harmattan"
  | "light_rain"
  | "rain"
  | "thunderstorm";

export type TimePeriod = "morning" | "afternoon" | "evening" | "night";

export type CameraMode = "third-person" | "wide" | "overhead";

export type OutfitStyle = "batakari" | "casual" | "kaba" | "polo";
export type HeadwearStyle = "none" | "kufi" | "headwrap" | "braids";
export type HairstyleOption = "natural" | "low_fade" | "waves" | "braided_crown" | "afro_trim";

export interface PlayerCustomization {
  name: string;
  outfit: OutfitStyle;
  headwear: HeadwearStyle;
  hairstyle?: HairstyleOption;
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

export interface ShopServiceAction {
  id: string;
  label: string;
  dagbaniLabel: string;
  price: number;
  serviceType: "haircut" | "rest_hotel" | "gym_workout" | "airtime_data" | "print_doc" | "repair";
  description: string;
  energyRestore?: number;
  advanceMinutes?: number;
  cultureXp?: number;
}

export interface ShopMetadata {
  id: string;
  title: string;
  dagbaniTitle: string;
  district: string;
  category:
    | "market"
    | "chop_bar"
    | "restaurant"
    | "fast_food"
    | "supermarket"
    | "cafe"
    | "nightlife"
    | "pharmacy_bakery"
    | "barber_salon"
    | "guesthouse"
    | "fitness_print"
    | "hardware_artisan"
    | "telecom_bank"
    | "cultural_craft"
    | "electronics"
    | "fashion_footwear"
    | "ice_cream"
    | "household"
    | "street_vendor";
  openHour: number; // 0..24
  closeHour: number; // 0..24 (can be < openHour for overnight/late-night spots)
  authenticityStatus: "real-institution" | "representative-fictional";
  authenticityNote: string;
  staffName?: string;
  buyableSharePrice?: number;
  dailyRevenueCedis?: number;
  services?: ShopServiceAction[];
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

export type CityGigCategory = "passenger_ride" | "food_delivery" | "supply_run" | "city_survey";

export interface CityGigTask {
  id: string;
  title: string;
  dagbaniTitle: string;
  category: CityGigCategory;
  pickupLabel: string;
  targetLandmarkId: string;
  targetLandmarkName: string;
  description: string;
  rewardCedis: number;
  rewardCultureXp: number;
  distanceMeters: number;
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
  realDistanceFromInterchangeKm?: number;
  referenceImagePath?: string;
  historicalSignificance?: string;
  isRepresentativeFictional?: boolean;
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

export type InteractionVerb =
  | "talk"
  | "shop"
  | "enter"
  | "exit"
  | "use_station"
  | "vehicle"
  | "deliver"
  | "buy"
  | "board_service"
  | "pickup_passenger"
  | "work"
  | "repair";

export interface NearbyInteractable {
  kind:
    | "npc"
    | "vehicle"
    | "building"
    | "interior_exit"
    | "interior_station"
    | "delivery"
    | "vendor"
    | "service_provider"
    | "job_action";
  id: string;
  label: string;
  sublabel?: string;
  interactionVerb?: InteractionVerb;
  vehicleKind?: "pragya" | "motorcycle";
  shopId?: string;
  stationKind?: InteriorStationKind;
  isGigDelivery?: boolean;
  servicePhase?: "pickup_food_or_repair" | "board_ride";
  jobActionMode?: "pickup_passenger" | "work_shift" | "mechanic_repair" | "photo_capture" | "sports_drill";
}

export interface NearbyChatter {
  speaker: string;
  dagbani: string;
  english: string;
  district: string;
}

export type GraphicsQuality = "low" | "medium" | "high";
export type ControlDisplayMode = "auto" | "touch" | "keyboard";

export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
  run: string;
  interact: string;
  vehicleToggle: string;
  horn: string;
  map: string;
  inventory: string;
  pause: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: "KeyW",
  backward: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  run: "ShiftLeft",
  interact: "KeyE",
  vehicleToggle: "KeyF",
  horn: "KeyH",
  map: "KeyM",
  inventory: "KeyI",
  pause: "Escape",
};

export interface GameSettings {
  languageMode: LanguageMode;
  showSubtitles: boolean;
  audioEnabled: boolean;
  soundVolume: number;
  cameraMode: CameraMode;
  graphicsQuality: GraphicsQuality;
  resolutionScale: number;
  cameraSensitivity: number;
  vibrationEnabled: boolean;
  controlMode: ControlDisplayMode;
  keyBindings: KeyBindings;
}

export type SkillKey = "riding" | "trade" | "stamina" | "culture" | "craft";

export interface CharacterSkills {
  riding: number;   // 1..10
  trade: number;    // 1..10
  stamina: number;  // 1..10
  culture: number;  // 1..10
  craft: number;    // 1..10
}

export interface PlayableCharacterProfile {
  id: string;
  name: string;
  nickname: string;
  occupation: string;
  dagbaniTitle: string;
  homeDistrict: string;
  homeLandmarkId: string;
  spawnPos: { x: number; z: number; rotY: number };
  startingMoney: number;
  startingEnergy: number;
  startingVehicleLabel: string;
  startingVehicleKind?: "pragya" | "motorcycle";
  bio: string;
  dailyRoutineSummary: string;
  careerTrack: string;
  customization: PlayerCustomization;
  initialSkills: CharacterSkills;
  startingInventory: InventoryItem[];
  startingFriendships: Record<string, number>;
  startingDiscoveredLandmarks: string[];
  startingVocabIds: string[];
  recommendedJobCategories: CityTaskCategory[];
}

export type CityTaskCategory =
  | "passenger_ride"
  | "food_delivery"
  | "grocery_delivery"
  | "courier_delivery"
  | "shop_assistant"
  | "food_prep"
  | "mechanic_repair"
  | "market_trade"
  | "business_ops"
  | "student_activity"
  | "cultural_activity"
  | "event_crew"
  | "sports_activity"
  | "photography"
  | "exploration"
  | "social_activity"
  | "community_errand";

export type CityTaskExecutionMode =
  | "transport_passenger"
  | "pickup_and_deliver"
  | "work_shift"
  | "mechanic_dispatch"
  | "photo_survey"
  | "sports_drill"
  | "business_manage";

export interface CityTaskJob {
  id: string;
  title: string;
  dagbaniTitle: string;
  category: CityTaskCategory;
  executionMode: CityTaskExecutionMode;
  description: string;
  pickupLandmarkId?: string;
  pickupLabel: string;
  targetLandmarkId: string;
  targetLandmarkName: string;
  requirements: string;
  completionCondition: string;
  rewardCedis: number;
  rewardCultureXp: number;
  energyCost: number;
  skillReward: { skill: SkillKey; points: number };
  recommendedVehicle?: "any" | "pragya" | "motorcycle" | "foot";
  shiftDomain?: "kitchen" | "supermarket" | "electronics" | "fashion" | "event" | "community";
  distanceMeters?: number;
}

export interface ActiveTaskRuntime {
  job: CityTaskJob;
  stage: "go_to_pickup" | "go_to_destination" | "ready_for_activity";
  passengerBoarded?: boolean;
  passengerName?: string;
  startedAtMinutes: number;
}

export type ServiceRequestKind =
  | "moto_ride"
  | "pragya_ride"
  | "taxi_ride"
  | "food_delivery"
  | "grocery_delivery"
  | "parcel_delivery"
  | "roadside_repair"
  | "cargo_moving"
  | "business_supply_delivery"
  | "personal_errand";

export type ServiceRequestStatus =
  | "searching"
  | "en_route_to_player"
  | "arrived_waiting"
  | "in_transit_to_dest"
  | "completed"
  | "cancelled";

export interface ServiceRequestRuntime {
  id: string;
  kind: ServiceRequestKind;
  title: string;
  providerName: string;
  vehicleKind: "moto" | "pragya" | "taxi" | "cargo";
  estimatedCostCedis: number;
  distanceMeters: number;
  etaSeconds: number;
  status: ServiceRequestStatus;
  statusNote: string;
  destinationLandmarkId?: string;
  destinationName?: string;
  destinationX?: number;
  destinationZ?: number;
  deliveredItems?: Array<{
    id: string;
    name: string;
    dagbaniName: string;
    category: "food" | "clothing" | "craft";
    energyRestore?: number;
    description: string;
  }>;
  providerX?: number;
  providerZ?: number;
}

export interface CapturedPhotoRecord {
  id: string;
  title: string;
  district: string;
  landmarkId?: string;
  dataUrl: string;
  capturedAtClock: string;
}

export interface PhoneMessageRecord {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestampClock: string;
  read: boolean;
}

export interface CharacterRuntimeState {
  characterId: string;
  moneyCedis: number;
  bankBalanceCedis?: number;
  momoBalanceCedis?: number;
  savingsBalanceCedis?: number;
  vehicleCondition?: number;
  energy: number;
  cultureXp: number;
  careerLevel: number;
  skills: CharacterSkills;
  customization: PlayerCustomization;
  inventory: InventoryItem[];
  friendships: Record<string, number>;
  discoveredLandmarks: string[];
  learnedVocabIds: string[];
  activeErrandId: string | null;
  completedErrands: string[];
  activeTask: ActiveTaskRuntime | null;
  activeGig?: CityGigTask | null;
  completedJobsCount: number;
  completedGigsCount?: number;
  totalEarnedCedis: number;
  ownedBusinessIds: string[];
  achievements: string[];
  capturedPhotos: CapturedPhotoRecord[];
  phoneMessages?: PhoneMessageRecord[];
  playerPos: { x: number; z: number; rotY: number };
}

export interface SavedGameState {
  version: number;
  activeCharacterId?: string;
  characterStates?: Record<string, CharacterRuntimeState>;
  moneyCedis: number;
  bankBalanceCedis?: number;
  momoBalanceCedis?: number;
  savingsBalanceCedis?: number;
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
  activeGig?: CityGigTask | null;
  completedGigsCount?: number;
  totalEarnedCedis?: number;
  playerPos: { x: number; z: number; rotY: number };
}

export type InteriorBuildingArchetype =
  | "bank"
  | "momo_telecom"
  | "restaurant"
  | "fast_food"
  | "supermarket"
  | "barber_salon"
  | "electronics"
  | "mechanic"
  | "hospital_clinic"
  | "pharmacy_bakery"
  | "guesthouse"
  | "compound_home"
  | "palace_courtyard"
  | "mosque_courtyard"
  | "cultural_gallery"
  | "market_hall"
  | "fitness_print";

export type InteriorStationKind =
  | "exit_door"
  | "bank_teller"
  | "atm_kiosk"
  | "momo_agent"
  | "food_counter"
  | "dining_table"
  | "shelf_browse"
  | "checkout_counter"
  | "barber_chair"
  | "electronics_desk"
  | "mechanic_bay"
  | "clinic_triage"
  | "guesthouse_desk"
  | "home_bed"
  | "wardrobe"
  | "room_radio"
  | "cultural_bench"
  | "gym_rack";

export interface InteriorStationSpec {
  id: string;
  kind: InteriorStationKind;
  label: string;
  dagbaniLabel: string;
  x: number; // local room coordinate relative to room center
  z: number;
  radius: number;
}

export interface InteriorRoomSpec {
  landmarkId: string;
  archetype: InteriorBuildingArchetype;
  title: string;
  dagbaniTitle: string;
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  floorColor: string;
  accentColor: string;
  ceilingColor: string;
  ambientHex: string;
  spawnX: number;
  spawnZ: number;
  shopId?: string;
  hasIndoorRadio?: boolean;
  stations: InteriorStationSpec[];
}

export type MusicLicenseStatus =
  | "procedural-preview"
  | "licensed-audio-file"
  | "metadata-only-placeholder";

export type MusicGrooveStyle =
  | "dondo_hiphop"
  | "afrobeat"
  | "highlife"
  | "traditional_drum"
  | "gospel"
  | "reggae";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  featuredArtist?: string;
  region: "Tamale" | "Dagbon" | "Northern Ghana" | "Ghana";
  genre:
    | "Northern Hip-Hop"
    | "Afrobeats"
    | "Dagbon Traditional"
    | "Highlife"
    | "Reggae/Dancehall"
    | "Northern Gospel"
    | "Folk";
  mood: string;
  bpm: number;
  durationSec: number;
  scaleNotes: number[];
  grooveStyle: MusicGrooveStyle;
  licenseStatus: MusicLicenseStatus;
  audioUrl?: string;
  notes: string;
}

export interface RadioStation {
  id: string;
  name: string;
  frequency: string;
  tagline: string;
  genreFocus: string;
  hostName: string;
  hostStyle: string;
  trackIds: string[];
  color: string;
  isTalkFocused?: boolean;
}

export interface GeoLocationAuditEntry {
  landmarkId: string;
  name: string;
  category: string;
  district: string;
  coordsLabel: string;
  referenceSource: string;
  licenseNote: string;
  roadConnections: string[];
  nearbyBuildings: string[];
  architecturalNotes: string;
  confidence: "verified-osm-photo" | "verified-osm" | "representative-local";
}


