/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutTamaleModal } from "./components/AboutTamaleModal";
import { CharacterSwitchModal } from "./components/CharacterSwitchModal";
import { CommunityPortalModal } from "./components/CommunityPortalModal";
import { CustomizeModal } from "./components/CustomizeModal";
import { DagbaniGuideModal } from "./components/DagbaniGuideModal";
import { DialogueModal } from "./components/DialogueModal";
import { DiscoveryCardOverlay } from "./components/DiscoveryCardOverlay";
import { GameHud } from "./components/GameHud";
import { HomeStationKind, HomeStationModal } from "./components/HomeStationModal";
import { BuildingInteriorModal, PauseModal } from "./components/InteriorAndPauseModals";
import { ClubEntertainmentModal } from "./components/ClubEntertainmentModal";
import { InteriorServiceOverlay } from "./components/InteriorServiceOverlay";
import { InventoryJournalModal } from "./components/InventoryJournalModal";
import { MainMenu } from "./components/MainMenu";
import { MapModal } from "./components/MapModal";
import { MobileTouchControls } from "./components/MobileTouchControls";
import { PoliceStopModal } from "./components/PoliceStopModal";
import { ReferenceArchiveModal } from "./components/ReferenceArchiveModal";
import { SettingsAndControlsModal } from "./components/SettingsAndControlsModal";
import { ShopModal } from "./components/ShopAndErrandsModal";
import { TamaleEventsModal } from "./components/TamaleEventsModal";
import { PhoneTab, TamalePhoneModal } from "./components/TamalePhoneModal";
import { WorkAndActivityModal } from "./components/WorkAndActivityModal";
import {
  computeCareerRankTitle,
  createInitialCharacterState,
  PLAYABLE_CHARACTERS,
} from "./data/playableCharacters";
import { TAMALE_ECONOMY_CONFIG } from "./data/tamaleEconomy";
import { INITIAL_CITY_EVENT_DESCRIPTIONS } from "./data/tamaleExpansionData";
import {
  computeDailyHomeBillCedis,
  computeHomeCleanlinessFromRooms,
  createDefaultHomeStateForCharacter,
  createDefaultLaundryState,
  createDefaultNeedsForCharacter,
  HOME_COOKING_RECIPES,
  HOME_UPGRADES_CATALOG,
} from "./data/tamaleHomeData";
import {
  calculateServiceFare,
  generateJobsForCharacter,
  SERVICE_CATALOG,
} from "./data/tamaleJobsAndServices";
import { buildDynamicRadioSegment } from "./data/tamaleMusicAndRadio";
import {
  generateAvailableCityGigs,
  INITIAL_ERRANDS,
  SHOP_METADATA,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
} from "./data/tamaleWorldData";
import { TamaleAudioEngine } from "./game/audio";
import { MusicPlayerSnapshot, TamaleMusicRadioEngine } from "./game/musicPlayer";
import { TamaleEngine } from "./game/TamaleEngine";
import {
  ActiveCityEventMode,
  ActiveInputMethod,
  ActiveTaskRuntime,
  CapturedPhotoRecord,
  CharacterRuntimeState,
  CharacterSkills,
  CityGigTask,
  CityTaskJob,
  DEFAULT_KEY_BINDINGS,
  DrivableVehicleKind,
  ErrandQuest,
  GameSettings,
  HomeIngredientId,
  HomeLaundryState,
  HomeRoomKey,
  HomeState,
  HomeUpgradeId,
  InteriorRoomSpec,
  InteriorStationKind,
  InventoryItem,
  LandmarkData,
  NavRouteSnapshot,
  NearbyChatter,
  NearbyInteractable,
  NearbySignalSnapshot,
  NpcRuntimeSnapshot,
  OutfitStyle,
  PhoneMessageRecord,
  PlayerCustomization,
  PlayerNeedsState,
  PoliceStopNotice,
  RadioStation,
  SavedGameState,
  ServiceRequestKind,
  ServiceRequestRuntime,
  ShopItem,
  ShopServiceAction,
  SkillKey,
  TimePeriod,
  WeatherType,
} from "./types/game";
import {
  advanceOnboardingState,
  computeContextualHint,
  loadOnboardingState,
  OnboardingState,
  resetOnboardingStorage,
  saveOnboardingComplete,
} from "./game/contextualHints";
import {
  computeDeviceLayoutConfig,
  DeviceSignals,
  getDefaultSettingsForDevice,
  readBrowserDeviceSignals,
} from "./utils/deviceProfile";
import {
  buildAllDefaultCharacterStates,
  CURRENT_SAVE_VERSION,
  migrateSavedGameState,
} from "./utils/saveMigration";

const SAVE_STORAGE_KEY = "tamale3d_save_v1";
const MUSIC_STORAGE_KEY = "tamale3d_music_library_v1";

const ALWAYS_HOME_STATION_KINDS: ReadonlySet<InteriorStationKind> = new Set([
  "home_shower",
  "home_sink_hygiene",
  "home_toilet",
  "home_mirror",
  "home_kitchen_fridge",
  "home_kitchen_stove",
  "home_kitchen_sink",
  "home_clean_sweep",
  "home_clean_mop",
  "home_rubbish_bin",
  "home_laundry_wash",
  "home_clothesline",
  "home_sofa_tv",
  "home_upgrade_desk",
  "home_charger",
]);

function clampNeed(val: number): number {
  return Math.max(0, Math.min(100, val));
}

function buildDefaultCharacterStates(): Record<string, CharacterRuntimeState> {
  return buildAllDefaultCharacterStates();
}

function createInitialSettings(): GameSettings {
  return getDefaultSettingsForDevice(readBrowserDeviceSignals("keyboard"));
}

function getPeriodFromMinutes(mins: number): { period: TimePeriod; label: string } {
  const h = mins / 60;
  if (h >= 5.5 && h < 12) return { period: "morning", label: "Morning" };
  if (h >= 12 && h < 17) return { period: "afternoon", label: "Afternoon" };
  if (h >= 17 && h < 19.5) return { period: "evening", label: "Evening" };
  return { period: "night", label: "Night" };
}

function formatClock(mins: number): string {
  const total = Math.floor(((mins % 1440) + 1440) % 1440);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TamaleEngine | null>(null);
  const audioRef = useRef<TamaleAudioEngine | null>(null);
  const musicEngineRef = useRef<TamaleMusicRadioEngine | null>(null);

  const initialProfile = PLAYABLE_CHARACTERS[0];
  const initialCharState = createInitialCharacterState(initialProfile);

  const [inMainMenu, setInMainMenu] = useState(true);
  const [exitedScreen, setExitedScreen] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [webglLost, setWebglLost] = useState(false);

  // Live Device & Input Detection (Desktop vs Mobile Phone vs Tablet vs Hybrid)
  const [deviceSignals, setDeviceSignals] = useState<DeviceSignals>(() =>
    readBrowserDeviceSignals(
      typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches === true
        ? "touch"
        : "keyboard"
    )
  );
  const lastInputMethodRef = useRef<ActiveInputMethod>(deviceSignals.lastInputMethod);
  lastInputMethodRef.current = deviceSignals.lastInputMethod;

  useEffect(() => {
    const syncSignals = (overrideInput?: ActiveInputMethod) => {
      const nextInput = overrideInput ?? lastInputMethodRef.current;
      lastInputMethodRef.current = nextInput;
      setDeviceSignals(readBrowserDeviceSignals(nextInput));
    };

    const handleResize = () => syncSignals();
    const handleKeyInput = () => {
      if (lastInputMethodRef.current !== "keyboard") {
        syncSignals("keyboard");
      }
    };
    const handlePointerInput = (e: PointerEvent) => {
      if (e.pointerType === "touch" && lastInputMethodRef.current !== "touch") {
        syncSignals("touch");
      } else if (e.pointerType === "mouse" && lastInputMethodRef.current !== "keyboard") {
        syncSignals("keyboard");
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("keydown", handleKeyInput, { passive: true });
    window.addEventListener("pointerdown", handlePointerInput, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("keydown", handleKeyInput);
      window.removeEventListener("pointerdown", handlePointerInput);
    };
  }, []);

  // Multi-character state
  const [activeCharacterId, setActiveCharacterId] = useState<string>(initialProfile.id);
  const [characterStates, setCharacterStates] = useState<Record<string, CharacterRuntimeState>>(
    () => buildDefaultCharacterStates()
  );

  // Active character runtime progression & world state
  const [moneyCedis, setMoneyCedis] = useState(initialCharState.moneyCedis);
  const [bankBalanceCedis, setBankBalanceCedis] = useState(
    initialCharState.bankBalanceCedis ?? 200
  );
  const [momoBalanceCedis, setMomoBalanceCedis] = useState(
    initialCharState.momoBalanceCedis ?? 65
  );
  const [savingsBalanceCedis, setSavingsBalanceCedis] = useState(
    initialCharState.savingsBalanceCedis ?? 100
  );
  const [vehicleCondition, setVehicleCondition] = useState(
    initialCharState.vehicleCondition ?? 92
  );
  const [phoneMessages, setPhoneMessages] = useState<PhoneMessageRecord[]>(
    initialCharState.phoneMessages ?? []
  );
  const [energy, setEnergy] = useState(initialCharState.energy);
  const [dayCount, setDayCount] = useState<number>(initialCharState.dayCount ?? 1);
  const [needs, setNeeds] = useState<PlayerNeedsState>(
    () => initialCharState.needs ?? createDefaultNeedsForCharacter()
  );
  const [homeState, setHomeState] = useState<HomeState>(
    () => initialCharState.homeState ?? createDefaultHomeStateForCharacter(initialProfile)
  );
  const [laundryState, setLaundryState] = useState<HomeLaundryState>(
    () => initialCharState.laundryState ?? createDefaultLaundryState()
  );
  const [ownedOutfits, setOwnedOutfits] = useState<OutfitStyle[]>(
    () => initialCharState.ownedOutfits ?? ["batakari", "kaba", "casual", "polo"]
  );
  const [cultureXp, setCultureXp] = useState(initialCharState.cultureXp);
  const [skills, setSkills] = useState<CharacterSkills>(initialCharState.skills);
  const [gameMinutes, setGameMinutes] = useState(9 * 60 + 15);
  const [weather, setWeather] = useState<WeatherType>("clear");
  const [activeCityEvent, setActiveCityEvent] = useState<ActiveCityEventMode>("ordinary_day");
  const [customization, setCustomization] = useState<PlayerCustomization>(
    initialCharState.customization
  );
  const [settings, setSettings] = useState<GameSettings>(createInitialSettings);

  const [inventory, setInventory] = useState<InventoryItem[]>(initialCharState.inventory);
  const [friendships, setFriendships] = useState<Record<string, number>>(
    initialCharState.friendships
  );
  const [discoveredLandmarks, setDiscoveredLandmarks] = useState<string[]>(
    initialCharState.discoveredLandmarks
  );
  const [learnedVocabIds, setLearnedVocabIds] = useState<string[]>(
    initialCharState.learnedVocabIds
  );
  const [errands, setErrands] = useState<ErrandQuest[]>(INITIAL_ERRANDS);
  const [activeGig, setActiveGig] = useState<CityGigTask | null>(null);
  const [availableGigs, setAvailableGigs] = useState<CityGigTask[]>(() =>
    generateAvailableCityGigs(initialProfile.spawnPos.x, initialProfile.spawnPos.z)
  );
  const [completedGigsCount, setCompletedGigsCount] = useState(0);
  const [totalEarnedCedis, setTotalEarnedCedis] = useState(0);

  // Enhanced Jobs, Businesses, Achievements, Photos & Live 3D Services
  const [activeTask, setActiveTask] = useState<ActiveTaskRuntime | null>(null);
  const [availableJobs, setAvailableJobs] = useState<CityTaskJob[]>(() =>
    generateJobsForCharacter(
      initialProfile.recommendedJobCategories,
      initialProfile.spawnPos.x,
      initialProfile.spawnPos.z
    )
  );
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [ownedBusinessIds, setOwnedBusinessIds] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoRecord[]>([]);
  const [activeService, setActiveService] = useState<ServiceRequestRuntime | null>(null);
  const [activeDiscoveryCard, setActiveDiscoveryCard] = useState<LandmarkData | null>(null);

  // Walkable 3D Interior & Music/Radio state
  const [activeInteriorSpec, setActiveInteriorSpec] = useState<InteriorRoomSpec | null>(null);
  const [activeInteriorStation, setActiveInteriorStation] = useState<{
    kind: Exclude<InteriorStationKind, "exit_door">;
    label: string;
    shopId?: string;
  } | null>(null);
  const [phoneInitialTab, setPhoneInitialTab] = useState<PhoneTab>("home");
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => loadOnboardingState());
  const [drivingHintTimerSec, setDrivingHintTimerSec] = useState(0);
  const [showMiniRadioBar, setShowMiniRadioBar] = useState(false);
  const [musicSnap, setMusicSnap] = useState<MusicPlayerSnapshot>(() =>
    new TamaleMusicRadioEngine().getSnapshot()
  );

  // Live HUD state synced from engine
  const [district, setDistrict] = useState("Naa Gbewaa Interchange · Central Tamale");
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isDriving, setIsDriving] = useState(false);
  const [isRidingService, setIsRidingService] = useState(false);
  const [drivingLabel, setDrivingLabel] = useState<string | null>(null);
  const [drivingKind, setDrivingKind] = useState<DrivableVehicleKind | null>(null);
  const [drivingMaxCargoKg, setDrivingMaxCargoKg] = useState(0);
  const [vehicleHealthPct, setVehicleHealthPct] = useState(100);
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [nearbyVehicle, setNearbyVehicle] = useState<NearbyInteractable | null>(null);
  const [nearbyChatter, setNearbyChatter] = useState<NearbyChatter | null>(null);
  const [nearbySignal, setNearbySignal] = useState<NearbySignalSnapshot | null>(null);
  const [policePursuitActive, setPolicePursuitActive] = useState(false);
  const [impoundedVehicleId, setImpoundedVehicleId] = useState<string | null>(null);
  const [navSnapshot, setNavSnapshot] = useState<NavRouteSnapshot | null>(null);
  const [cargoIntegrityPct, setCargoIntegrityPct] = useState<number | null>(null);
  const [cargoLoadProgressPct, setCargoLoadProgressPct] = useState<number | null>(null);
  const [policeCruiserPositions, setPoliceCruiserPositions] = useState<Array<{ x: number; z: number }>>([]);
  const [roadIncidentPositions, setRoadIncidentPositions] = useState<
    Array<{ id: string; title: string; x: number; z: number }>
  >([]);
  const [policeFinesOwedCedis, setPoliceFinesOwedCedis] = useState(
    initialCharState.policeFinesOwedCedis ?? 0
  );
  const [trafficViolationsCount, setTrafficViolationsCount] = useState(
    initialCharState.trafficViolationsCount ?? 0
  );
  const [cleanDrivingStreak, setCleanDrivingStreak] = useState(
    initialCharState.cleanDrivingStreak ?? 0
  );
  const [cargoDeliveriesCount, setCargoDeliveriesCount] = useState(
    initialCharState.cargoDeliveriesCount ?? 0
  );
  const [nearestGuidance, setNearestGuidance] = useState<{
    id: string;
    name: string;
    dagbaniLabel: string;
    distanceMeters: number;
    bearingLabel: string;
    isErrandTarget: boolean;
  } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [debugWireframe, setDebugWireframe] = useState(false);
  const [playerPos, setPlayerPos] = useState(initialCharState.playerPos);
  const [servicePos, setServicePos] = useState<{ x: number; z: number } | null>(null);
  const [npcStates, setNpcStates] = useState<NpcRuntimeSnapshot[]>([]);

  // Active modals
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [activeInteriorLandmarkId, setActiveInteriorLandmarkId] = useState<string | null>(null);
  const [activePoliceStop, setActivePoliceStop] = useState<PoliceStopNotice | null>(null);
  const [showClubGames, setShowClubGames] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showDagbaniGuide, setShowDagbaniGuide] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customizeTargetCharId, setCustomizeTargetCharId] = useState<string | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showCharacterSwitch, setShowCharacterSwitch] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showContributions, setShowContributions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"settings" | "controls">("settings");
  const [showAbout, setShowAbout] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const errandsRef = useRef(errands);
  errandsRef.current = errands;
  const activeGigRef = useRef(activeGig);
  activeGigRef.current = activeGig;
  const activeTaskRef = useRef(activeTask);
  activeTaskRef.current = activeTask;
  const cargoIntegrityPctRef = useRef(cargoIntegrityPct);
  cargoIntegrityPctRef.current = cargoIntegrityPct;
  const drivingMaxCargoKgRef = useRef(drivingMaxCargoKg);
  drivingMaxCargoKgRef.current = drivingMaxCargoKg;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const settledServiceIdRef = useRef<string | null>(null);
  const lastClockMinsRef = useRef<number>(9 * 60 + 15);
  const ownedBusinessIdsRef = useRef<string[]>(ownedBusinessIds);
  ownedBusinessIdsRef.current = ownedBusinessIds;
  const savingsBalanceRef = useRef<number>(savingsBalanceCedis);
  savingsBalanceRef.current = savingsBalanceCedis;
  const activeCharacterIdRef = useRef<string>(activeCharacterId);
  activeCharacterIdRef.current = activeCharacterId;
  const weatherRef = useRef<WeatherType>(weather);
  weatherRef.current = weather;
  const districtRef = useRef<string>(district);
  districtRef.current = district;
  const activeCityEventRef = useRef<ActiveCityEventMode>(activeCityEvent);
  activeCityEventRef.current = activeCityEvent;
  const menuPickedCharacterRef = useRef(false);
  const prevDrivingRef = useRef(false);
  const hasOpenedPhoneRef = useRef(false);
  const inMenuOrPauseRef = useRef(true);
  inMenuOrPauseRef.current = inMainMenu || exitedScreen;
  const dayCountRef = useRef(dayCount);
  dayCountRef.current = dayCount;
  const homeStateRef = useRef(homeState);
  homeStateRef.current = homeState;
  const laundryStateRef = useRef(laundryState);
  laundryStateRef.current = laundryState;
  const needsRef = useRef(needs);
  needsRef.current = needs;
  const activeInteriorSpecRef = useRef<InteriorRoomSpec | null>(activeInteriorSpec);
  activeInteriorSpecRef.current = activeInteriorSpec;
  const policePursuitActiveRef = useRef(policePursuitActive);
  policePursuitActiveRef.current = policePursuitActive;
  const isDrivingRef = useRef(isDriving);
  isDrivingRef.current = isDriving;
  const energyRef = useRef(energy);
  energyRef.current = energy;
  const lastLaundryToastRef = useRef<string | null>(null);

  const deviceLayout = useMemo(
    () => computeDeviceLayoutConfig(deviceSignals, settings),
    [deviceSignals, settings]
  );
  const deviceClassRef = useRef(deviceLayout.deviceClass);
  deviceClassRef.current = deviceLayout.deviceClass;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const activeProfile = useMemo(
    () => PLAYABLE_CHARACTERS.find((p) => p.id === activeCharacterId) || PLAYABLE_CHARACTERS[0],
    [activeCharacterId]
  );

  const activeCareerRank = useMemo(
    () => computeCareerRankTitle(activeProfile, completedJobsCount, cultureXp),
    [activeProfile, completedJobsCount, cultureXp]
  );

  // Sync player energy ratio into TamaleEngine
  useEffect(() => {
    engineRef.current?.setPlayerEnergyRatio(energy / 100);
  }, [energy]);

  // Sync Home cleanliness, sink dishes, rubbish, upgrades, and clothesline visuals into TamaleEngine
  useEffect(() => {
    engineRef.current?.setHomeVisualState(homeState, laundryState);
  }, [homeState, laundryState]);

  // Declarative achievement tracker
  useEffect(() => {
    setAchievements((prev) => {
      const next = new Set(prev);
      if (completedJobsCount >= 1) next.add("first_hustle");
      if (completedJobsCount >= 5) next.add("five_jobs");
      if (discoveredLandmarks.length >= 5) next.add("city_explorer_5");
      if (discoveredLandmarks.length >= 15) next.add("city_explorer_15");
      if (learnedVocabIds.length >= 6) next.add("dagbani_speaker");
      if (ownedBusinessIds.length >= 1) next.add("business_investor");
      if (capturedPhotos.length >= 1) next.add("photo_archivist");
      if (next.size === prev.length) return prev;
      return Array.from(next);
    });
  }, [
    completedJobsCount,
    discoveredLandmarks.length,
    learnedVocabIds.length,
    ownedBusinessIds.length,
    capturedPhotos.length,
  ]);

  const applySettingsToEngines = useCallback((next: GameSettings) => {
    audioRef.current?.setEnabled(next.audioEnabled);
    audioRef.current?.setVolume(next.soundVolume);
    engineRef.current?.setCameraMode(next.cameraMode);
    engineRef.current?.setCameraSensitivity(next.cameraSensitivity);
    engineRef.current?.setKeyBindings(next.keyBindings);
    engineRef.current?.setDevicePerformanceProfile(
      deviceClassRef.current,
      next.graphicsQuality,
      next.resolutionScale
    );
  }, []);

  useEffect(() => {
    engineRef.current?.setTouchControlsActive(deviceLayout.showTouchControls);
    engineRef.current?.setDevicePerformanceProfile(
      deviceLayout.deviceClass,
      settings.graphicsQuality,
      settings.resolutionScale
    );
  }, [
    deviceLayout.deviceClass,
    deviceLayout.showTouchControls,
    settings.graphicsQuality,
    settings.resolutionScale,
  ]);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      setSettings((prev) => {
        const next: GameSettings = {
          ...prev,
          ...patch,
          keyBindings: patch.keyBindings
            ? { ...DEFAULT_KEY_BINDINGS, ...patch.keyBindings }
            : prev.keyBindings,
        };
        applySettingsToEngines(next);
        return next;
      });
    },
    [applySettingsToEngines]
  );

  // Check saved game presence on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) setHasSavedGame(true);
    } catch {
      // ignore storage access issues
    }
  }, []);

  const awardSkillPoint = useCallback((skillKey: SkillKey, pts: number) => {
    if (pts <= 0) return;
    setSkills((prev) => ({
      ...prev,
      [skillKey]: Math.min(10, (prev[skillKey] ?? 1) + pts),
    }));
  }, []);

  const markHomeRoutineDone = useCallback((routineId: string) => {
    setHomeState((prev) =>
      prev.dailyRoutineIdsDone.includes(routineId)
        ? prev
        : {
            ...prev,
            dailyRoutineIdsDone: [...prev.dailyRoutineIdsDone, routineId],
          }
    );
  }, []);

  const settleNewDayAndMidnight = useCallback(
    (daysElapsed = 1, refreshWeatherFromSleep = false) => {
      const safeDays = Math.max(1, daysElapsed);
      const nextDay = dayCountRef.current + safeDays;
      setDayCount(nextDay);
      dayCountRef.current = nextDay;

      let summaryParts: string[] = [];
      if (ownedBusinessIdsRef.current.length > 0) {
        const dividend =
          ownedBusinessIdsRef.current.reduce(
            (sum, id) => sum + (SHOP_METADATA[id]?.dailyRevenueCedis ?? 35),
            0
          ) * safeDays;
        if (dividend > 0) {
          setMoneyCedis((m) => m + dividend);
          setTotalEarnedCedis((t) => t + dividend);
          summaryParts.push(`Business Dividend +GH₵ ${dividend}`);
        }
      }
      if (savingsBalanceRef.current >= 20) {
        const yieldAmt =
          Math.max(
            1,
            Math.round(
              savingsBalanceRef.current * TAMALE_ECONOMY_CONFIG.banking.savingsInterestDailyRate
            )
          ) * safeDays;
        setSavingsBalanceCedis((s) => s + yieldAmt);
        summaryParts.push(`Savings Interest +GH₵ ${yieldAmt}`);
      }

      const curHome = homeStateRef.current;
      const dailyBill = computeDailyHomeBillCedis(curHome) * safeDays;
      setHomeState((prev) => {
        const nextDirt: Record<HomeRoomKey, number> = {
          courtyard: Math.min(95, prev.roomDirt.courtyard + 4 * safeDays),
          livingRoom: Math.min(95, prev.roomDirt.livingRoom + 3 * safeDays),
          kitchen: Math.min(95, prev.roomDirt.kitchen + 3 * safeDays),
          bedroom: Math.min(95, prev.roomDirt.bedroom + 3 * safeDays),
          bathroom: Math.min(95, prev.roomDirt.bathroom + 3 * safeDays),
        };
        return {
          ...prev,
          roomDirt: nextDirt,
          cleanliness: computeHomeCleanlinessFromRooms(
            nextDirt,
            prev.dirtyDishesCount,
            prev.rubbishCount
          ),
          dailyBillsOwed: prev.dailyBillsOwed + dailyBill,
          dailyRoutineIdsDone: [],
        };
      });
      summaryParts.push(`Home Utilities +GH₵ ${dailyBill}`);

      setLaundryState((prev) => {
        if (prev.dryingOnLineCount <= 0) return prev;
        return {
          ...prev,
          cleanOutfitsStored: prev.cleanOutfitsStored + prev.dryingOnLineCount,
          dryingOnLineCount: 0,
          dryReadyAtMinutes: null,
          dryReadyDay: null,
        };
      });

      if (refreshWeatherFromSleep) {
        const pool: WeatherType[] = ["clear", "clear", "cloudy", "heat", "harmattan", "light_rain"];
        const nextWeather = pool[(nextDay + Math.floor(Math.random() * 2)) % pool.length];
        setWeather(nextWeather);
        engineRef.current?.setWeather(nextWeather);
      }

      audioRef.current?.playChime("coin");
      showToast(`Day ${nextDay} · ${summaryParts.join(" · ")}`);
    },
    [showToast]
  );

  const handleCompleteActiveErrand = useCallback(
    (landmarkId: string) => {
      const active = errandsRef.current.find(
        (e) => e.active && !e.completed && e.targetLandmarkId === landmarkId
      );
      if (!active) return;

      setErrands((prev) =>
        prev.map((e) => (e.id === active.id ? { ...e, active: false, completed: true } : e))
      );
      setMoneyCedis((m) => m + active.rewardCedis);
      setTotalEarnedCedis((t) => t + active.rewardCedis);
      setCultureXp((xp) => xp + active.rewardCultureXp);
      setCompletedJobsCount((c) => c + 1);
      markHomeRoutineDone("city_hustle");
      engineRef.current?.setActiveErrandLandmark(null);
      engineRef.current?.clearNavigationDestination();
      audioRef.current?.playChime("success");
      showToast(
        `Errand completed! Earned GH₵ ${active.rewardCedis} & +${active.rewardCultureXp} Culture XP`
      );
    },
    [markHomeRoutineDone, showToast]
  );

  const handleCompleteActiveGig = useCallback(
    (landmarkId: string) => {
      const currentGig = activeGigRef.current;
      if (!currentGig || currentGig.targetLandmarkId !== landmarkId) return;

      setActiveGig(null);
      setCompletedGigsCount((c) => c + 1);
      setCompletedJobsCount((c) => c + 1);
      setTotalEarnedCedis((t) => t + currentGig.rewardCedis);
      setMoneyCedis((m) => m + currentGig.rewardCedis);
      setCultureXp((xp) => xp + currentGig.rewardCultureXp);
      markHomeRoutineDone("city_hustle");
      engineRef.current?.setActiveGigLandmark(null);
      engineRef.current?.clearNavigationDestination();
      audioRef.current?.playChime("success");
      showToast(
        `Gig completed! Earned GH₵ ${currentGig.rewardCedis} & +${currentGig.rewardCultureXp} Culture XP`
      );
    },
    [markHomeRoutineDone, showToast]
  );

  const handleCompleteActiveTask = useCallback(
    (bonusCedis = 0, photoRecord?: CapturedPhotoRecord) => {
      const currentTask = activeTaskRef.current;
      if (!currentTask) return;
      const totalPay = Math.max(10, currentTask.job.rewardCedis + bonusCedis);
      setActiveTask(null);
      engineRef.current?.setActiveTaskState(null);
      engineRef.current?.clearAttachedCargo();
      engineRef.current?.clearNavigationDestination();
      setCompletedJobsCount((c) => c + 1);
      setCompletedGigsCount((c) => c + 1);
      setMoneyCedis((m) => m + totalPay);
      setTotalEarnedCedis((t) => t + totalPay);
      setCultureXp((xp) => xp + currentTask.job.rewardCultureXp);
      setEnergy((e) => Math.max(8, e - currentTask.job.energyCost));
      markHomeRoutineDone("city_hustle");
      awardSkillPoint(currentTask.job.skillReward.skill, currentTask.job.skillReward.points);
      if (photoRecord) {
        setCapturedPhotos((prev) => [photoRecord, ...prev]);
      }
      audioRef.current?.playChime("success");
      showToast(
        `Job completed! +GH₵ ${totalPay}, +${currentTask.job.rewardCultureXp} XP & +${currentTask.job.skillReward.points} ${currentTask.job.skillReward.skill}`
      );
    },
    [awardSkillPoint, markHomeRoutineDone, showToast]
  );

  // Initialize Northern Ghana Music & 7-Station FM Radio Engine
  useEffect(() => {
    const mr = new TamaleMusicRadioEngine();
    musicEngineRef.current = mr;
    try {
      const rawMusic = localStorage.getItem(MUSIC_STORAGE_KEY);
      if (rawMusic) {
        mr.hydratePersistedState(JSON.parse(rawMusic));
      }
    } catch {
      // ignore storage errors
    }
    const unsub = mr.subscribe((snap) => {
      setMusicSnap(snap);
      try {
        localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(mr.getPersistedState()));
      } catch {
        // ignore quota errors
      }
    });
    return () => {
      unsub();
      mr.dispose();
      musicEngineRef.current = null;
    };
  }, []);

  // Initialize Three.js TamaleEngine once inside isolated canvasMountRef
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const audio = new TamaleAudioEngine();
    audioRef.current = audio;

    const engine = new TamaleEngine(mountEl, initialProfile.customization, audio, {
      onHudUpdate: (data) => {
        setDistrict(data.district);
        setSpeedKmh(data.speedKmh);
        setIsDriving(data.isDriving);
        setIsRidingService(data.isRidingService);
        setDrivingLabel(data.drivingLabel);
        setDrivingKind(data.drivingKind);
        setDrivingMaxCargoKg(data.drivingMaxCargoKg);
        setVehicleHealthPct(data.vehicleHealthPct);
        setNearby(data.nearby);
        setNearbyVehicle(data.nearbyVehicle);
        setNearbyChatter(data.nearbyChatter);
        setNearbySignal(data.nearbySignal);
        setPolicePursuitActive(data.policePursuitActive);
        setImpoundedVehicleId(data.impoundedVehicleId);
        setNavSnapshot(data.navSnapshot);
        setCargoIntegrityPct(data.cargoIntegrityPct);
        setCargoLoadProgressPct(data.cargoLoadProgressPct);
        setPoliceCruiserPositions(data.policeCruiserPositions);
        setRoadIncidentPositions(data.roadIncidentPositions);
        setNearestGuidance(data.nearestGuidance);
        setPlayerPos(data.playerPos);
        setServicePos(data.servicePos);
        setNpcStates(data.npcStates);

        if (!inMenuOrPauseRef.current) {
          if (data.isDriving && !prevDrivingRef.current) {
            setDrivingHintTimerSec(4.2);
          } else if (data.isDriving) {
            setDrivingHintTimerSec((sec) => Math.max(0, sec - 0.14));
          } else if (prevDrivingRef.current) {
            setDrivingHintTimerSec(0);
          }
          prevDrivingRef.current = data.isDriving;

          setOnboarding((prev) =>
            prev.step === "complete"
              ? prev
              : advanceOnboardingState(prev, {
                  dt: 0.14,
                  isMoving: data.isMoving,
                  isRunning: data.isRunning,
                  hasOpenedPhone: hasOpenedPhoneRef.current,
                })
          );

          // Gentle daily-life needs progression during free-roam
          const activeWeather = weatherRef.current;
          const thirstDrain =
            activeWeather === "heat" ? 0.032 : activeWeather === "harmattan" ? 0.025 : 0.018;
          const hungerDrain = data.isRunning ? 0.022 : 0.012;
          const hygieneDrain =
            (data.isRunning ? 0.019 : 0.008) *
            (activeWeather === "rain" || activeWeather === "harmattan" ? 1.35 : 1);
          const homeCleanVal = homeStateRef.current.cleanliness;
          const outfitCleanVal = laundryStateRef.current.outfitCleanliness;

          setNeeds((prev) => {
            const nextHygiene = clampNeed(prev.hygiene - hygieneDrain);
            const nextHunger = clampNeed(prev.hunger - hungerDrain);
            const nextThirst = clampNeed(prev.thirst - thirstDrain);
            const nextSocial = clampNeed(prev.social - 0.004);
            const comfortTarget =
              homeCleanVal * 0.4 + outfitCleanVal * 0.3 + nextHygiene * 0.3;
            const comfortDelta = (comfortTarget - prev.comfort) * 0.003;
            const nextComfort = clampNeed(prev.comfort + comfortDelta);
            return {
              hygiene: nextHygiene,
              hunger: nextHunger,
              thirst: nextThirst,
              social: nextSocial,
              comfort: nextComfort,
            };
          });

          if (data.isMoving || activeWeather === "rain" || activeWeather === "harmattan") {
            const clothWear =
              (data.isRunning ? 0.011 : 0.004) *
              (activeWeather === "rain" || activeWeather === "harmattan" ? 1.5 : 1);
            setLaundryState((prev) => {
              const nextClean = Math.max(10, prev.outfitCleanliness - clothWear);
              return { ...prev, outfitCleanliness: nextClean };
            });
          }
        }
        if (engineRef.current) {
          const nextMins = engineRef.current.getGameMinutes();
          const prevMins = lastClockMinsRef.current;
          lastClockMinsRef.current = nextMins;
          setGameMinutes(nextMins);

          if (prevMins >= 23 * 60 && nextMins < 2 * 60) {
            settleNewDayAndMidnight(1, false);
          }

          // Check clothesline drying completion in real-time
          const curLaundry = laundryStateRef.current;
          if (
            curLaundry.dryingOnLineCount > 0 &&
            curLaundry.dryReadyDay !== null &&
            curLaundry.dryReadyAtMinutes !== null
          ) {
            const curDay = dayCountRef.current;
            const ready =
              curDay > curLaundry.dryReadyDay ||
              (curDay === curLaundry.dryReadyDay && nextMins >= curLaundry.dryReadyAtMinutes);
            if (ready) {
              const driedCount = curLaundry.dryingOnLineCount;
              setLaundryState((prev) => ({
                ...prev,
                cleanOutfitsStored: prev.cleanOutfitsStored + prev.dryingOnLineCount,
                dryingOnLineCount: 0,
                dryReadyAtMinutes: null,
                dryReadyDay: null,
              }));
              const notifyKey = `${curDay}_${curLaundry.dryReadyAtMinutes}`;
              if (lastLaundryToastRef.current !== notifyKey) {
                lastLaundryToastRef.current = notifyKey;
                showToast(
                  `${driedCount} outfit(s) on your Changli clothesline finished drying!`
                );
              }
            }
          }
        }
        if (data.discoveredLandmarkId) {
          const lmId = data.discoveredLandmarkId;
          setDiscoveredLandmarks((prev) => {
            if (prev.includes(lmId)) return prev;
            const lm = TAMALE_LANDMARKS.find((l) => l.id === lmId);
            if (lm) {
              setCultureXp((xp) => xp + 10);
              setActiveDiscoveryCard(lm);
              showToast(`Discovered ${lm.name} (${lm.dagbaniLabel})`);
            }
            return [...prev, lmId];
          });
        }
      },
      onInteriorChange: (spec) => {
        setActiveInteriorSpec(spec);
        if (!spec) {
          setActiveInteriorStation(null);
        } else {
          if (spec.landmarkId === "player_home") {
            engineRef.current?.setHomeVisualState(
              homeStateRef.current,
              laundryStateRef.current
            );
          }
          showToast(`Entered ${spec.title} (${spec.dagbaniTitle}). Walk to any station or door.`);
        }
      },
      onInteract: (item) => {
        if (item.kind === "npc") {
          setActiveNpcId(item.id);
        } else if (item.kind === "building") {
          if (item.doorClosed) {
            showToast(item.sublabel || `${item.label} is currently closed.`);
            return;
          }
          const entered = engineRef.current?.enterInterior(item.id);
          if (!entered) {
            setActiveInteriorLandmarkId(item.id);
          }
        } else if (item.kind === "police_officer") {
          const lawState = engineRef.current?.getLawEnforcementState();
          showToast(
            `${item.label}: ${lawState?.offensesCount ?? 0} citation(s) on record${
              lawState?.impoundedVehicleId
                ? ` · Impounded: ${lawState.impoundedVehicleId} (Release at Police HQ)`
                : " · Drive safe on Tamale avenues!"
            }`
          );
        } else if (item.kind === "accident_scene") {
          const cleared = engineRef.current?.assistRoadIncident(item.id);
          if (cleared) {
            setMoneyCedis((m) => m + 25);
            setTotalEarnedCedis((t) => t + 25);
            setCultureXp((xp) => xp + 15);
            setCleanDrivingStreak((s) => s + 1);
            awardSkillPoint("craft", 1);
            showToast(
              `Assisted stranded driver (${cleared.title})! Earned GH₵ 25 & +15 Culture XP.`
            );
          }
        } else if (item.kind === "interior_exit") {
          engineRef.current?.exitInterior();
        } else if (item.kind === "interior_station") {
          const inPlayerHome = activeInteriorSpecRef.current?.landmarkId === "player_home";
          if (item.stationKind === "wardrobe" && !inPlayerHome) {
            setCustomizeTargetCharId(activeCharacterIdRef.current);
            setShowCustomize(true);
          } else if (item.stationKind === "room_radio") {
            setPhoneInitialTab("radio");
            setShowMiniRadioBar(true);
            setShowPhone(true);
          } else if (item.stationKind === "club_game_table") {
            setShowClubGames(true);
          } else if (item.stationKind && item.stationKind !== "exit_door") {
            setActiveInteriorStation({
              kind: item.stationKind,
              label: item.label,
              shopId: item.shopId,
            });
          }
        } else if (item.kind === "vendor") {
          if (item.shopId) setActiveShopId(item.shopId);
        } else if (item.kind === "service_provider") {
          if (item.servicePhase === "board_ride") {
            engineRef.current?.boardServiceVehicle();
          } else {
            engineRef.current?.collectServiceDelivery();
          }
        } else if (item.kind === "job_action") {
          const task = activeTaskRef.current;
          if (!task) return;
          if (item.jobActionMode === "load_cargo" && task.stage === "go_to_pickup") {
            const attached = engineRef.current?.attachCargoToVehicle(
              task.job.cargoKind ?? "mixed_parcels"
            );
            if (!attached) {
              showToast("Enter a compatible freight vehicle before loading cargo.");
              return;
            }
            const updated: ActiveTaskRuntime = {
              ...task,
              stage: "go_to_destination",
              cargoLoaded: true,
              cargoDamagePct: 0,
            };
            setActiveTask(updated);
            engineRef.current?.setActiveTaskState(updated);
            const destLm = TAMALE_LANDMARKS.find((l) => l.id === task.job.targetLandmarkId);
            if (destLm) {
              engineRef.current?.setNavigationDestination({
                landmarkId: destLm.id,
                label: destLm.name,
                x: destLm.x,
                z: destLm.z,
              });
            }
            showToast(
              `Loaded ${task.job.cargoTitle ?? "Cargo"} (${task.job.cargoWeightKg ?? 100} kg)! Drive smoothly to ${task.job.targetLandmarkName}.`
            );
          } else if (item.jobActionMode === "unload_cargo" && task.stage === "go_to_destination") {
            const integrity = cargoIntegrityPctRef.current ?? 100;
            const bonusCedis =
              integrity >= 95
                ? 15
                : Math.round(task.job.rewardCedis * (Math.max(0.45, integrity / 100) - 1));
            setCargoDeliveriesCount((c) => c + 1);
            handleCompleteActiveTask(bonusCedis);
          } else if (item.interactionVerb === "load_cargo" && !item.jobActionMode) {
            const reqClasses = task.job.requiredVehicleClasses?.join(", ") || "Pickup / Cargo Trike / Truck";
            showToast(
              `Park a compatible freight vehicle (${reqClasses}) with >=${task.job.cargoWeightKg ?? 100} kg capacity to load cargo.`
            );
          } else if (
            item.jobActionMode === "pickup_passenger" &&
            task.stage === "go_to_pickup"
          ) {
            const updated: ActiveTaskRuntime = {
              ...task,
              stage: "go_to_destination",
              passengerBoarded: task.job.executionMode === "transport_passenger",
            };
            setActiveTask(updated);
            engineRef.current?.setActiveTaskState(updated);
            const destLm = TAMALE_LANDMARKS.find((l) => l.id === task.job.targetLandmarkId);
            if (destLm) {
              engineRef.current?.setNavigationDestination({
                landmarkId: destLm.id,
                label: destLm.name,
                x: destLm.x,
                z: destLm.z,
              });
            }
            audioRef.current?.playChime("success");
            showToast(
              `${
                task.job.executionMode === "transport_passenger"
                  ? "Passenger boarded!"
                  : "Dispatch collected!"
              } Now proceed to ${task.job.targetLandmarkName}.`
            );
          } else {
            setShowWorkModal(true);
          }
        } else if (item.kind === "delivery") {
          const currentTask = activeTaskRef.current;
          if (item.isGigDelivery && currentTask && currentTask.job.targetLandmarkId === item.id) {
            handleCompleteActiveTask(0);
          } else if (item.isGigDelivery) {
            handleCompleteActiveGig(item.id);
          } else {
            handleCompleteActiveErrand(item.id);
          }
        }
      },
      onServiceUpdate: (req) => {
        setActiveService(req);
        if (req && req.status === "completed" && settledServiceIdRef.current !== req.id) {
          settledServiceIdRef.current = req.id;
          setMoneyCedis((m) => Math.max(0, m - req.estimatedCostCedis));
          setAchievements((prev) =>
            prev.includes("service_patron") ? prev : [...prev, "service_patron"]
          );

          if (req.deliveredItems && req.deliveredItems.length > 0) {
            setInventory((prev) => {
              const next = [...prev];
              for (const dItem of req.deliveredItems!) {
                const idx = next.findIndex((i) => i.id === dItem.id);
                if (idx >= 0) {
                  next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
                } else {
                  next.push({
                    id: dItem.id,
                    name: dItem.name,
                    dagbaniName: dItem.dagbaniName,
                    category: dItem.category,
                    quantity: 1,
                    energyRestore: dItem.energyRestore,
                    description: dItem.description,
                  });
                }
              }
              return next;
            });
            showToast(
              `Delivered by ${req.providerName}! Items added to your bag (Paid GH₵ ${req.estimatedCostCedis}).`
            );
          } else if (req.kind === "roadside_repair") {
            setEnergy((e) => Math.min(100, e + 20));
            showToast(
              `Master mechanic serviced your street ride & boosted energy (+20%) · Paid GH₵ ${req.estimatedCostCedis}.`
            );
          } else {
            showToast(
              `Arrived at ${req.destinationName ?? "destination"}! Paid GH₵ ${req.estimatedCostCedis}.`
            );
          }
          audioRef.current?.playChime("success");
        }
      },
      onEnergyDrain: (delta) => {
        setEnergy((e) => Math.max(5, e - delta));
      },
      onPoliceStop: (notice) => {
        setActivePoliceStop(notice);
      },
      onLawEventToast: (msg) => {
        showToast(msg);
      },
      onCargoDamaged: (nextPct, reason) => {
        showToast(`${reason} · Cargo integrity ${Math.round(nextPct)}%`);
      },
      onWebGLContextChange: (lost) => setWebglLost(lost),
    });

    engineRef.current = engine;
    engine.setActivePlayableCharacter(initialProfile.id);
    engine.setPlayerEnergyRatio(initialCharState.energy / 100);
    applySettingsToEngines(settingsRef.current);
    engine.setPaused(true); // Paused while on Main Menu

    return () => {
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, [
    applySettingsToEngines,
    awardSkillPoint,
    handleCompleteActiveErrand,
    handleCompleteActiveGig,
    handleCompleteActiveTask,
    initialCharState.energy,
    initialProfile.customization,
    initialProfile.id,
    settleNewDayAndMidnight,
    showToast,
  ]);

  // Helper returning current runtime state merged with characterStates map (strict per-character isolation)
  const snapshotActiveCharacterState = useCallback((): CharacterRuntimeState => {
    const activeErr = errands.find((e) => e.active && !e.completed);
    return {
      characterId: activeCharacterId,
      moneyCedis,
      bankBalanceCedis,
      momoBalanceCedis,
      savingsBalanceCedis,
      vehicleCondition,
      energy,
      cultureXp,
      careerLevel: activeCareerRank.tier,
      skills,
      customization,
      inventory,
      friendships,
      discoveredLandmarks,
      learnedVocabIds,
      activeErrandId: activeErr ? activeErr.id : null,
      completedErrands: errands.filter((e) => e.completed).map((e) => e.id),
      activeTask,
      activeGig,
      completedJobsCount,
      completedGigsCount,
      totalEarnedCedis,
      ownedBusinessIds,
      achievements,
      capturedPhotos,
      phoneMessages,
      playerPos,
      policeFinesOwedCedis,
      trafficViolationsCount,
      cleanDrivingStreak,
      cargoDeliveriesCount,
      dayCount,
      needs,
      homeState,
      laundryState,
      ownedOutfits,
    };
  }, [
    activeCharacterId,
    moneyCedis,
    bankBalanceCedis,
    momoBalanceCedis,
    savingsBalanceCedis,
    vehicleCondition,
    energy,
    cultureXp,
    activeCareerRank.tier,
    skills,
    customization,
    inventory,
    friendships,
    discoveredLandmarks,
    learnedVocabIds,
    errands,
    activeTask,
    activeGig,
    completedJobsCount,
    completedGigsCount,
    totalEarnedCedis,
    ownedBusinessIds,
    achievements,
    capturedPhotos,
    phoneMessages,
    playerPos,
    policeFinesOwedCedis,
    trafficViolationsCount,
    cleanDrivingStreak,
    cargoDeliveriesCount,
    dayCount,
    needs,
    homeState,
    laundryState,
    ownedOutfits,
  ]);

  const allCharacterStatesLive = useMemo(() => {
    return {
      ...characterStates,
      [activeCharacterId]: snapshotActiveCharacterState(),
    };
  }, [characterStates, activeCharacterId, snapshotActiveCharacterState]);

  const applyCharacterStateToRuntime = useCallback(
    (charId: string, state: CharacterRuntimeState) => {
      const profile =
        PLAYABLE_CHARACTERS.find((p) => p.id === charId) || PLAYABLE_CHARACTERS[0];
      if (engineRef.current?.isIndoors()) {
        engineRef.current.exitInterior();
      }
      setActiveCharacterId(charId);
      setMoneyCedis(state.moneyCedis);
      setBankBalanceCedis(state.bankBalanceCedis ?? Math.round(profile.startingMoney * 1.5));
      setMomoBalanceCedis(state.momoBalanceCedis ?? 65);
      setSavingsBalanceCedis(state.savingsBalanceCedis ?? 100);
      setVehicleCondition(state.vehicleCondition ?? 92);
      setPhoneMessages(state.phoneMessages ?? createInitialCharacterState(profile).phoneMessages ?? []);
      setEnergy(state.energy);
      setDayCount(state.dayCount ?? 1);
      setNeeds(state.needs ?? createDefaultNeedsForCharacter());
      setHomeState(state.homeState ?? createDefaultHomeStateForCharacter(profile));
      setLaundryState(state.laundryState ?? createDefaultLaundryState());
      setOwnedOutfits(
        state.ownedOutfits ?? ["batakari", "kaba", "casual", "polo"]
      );
      setCultureXp(state.cultureXp);
      setSkills(state.skills);
      setCustomization(state.customization);
      setInventory(state.inventory);
      setFriendships(state.friendships);
      setDiscoveredLandmarks(state.discoveredLandmarks);
      setLearnedVocabIds(state.learnedVocabIds);
      setErrands(
        INITIAL_ERRANDS.map((e) => ({
          ...e,
          completed: state.completedErrands.includes(e.id),
          active: state.activeErrandId === e.id,
        }))
      );
      setActiveTask(state.activeTask);
      setActiveGig(state.activeGig ?? null);
      setCompletedJobsCount(state.completedJobsCount);
      setCompletedGigsCount(state.completedGigsCount ?? 0);
      setTotalEarnedCedis(state.totalEarnedCedis);
      setOwnedBusinessIds(state.ownedBusinessIds);
      setAchievements(state.achievements);
      setCapturedPhotos(state.capturedPhotos);
      setPlayerPos(state.playerPos);
      setPoliceFinesOwedCedis(state.policeFinesOwedCedis ?? 0);
      setTrafficViolationsCount(state.trafficViolationsCount ?? 0);
      setCleanDrivingStreak(state.cleanDrivingStreak ?? 0);
      setCargoDeliveriesCount(state.cargoDeliveriesCount ?? 0);
      setAvailableJobs(
        generateJobsForCharacter(
          profile.recommendedJobCategories,
          state.playerPos.x,
          state.playerPos.z
        )
      );
      setAvailableGigs(
        generateAvailableCityGigs(
          state.playerPos.x,
          state.playerPos.z,
          state.activeGig ? [state.activeGig.targetLandmarkId] : []
        )
      );

      if (engineRef.current) {
        engineRef.current.setActivePlayableCharacter(charId);
        engineRef.current.updatePlayerCustomization(state.customization);
        engineRef.current.setPlayerEnergyRatio(state.energy / 100);
        engineRef.current.setHomeVisualState(
          state.homeState ?? createDefaultHomeStateForCharacter(profile),
          state.laundryState ?? createDefaultLaundryState()
        );
        engineRef.current.setActiveTaskState(state.activeTask);
        engineRef.current.setLawEnforcementState({
          offensesCount: state.trafficViolationsCount ?? 0,
          impoundedVehicleId: null,
        });
        engineRef.current.setActiveGigLandmark(
          state.activeGig ? state.activeGig.targetLandmarkId : null
        );
        engineRef.current.setActiveErrandLandmark(
          state.activeErrandId
            ? INITIAL_ERRANDS.find((e) => e.id === state.activeErrandId)?.targetLandmarkId ?? null
            : null
        );
        engineRef.current.teleportTo(
          state.playerPos.x,
          state.playerPos.z,
          state.playerPos.rotY
        );
      }
    },
    []
  );

  const handleSwitchCharacter = useCallback(
    (newCharId: string) => {
      if (inMainMenu) {
        menuPickedCharacterRef.current = true;
      }
      if (newCharId === activeCharacterId) {
        setShowCharacterSwitch(false);
        setShowPhone(false);
        return;
      }
      if (engineRef.current?.isIndoors()) {
        engineRef.current.exitInterior();
      }
      engineRef.current?.cancelActiveService();
      setActiveService(null);
      const snapshot = snapshotActiveCharacterState();
      const updatedMap = {
        ...characterStates,
        [activeCharacterId]: snapshot,
      };
      const targetProfile =
        PLAYABLE_CHARACTERS.find((p) => p.id === newCharId) || PLAYABLE_CHARACTERS[0];
      const targetState = updatedMap[newCharId] ?? createInitialCharacterState(targetProfile);
      updatedMap[newCharId] = targetState;
      setCharacterStates(updatedMap);
      applyCharacterStateToRuntime(newCharId, targetState);
      setShowCharacterSwitch(false);
      setShowPhone(false);
      audioRef.current?.playChime("success");
      showToast(`Switched to ${targetProfile.name} (${targetProfile.occupation})`);
    },
    [
      activeCharacterId,
      applyCharacterStateToRuntime,
      characterStates,
      inMainMenu,
      showToast,
      snapshotActiveCharacterState,
    ]
  );

  // Pause engine whenever menu, exit screen, or any modal is open
  const anyModalOpen =
    inMainMenu ||
    exitedScreen ||
    Boolean(activeNpcId) ||
    Boolean(activeShopId) ||
    Boolean(activeInteriorLandmarkId) ||
    Boolean(activeInteriorStation) ||
    Boolean(activePoliceStop) ||
    showClubGames ||
    showMap ||
    showDagbaniGuide ||
    showCustomize ||
    showInventory ||
    showPhone ||
    showCharacterSwitch ||
    showWorkModal ||
    showReferences ||
    showEvents ||
    showContributions ||
    showSettings ||
    showAbout ||
    showPause;

  useEffect(() => {
    engineRef.current?.setPaused(anyModalOpen);
  }, [anyModalOpen]);

  useEffect(() => {
    const indoor = Boolean(activeShopId || activeInteriorLandmarkId || activeInteriorSpec);
    audioRef.current?.setIndoorMode(indoor);
    musicEngineRef.current?.setIndoorTransition(indoor);
  }, [activeShopId, activeInteriorLandmarkId, activeInteriorSpec]);

  useEffect(() => {
    musicEngineRef.current?.setVehicleMode(isDriving);
  }, [isDriving]);

  useEffect(() => {
    audioRef.current?.setPersonalMusicActive(musicSnap.isPlaying);
  }, [musicSnap.isPlaying]);

  useEffect(() => {
    musicEngineRef.current?.setDucking(activeNpcId ? 0.28 : 1.0);
  }, [activeNpcId]);

  // Keyboard shortcuts for HUD modals (supports custom key bindings)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        inMainMenu ||
        exitedScreen ||
        showSettings ||
        Boolean(activePoliceStop)
      ) {
        return;
      }

      const kb = settings.keyBindings;
      if (e.code === kb.pause || e.code === "Escape") {
        if (
          activeNpcId ||
          activeShopId ||
          activeInteriorLandmarkId ||
          activeInteriorStation ||
          showClubGames ||
          showMap ||
          showDagbaniGuide ||
          showCustomize ||
          showInventory ||
          showPhone ||
          showCharacterSwitch ||
          showWorkModal ||
          showReferences ||
          showEvents ||
          showContributions ||
          showAbout
        ) {
          setActiveNpcId(null);
          setActiveShopId(null);
          setActiveInteriorLandmarkId(null);
          setActiveInteriorStation(null);
          setShowClubGames(false);
          setShowMap(false);
          setShowDagbaniGuide(false);
          setShowCustomize(false);
          setCustomizeTargetCharId(null);
          setShowInventory(false);
          setShowPhone(false);
          setShowCharacterSwitch(false);
          setShowWorkModal(false);
          setShowReferences(false);
          setShowEvents(false);
          setShowContributions(false);
          setShowAbout(false);
        } else {
          setShowPause((p) => !p);
        }
      } else if (e.code === kb.map && !anyModalOpen) {
        setShowMap(true);
      } else if (e.code === "KeyL" && !anyModalOpen) {
        setShowDagbaniGuide(true);
      } else if (e.code === kb.inventory && !anyModalOpen) {
        setShowInventory(true);
      } else if (e.code === "KeyP" && !anyModalOpen) {
        hasOpenedPhoneRef.current = true;
        setPhoneInitialTab("home");
        setShowPhone(true);
      } else if (e.code === "KeyC" && !anyModalOpen) {
        setShowCharacterSwitch(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    inMainMenu,
    exitedScreen,
    showSettings,
    activePoliceStop,
    settings.keyBindings,
    anyModalOpen,
    activeNpcId,
    activeShopId,
    activeInteriorLandmarkId,
    activeInteriorStation,
    showClubGames,
    showMap,
    showDagbaniGuide,
    showCustomize,
    showInventory,
    showPhone,
    showCharacterSwitch,
    showWorkModal,
    showReferences,
    showEvents,
    showContributions,
    showAbout,
  ]);

  const handleSaveGame = useCallback(() => {
    const activeErr = errands.find((e) => e.active && !e.completed);
    const fullStates = allCharacterStatesLive;
    const saveObj: SavedGameState = {
      version: CURRENT_SAVE_VERSION,
      activeCharacterId,
      characterStates: fullStates,
      moneyCedis,
      bankBalanceCedis,
      momoBalanceCedis,
      savingsBalanceCedis,
      energy,
      cultureXp,
      gameMinutes,
      dayCount,
      weather,
      activeCityEvent,
      customization,
      settings,
      inventory,
      friendships,
      discoveredLandmarks,
      learnedVocabIds,
      activeErrandId: activeErr ? activeErr.id : null,
      completedErrands: errands.filter((e) => e.completed).map((e) => e.id),
      activeGig,
      completedGigsCount,
      totalEarnedCedis,
      playerPos,
      musicLibrary: musicEngineRef.current?.getPersistedState(),
    };
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveObj));
      setHasSavedGame(true);
      audioRef.current?.playChime("success");
      showToast("All Tamale characters, homes & progress saved.");
    } catch {
      showToast("Unable to write save data in this browser session.");
    }
  }, [
    allCharacterStatesLive,
    activeCharacterId,
    errands,
    moneyCedis,
    bankBalanceCedis,
    momoBalanceCedis,
    savingsBalanceCedis,
    energy,
    cultureXp,
    gameMinutes,
    dayCount,
    weather,
    activeCityEvent,
    customization,
    settings,
    inventory,
    friendships,
    discoveredLandmarks,
    learnedVocabIds,
    activeGig,
    completedGigsCount,
    totalEarnedCedis,
    playerPos,
    showToast,
  ]);

  const loadSavedGameFromStorage = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<SavedGameState>;
      const migrated = migrateSavedGameState(parsed, createInitialSettings());

      setGameMinutes(migrated.gameMinutes);
      lastClockMinsRef.current = migrated.gameMinutes;
      setWeather(migrated.weather);
      setActiveCityEvent(migrated.activeCityEvent);
      engineRef.current?.setActiveCityEvent(migrated.activeCityEvent);
      engineRef.current?.setWeather(migrated.weather);
      engineRef.current?.setGameMinutes(migrated.gameMinutes);

      setSettings(migrated.settings);
      applySettingsToEngines(migrated.settings);

      setCharacterStates(migrated.characterStates);
      applyCharacterStateToRuntime(
        migrated.activeCharacterId,
        migrated.characterStates[migrated.activeCharacterId]
      );
      if (migrated.musicLibrary) {
        musicEngineRef.current?.hydratePersistedState(migrated.musicLibrary);
      }
      return true;
    } catch {
      return false;
    }
  }, [applyCharacterStateToRuntime, applySettingsToEngines]);

  const handleNewGame = useCallback(() => {
    audioRef.current?.init();
    engineRef.current?.cancelActiveService();
    setActiveService(null);
    const freshMap = buildDefaultCharacterStates();
    const startProfile =
      PLAYABLE_CHARACTERS.find((p) => p.id === activeCharacterId) || PLAYABLE_CHARACTERS[0];
    setCharacterStates(freshMap);
    applyCharacterStateToRuntime(startProfile.id, freshMap[startProfile.id]);

    setGameMinutes(9 * 60 + 15);
    lastClockMinsRef.current = 9 * 60 + 15;
    setWeather("clear");
    setActiveCityEvent("ordinary_day");
    setActiveGig(null);
    setCompletedGigsCount(0);
    setActiveDiscoveryCard(null);
    setAvailableGigs(
      generateAvailableCityGigs(startProfile.spawnPos.x, startProfile.spawnPos.z)
    );
    engineRef.current?.setWeather("clear");
    engineRef.current?.setActiveCityEvent("ordinary_day");
    engineRef.current?.setGameMinutes(9 * 60 + 15);
    engineRef.current?.setActiveGigLandmark(null);
    engineRef.current?.clearNavigationDestination();
    engineRef.current?.clearAttachedCargo();
    engineRef.current?.setLawEnforcementState({ offensesCount: 0, impoundedVehicleId: null });
    setActivePoliceStop(null);
    setImpoundedVehicleId(null);
    setExitedScreen(false);
    setShowPause(false);
    setInMainMenu(false);
    showToast(`Dasuba! Playing as ${startProfile.name} (${startProfile.occupation}).`);
  }, [activeCharacterId, applyCharacterStateToRuntime, showToast]);

  const handleContinueGame = useCallback(() => {
    audioRef.current?.init();
    const loaded = loadSavedGameFromStorage();
    setExitedScreen(false);
    setShowPause(false);
    if (loaded) {
      setInMainMenu(false);
      showToast("Dasuba / Antire! Welcome back to Tamale.");
    } else {
      handleNewGame();
      showToast("No prior save found — starting a fresh journey in Tamale!");
    }
  }, [handleNewGame, loadSavedGameFromStorage, showToast]);

  const handlePlay = useCallback(() => {
    if (hasSavedGame && !menuPickedCharacterRef.current) {
      handleContinueGame();
    } else {
      audioRef.current?.init();
      menuPickedCharacterRef.current = false;
      setExitedScreen(false);
      setShowPause(false);
      setInMainMenu(false);
      showToast(`Dasuba! Playing as ${activeProfile.name} (${activeProfile.occupation}).`);
    }
  }, [activeProfile.name, activeProfile.occupation, handleContinueGame, hasSavedGame, showToast]);

  const handleLoadFromPause = useCallback(() => {
    audioRef.current?.init();
    const loaded = loadSavedGameFromStorage();
    if (loaded) {
      setShowPause(false);
      audioRef.current?.playChime("success");
      showToast("Loaded saved Tamale progress.");
    } else {
      showToast("No saved game found yet — save your progress first.");
    }
  }, [loadSavedGameFromStorage, showToast]);

  const handleToggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        const req = document.documentElement.requestFullscreen?.();
        if (req) {
          void req
            .then(() => {
              const ori = screen.orientation as unknown as {
                lock?: (mode: string) => Promise<void>;
              };
              if (deviceSignals.hasTouch && ori?.lock) {
                void ori.lock("landscape").catch(() => undefined);
              }
            })
            .catch(() => undefined);
        }
      } else {
        void document.exitFullscreen?.().catch(() => undefined);
      }
    } catch {
      // Ignore fullscreen denial on restricted browsers
    }
  }, [deviceSignals.hasTouch]);

  const handleAdjustWallets = useCallback(
    (patch: {
      cashDelta?: number;
      bankDelta?: number;
      momoDelta?: number;
      savingsDelta?: number;
      xpDelta?: number;
      message?: string;
    }) => {
      if (patch.cashDelta) setMoneyCedis((m) => Math.max(0, m + patch.cashDelta!));
      if (patch.bankDelta) setBankBalanceCedis((b) => Math.max(0, b + patch.bankDelta!));
      if (patch.momoDelta) setMomoBalanceCedis((m) => Math.max(0, m + patch.momoDelta!));
      if (patch.savingsDelta) setSavingsBalanceCedis((s) => Math.max(0, s + patch.savingsDelta!));
      if (patch.xpDelta) setCultureXp((xp) => xp + patch.xpDelta!);
      audioRef.current?.playChime("coin");
      if (patch.message) showToast(patch.message);
    },
    [showToast]
  );

  const handleApplyEnergyAndTime = useCallback(
    (opts: {
      costCedis?: number;
      payWith?: "cash" | "momo";
      energyDelta?: number;
      setFullEnergy?: boolean;
      advanceMinutes?: number;
      xpBonus?: number;
      message?: string;
    }): boolean => {
      const cost = opts.costCedis ?? 0;
      const wallet = opts.payWith === "momo" ? momoBalanceCedis : moneyCedis;
      if (wallet < cost) {
        showToast(`Need GH₵ ${cost}.`);
        return false;
      }
      if (cost > 0) {
        if (opts.payWith === "momo") setMomoBalanceCedis((m) => m - cost);
        else setMoneyCedis((m) => m - cost);
      }
      if (opts.setFullEnergy) {
        setEnergy(100);
      } else if (opts.energyDelta) {
        setEnergy((e) => Math.max(5, Math.min(100, e + opts.energyDelta!)));
      }
      if (opts.xpBonus) {
        setCultureXp((xp) => xp + opts.xpBonus!);
      }
      if (opts.advanceMinutes) {
        const nextMins = (((gameMinutes + opts.advanceMinutes) % 1440) + 1440) % 1440;
        setGameMinutes(nextMins);
        lastClockMinsRef.current = nextMins;
        engineRef.current?.setGameMinutes(nextMins);
      }
      audioRef.current?.playChime("success");
      if (opts.message) showToast(opts.message);
      return true;
    },
    [gameMinutes, momoBalanceCedis, moneyCedis, showToast]
  );

  const handleRepairVehicle = useCallback(
    (newCondition: number, costCedis: number, label: string): boolean => {
      if (moneyCedis < costCedis) {
        showToast(`Need GH₵ ${costCedis} for ${label}.`);
        return false;
      }
      setMoneyCedis((m) => m - costCedis);
      setVehicleCondition(Math.min(100, Math.max(0, newCondition)));
      engineRef.current?.repairDrivingVehicle();
      awardSkillPoint("craft", 1);
      audioRef.current?.playChime("success");
      showToast(`${label} complete! Vehicle condition is now ${Math.round(newCondition)}%.`);
      return true;
    },
    [awardSkillPoint, moneyCedis, showToast]
  );

  const handleApplyStationCustomization = useCallback(
    (next: PlayerCustomization, costCedis = 0, label?: string): boolean => {
      if (costCedis > 0 && moneyCedis < costCedis) {
        showToast(`Need GH₵ ${costCedis}.`);
        return false;
      }
      if (costCedis > 0) setMoneyCedis((m) => m - costCedis);
      setCustomization(next);
      engineRef.current?.updatePlayerCustomization(next);
      audioRef.current?.playChime("success");
      if (label) showToast(label);
      return true;
    },
    [moneyCedis, showToast]
  );

  const handleSendPhoneMessage = useCallback(
    (npcId: string, text: string) => {
      const npc = TAMALE_NPCS.find((n) => n.id === npcId);
      const clock = formatClock(gameMinutes);
      const replyText = npc
        ? `Sent to ${npc.name}: “${text}” — Reply: Antire! ${npc.greetings.morning.english} Come find me in ${npc.district}.`
        : text;
      setPhoneMessages((prev) => [
        {
          id: `msg_${Date.now()}`,
          senderName: npc ? npc.name : "Tamale City Dispatch",
          senderRole: npc ? npc.role : "SMS",
          text: replyText,
          timestampClock: clock,
          read: true,
        },
        ...prev,
      ]);
      audioRef.current?.playChime("interact");
      showToast(`Sent SMS to ${npc?.name ?? "contact"}.`);
    },
    [gameMinutes, showToast]
  );

  const handleMarkMessagesRead = useCallback(() => {
    setPhoneMessages((prev) => prev.map((m) => (m.read ? m : { ...m, read: true })));
  }, []);

  const handleTuneRadioStation = useCallback((station: RadioStation) => {
    const seg = buildDynamicRadioSegment({
      station,
      gameMinutes: lastClockMinsRef.current,
      weather: weatherRef.current,
      district: districtRef.current,
      activeCityEventLabel: INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEventRef.current].label,
    });
    musicEngineRef.current?.tuneStation(station.id, seg);
    setShowMiniRadioBar(true);
  }, []);

  const handleRefreshDjSegment = useCallback((station: RadioStation) => {
    const seg = buildDynamicRadioSegment({
      station,
      gameMinutes: lastClockMinsRef.current,
      weather: weatherRef.current,
      district: districtRef.current,
      activeCityEventLabel: INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEventRef.current].label,
      lastLine: musicEngineRef.current?.getSnapshot().djSegment ?? undefined,
    });
    musicEngineRef.current?.setDjSegment(seg);
  }, []);

  const handleBuyItem = (
    item: ShopItem,
    finalPrice: number,
    consumeImmediately = false,
    payWith: "cash" | "momo" = "cash"
  ): boolean => {
    const wallet = payWith === "momo" ? momoBalanceCedis : moneyCedis;
    if (wallet < finalPrice) return false;
    if (payWith === "momo") setMomoBalanceCedis((m) => m - finalPrice);
    else setMoneyCedis((m) => m - finalPrice);
    audioRef.current?.playChime("coin");

    if (item.unlockOutfit) {
      const updated = { ...customization, outfit: item.unlockOutfit };
      setCustomization(updated);
      setOwnedOutfits((prev) =>
        prev.includes(item.unlockOutfit!) ? prev : [...prev, item.unlockOutfit!]
      );
      setLaundryState((prev) => ({ ...prev, outfitCleanliness: 100 }));
      engineRef.current?.updatePlayerCustomization(updated);
      setCultureXp((xp) => xp + 20);
      showToast(`Equipped ${item.name} (${item.dagbaniName})!`);
    } else if (item.ingredientKey) {
      const units = item.ingredientUnits ?? 1;
      setHomeState((prev) => ({
        ...prev,
        fridgeIngredients: {
          ...prev.fridgeIngredients,
          [item.ingredientKey!]: (prev.fridgeIngredients[item.ingredientKey!] ?? 0) + units,
        },
      }));
      audioRef.current?.playChime("success");
      showToast(`Stocked ${item.name} (+${units} to Home Pantry)!`);
    } else if (consumeImmediately) {
      if (item.energyRestore) {
        setEnergy((e) => Math.min(100, e + item.energyRestore!));
      }
      const hungerBoost = item.hungerRestore ?? (item.category === "food" ? 26 : 0);
      const thirstBoost = item.thirstRestore ?? 0;
      const hygieneBoost = item.hygieneRestore ?? 0;
      if (hungerBoost > 0 || thirstBoost > 0 || hygieneBoost > 0) {
        setNeeds((prev) => ({
          ...prev,
          hunger: clampNeed(prev.hunger + hungerBoost),
          thirst: clampNeed(prev.thirst + thirstBoost),
          hygiene: clampNeed(prev.hygiene + hygieneBoost),
        }));
      }
      audioRef.current?.playChime("success");
      showToast(`Enjoyed ${item.name} fresh!`);
    } else {
      setInventory((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
        }
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            dagbaniName: item.dagbaniName,
            category: item.category,
            quantity: 1,
            energyRestore: item.energyRestore,
            hungerRestore: item.hungerRestore,
            thirstRestore: item.thirstRestore,
            hygieneRestore: item.hygieneRestore,
            ingredientKey: item.ingredientKey,
            description: item.description,
          },
        ];
      });
    }
    return true;
  };

  const handleUseShopService = (service: ShopServiceAction) => {
    if (moneyCedis < service.price) return;
    setMoneyCedis((m) => m - service.price);
    if (service.energyRestore) {
      setEnergy((e) => Math.min(100, e + service.energyRestore!));
    }
    if (service.cultureXp) {
      setCultureXp((xp) => xp + service.cultureXp!);
    }
    if (service.advanceMinutes) {
      const nextMins = (((gameMinutes + service.advanceMinutes) % 1440) + 1440) % 1440;
      setGameMinutes(nextMins);
      lastClockMinsRef.current = nextMins;
      engineRef.current?.setGameMinutes(nextMins);
    }
    audioRef.current?.playChime("success");
    showToast(`${service.label} (${service.dagbaniLabel}) completed!`);
  };

  const handleInvestBusiness = useCallback(
    (shopId: string) => {
      const meta = SHOP_METADATA[shopId];
      if (!meta || !meta.buyableSharePrice) return;
      if (ownedBusinessIds.includes(shopId)) {
        showToast(`You already co-own ${meta.title}.`);
        return;
      }
      if (moneyCedis < meta.buyableSharePrice) {
        showToast(`Need GH₵ ${meta.buyableSharePrice} to invest in ${meta.title}.`);
        return;
      }
      setMoneyCedis((m) => m - meta.buyableSharePrice!);
      setOwnedBusinessIds((prev) => [...prev, shopId]);
      awardSkillPoint("trade", 1);
      audioRef.current?.playChime("success");
      showToast(
        `Co-owned ${meta.title}! You now earn +GH₵ ${meta.dailyRevenueCedis ?? 35}/day at midnight.`
      );
    },
    [awardSkillPoint, moneyCedis, ownedBusinessIds, showToast]
  );

  const handleConsumeItem = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    if (item.energyRestore) {
      setEnergy((e) => Math.min(100, e + item.energyRestore!));
    }
    const hungerBoost = item.hungerRestore ?? (item.category === "food" ? 24 : 0);
    const thirstBoost = item.thirstRestore ?? 0;
    const hygieneBoost = item.hygieneRestore ?? 0;
    if (hungerBoost > 0 || thirstBoost > 0 || hygieneBoost > 0) {
      setNeeds((prev) => ({
        ...prev,
        hunger: clampNeed(prev.hunger + hungerBoost),
        thirst: clampNeed(prev.thirst + thirstBoost),
        hygiene: clampNeed(prev.hygiene + hygieneBoost),
      }));
    }
    setInventory((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
    audioRef.current?.playChime("success");
    showToast(`Enjoyed ${item.name} (${item.dagbaniName})!`);
  };

  const handleAcceptErrand = (errandId: string) => {
    const err = errands.find((e) => e.id === errandId);
    if (!err) return;
    setErrands((prev) =>
      prev.map((e) => ({
        ...e,
        active: e.id === errandId,
      }))
    );
    engineRef.current?.setActiveErrandLandmark(err.targetLandmarkId);
    const lm = TAMALE_LANDMARKS.find((l) => l.id === err.targetLandmarkId);
    if (lm) {
      engineRef.current?.setNavigationDestination({
        landmarkId: lm.id,
        label: lm.name,
        x: lm.x,
        z: lm.z,
      });
    }
    setActiveNpcId(null);
    audioRef.current?.playChime("success");
    showToast(`Errand started: Head to ${err.targetLandmarkName} (amber beacon).`);
  };

  const handleAcceptGig = (gig: CityGigTask) => {
    setActiveGig(gig);
    engineRef.current?.setActiveGigLandmark(gig.targetLandmarkId);
    const lm = TAMALE_LANDMARKS.find((l) => l.id === gig.targetLandmarkId);
    if (lm) {
      engineRef.current?.setNavigationDestination({
        landmarkId: lm.id,
        label: lm.name,
        x: lm.x,
        z: lm.z,
      });
    }
    setShowInventory(false);
    audioRef.current?.playChime("success");
    showToast(`Gig accepted: Head to ${gig.targetLandmarkName} (green beacon).`);
  };

  const handleAbandonGig = () => {
    setActiveGig(null);
    engineRef.current?.setActiveGigLandmark(null);
    engineRef.current?.clearNavigationDestination();
    showToast("Active gig cancelled.");
  };

  const handleRefreshGigs = () => {
    setAvailableGigs(
      generateAvailableCityGigs(
        playerPos.x,
        playerPos.z,
        activeGig ? [activeGig.targetLandmarkId] : []
      )
    );
    showToast("Refreshed Tamale city dispatch board.");
  };

  const handleAcceptTask = useCallback(
    (job: CityTaskJob) => {
      const needsPickup =
        Boolean(job.pickupLandmarkId) &&
        (job.executionMode === "transport_passenger" ||
          job.executionMode === "pickup_and_deliver" ||
          job.executionMode === "cargo_haul");
      const task: ActiveTaskRuntime = {
        job,
        stage: needsPickup ? "go_to_pickup" : "ready_for_activity",
        startedAtMinutes: gameMinutes,
      };
      setActiveTask(task);
      engineRef.current?.clearAttachedCargo();
      engineRef.current?.setActiveTaskState(task);
      const navLmId = needsPickup ? job.pickupLandmarkId : job.targetLandmarkId;
      const navLm = navLmId ? TAMALE_LANDMARKS.find((l) => l.id === navLmId) : undefined;
      if (navLm) {
        engineRef.current?.setNavigationDestination({
          landmarkId: navLm.id,
          label: navLm.name,
          x: navLm.x,
          z: navLm.z,
        });
      }
      setShowPhone(false);
      audioRef.current?.playChime("success");
      showToast(
        needsPickup
          ? `Accepted: Go to ${job.pickupLabel} first (green beacon).`
          : `Accepted: Travel to ${job.targetLandmarkName} to begin!`
      );
    },
    [gameMinutes, showToast]
  );

  const handleAbandonTask = useCallback(() => {
    setActiveTask(null);
    engineRef.current?.setActiveTaskState(null);
    engineRef.current?.clearAttachedCargo();
    engineRef.current?.clearNavigationDestination();
    showToast("Active city job cancelled.");
  }, [showToast]);

  const handleDispatchService = useCallback(
    (kind: ServiceRequestKind, destLandmarkId?: string, packageOptionId?: string) => {
      const entry = SERVICE_CATALOG.find((s) => s.kind === kind);
      if (!entry) return;
      const destLm = destLandmarkId
        ? TAMALE_LANDMARKS.find((l) => l.id === destLandmarkId)
        : undefined;
      const distMeters = destLm
        ? Math.max(120, Math.round(Math.hypot(destLm.x - playerPos.x, destLm.z - playerPos.z) * 10))
        : 450;
      const pkg = entry.packageOptions?.find((p) => p.id === packageOptionId);
      const fare = calculateServiceFare(entry, distMeters, pkg?.extraCostCedis ?? 0);

      if (moneyCedis < fare) {
        showToast(`Need GH₵ ${fare} for ${entry.title}.`);
        return;
      }

      const providerName =
        entry.providerNames[Math.floor(Math.random() * entry.providerNames.length)];
      const req: ServiceRequestRuntime = {
        id: `srv_${Date.now()}`,
        kind,
        title: entry.title,
        providerName,
        vehicleKind: entry.vehicleKind,
        estimatedCostCedis: fare,
        distanceMeters: distMeters,
        etaSeconds: 10,
        status: "en_route_to_player",
        statusNote: `${providerName} dispatched and heading down Tamale roads.`,
        destinationLandmarkId: destLm?.id,
        destinationName: destLm?.name,
        destinationX: destLm?.x,
        destinationZ: destLm ? destLm.z + 12 : undefined,
        deliveredItems: pkg?.items,
      };

      setShowPhone(false);
      engineRef.current?.dispatchServiceRequest(req, {
        x: playerPos.x + 2.5,
        z: playerPos.z + 2.5,
      });
      showToast(`${providerName} is driving to your location on the road grid!`);
    },
    [moneyCedis, playerPos.x, playerPos.z, showToast]
  );

  const handleFastTravelToLandmark = useCallback(
    (lm: LandmarkData) => {
      let tx = lm.x;
      let tz = lm.z + 15;
      if (lm.id === "tamale_interchange") {
        tx = 14;
        tz = 14;
      } else if (lm.id === "player_home") {
        tx = 20;
        tz = 89;
      } else if (lm.id === "changli_provisions_mart") {
        tx = 50;
        tz = 89;
      } else if (lm.id === "central_mosque") {
        tx = 18;
        tz = lm.z;
      } else if (lm.id === "aliu_mahama_stadium") {
        tx = lm.x;
        tz = lm.z + 27;
      } else if (lm.id === "tamale_teaching_hospital") {
        tx = lm.x - 18;
        tz = lm.z + 10;
      } else if (lm.id === "scca_red_clay" || lm.id === "kukuo_market_pottery") {
        tx = lm.x - 16;
        tz = lm.z;
      } else if (lm.id === "tamale_airport") {
        tx = lm.x;
        tz = lm.z + 14;
      }
      engineRef.current?.teleportTo(tx, tz, 0);
      setShowMap(false);
      setShowPhone(false);
      showToast(`Arrived at ${lm.name}`);
    },
    [showToast]
  );

  const handleLearnVocab = useCallback((vocabIds: string[]) => {
    setLearnedVocabIds((prev) => {
      const merged = new Set([...prev, ...vocabIds]);
      if (merged.size === prev.length) return prev;
      setCultureXp((xp) => xp + (merged.size - prev.length) * 5);
      return Array.from(merged);
    });
  }, []);

  const handleIncreaseFriendship = useCallback((npcId: string) => {
    setFriendships((prev) => ({
      ...prev,
      [npcId]: (prev[npcId] ?? 1) + 1,
    }));
    setNeeds((prev) => ({
      ...prev,
      social: clampNeed(prev.social + 14),
    }));
  }, []);

  // --- PERSONAL HOME & DAILY LIFE ACTION HANDLERS ---
  const advanceClockMinutes = useCallback((deltaMins: number) => {
    const cur = lastClockMinsRef.current;
    const total = cur + deltaMins;
    const nextMins = ((Math.floor(total) % 1440) + 1440) % 1440;
    const daysCrossed = Math.floor(total / 1440);
    setGameMinutes(nextMins);
    lastClockMinsRef.current = nextMins;
    engineRef.current?.setGameMinutes(nextMins);
    if (daysCrossed > 0) {
      settleNewDayAndMidnight(daysCrossed, false);
    }
  }, [settleNewDayAndMidnight]);

  const handleSleepUntil = useCallback(
    (mode: "nap" | "wake_6" | "wake_7" | "wake_8" | "wake_9" | "sleep_8h"): { ok: boolean; message: string } => {
      if (policePursuitActiveRef.current) {
        return {
          ok: false,
          message: "Cannot sleep while actively pursued by Tamale MTTD Patrol!",
        };
      }
      if (isDrivingRef.current) {
        return {
          ok: false,
          message: "Park and exit your vehicle before resting in your bedroom.",
        };
      }
      const curMins = lastClockMinsRef.current;
      let deltaMins = 480;
      if (mode === "nap") {
        deltaMins = 90;
      } else if (mode === "sleep_8h") {
        deltaMins = 480;
      } else {
        const targetMap: Record<"wake_6" | "wake_7" | "wake_8" | "wake_9", number> = {
          wake_6: 6 * 60,
          wake_7: 7 * 60,
          wake_8: 8 * 60,
          wake_9: 9 * 60,
        };
        const target = targetMap[mode];
        deltaMins = (target - curMins + 1440) % 1440;
        if (deltaMins < 90) deltaMins += 1440;
      }

      const total = curMins + deltaMins;
      const daysCrossed = Math.floor(total / 1440);
      const nextMins = ((Math.floor(total) % 1440) + 1440) % 1440;
      const bedTier = homeStateRef.current.upgrades.bed_tier ?? 1;
      const secGateBonus = (homeStateRef.current.upgrades.security_gate ?? 1) >= 2 ? 10 : 0;
      const cleanPenalty = homeStateRef.current.cleanliness < 45 ? -10 : 0;

      if (mode === "nap") {
        setEnergy((e) => Math.min(100, Math.max(e, Math.min(100, e + 35 + bedTier * 5))));
        setNeeds((prev) => ({
          ...prev,
          comfort: clampNeed(prev.comfort + 14 + bedTier * 4),
        }));
      } else {
        const targetEnergy = Math.max(50, Math.min(100, (bedTier === 1 ? 88 : 100) + cleanPenalty));
        setEnergy(targetEnergy);
        setNeeds((prev) => ({
          ...prev,
          comfort: clampNeed(prev.comfort + 24 + bedTier * 8 + secGateBonus + cleanPenalty),
          hunger: clampNeed(prev.hunger - 12),
          thirst: clampNeed(prev.thirst - 14),
        }));
      }

      setGameMinutes(nextMins);
      lastClockMinsRef.current = nextMins;
      engineRef.current?.setGameMinutes(nextMins);

      if (daysCrossed > 0) {
        settleNewDayAndMidnight(daysCrossed, mode !== "nap");
      } else {
        markHomeRoutineDone("evening_rest");
      }
      audioRef.current?.playChime("success");
      const msg =
        mode === "nap"
          ? `Power nap complete · Clock now ${formatClock(nextMins)}`
          : `Good morning! Woke up refreshed at ${formatClock(nextMins)}.`;
      showToast(msg);
      return { ok: true, message: msg };
    },
    [markHomeRoutineDone, settleNewDayAndMidnight, showToast]
  );

  const handleHygieneAction = useCallback(
    (kind: "shower" | "sink" | "toilet" | "mirror"): string => {
      const polytankBonus = homeStateRef.current.upgrades.polytank_plumbing >= 2 ? 20 : 0;
      if (kind === "shower") {
        setNeeds((prev) => ({
          ...prev,
          hygiene: clampNeed(prev.hygiene + 58 + polytankBonus),
          comfort: clampNeed(prev.comfort + 18),
        }));
        setEnergy((e) => Math.min(100, e + 8));
        advanceClockMinutes(20);
        setHomeState((prev) => {
          const roomDirt = { ...prev.roomDirt, bathroom: Math.min(95, prev.roomDirt.bathroom + 3) };
          return {
            ...prev,
            roomDirt,
            cleanliness: computeHomeCleanlinessFromRooms(roomDirt, prev.dirtyDishesCount, prev.rubbishCount),
          };
        });
        markHomeRoutineDone("morning_hygiene");
        audioRef.current?.playChime("success");
        return polytankBonus > 0
          ? "Enjoyed a hot pressurized Polytank shower! Hygiene refreshed."
          : "Took a refreshing shower! Hygiene restored.";
      }
      if (kind === "sink") {
        setNeeds((prev) => ({
          ...prev,
          hygiene: clampNeed(prev.hygiene + 28),
          thirst: clampNeed(prev.thirst + 10),
        }));
        advanceClockMinutes(8);
        markHomeRoutineDone("morning_hygiene");
        audioRef.current?.playChime("interact");
        return "Washed face & brushed teeth at the bathroom basin.";
      }
      if (kind === "toilet") {
        setNeeds((prev) => ({
          ...prev,
          hygiene: clampNeed(prev.hygiene + 14),
          comfort: clampNeed(prev.comfort + 14),
        }));
        advanceClockMinutes(6);
        setHomeState((prev) => {
          const roomDirt = { ...prev.roomDirt, bathroom: Math.min(95, prev.roomDirt.bathroom + 4) };
          return {
            ...prev,
            roomDirt,
            cleanliness: computeHomeCleanlinessFromRooms(roomDirt, prev.dirtyDishesCount, prev.rubbishCount),
          };
        });
        audioRef.current?.playChime("interact");
        return "Used the bathroom & washed hands thoroughly.";
      }
      setNeeds((prev) => ({
        ...prev,
        comfort: clampNeed(prev.comfort + 12),
        social: clampNeed(prev.social + 10),
      }));
      advanceClockMinutes(5);
      audioRef.current?.playChime("interact");
      return `Looking sharp in your ${customization.outfit} (Outfit cleanliness ${Math.round(
        laundryStateRef.current.outfitCleanliness
      )}%).`;
    },
    [advanceClockMinutes, customization.outfit, markHomeRoutineDone]
  );

  const handleCookRecipe = useCallback(
    (recipeId: string): { ok: boolean; message: string } => {
      const recipe = HOME_COOKING_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return { ok: false, message: "Recipe not found." };
      const curFridge = homeStateRef.current.fridgeIngredients;
      for (const [k, req] of Object.entries(recipe.ingredients)) {
        if ((curFridge[k as HomeIngredientId] ?? 0) < (req ?? 0)) {
          return {
            ok: false,
            message: "Missing ingredients! Stock up at Changli Provisions or Central Market.",
          };
        }
      }
      const upgradedStove = homeStateRef.current.upgrades.kitchen_appliance >= 2;
      const cookMins = upgradedStove
        ? Math.max(2, Math.round(recipe.cookMinutes * 0.6))
        : recipe.cookMinutes;

      setHomeState((prev) => {
        const nextFridge = { ...prev.fridgeIngredients };
        for (const [k, req] of Object.entries(recipe.ingredients)) {
          const key = k as HomeIngredientId;
          nextFridge[key] = Math.max(0, (nextFridge[key] ?? 0) - (req ?? 0));
        }
        const nextDishes = prev.dirtyDishesCount + 1;
        const nextDirt = {
          ...prev.roomDirt,
          kitchen: Math.min(95, prev.roomDirt.kitchen + 5),
        };
        const preparedMeal = {
          id: `meal_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          recipeId: recipe.id,
          name: recipe.name,
          dagbaniName: recipe.dagbaniName,
          hungerRestore: recipe.hungerRestore,
          energyRestore: recipe.energyRestore,
          thirstRestore: recipe.thirstRestore,
          comfortRestore: recipe.comfortRestore + (upgradedStove ? 8 : 0),
          preparedDay: dayCountRef.current,
        };
        return {
          ...prev,
          fridgeIngredients: nextFridge,
          cookedMealsReady: [preparedMeal, ...prev.cookedMealsReady],
          dirtyDishesCount: nextDishes,
          roomDirt: nextDirt,
          cleanliness: computeHomeCleanlinessFromRooms(nextDirt, nextDishes, prev.rubbishCount),
        };
      });

      if (recipe.cultureXp > 0) setCultureXp((xp) => xp + recipe.cultureXp);
      advanceClockMinutes(cookMins);
      markHomeRoutineDone("home_meal");
      audioRef.current?.playChime("success");
      const msg = `Prepared ${recipe.name} (${cookMins}m)! Ready to eat now or save in pantry.`;
      showToast(msg);
      return { ok: true, message: msg };
    },
    [advanceClockMinutes, markHomeRoutineDone, showToast]
  );

  const handleEatCookedMeal = useCallback(
    (mealId: string): string => {
      const meal = homeStateRef.current.cookedMealsReady.find((m) => m.id === mealId);
      if (!meal) return "Meal is no longer on the counter.";

      setHomeState((prev) => {
        const nextDishes = prev.dirtyDishesCount + 1;
        return {
          ...prev,
          cookedMealsReady: prev.cookedMealsReady.filter((m) => m.id !== mealId),
          dirtyDishesCount: nextDishes,
          cleanliness: computeHomeCleanlinessFromRooms(
            prev.roomDirt,
            nextDishes,
            prev.rubbishCount
          ),
        };
      });

      setEnergy((e) => Math.min(100, e + meal.energyRestore));
      setNeeds((prev) => ({
        ...prev,
        hunger: clampNeed(prev.hunger + meal.hungerRestore),
        thirst: clampNeed(prev.thirst + meal.thirstRestore),
        comfort: clampNeed(prev.comfort + meal.comfortRestore),
      }));
      markHomeRoutineDone("home_meal");
      audioRef.current?.playChime("success");
      const msg = `Enjoyed homemade ${meal.name}! (+${meal.hungerRestore}% Hunger, +${meal.energyRestore}% Energy)`;
      showToast(msg);
      return msg;
    },
    [markHomeRoutineDone, showToast]
  );

  const handleDrinkHomeWater = useCallback((): { ok: boolean; message: string } => {
    const count = homeStateRef.current.fridgeIngredients.clean_water ?? 0;
    if (count < 1) {
      return {
        ok: false,
        message: "Out of home drinking water! Buy water packs at Changli Provisions Mart.",
      };
    }
    setHomeState((prev) => ({
      ...prev,
      fridgeIngredients: {
        ...prev.fridgeIngredients,
        clean_water: Math.max(0, (prev.fridgeIngredients.clean_water ?? 0) - 1),
      },
    }));
    setEnergy((e) => Math.min(100, e + 6));
    setNeeds((prev) => ({
      ...prev,
      thirst: clampNeed(prev.thirst + 42),
      comfort: clampNeed(prev.comfort + 8),
    }));
    audioRef.current?.playChime("success");
    return { ok: true, message: "Drank chilled drinking water (+42% Hydration)." };
  }, []);

  const handleCleanAction = useCallback(
    (kind: "sweep" | "mop" | "dishes" | "rubbish"): string => {
      if (kind === "sweep") {
        setHomeState((prev) => {
          const roomDirt = {
            ...prev.roomDirt,
            courtyard: 0,
            livingRoom: Math.max(0, prev.roomDirt.livingRoom - 16),
          };
          return {
            ...prev,
            roomDirt,
            cleanliness: computeHomeCleanlinessFromRooms(
              roomDirt,
              prev.dirtyDishesCount,
              prev.rubbishCount
            ),
            lastMaintainedDay: dayCountRef.current,
          };
        });
        setEnergy((e) => Math.max(5, e - 4));
        setNeeds((prev) => ({ ...prev, comfort: clampNeed(prev.comfort + 12) }));
        advanceClockMinutes(15);
        markHomeRoutineDone("tidy_home");
        audioRef.current?.playChime("success");
        return "Swept the compound courtyard & entrance clean!";
      }
      if (kind === "mop") {
        setHomeState((prev) => {
          const roomDirt: Record<HomeRoomKey, number> = {
            courtyard: Math.max(0, prev.roomDirt.courtyard - 10),
            livingRoom: 0,
            kitchen: 0,
            bedroom: 0,
            bathroom: 0,
          };
          return {
            ...prev,
            roomDirt,
            cleanliness: computeHomeCleanlinessFromRooms(
              roomDirt,
              prev.dirtyDishesCount,
              prev.rubbishCount
            ),
            lastMaintainedDay: dayCountRef.current,
          };
        });
        setEnergy((e) => Math.max(5, e - 6));
        setNeeds((prev) => ({ ...prev, comfort: clampNeed(prev.comfort + 18) }));
        advanceClockMinutes(22);
        markHomeRoutineDone("tidy_home");
        audioRef.current?.playChime("success");
        return "Mopped living room, kitchen, bedroom & bathroom floors sparkling clean!";
      }
      if (kind === "dishes") {
        setHomeState((prev) => {
          const roomDirt = {
            ...prev.roomDirt,
            kitchen: Math.max(0, prev.roomDirt.kitchen - 14),
          };
          return {
            ...prev,
            dirtyDishesCount: 0,
            roomDirt,
            cleanliness: computeHomeCleanlinessFromRooms(roomDirt, 0, prev.rubbishCount),
            lastMaintainedDay: dayCountRef.current,
          };
        });
        advanceClockMinutes(10);
        markHomeRoutineDone("tidy_home");
        audioRef.current?.playChime("success");
        return "Washed & stacked all dirty pots and plates from the kitchen sink.";
      }
      setHomeState((prev) => {
        const roomDirt = {
          ...prev.roomDirt,
          courtyard: Math.max(0, prev.roomDirt.courtyard - 10),
        };
        return {
          ...prev,
          rubbishCount: 0,
          roomDirt,
          cleanliness: computeHomeCleanlinessFromRooms(roomDirt, prev.dirtyDishesCount, 0),
          lastMaintainedDay: dayCountRef.current,
        };
      });
      advanceClockMinutes(8);
      markHomeRoutineDone("tidy_home");
      audioRef.current?.playChime("success");
      return "Cleared household rubbish bags into the covered compound bin!";
    },
    [advanceClockMinutes, markHomeRoutineDone]
  );

  const handleLaundryAction = useCallback(
    (
      kind: "wash" | "hang" | "collect" | "instant_wear_clean"
    ): { ok: boolean; message: string } => {
      const cur = laundryStateRef.current;
      if (kind === "wash") {
        const washQty = cur.dirtyClothesCount > 0 ? cur.dirtyClothesCount : 1;
        setLaundryState((prev) => ({
          ...prev,
          dirtyClothesCount: 0,
          washedWetCount: prev.washedWetCount + washQty,
        }));
        setNeeds((prev) => ({ ...prev, hygiene: clampNeed(prev.hygiene + 8) }));
        advanceClockMinutes(18);
        markHomeRoutineDone("laundry_care");
        audioRef.current?.playChime("interact");
        return {
          ok: true,
          message: `Scrubbed & rinsed ${washQty} laundry load(s). Hang them on the courtyard clothesline to dry!`,
        };
      }
      if (kind === "hang") {
        if (cur.washedWetCount <= 0) {
          return { ok: false, message: "No freshly washed wet clothes to hang yet." };
        }
        const dryMinsNeeded =
          homeStateRef.current.upgrades.polytank_plumbing >= 2 ? 45 : 75;
        const total = lastClockMinsRef.current + dryMinsNeeded;
        const readyDay = dayCountRef.current + Math.floor(total / 1440);
        const readyMins = total % 1440;
        const count = cur.washedWetCount;
        setLaundryState((prev) => ({
          ...prev,
          washedWetCount: 0,
          dryingOnLineCount: prev.dryingOnLineCount + count,
          dryReadyAtMinutes: readyMins,
          dryReadyDay: readyDay,
        }));
        markHomeRoutineDone("laundry_care");
        audioRef.current?.playChime("success");
        return {
          ok: true,
          message: `Hung ${count} garment(s) in the Tamale sun — ready around ${formatClock(readyMins)}!`,
        };
      }
      if (kind === "collect") {
        if (cur.dryingOnLineCount <= 0) {
          return { ok: false, message: "Nothing is currently hanging on the clothesline." };
        }
        const curDay = dayCountRef.current;
        const curMins = lastClockMinsRef.current;
        const isReady =
          cur.dryReadyDay === null ||
          cur.dryReadyAtMinutes === null ||
          curDay > cur.dryReadyDay ||
          (curDay === cur.dryReadyDay && curMins >= cur.dryReadyAtMinutes);
        if (!isReady) {
          return {
            ok: false,
            message: `Still drying in the courtyard breeze — ready around ${formatClock(
              cur.dryReadyAtMinutes ?? curMins
            )} (or after resting).`,
          };
        }
        const collected = cur.dryingOnLineCount;
        setLaundryState((prev) => ({
          ...prev,
          dryingOnLineCount: 0,
          dryReadyAtMinutes: null,
          dryReadyDay: null,
          cleanOutfitsStored: prev.cleanOutfitsStored + collected,
        }));
        audioRef.current?.playChime("success");
        return {
          ok: true,
          message: `Folded & stored ${collected} sun-dried outfit(s) into your bedroom wardrobe!`,
        };
      }
      if (cur.cleanOutfitsStored <= 0) {
        return {
          ok: false,
          message: "No folded clean clothes left in wardrobe — wash & dry laundry first!",
        };
      }
      setLaundryState((prev) => ({
        ...prev,
        cleanOutfitsStored: Math.max(0, prev.cleanOutfitsStored - 1),
        dirtyClothesCount: prev.dirtyClothesCount + (prev.outfitCleanliness < 80 ? 1 : 0),
        outfitCleanliness: 100,
      }));
      setNeeds((prev) => ({
        ...prev,
        hygiene: clampNeed(prev.hygiene + 10),
        comfort: clampNeed(prev.comfort + 14),
      }));
      markHomeRoutineDone("laundry_care");
      audioRef.current?.playChime("success");
      return { ok: true, message: "Changed into fresh sun-dried clothes (100% Cleanliness)!" };
    },
    [advanceClockMinutes, markHomeRoutineDone]
  );

  const handleRelaxSofaTv = useCallback((): string => {
    const upgradedTv = homeStateRef.current.upgrades.tv_entertainment >= 2;
    setEnergy((e) => Math.min(100, e + (upgradedTv ? 18 : 12)));
    setNeeds((prev) => ({
      ...prev,
      comfort: clampNeed(prev.comfort + (upgradedTv ? 32 : 18)),
      social: clampNeed(prev.social + (upgradedTv ? 14 : 7)),
    }));
    advanceClockMinutes(30);
    markHomeRoutineDone("evening_rest");
    audioRef.current?.playChime("success");
    return upgradedTv
      ? "Watched Northern cultural broadcasts on your Smart TV (+Comfort, +Social, +18% Energy)!"
      : "Unwound in your living room (+18% Comfort, +12% Energy).";
  }, [advanceClockMinutes, markHomeRoutineDone]);

  const handlePurchaseHomeUpgrade = useCallback(
    (upgradeId: HomeUpgradeId, payWith: "cash" | "momo"): { ok: boolean; message: string } => {
      const def = HOME_UPGRADES_CATALOG.find((u) => u.id === upgradeId);
      if (!def) return { ok: false, message: "Upgrade definition not found." };
      const curLv = homeStateRef.current.upgrades[upgradeId] ?? 1;
      const nextTier = def.levels.find((l) => l.level === curLv + 1);
      if (!nextTier) return { ok: false, message: "Already at maximum upgrade level." };
      const wallet = payWith === "momo" ? momoBalanceCedis : moneyCedis;
      if (wallet < nextTier.costCedis) {
        return {
          ok: false,
          message: `Need GH₵ ${nextTier.costCedis} (${payWith.toUpperCase()}) for ${nextTier.title}.`,
        };
      }
      if (payWith === "momo") setMomoBalanceCedis((m) => m - nextTier.costCedis);
      else setMoneyCedis((m) => m - nextTier.costCedis);

      setHomeState((prev) => ({
        ...prev,
        upgrades: {
          ...prev.upgrades,
          [upgradeId]: nextTier.level,
        },
      }));
      setCultureXp((xp) => xp + 25);
      audioRef.current?.playChime("success");
      const msg = `Installed ${nextTier.title}! (${nextTier.effectSummary})`;
      showToast(msg);
      return { ok: true, message: msg };
    },
    [momoBalanceCedis, moneyCedis, showToast]
  );

  const handlePayHomeBills = useCallback(
    (payWith: "cash" | "momo"): { ok: boolean; message: string } => {
      const owed = homeStateRef.current.dailyBillsOwed;
      if (owed <= 0) return { ok: true, message: "No utility bills currently owed." };
      const wallet = payWith === "momo" ? momoBalanceCedis : moneyCedis;
      if (wallet < owed) {
        return {
          ok: false,
          message: `Need GH₵ ${owed} (${payWith.toUpperCase()}) to clear your ECG & Water bill.`,
        };
      }
      if (payWith === "momo") setMomoBalanceCedis((m) => m - owed);
      else setMoneyCedis((m) => m - owed);
      setHomeState((prev) => ({ ...prev, dailyBillsOwed: 0 }));
      audioRef.current?.playChime("coin");
      const msg = `Cleared GH₵ ${owed} Tamale utility & water rates!`;
      showToast(msg);
      return { ok: true, message: msg };
    },
    [momoBalanceCedis, moneyCedis, showToast]
  );

  const handleSelectWardrobeOutfit = useCallback(
    (outfit: OutfitStyle): { ok: boolean; message: string } => {
      const updated = { ...customization, outfit };
      setCustomization(updated);
      engineRef.current?.updatePlayerCustomization(updated);
      setLaundryState((prev) => ({ ...prev, outfitCleanliness: 100 }));
      setNeeds((prev) => ({ ...prev, comfort: clampNeed(prev.comfort + 10) }));
      markHomeRoutineDone("laundry_care");
      audioRef.current?.playChime("success");
      return { ok: true, message: `Changed into ${outfit} outfit (100% Clean).` };
    },
    [customization, markHomeRoutineDone]
  );

  const handleBuyWardrobeOutfit = useCallback(
    (
      outfit: OutfitStyle,
      cost: number,
      payWith: "cash" | "momo"
    ): { ok: boolean; message: string } => {
      const wallet = payWith === "momo" ? momoBalanceCedis : moneyCedis;
      if (wallet < cost) {
        return {
          ok: false,
          message: `Need GH₵ ${cost} (${payWith.toUpperCase()}) for tailoring.`,
        };
      }
      if (payWith === "momo") setMomoBalanceCedis((m) => m - cost);
      else setMoneyCedis((m) => m - cost);
      setOwnedOutfits((prev) => (prev.includes(outfit) ? prev : [...prev, outfit]));
      const updated = { ...customization, outfit };
      setCustomization(updated);
      engineRef.current?.updatePlayerCustomization(updated);
      setLaundryState((prev) => ({ ...prev, outfitCleanliness: 100 }));
      setCultureXp((xp) => xp + 15);
      markHomeRoutineDone("laundry_care");
      audioRef.current?.playChime("success");
      return { ok: true, message: `Tailored & equipped ${outfit}!` };
    },
    [customization, markHomeRoutineDone, momoBalanceCedis, moneyCedis]
  );

  const activeNpc = activeNpcId ? TAMALE_NPCS.find((n) => n.id === activeNpcId) || null : null;
  const activeInteriorLandmark = activeInteriorLandmarkId
    ? TAMALE_LANDMARKS.find((l) => l.id === activeInteriorLandmarkId) || null
    : null;
  const activeErrand = errands.find((e) => e.active && !e.completed) || null;
  const { period, label: timePeriodLabel } = getPeriodFromMinutes(gameMinutes);

  const customizeTargetId = customizeTargetCharId || activeCharacterId;
  const customizeTargetLook =
    customizeTargetId === activeCharacterId
      ? customization
      : (allCharacterStatesLive[customizeTargetId]?.customization ?? customization);

  const contextualHint = useMemo(
    () =>
      computeContextualHint({
        showTutorialHints: settings.showTutorialHints,
        onboarding,
        inputMethod: deviceLayout.effectiveInput,
        keyBindings: settings.keyBindings,
        isDriving,
        isIndoors: Boolean(activeInteriorSpec),
        nearby,
        nearbyVehicle,
        activeTask,
        drivingHintTimerSec,
      }),
    [
      settings.showTutorialHints,
      onboarding,
      deviceLayout.effectiveInput,
      settings.keyBindings,
      isDriving,
      activeInteriorSpec,
      nearby,
      nearbyVehicle,
      activeTask,
      drivingHintTimerSec,
    ]
  );

  const handleDismissOnboarding = useCallback(() => {
    saveOnboardingComplete();
    setOnboarding({
      step: "complete",
      movedSeconds: 99,
      rotatedCamera: true,
      ranOnce: true,
      openedPhone: true,
      stepElapsedSec: 0,
    });
    updateSettings({ showTutorialHints: false });
    showToast("Tutorial hints hidden (re-enable anytime in Settings).");
  }, [showToast, updateSettings]);

  const handleResetTutorialHints = useCallback(() => {
    resetOnboardingStorage();
    hasOpenedPhoneRef.current = false;
    setOnboarding({
      step: "move",
      movedSeconds: 0,
      rotatedCamera: false,
      ranOnce: false,
      openedPhone: false,
      stepElapsedSec: 0,
    });
    updateSettings({ showTutorialHints: true });
    showToast("Contextual onboarding hints reset.");
  }, [showToast, updateSettings]);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#12100e]">
      {/* Isolated WebGL Mount */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {webglLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100e] p-6 text-center">
          <div className="max-w-md space-y-2">
            <h2 className="font-display text-xl font-bold text-amber-400">
              Graphics Context Paused
            </h2>
            <p className="text-sm text-[#cfc8bc]">
              Your browser momentarily suspended WebGL rendering. Reload or wait for restoration.
            </p>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {inMainMenu && !exitedScreen && (
        <MainMenu
          deviceLayout={deviceLayout}
          hasSavedGame={hasSavedGame}
          languageMode={settings.languageMode}
          activeCharacterName={customization.name || activeProfile.name}
          activeCharacterOccupation={activeCareerRank.title}
          activeCharacterMoney={moneyCedis}
          onChangeLanguageMode={(mode) => updateSettings({ languageMode: mode })}
          onPlay={handlePlay}
          onContinueGame={handleContinueGame}
          onNewGame={handleNewGame}
          onOpenCustomize={() => setShowCharacterSwitch(true)}
          onOpenSettings={() => {
            setSettingsTab("settings");
            setShowSettings(true);
          }}
          onOpenLanguageGuide={() => setShowDagbaniGuide(true)}
          onOpenControls={() => {
            setSettingsTab("controls");
            setShowSettings(true);
          }}
          onOpenAbout={() => setShowAbout(true)}
          onExit={() => setExitedScreen(true)}
          onOpenReferences={() => setShowReferences(true)}
          onOpenEvents={() => setShowEvents(true)}
          onOpenContributions={() => setShowContributions(true)}
        />
      )}

      {/* Clean Exit Screen */}
      {exitedScreen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#12100e]/95 p-6 text-center">
          <div className="w-full max-w-md bg-[#171411] border border-white/15 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="text-xs font-medium text-amber-400">Biɛɣuni ti ni nyɛ taba</div>
            <h2 className="font-display text-2xl font-bold text-[#f8f5ef]">
              Thank You for Visiting Tamale 3D
            </h2>
            <p className="text-sm text-[#cfc8bc]">
              Your current session is paused. Return to the main menu anytime to explore the city.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setExitedScreen(false);
                  setInMainMenu(true);
                }}
                className="min-h-[46px] flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-sm rounded-xl cursor-pointer"
              >
                Return to Main Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitedScreen(false);
                  setInMainMenu(false);
                }}
                className="min-h-[46px] flex-1 px-4 py-2.5 bg-[#241f1a] hover:bg-white/10 text-[#f5f2eb] border border-white/15 font-semibold text-sm rounded-xl cursor-pointer"
              >
                Resume Tamale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Gameplay HUD */}
      {!inMainMenu && !exitedScreen && (
        <GameHud
          deviceLayout={deviceLayout}
          contextualHint={contextualHint}
          onDismissOnboarding={handleDismissOnboarding}
          district={district}
          formattedTime={formatClock(gameMinutes)}
          dayCount={dayCount}
          timePeriodLabel={timePeriodLabel}
          moneyCedis={moneyCedis}
          energy={energy}
          needs={needs}
          cultureXp={cultureXp}
          activeCharacterName={customization.name || activeProfile.name}
          activeCareerTitle={activeCareerRank.title}
          isDriving={isDriving}
          isRidingService={isRidingService}
          drivingLabel={drivingLabel}
          drivingKind={drivingKind}
          vehicleHealthPct={vehicleHealthPct}
          speedKmh={speedKmh}
          nearby={nearby}
          nearbyVehicle={nearbyVehicle}
          nearbyChatter={nearbyChatter}
          nearbySignal={nearbySignal}
          policePursuitActive={policePursuitActive}
          impoundedVehicleId={impoundedVehicleId}
          navSnapshot={navSnapshot}
          cargoIntegrityPct={cargoIntegrityPct}
          cargoLoadProgressPct={cargoLoadProgressPct}
          policeCruiserPositions={policeCruiserPositions}
          roadIncidentPositions={roadIncidentPositions}
          playerPos={playerPos}
          servicePos={servicePos}
          nearestGuidance={nearestGuidance}
          activeErrandTitle={activeErrand ? activeErrand.title : null}
          activeGigTitle={activeGig ? activeGig.title : null}
          activeTask={activeTask}
          activeService={activeService}
          activeCityEventLabel={INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEvent].label}
          weather={weather}
          cameraMode={settings.cameraMode}
          languageMode={settings.languageMode}
          audioEnabled={settings.audioEnabled}
          showLabels={showLabels}
          isIndoors={Boolean(activeInteriorSpec)}
          musicSnapshot={musicSnap}
          showMiniRadioBar={showMiniRadioBar}
          keyBindings={settings.keyBindings}
          onTriggerInteract={() => engineRef.current?.triggerNearbyInteraction()}
          onExitInterior={() => engineRef.current?.exitInterior()}
          onToggleVehicle={() => engineRef.current?.handleVehicleToggle()}
          onTriggerHorn={() => engineRef.current?.triggerHorn()}
          onOpenPhone={() => {
            hasOpenedPhoneRef.current = true;
            setPhoneInitialTab("home");
            setShowPhone(true);
          }}
          onOpenPhoneRadio={() => {
            hasOpenedPhoneRef.current = true;
            setPhoneInitialTab("radio");
            setShowPhone(true);
          }}
          onToggleMiniRadioPlay={() => musicEngineRef.current?.togglePlayPause()}
          onMiniRadioNext={() => musicEngineRef.current?.next()}
          onMiniRadioPrev={() => musicEngineRef.current?.previous()}
          onToggleVehicleRadio={() => {
            const st = musicEngineRef.current?.getCurrentStation();
            const seg = st
              ? buildDynamicRadioSegment({
                  station: st,
                  gameMinutes: lastClockMinsRef.current,
                  weather: weatherRef.current,
                  district: districtRef.current,
                  activeCityEventLabel:
                    INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEventRef.current].label,
                })
              : undefined;
            musicEngineRef.current?.toggleVehicleRadio(seg);
            setShowMiniRadioBar(true);
          }}
          onToggleVehicleAudioSource={() => {
            const cur = musicEngineRef.current?.getSnapshot().mode ?? "radio";
            const nextMode = cur === "radio" ? "music" : "radio";
            const st = musicEngineRef.current?.getCurrentStation();
            const seg =
              nextMode === "radio" && st
                ? buildDynamicRadioSegment({
                    station: st,
                    gameMinutes: lastClockMinsRef.current,
                    weather: weatherRef.current,
                    district: districtRef.current,
                    activeCityEventLabel:
                      INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEventRef.current].label,
                  })
                : undefined;
            musicEngineRef.current?.setMode(nextMode, seg);
            if (!musicEngineRef.current?.getSnapshot().isPlaying) {
              musicEngineRef.current?.play();
            }
            setShowMiniRadioBar(true);
          }}
          onCloseMiniRadio={() => {
            musicEngineRef.current?.pause();
            setShowMiniRadioBar(false);
          }}
          onOpenCharacterSwitch={() => setShowCharacterSwitch(true)}
          onCancelService={() => {
            engineRef.current?.cancelActiveService();
            setActiveService(null);
            showToast("Service dispatch cancelled.");
          }}
          onOpenMap={() => setShowMap(true)}
          onOpenDagbaniGuide={() => setShowDagbaniGuide(true)}
          onOpenInventory={() => setShowInventory(true)}
          onOpenCustomize={() => {
            setCustomizeTargetCharId(activeCharacterId);
            setShowCustomize(true);
          }}
          onOpenReferences={() => setShowReferences(true)}
          onOpenEvents={() => setShowEvents(true)}
          onOpenContributions={() => setShowContributions(true)}
          onOpenPause={() => setShowPause(true)}
          onToggleAudio={() => {
            audioRef.current?.init();
            updateSettings({ audioEnabled: !settings.audioEnabled });
          }}
          onToggleLabels={() => {
            const next = !showLabels;
            setShowLabels(next);
            engineRef.current?.setShowLabels(next);
          }}
          onToggleFullscreen={handleToggleFullscreen}
          onChangeWeather={(w) => {
            setWeather(w);
            engineRef.current?.setWeather(w);
          }}
          onChangeTimePreset={(mins) => {
            setGameMinutes(mins);
            lastClockMinsRef.current = mins;
            engineRef.current?.setGameMinutes(mins);
          }}
          onChangeCameraMode={(m) => updateSettings({ cameraMode: m })}
          onChangeLanguageMode={(m) => updateSettings({ languageMode: m })}
        />
      )}

      {/* Non-blocking Landmark Discovery Card */}
      {!inMainMenu && !exitedScreen && !anyModalOpen && activeDiscoveryCard && (
        <DiscoveryCardOverlay
          landmark={activeDiscoveryCard}
          onClose={() => setActiveDiscoveryCard(null)}
        />
      )}

      {/* Multi-Touch Mobile & Tablet Controls */}
      {!inMainMenu && !exitedScreen && !anyModalOpen && deviceLayout.showTouchControls && (
        <MobileTouchControls
          deviceLayout={deviceLayout}
          isDriving={isDriving}
          isRidingService={isRidingService}
          drivingKind={drivingKind}
          nearby={nearby}
          nearbyVehicle={nearbyVehicle}
          vibrationEnabled={settings.vibrationEnabled}
          onMoveChange={(x, y) => {
            audioRef.current?.init();
            engineRef.current?.setVirtualMove(x, y);
          }}
          onToggleRun={(running) => engineRef.current?.setVirtualRun(running)}
          onJump={() => {
            audioRef.current?.init();
            engineRef.current?.triggerJump();
          }}
          onInteract={() => {
            audioRef.current?.init();
            engineRef.current?.triggerNearbyInteraction();
          }}
          onEnterVehicle={() => {
            audioRef.current?.init();
            engineRef.current?.handleVehicleToggle();
          }}
          onExitVehicle={() => engineRef.current?.exitVehicle()}
          onVehicleControls={(ctrl) => {
            audioRef.current?.init();
            engineRef.current?.setVehicleControls(ctrl);
          }}
          onHorn={() => {
            audioRef.current?.init();
            engineRef.current?.triggerHorn();
          }}
          onCameraRotate={(dx, dy) => engineRef.current?.rotateCamera(dx, dy)}
          onPinchZoom={(delta) => engineRef.current?.adjustZoom(delta)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#171411]/95 border border-amber-500/45 text-[#f8f5ef] px-4 py-2 rounded-lg text-xs font-medium shadow-xl pointer-events-none max-w-[90vw] text-center">
          {toastMessage}
        </div>
      )}

      {/* Character Switcher */}
      {showCharacterSwitch && (
        <CharacterSwitchModal
          activeCharacterId={activeCharacterId}
          characterStates={allCharacterStatesLive}
          onSelectCharacter={handleSwitchCharacter}
          onOpenCustomize={(charId) => {
            setCustomizeTargetCharId(charId);
            setShowCharacterSwitch(false);
            setShowCustomize(true);
          }}
          onClose={() => setShowCharacterSwitch(false)}
        />
      )}

      {/* Tamale Smartphone: Launcher, Jobs, 3D Services, Bank & MoMo, Music, 7 FM Radio Stations, Messages, Businesses & Skills */}
      {showPhone && (
        <TamalePhoneModal
          initialTab={phoneInitialTab}
          deviceLayout={deviceLayout}
          activeProfile={activeProfile}
          characterState={allCharacterStatesLive[activeCharacterId]}
          allCharacterStates={allCharacterStatesLive}
          playerPos={playerPos}
          gameMinutes={gameMinutes}
          availableJobs={availableJobs}
          activeTask={activeTask}
          activeService={activeService}
          musicSnapshot={musicSnap}
          onOpenMap={() => setShowMap(true)}
          onOpenInventory={() => setShowInventory(true)}
          onOpenSettings={() => {
            setSettingsTab("settings");
            setShowSettings(true);
          }}
          onAcceptTask={handleAcceptTask}
          onAbandonTask={handleAbandonTask}
          onRefreshJobs={() => {
            setAvailableJobs(
              generateJobsForCharacter(
                activeProfile.recommendedJobCategories,
                playerPos.x,
                playerPos.z
              )
            );
            showToast("Updated nearby Tamale jobs by distance.");
          }}
          onDispatchService={handleDispatchService}
          onCancelService={() => {
            engineRef.current?.cancelActiveService();
            setActiveService(null);
            showToast("Dispatched service cancelled.");
          }}
          onAdjustWallets={handleAdjustWallets}
          onSendPhoneMessage={handleSendPhoneMessage}
          onMarkMessagesRead={handleMarkMessagesRead}
          onPlayTrack={(trackId, playlistId) => {
            musicEngineRef.current?.playTrackById(trackId, playlistId);
            setShowMiniRadioBar(true);
          }}
          onPlayPlaylist={(playlistId, startTrackId) => {
            musicEngineRef.current?.playPlaylist(playlistId, startTrackId);
            setShowMiniRadioBar(true);
          }}
          onTuneStation={handleTuneRadioStation}
          onRefreshDjSegment={handleRefreshDjSegment}
          onToggleMusicPlay={() => {
            musicEngineRef.current?.togglePlayPause();
            setShowMiniRadioBar(true);
          }}
          onMusicNext={() => musicEngineRef.current?.next()}
          onMusicPrev={() => musicEngineRef.current?.previous()}
          onMusicSeek={(sec) => musicEngineRef.current?.seek(sec)}
          onMusicVolume={(vol) => musicEngineRef.current?.setVolume(vol)}
          onToggleMusicShuffle={() => musicEngineRef.current?.toggleShuffle()}
          onCycleMusicRepeat={() => musicEngineRef.current?.cycleRepeat()}
          onToggleFavorite={(trackId) => musicEngineRef.current?.toggleFavorite(trackId)}
          onCreatePlaylist={(name) => {
            const created = musicEngineRef.current?.createCustomPlaylist(name);
            if (created) showToast(`Created playlist “${created.name}”`);
          }}
          onAddTrackToPlaylist={(playlistId, trackId) => {
            musicEngineRef.current?.addTrackToPlaylist(playlistId, trackId);
            showToast("Added track to playlist.");
          }}
          onRemoveTrackFromPlaylist={(playlistId, trackId) => {
            musicEngineRef.current?.removeTrackFromPlaylist(playlistId, trackId);
            showToast("Removed track from playlist.");
          }}
          onDeletePlaylist={(playlistId) => {
            musicEngineRef.current?.deleteCustomPlaylist(playlistId);
            showToast("Deleted custom playlist.");
          }}
          onSwitchCharacter={handleSwitchCharacter}
          onOpenCustomize={() => {
            setCustomizeTargetCharId(activeCharacterId);
            setShowPhone(false);
            setShowCustomize(true);
          }}
          onInvestBusiness={handleInvestBusiness}
          onFastTravelLandmark={handleFastTravelToLandmark}
          onNavigateHome={() => {
            const homeLm = TAMALE_LANDMARKS.find((l) => l.id === "player_home");
            engineRef.current?.setNavigationDestination({
              landmarkId: "player_home",
              label: homeState.homeName || (homeLm?.name ?? "Personal Residence"),
              x: 20,
              z: 89,
            });
            setShowPhone(false);
            showToast("GPS route plotted to your Changli Compound Home!");
          }}
          onTravelHome={() => {
            const homeLm = TAMALE_LANDMARKS.find((l) => l.id === "player_home");
            if (homeLm) handleFastTravelToLandmark(homeLm);
          }}
          onToggleHomeReminders={() =>
            setHomeState((prev) => ({ ...prev, remindersEnabled: !prev.remindersEnabled }))
          }
          onClose={() => setShowPhone(false)}
        />
      )}

      {/* Interactive Station Overlay inside Walkable 3D Building Interiors */}
      {activeInteriorSpec && activeInteriorStation && (
        activeInteriorSpec.landmarkId === "player_home" ||
        ALWAYS_HOME_STATION_KINDS.has(activeInteriorStation.kind) ? (
          <HomeStationModal
            stationKind={activeInteriorStation.kind as HomeStationKind}
            stationLabel={activeInteriorStation.label}
            dayCount={dayCount}
            gameMinutes={gameMinutes}
            energy={energy}
            moneyCedis={moneyCedis}
            momoBalanceCedis={momoBalanceCedis}
            needs={needs}
            homeState={homeState}
            laundryState={laundryState}
            customization={customization}
            ownedOutfits={ownedOutfits}
            policePursuitActive={policePursuitActive}
            onSleepUntil={handleSleepUntil}
            onHygieneAction={handleHygieneAction}
            onCookRecipe={handleCookRecipe}
            onEatCookedMeal={handleEatCookedMeal}
            onDrinkHomeWater={handleDrinkHomeWater}
            onCleanAction={handleCleanAction}
            onLaundryAction={handleLaundryAction}
            onRelaxSofaTv={handleRelaxSofaTv}
            onPurchaseHomeUpgrade={handlePurchaseHomeUpgrade}
            onPayHomeBills={handlePayHomeBills}
            onSelectWardrobeOutfit={handleSelectWardrobeOutfit}
            onBuyWardrobeOutfit={handleBuyWardrobeOutfit}
            onToggleReminders={() =>
              setHomeState((prev) => ({ ...prev, remindersEnabled: !prev.remindersEnabled }))
            }
            onClose={() => setActiveInteriorStation(null)}
          />
        ) : (
          <InteriorServiceOverlay
            room={activeInteriorSpec}
            stationKind={activeInteriorStation.kind}
            stationLabel={activeInteriorStation.label}
            shopId={activeInteriorStation.shopId}
            moneyCedis={moneyCedis}
            bankBalanceCedis={bankBalanceCedis}
            momoBalanceCedis={momoBalanceCedis}
            savingsBalanceCedis={savingsBalanceCedis}
            energy={energy}
            vehicleCondition={vehicleCondition}
            customization={customization}
            policeFinesOwedCedis={policeFinesOwedCedis}
            trafficViolationsCount={trafficViolationsCount}
            cleanDrivingStreak={cleanDrivingStreak}
            impoundedVehicleId={impoundedVehicleId}
            onAdjustWallets={handleAdjustWallets}
            onBuyItem={handleBuyItem}
            onApplyEnergyAndTime={handleApplyEnergyAndTime}
            onRepairVehicle={handleRepairVehicle}
            onApplyCustomization={handleApplyStationCustomization}
            onPayPoliceFines={(payWith) => {
              if (policeFinesOwedCedis <= 0) return false;
              const wallet = payWith === "momo" ? momoBalanceCedis : moneyCedis;
              if (wallet < policeFinesOwedCedis) {
                showToast(`Need GH₵ ${policeFinesOwedCedis} (${payWith.toUpperCase()}).`);
                return false;
              }
              if (payWith === "momo") setMomoBalanceCedis((m) => m - policeFinesOwedCedis);
              else setMoneyCedis((m) => m - policeFinesOwedCedis);
              setPoliceFinesOwedCedis(0);
              audioRef.current?.playChime("success");
              showToast("Cleared all outstanding Tamale MTTD fines!");
              return true;
            }}
            onReleaseImpoundedVehicle={(payWith) => {
              const fee = 120;
              const wallet = payWith === "momo" ? momoBalanceCedis : moneyCedis;
              if (wallet < fee) {
                showToast(`Need GH₵ ${fee} (${payWith.toUpperCase()}) for impound release.`);
                return false;
              }
              if (payWith === "momo") setMomoBalanceCedis((m) => m - fee);
              else setMoneyCedis((m) => m - fee);
              const rel = engineRef.current?.releaseImpoundedVehicle();
              setImpoundedVehicleId(null);
              audioRef.current?.playChime("success");
              showToast(
                `Released vehicle ${rel?.releasedId ?? ""} from Tamale Police HQ yard!`
              );
              return true;
            }}
            onOpenClubGames={() => {
              setActiveInteriorStation(null);
              setShowClubGames(true);
            }}
            onToggleRoomMusic={(action) => {
              if (action === "next") {
                musicEngineRef.current?.next();
              } else {
                musicEngineRef.current?.togglePlayPause();
              }
              setShowMiniRadioBar(true);
            }}
            onOpenDagbaniGuide={() => setShowDagbaniGuide(true)}
            onClose={() => setActiveInteriorStation(null)}
          />
        )
      )}

      {/* Ghana Police Service (MTTD) Traffic Citation & Stop Modal */}
      {activePoliceStop && (
        <PoliceStopModal
          notice={activePoliceStop}
          moneyCedis={moneyCedis}
          momoBalanceCedis={momoBalanceCedis}
          isDriving={isDriving}
          onResolve={(action) => {
            const notice = activePoliceStop;
            if (!notice) return;
            if (action === "pay_cash") {
              if (moneyCedis < notice.fineCedis) {
                showToast(`Need GH₵ ${notice.fineCedis} cash.`);
                return;
              }
              setMoneyCedis((m) => m - notice.fineCedis);
              setTrafficViolationsCount((c) => c + 1);
              setCleanDrivingStreak(0);
              engineRef.current?.resolvePoliceStop("pay_cash");
              setActivePoliceStop(null);
              audioRef.current?.playChime("coin");
              showToast(`Settled GH₵ ${notice.fineCedis} MTTD fine in cash.`);
            } else if (action === "pay_momo") {
              if (momoBalanceCedis < notice.fineCedis) {
                showToast(`Need GH₵ ${notice.fineCedis} MoMo.`);
                return;
              }
              setMomoBalanceCedis((m) => m - notice.fineCedis);
              setTrafficViolationsCount((c) => c + 1);
              setCleanDrivingStreak(0);
              engineRef.current?.resolvePoliceStop("pay_momo");
              setActivePoliceStop(null);
              audioRef.current?.playChime("coin");
              showToast(`Settled GH₵ ${notice.fineCedis} MTTD fine via MoMo.`);
            } else if (action === "accept_warning") {
              setTrafficViolationsCount((c) => c + 1);
              engineRef.current?.resolvePoliceStop("accept_warning");
              setActivePoliceStop(null);
              audioRef.current?.playChime("interact");
              showToast("Official 1st MTTD warning recorded. Drive carefully!");
            } else {
              setTrafficViolationsCount((c) => c + 1);
              setPoliceFinesOwedCedis((f) => f + notice.fineCedis);
              setCleanDrivingStreak(0);
              const res = engineRef.current?.resolvePoliceStop("impound");
              setImpoundedVehicleId(res?.impoundedVehicleId ?? null);
              setActivePoliceStop(null);
              showToast(
                "Vehicle impounded at Tamale Central Police HQ. Visit Police Desk to settle & release."
              );
            }
          }}
        />
      )}

      {/* Non-Gambling Club Social Lounge Table (Oware & Ludo) */}
      {showClubGames && (
        <ClubEntertainmentModal
          venueTitle={activeInteriorSpec?.title ?? "Tamale Night Lounge"}
          onGameComplete={(result) => {
            setCultureXp((xp) => xp + result.xpEarned);
            setEnergy((e) => Math.min(100, e + result.energyBoost));
            audioRef.current?.playChime("success");
            showToast(
              `${result.game === "oware" ? "Oware" : "Ludo"} ${
                result.won ? "victory" : "match"
              }! +${result.xpEarned} Culture XP & +${result.energyBoost}% Mood Energy.`
            );
          }}
          onClose={() => setShowClubGames(false)}
        />
      )}

      {/* Interactive On-Site Work, Mechanic, Photo Survey, Sports & Business Activity */}
      {showWorkModal && activeTask && (
        <WorkAndActivityModal
          task={activeTask}
          district={district}
          gameMinutesFormatted={formatClock(gameMinutes)}
          onCaptureSnapshot={() => engineRef.current?.captureViewportSnapshot() || ""}
          onCompleteActivity={({ bonusCedis, photoRecord }) => {
            setShowWorkModal(false);
            handleCompleteActiveTask(bonusCedis ?? 0, photoRecord);
          }}
          onClose={() => setShowWorkModal(false)}
        />
      )}

      {/* NPC Dialogue Modal */}
      {activeNpc && (
        <DialogueModal
          npc={activeNpc}
          npcRuntime={npcStates.find((s) => s.npcId === activeNpc.id) ?? null}
          languageMode={settings.languageMode}
          showSubtitles={settings.showSubtitles}
          timePeriod={period}
          friendshipLevel={friendships[activeNpc.id] ?? 1}
          availableErrand={
            errands.find((e) => e.giverNpcId === activeNpc.id && !e.completed) || null
          }
          onChangeLanguageMode={(m) => updateSettings({ languageMode: m })}
          onToggleSubtitles={() => updateSettings({ showSubtitles: !settings.showSubtitles })}
          onClose={() => setActiveNpcId(null)}
          onOpenShop={(shopId) => {
            setActiveNpcId(null);
            setActiveShopId(shopId);
          }}
          onAcceptErrand={handleAcceptErrand}
          onLearnVocab={handleLearnVocab}
          onIncreaseFriendship={handleIncreaseFriendship}
        />
      )}

      {/* Market / Craft / Night Lounge Shop Modal */}
      {activeShopId && (
        <ShopModal
          shopId={activeShopId}
          moneyCedis={moneyCedis}
          energy={energy}
          gameMinutes={gameMinutes}
          ownedBusinessIds={ownedBusinessIds}
          onBuyItem={handleBuyItem}
          onUseService={handleUseShopService}
          onInvestBusiness={handleInvestBusiness}
          onOpenCityJobs={() => {
            setActiveShopId(null);
            setShowPhone(true);
          }}
          onClose={() => setActiveShopId(null)}
        />
      )}

      {/* Enterable Building Interior Modal */}
      {activeInteriorLandmark && (
        <BuildingInteriorModal
          landmark={activeInteriorLandmark}
          onClose={() => setActiveInteriorLandmarkId(null)}
          onOpenShop={(shopId) => {
            setActiveInteriorLandmarkId(null);
            setActiveShopId(shopId);
          }}
          onOpenDagbaniGuide={() => {
            setActiveInteriorLandmarkId(null);
            setShowDagbaniGuide(true);
          }}
        />
      )}

      {/* Tamale City Map */}
      {showMap && (
        <MapModal
          deviceLayout={deviceLayout}
          playerPos={playerPos}
          discoveredLandmarks={discoveredLandmarks}
          activeErrandLandmarkId={activeErrand ? activeErrand.targetLandmarkId : null}
          activeGigLandmarkId={
            activeTask
              ? activeTask.stage === "go_to_pickup" && activeTask.job.pickupLandmarkId
                ? activeTask.job.pickupLandmarkId
                : activeTask.job.targetLandmarkId
              : activeGig
              ? activeGig.targetLandmarkId
              : null
          }
          npcStates={npcStates}
          servicePos={servicePos}
          navRoutePoints={navSnapshot?.routePoints ?? []}
          navTargetLabel={navSnapshot?.targetLabel ?? null}
          policeCruiserPositions={policeCruiserPositions}
          roadIncidentPositions={roadIncidentPositions}
          onSetNavDestination={(dest) => {
            engineRef.current?.setNavigationDestination(dest);
            showToast(`GPS Route plotted to ${dest.label}`);
          }}
          onClearNavDestination={() => {
            engineRef.current?.clearNavigationDestination();
            showToast("Cleared GPS route.");
          }}
          onInspectLandmark={(lm) => {
            setShowMap(false);
            setActiveDiscoveryCard(lm);
          }}
          onFastTravel={handleFastTravelToLandmark}
          onFastTravelCoords={(x, z, label) => {
            engineRef.current?.teleportTo(x, z, 0);
            setShowMap(false);
            showToast(`Arrived in ${label}`);
          }}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Tamale Photographic & GIS Reference Archive */}
      {showReferences && (
        <ReferenceArchiveModal onClose={() => setShowReferences(false)} />
      )}

      {/* Tamale Cultural Events, Historical Timeline & Simulation Mode */}
      {showEvents && (
        <TamaleEventsModal
          activeCityEvent={activeCityEvent}
          onSelectCityEvent={(mode) => {
            setActiveCityEvent(mode);
            engineRef.current?.setActiveCityEvent(mode);
            if (mode === "bugum_chugu" || mode === "ramadan_evening") {
              setGameMinutes(18 * 60 + 45);
              lastClockMinsRef.current = 18 * 60 + 45;
              engineRef.current?.setGameMinutes(18 * 60 + 45);
            } else if (mode === "stadium_match") {
              setGameMinutes(17 * 60 + 50);
              lastClockMinsRef.current = 17 * 60 + 50;
              engineRef.current?.setGameMinutes(17 * 60 + 50);
            }
            audioRef.current?.playChime("success");
            showToast(`City event mode: ${INITIAL_CITY_EVENT_DESCRIPTIONS[mode].label}`);
          }}
          onJumpToLandmark={(landmarkId) => {
            const lm = TAMALE_LANDMARKS.find((l) => l.id === landmarkId);
            if (!lm) return;
            handleFastTravelToLandmark(lm);
            setInMainMenu(false);
          }}
          onClose={() => setShowEvents(false)}
        />
      )}

      {/* Community Contributions & Curator Verification Portal */}
      {showContributions && (
        <CommunityPortalModal
          onSubmissionNotice={(msg) => showToast(msg)}
          onClose={() => setShowContributions(false)}
        />
      )}

      {/* Dagbani Language & Cultural Preservation Guide */}
      {showDagbaniGuide && (
        <DagbaniGuideModal
          learnedVocabIds={learnedVocabIds}
          onClose={() => setShowDagbaniGuide(false)}
        />
      )}

      {/* Character Customisation */}
      {showCustomize && (
        <CustomizeModal
          customization={customizeTargetLook}
          onApply={(cust) => {
            if (customizeTargetId === activeCharacterId) {
              setCustomization(cust);
              engineRef.current?.updatePlayerCustomization(cust);
            } else {
              setCharacterStates((prev) => ({
                ...prev,
                [customizeTargetId]: {
                  ...prev[customizeTargetId],
                  customization: cust,
                },
              }));
            }
            setCustomizeTargetCharId(null);
            showToast(`Updated look for ${cust.name}`);
          }}
          onClose={() => {
            setCustomizeTargetCharId(null);
            setShowCustomize(false);
          }}
        />
      )}

      {/* Bag, Gigs, Errands & Progression */}
      {showInventory && (
        <InventoryJournalModal
          inventory={inventory}
          errands={errands}
          moneyCedis={moneyCedis}
          energy={energy}
          cultureXp={cultureXp}
          discoveredCount={discoveredLandmarks.length}
          totalLandmarks={TAMALE_LANDMARKS.length}
          playerPos={playerPos}
          activeGig={activeGig}
          availableGigs={availableGigs}
          completedGigsCount={completedGigsCount}
          totalEarnedCedis={totalEarnedCedis}
          onAcceptGig={handleAcceptGig}
          onAbandonGig={handleAbandonGig}
          onRefreshGigs={handleRefreshGigs}
          onAcceptErrand={(errandId) => {
            handleAcceptErrand(errandId);
            setShowInventory(false);
          }}
          onConsumeItem={handleConsumeItem}
          onOpenPhone={() => {
            hasOpenedPhoneRef.current = true;
            setPhoneInitialTab("home");
            setShowPhone(true);
          }}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Settings & Controls Modal */}
      {showSettings && (
        <SettingsAndControlsModal
          initialTab={settingsTab}
          deviceLayout={deviceLayout}
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetKeyBindings={() =>
            updateSettings({ keyBindings: { ...DEFAULT_KEY_BINDINGS } })
          }
          onResetTutorialHints={handleResetTutorialHints}
          debugWireframe={debugWireframe}
          onToggleDebugWireframe={() => {
            const next = !debugWireframe;
            setDebugWireframe(next);
            engineRef.current?.setDebugWireframeVisible(next);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* About Tamale Modal */}
      {showAbout && (
        <AboutTamaleModal
          onOpenReferences={() => setShowReferences(true)}
          onOpenEvents={() => setShowEvents(true)}
          onClose={() => setShowAbout(false)}
        />
      )}

      {/* Pause & Save Menu */}
      {showPause && (
        <PauseModal
          deviceLayout={deviceLayout}
          hasSavedGame={hasSavedGame}
          onResume={() => setShowPause(false)}
          onSaveGame={handleSaveGame}
          onLoadGame={handleLoadFromPause}
          onOpenSettings={() => {
            setSettingsTab("settings");
            setShowSettings(true);
          }}
          onOpenControls={() => {
            setSettingsTab("controls");
            setShowSettings(true);
          }}
          onOpenBag={() => {
            setShowPause(false);
            setShowInventory(true);
          }}
          onOpenCharacterSwitch={() => {
            setShowPause(false);
            setShowCharacterSwitch(true);
          }}
          onOpenDagbaniGuide={() => {
            setShowPause(false);
            setShowDagbaniGuide(true);
          }}
          onReturnMainMenu={() => {
            setShowPause(false);
            setInMainMenu(true);
          }}
        />
      )}
    </div>
  );
}
