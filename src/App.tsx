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
import { BuildingInteriorModal, PauseModal } from "./components/InteriorAndPauseModals";
import { InteriorServiceOverlay } from "./components/InteriorServiceOverlay";
import { InventoryJournalModal } from "./components/InventoryJournalModal";
import { MainMenu } from "./components/MainMenu";
import { MapModal } from "./components/MapModal";
import { MobileTouchControls } from "./components/MobileTouchControls";
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
  ActiveTaskRuntime,
  CapturedPhotoRecord,
  CharacterRuntimeState,
  CharacterSkills,
  CityGigTask,
  CityTaskJob,
  DEFAULT_KEY_BINDINGS,
  ErrandQuest,
  GameSettings,
  InteriorRoomSpec,
  InteriorStationKind,
  InventoryItem,
  LandmarkData,
  NearbyChatter,
  NearbyInteractable,
  NpcRuntimeSnapshot,
  PhoneMessageRecord,
  PlayerCustomization,
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
  buildAllDefaultCharacterStates,
  CURRENT_SAVE_VERSION,
  migrateSavedGameState,
} from "./utils/saveMigration";

const SAVE_STORAGE_KEY = "tamale3d_save_v1";

function buildDefaultCharacterStates(): Record<string, CharacterRuntimeState> {
  return buildAllDefaultCharacterStates();
}

function createInitialSettings(): GameSettings {
  const isCompactOrTouch =
    typeof window !== "undefined" &&
    (window.innerWidth < 900 || (navigator.maxTouchPoints ?? 0) > 0);
  return {
    languageMode: "mixed",
    showSubtitles: true,
    audioEnabled: true,
    soundVolume: 0.55,
    cameraMode: "third-person",
    graphicsQuality: isCompactOrTouch ? "medium" : "high",
    resolutionScale: isCompactOrTouch ? 0.85 : 1.0,
    cameraSensitivity: 1.0,
    vibrationEnabled: true,
    controlMode: "auto",
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
  };
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

  // Responsive device detection
  const [viewportInfo, setViewportInfo] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
    hasTouch:
      typeof window !== "undefined" &&
      ((navigator.maxTouchPoints ?? 0) > 0 ||
        window.matchMedia?.("(pointer: coarse)").matches === true),
  }));

  useEffect(() => {
    const updateViewport = () => {
      setViewportInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        hasTouch:
          (navigator.maxTouchPoints ?? 0) > 0 ||
          window.matchMedia?.("(pointer: coarse)").matches === true,
      });
    };
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
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
  const [phoneInitialTab, setPhoneInitialTab] = useState<PhoneTab>("jobs");
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
  const [drivingKind, setDrivingKind] = useState<"pragya" | "motorcycle" | null>(null);
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [nearbyVehicle, setNearbyVehicle] = useState<NearbyInteractable | null>(null);
  const [nearbyChatter, setNearbyChatter] = useState<NearbyChatter | null>(null);
  const [nearestGuidance, setNearestGuidance] = useState<{
    id: string;
    name: string;
    dagbaniLabel: string;
    distanceMeters: number;
    bearingLabel: string;
    isErrandTarget: boolean;
  } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [playerPos, setPlayerPos] = useState(initialCharState.playerPos);
  const [servicePos, setServicePos] = useState<{ x: number; z: number } | null>(null);
  const [npcStates, setNpcStates] = useState<NpcRuntimeSnapshot[]>([]);

  // Active modals
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [activeInteriorLandmarkId, setActiveInteriorLandmarkId] = useState<string | null>(null);
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

  const isPortraitPhone = viewportInfo.width < 768 && viewportInfo.height > viewportInfo.width;
  const isTouchControlsVisible =
    settings.controlMode === "touch" ||
    (settings.controlMode === "auto" && (viewportInfo.hasTouch || viewportInfo.width < 900));

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
    engineRef.current?.applyGraphicsSettings(next.graphicsQuality, next.resolutionScale);
  }, []);

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
      engineRef.current?.setActiveErrandLandmark(null);
      audioRef.current?.playChime("success");
      showToast(
        `Errand completed! Earned GH₵ ${active.rewardCedis} & +${active.rewardCultureXp} Culture XP`
      );
    },
    [showToast]
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
      engineRef.current?.setActiveGigLandmark(null);
      audioRef.current?.playChime("success");
      showToast(
        `Gig completed! Earned GH₵ ${currentGig.rewardCedis} & +${currentGig.rewardCultureXp} Culture XP`
      );
    },
    [showToast]
  );

  const handleCompleteActiveTask = useCallback(
    (bonusCedis = 0, photoRecord?: CapturedPhotoRecord) => {
      const currentTask = activeTaskRef.current;
      if (!currentTask) return;
      const totalPay = currentTask.job.rewardCedis + bonusCedis;
      setActiveTask(null);
      engineRef.current?.setActiveTaskState(null);
      setCompletedJobsCount((c) => c + 1);
      setCompletedGigsCount((c) => c + 1);
      setMoneyCedis((m) => m + totalPay);
      setTotalEarnedCedis((t) => t + totalPay);
      setCultureXp((xp) => xp + currentTask.job.rewardCultureXp);
      setEnergy((e) => Math.max(8, e - currentTask.job.energyCost));
      awardSkillPoint(currentTask.job.skillReward.skill, currentTask.job.skillReward.points);
      if (photoRecord) {
        setCapturedPhotos((prev) => [photoRecord, ...prev]);
      }
      audioRef.current?.playChime("success");
      showToast(
        `Job completed! +GH₵ ${totalPay}, +${currentTask.job.rewardCultureXp} XP & +${currentTask.job.skillReward.points} ${currentTask.job.skillReward.skill}`
      );
    },
    [awardSkillPoint, showToast]
  );

  // Initialize Northern Ghana Music & 7-Station FM Radio Engine
  useEffect(() => {
    const mr = new TamaleMusicRadioEngine();
    musicEngineRef.current = mr;
    const unsub = mr.subscribe((snap) => {
      setMusicSnap(snap);
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
        setNearby(data.nearby);
        setNearbyVehicle(data.nearbyVehicle);
        setNearbyChatter(data.nearbyChatter);
        setNearestGuidance(data.nearestGuidance);
        setPlayerPos(data.playerPos);
        setServicePos(data.servicePos);
        setNpcStates(data.npcStates);
        if (engineRef.current) {
          const nextMins = engineRef.current.getGameMinutes();
          const prevMins = lastClockMinsRef.current;
          lastClockMinsRef.current = nextMins;
          setGameMinutes(nextMins);

          if (prevMins >= 23 * 60 && nextMins < 2 * 60) {
            let midnightNote = "";
            if (ownedBusinessIdsRef.current.length > 0) {
              const dividend = ownedBusinessIdsRef.current.reduce(
                (sum, id) => sum + (SHOP_METADATA[id]?.dailyRevenueCedis ?? 35),
                0
              );
              if (dividend > 0) {
                setMoneyCedis((m) => m + dividend);
                setTotalEarnedCedis((t) => t + dividend);
                midnightNote += `Business Dividend +GH₵ ${dividend}`;
              }
            }
            if (savingsBalanceRef.current >= 20) {
              const yieldAmt = Math.max(
                1,
                Math.round(
                  savingsBalanceRef.current * TAMALE_ECONOMY_CONFIG.banking.savingsInterestDailyRate
                )
              );
              setSavingsBalanceCedis((s) => s + yieldAmt);
              midnightNote += `${midnightNote ? " · " : ""}Savings Interest +GH₵ ${yieldAmt}`;
            }
            if (midnightNote) {
              audioRef.current?.playChime("coin");
              showToast(`Midnight Settlement: ${midnightNote}!`);
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
          showToast(`Entered ${spec.title} (${spec.dagbaniTitle}). Walk to any station or door.`);
        }
      },
      onInteract: (item) => {
        if (item.kind === "npc") {
          setActiveNpcId(item.id);
        } else if (item.kind === "building") {
          const entered = engineRef.current?.enterInterior(item.id);
          if (!entered) {
            setActiveInteriorLandmarkId(item.id);
          }
        } else if (item.kind === "interior_exit") {
          engineRef.current?.exitInterior();
        } else if (item.kind === "interior_station") {
          if (item.stationKind === "wardrobe") {
            setCustomizeTargetCharId(activeCharacterIdRef.current);
            setShowCustomize(true);
          } else if (item.stationKind === "room_radio") {
            setPhoneInitialTab("radio");
            setShowMiniRadioBar(true);
            setShowPhone(true);
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
          if (
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
    handleCompleteActiveErrand,
    handleCompleteActiveGig,
    handleCompleteActiveTask,
    initialCharState.energy,
    initialProfile.customization,
    initialProfile.id,
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
        engineRef.current.setActiveTaskState(state.activeTask);
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
    audioRef.current?.setIndoorMode(
      Boolean(activeShopId || activeInteriorLandmarkId || activeInteriorSpec)
    );
  }, [activeShopId, activeInteriorLandmarkId, activeInteriorSpec]);

  useEffect(() => {
    musicEngineRef.current?.setDucking(activeNpcId ? 0.28 : 1.0);
  }, [activeNpcId]);

  // Keyboard shortcuts for HUD modals (supports custom key bindings)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || inMainMenu || exitedScreen || showSettings) {
        return;
      }

      const kb = settings.keyBindings;
      if (e.code === kb.pause || e.code === "Escape") {
        if (
          activeNpcId ||
          activeShopId ||
          activeInteriorLandmarkId ||
          activeInteriorStation ||
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
        setPhoneInitialTab("jobs");
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
    settings.keyBindings,
    anyModalOpen,
    activeNpcId,
    activeShopId,
    activeInteriorLandmarkId,
    activeInteriorStation,
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
    };
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveObj));
      setHasSavedGame(true);
      audioRef.current?.playChime("success");
      showToast("All Tamale characters, wallets & progress saved.");
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
    setExitedScreen(false);
    setShowPause(false);
    setInMainMenu(false);
    showToast(
      `Dasuba! Playing as ${startProfile.name} (${startProfile.occupation}). Press P for City Phone.`
    );
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
      showToast(
        `Dasuba! Playing as ${activeProfile.name} (${activeProfile.occupation}). Press P for City Phone.`
      );
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
              if (viewportInfo.hasTouch && ori?.lock) {
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
  }, [viewportInfo.hasTouch]);

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
      engineRef.current?.updatePlayerCustomization(updated);
      setCultureXp((xp) => xp + 20);
      showToast(`Equipped ${item.name} (${item.dagbaniName})!`);
    } else if (consumeImmediately && item.energyRestore) {
      setEnergy((e) => Math.min(100, e + item.energyRestore!));
      audioRef.current?.playChime("success");
      showToast(`Ate ${item.name} fresh (+${item.energyRestore}% Energy)!`);
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
    if (!item || !item.energyRestore) return;
    setEnergy((e) => Math.min(100, e + item.energyRestore!));
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
    setActiveNpcId(null);
    audioRef.current?.playChime("success");
    showToast(`Errand started: Head to ${err.targetLandmarkName} (amber beacon).`);
  };

  const handleAcceptGig = (gig: CityGigTask) => {
    setActiveGig(gig);
    engineRef.current?.setActiveGigLandmark(gig.targetLandmarkId);
    setShowInventory(false);
    audioRef.current?.playChime("success");
    showToast(`Gig accepted: Head to ${gig.targetLandmarkName} (green beacon).`);
  };

  const handleAbandonGig = () => {
    setActiveGig(null);
    engineRef.current?.setActiveGigLandmark(null);
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
        (job.executionMode === "transport_passenger" || job.executionMode === "pickup_and_deliver");
      const task: ActiveTaskRuntime = {
        job,
        stage: needsPickup ? "go_to_pickup" : "ready_for_activity",
        startedAtMinutes: gameMinutes,
      };
      setActiveTask(task);
      engineRef.current?.setActiveTaskState(task);
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
  }, []);

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
          district={district}
          formattedTime={formatClock(gameMinutes)}
          timePeriodLabel={timePeriodLabel}
          moneyCedis={moneyCedis}
          energy={energy}
          cultureXp={cultureXp}
          activeCharacterName={customization.name || activeProfile.name}
          activeCareerTitle={activeCareerRank.title}
          isDriving={isDriving}
          isRidingService={isRidingService}
          drivingLabel={drivingLabel}
          speedKmh={speedKmh}
          nearby={nearby}
          nearbyVehicle={nearbyVehicle}
          nearbyChatter={nearbyChatter}
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
          isTouchControlsVisible={isTouchControlsVisible}
          isPortraitPhone={isPortraitPhone}
          isIndoors={Boolean(activeInteriorSpec)}
          musicSnapshot={musicSnap}
          showMiniRadioBar={showMiniRadioBar}
          keyBindings={settings.keyBindings}
          onTriggerInteract={() => engineRef.current?.triggerNearbyInteraction()}
          onExitInterior={() => engineRef.current?.exitInterior()}
          onToggleVehicle={() => engineRef.current?.handleVehicleToggle()}
          onTriggerHorn={() => engineRef.current?.triggerHorn()}
          onOpenPhone={() => {
            setPhoneInitialTab("jobs");
            setShowPhone(true);
          }}
          onOpenPhoneRadio={() => {
            setPhoneInitialTab("radio");
            setShowPhone(true);
          }}
          onToggleMiniRadioPlay={() => musicEngineRef.current?.togglePlayPause()}
          onMiniRadioNext={() => musicEngineRef.current?.next()}
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
      {!inMainMenu && !exitedScreen && !anyModalOpen && isTouchControlsVisible && (
        <MobileTouchControls
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
          onOpenPhone={() => setShowPhone(true)}
          onOpenCharacterSwitch={() => setShowCharacterSwitch(true)}
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

      {/* Tamale Smartphone: Jobs, 3D Services, Bank & MoMo, Music, 7 FM Radio Stations, Messages, Businesses & Skills */}
      {showPhone && (
        <TamalePhoneModal
          initialTab={phoneInitialTab}
          activeProfile={activeProfile}
          characterState={allCharacterStatesLive[activeCharacterId]}
          allCharacterStates={allCharacterStatesLive}
          playerPos={playerPos}
          gameMinutes={gameMinutes}
          availableJobs={availableJobs}
          activeTask={activeTask}
          activeService={activeService}
          musicSnapshot={musicSnap}
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
          onPlayTrack={(trackId) => {
            musicEngineRef.current?.playTrackById(trackId);
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
          onSwitchCharacter={handleSwitchCharacter}
          onOpenCustomize={() => {
            setCustomizeTargetCharId(activeCharacterId);
            setShowPhone(false);
            setShowCustomize(true);
          }}
          onInvestBusiness={handleInvestBusiness}
          onFastTravelLandmark={handleFastTravelToLandmark}
          onClose={() => setShowPhone(false)}
        />
      )}

      {/* Interactive Station Overlay inside Walkable 3D Building Interiors */}
      {activeInteriorSpec && activeInteriorStation && (
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
          onAdjustWallets={handleAdjustWallets}
          onBuyItem={handleBuyItem}
          onApplyEnergyAndTime={handleApplyEnergyAndTime}
          onRepairVehicle={handleRepairVehicle}
          onApplyCustomization={handleApplyStationCustomization}
          onOpenDagbaniGuide={() => setShowDagbaniGuide(true)}
          onClose={() => setActiveInteriorStation(null)}
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
          onOpenPhone={() => setShowPhone(true)}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Settings & Controls Modal */}
      {showSettings && (
        <SettingsAndControlsModal
          initialTab={settingsTab}
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetKeyBindings={() =>
            updateSettings({ keyBindings: { ...DEFAULT_KEY_BINDINGS } })
          }
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
          onReturnMainMenu={() => {
            setShowPause(false);
            setInMainMenu(true);
          }}
        />
      )}
    </div>
  );
}
