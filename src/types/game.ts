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

export type OutfitStyle =
  | "batakari"
  | "casual"
  | "kaba"
  | "polo"
  | "workwear"
  | "formal"
  | "sportswear"
  | "nightlife";
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

export type HomeRoomKey = "courtyard" | "livingRoom" | "kitchen" | "bedroom" | "bathroom";

export type HomeUpgradeId =
  | "bed_tier"
  | "solar_power"
  | "polytank_plumbing"
  | "kitchen_appliance"
  | "tv_entertainment"
  | "security_gate";

export type HomeIngredientId =
  | "cornmeal_millet"
  | "rice_beans"
  | "yam_tubers"
  | "groundnut_paste"
  | "fresh_greens"
  | "meat_fish"
  | "eggs_bread"
  | "tea_sugar"
  | "cooking_oil"
  | "clean_water";

export interface PlayerNeedsState {
  hygiene: number;  // 0..100
  hunger: number;   // 0..100
  thirst: number;   // 0..100
  social: number;   // 0..100
  comfort: number;  // 0..100
}

export interface HomeCookedMeal {
  id: string;
  recipeId: string;
  name: string;
  dagbaniName: string;
  hungerRestore: number;
  energyRestore: number;
  thirstRestore: number;
  comfortRestore: number;
  preparedDay: number;
}

export interface HomeLaundryState {
  dirtyClothesCount: number;
  washedWetCount: number;
  dryingOnLineCount: number;
  dryReadyAtMinutes: number | null;
  dryReadyDay: number | null;
  cleanOutfitsStored: number;
  outfitCleanliness: number; // 0..100
}

export interface HomeState {
  homeName: string;
  homeDistrict: string;
  cleanliness: number; // 0..100
  dirtyDishesCount: number;
  rubbishCount: number;
  roomDirt: Record<HomeRoomKey, number>;
  upgrades: Record<HomeUpgradeId, number>;
  fridgeIngredients: Record<HomeIngredientId, number>;
  cookedMealsReady: HomeCookedMeal[];
  lastMaintainedDay: number;
  dailyBillsOwed: number;
  dailyRoutineIdsDone: string[];
  remindersEnabled: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  dagbaniName: string;
  category: "food" | "clothing" | "craft";
  price: number;
  energyRestore?: number;
  hungerRestore?: number;
  thirstRestore?: number;
  hygieneRestore?: number;
  ingredientKey?: HomeIngredientId;
  ingredientUnits?: number;
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
  hungerRestore?: number;
  thirstRestore?: number;
  hygieneRestore?: number;
  ingredientKey?: HomeIngredientId;
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
  | "commercial"
  | "police"
  | "nightclub"
  | "residential_home";

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

export type DrivableVehicleKind =
  | "pragya"
  | "motorcycle"
  | "cargo_trike"
  | "taxi"
  | "pickup_truck"
  | "box_truck"
  | "flatbed_truck";

export type TrafficVehicleKind =
  | "moto"
  | "pragya"
  | "taxi"
  | "car"
  | "cargo"
  | "bicycle"
  | "minibus"
  | "police_car"
  | "pickup_truck"
  | "box_truck"
  | "flatbed_truck";

export type CargoPropKind =
  | "none"
  | "rice_sacks"
  | "yam_bundles"
  | "cement_bags"
  | "timber_beams"
  | "water_packs"
  | "market_crates"
  | "mixed_parcels";

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
  | "repair"
  | "load_cargo"
  | "unload_cargo"
  | "play_minigame";

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
    | "job_action"
    | "police_officer"
    | "accident_scene";
  id: string;
  label: string;
  sublabel?: string;
  interactionVerb?: InteractionVerb;
  vehicleKind?: DrivableVehicleKind;
  shopId?: string;
  stationKind?: InteriorStationKind;
  isGigDelivery?: boolean;
  servicePhase?: "pickup_food_or_repair" | "board_ride";
  jobActionMode?:
    | "pickup_passenger"
    | "work_shift"
    | "mechanic_repair"
    | "photo_capture"
    | "sports_drill"
    | "load_cargo"
    | "unload_cargo";
  doorClosed?: boolean;
}

export interface NearbyChatter {
  speaker: string;
  dagbani: string;
  english: string;
  district: string;
}

export type GraphicsQuality = "low" | "medium" | "high";
export type ControlDisplayMode = "auto" | "touch" | "keyboard" | "hybrid";
export type DeviceClass = "desktop" | "mobile" | "tablet" | "hybrid";
export type ActiveInputMethod = "keyboard" | "touch";
export type JoystickSize = "small" | "medium" | "large";
export type UiScaleMode = "compact" | "normal" | "large";
export type HudVisibilityMode = "standard" | "minimal";
export type PreferredOrientation = "auto" | "landscape" | "portrait";

export interface ContextualHintPayload {
  id: string;
  text: string;
  keyCap?: string;
  priority: "situation" | "onboarding";
  tone?: "amber" | "emerald" | "sky";
}

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
  joystickSize: JoystickSize;
  uiScale: UiScaleMode;
  hudVisibility: HudVisibilityMode;
  showTutorialHints: boolean;
  preferredOrientation: PreferredOrientation;
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
  startingVehicleKind?: DrivableVehicleKind;
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
  | "community_errand"
  | "cargo_freight";

export type CityTaskExecutionMode =
  | "transport_passenger"
  | "pickup_and_deliver"
  | "work_shift"
  | "mechanic_dispatch"
  | "photo_survey"
  | "sports_drill"
  | "business_manage"
  | "cargo_haul";

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
  recommendedVehicle?: "any" | "pragya" | "motorcycle" | "foot" | "truck" | "cargo_trike";
  requiredVehicleClasses?: DrivableVehicleKind[];
  cargoWeightKg?: number;
  cargoKind?: CargoPropKind;
  cargoTitle?: string;
  shiftDomain?: "kitchen" | "supermarket" | "electronics" | "fashion" | "event" | "community";
  distanceMeters?: number;
}

export interface ActiveTaskRuntime {
  job: CityTaskJob;
  stage: "go_to_pickup" | "go_to_destination" | "ready_for_activity";
  passengerBoarded?: boolean;
  passengerName?: string;
  cargoLoaded?: boolean;
  cargoDamagePct?: number;
  assignedVehicleId?: string;
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
  policeFinesOwedCedis?: number;
  trafficViolationsCount?: number;
  cleanDrivingStreak?: number;
  cargoDeliveriesCount?: number;
  dayCount?: number;
  needs?: PlayerNeedsState;
  homeState?: HomeState;
  laundryState?: HomeLaundryState;
  ownedOutfits?: OutfitStyle[];
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
  dayCount?: number;
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
  musicLibrary?: SavedMusicLibraryState;
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
  | "player_home_compound"
  | "palace_courtyard"
  | "mosque_courtyard"
  | "cultural_gallery"
  | "market_hall"
  | "fitness_print"
  | "club_lounge"
  | "police_station";

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
  | "gym_rack"
  | "dj_booth"
  | "dance_floor"
  | "club_game_table"
  | "police_desk"
  | "home_shower"
  | "home_sink_hygiene"
  | "home_toilet"
  | "home_mirror"
  | "home_kitchen_fridge"
  | "home_kitchen_stove"
  | "home_kitchen_sink"
  | "home_clean_sweep"
  | "home_clean_mop"
  | "home_rubbish_bin"
  | "home_laundry_wash"
  | "home_clothesline"
  | "home_sofa_tv"
  | "home_upgrade_desk"
  | "home_charger";

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
  | "licensed-audio-file"
  | "artist-approved"
  | "royalty-free"
  | "awaiting-authorization"
  | "procedural-preview";

export type MusicPermissionStatus =
  | "cleared-for-distribution"
  | "pending-artist-clearance"
  | "procedural-original";

export type MusicGenre =
  | "Northern Hip-Hop"
  | "Dagbon Rap"
  | "Afrobeat"
  | "Dancehall"
  | "Hiplife"
  | "Traditional"
  | "Folk"
  | "Gospel"
  | "Hausa Music"
  | "Instrumental"
  | "Highlife"
  | "Contemporary African";

export type MusicGrooveStyle =
  | "dondo_hiphop"
  | "afrobeat"
  | "highlife"
  | "traditional_drum"
  | "gospel"
  | "reggae"
  | "hausa_percussion"
  | "instrumental_kologo";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  featuredArtist?: string;
  album: string;
  releaseYear: number;
  explicit: boolean;
  region: "Tamale" | "Dagbon" | "Northern Ghana" | "Ghana";
  genre: MusicGenre;
  mood: string;
  bpm: number;
  durationSec: number;
  scaleNotes: number[];
  grooveStyle: MusicGrooveStyle;
  licenseStatus: MusicLicenseStatus;
  licenseOwner: string;
  permissionStatus: MusicPermissionStatus;
  audioUrl?: string;
  coverPalette: [string, string, string];
  coverArt: string;
  playlistIds: string[];
  featured?: boolean;
  isNewRelease?: boolean;
  chartRank?: number;
  notes: string;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  isCustom?: boolean;
}

export interface ArtistProfileSummary {
  id: string;
  name: string;
  origin: string;
  primaryGenre: MusicGenre;
  spotlightTag: "Featured Northern Artist" | "Artist of the Week" | "Upcoming Artist" | "Heritage Custodian";
  bio: string;
  palette: [string, string, string];
  trackIds: string[];
}

export interface AlbumCollection {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  genre: MusicGenre;
  coverPalette: [string, string, string];
  coverArt: string;
  trackIds: string[];
  featured?: boolean;
}

export interface SavedMusicLibraryState {
  favorites: string[];
  recentTrackIds: string[];
  customPlaylists: UserPlaylist[];
  volume: number;
  lastTrackId?: string;
  lastStationId?: string;
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

export type PoliceViolationKind = "red_light" | "speeding" | "reckless_collision";

export interface PoliceStopNotice {
  id: string;
  violationKind: PoliceViolationKind;
  officerName: string;
  title: string;
  detail: string;
  fineCedis: number;
  warningEligible: boolean;
  impoundRisk: boolean;
  offenseCountAfter: number;
}

export interface NearbySignalSnapshot {
  id: string;
  label: string;
  ewAspect: "green" | "amber" | "red";
  nsAspect: "green" | "amber" | "red";
  remainingSec: number;
  dist: number;
}

export interface NavRouteSnapshot {
  targetLandmarkId?: string;
  targetLabel: string;
  routePoints: Array<{ x: number; z: number }>;
  remainingMeters: number;
  nextTurnLabel: string;
  isOffRoute: boolean;
}
