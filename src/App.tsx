/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AboutTamaleModal } from "./components/AboutTamaleModal";
import { CommunityPortalModal } from "./components/CommunityPortalModal";
import { CustomizeModal } from "./components/CustomizeModal";
import { DagbaniGuideModal } from "./components/DagbaniGuideModal";
import { DialogueModal } from "./components/DialogueModal";
import { DiscoveryCardOverlay } from "./components/DiscoveryCardOverlay";
import { GameHud } from "./components/GameHud";
import { BuildingInteriorModal, PauseModal } from "./components/InteriorAndPauseModals";
import { InventoryJournalModal } from "./components/InventoryJournalModal";
import { MainMenu } from "./components/MainMenu";
import { MapModal } from "./components/MapModal";
import { MobileTouchControls } from "./components/MobileTouchControls";
import { ReferenceArchiveModal } from "./components/ReferenceArchiveModal";
import { SettingsAndControlsModal } from "./components/SettingsAndControlsModal";
import { ShopModal } from "./components/ShopAndErrandsModal";
import { TamaleEventsModal } from "./components/TamaleEventsModal";
import { INITIAL_CITY_EVENT_DESCRIPTIONS } from "./data/tamaleExpansionData";
import {
  generateAvailableCityGigs,
  INITIAL_ERRANDS,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
} from "./data/tamaleWorldData";
import { TamaleAudioEngine } from "./game/audio";
import { TamaleEngine } from "./game/TamaleEngine";
import {
  ActiveCityEventMode,
  CityGigTask,
  DEFAULT_KEY_BINDINGS,
  ErrandQuest,
  GameSettings,
  InventoryItem,
  LandmarkData,
  NearbyChatter,
  NearbyInteractable,
  NpcRuntimeSnapshot,
  PlayerCustomization,
  SavedGameState,
  ShopItem,
  ShopServiceAction,
  TimePeriod,
  WeatherType,
} from "./types/game";

const SAVE_STORAGE_KEY = "tamale3d_save_v1";

const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  name: "Sulemana",
  outfit: "batakari",
  headwear: "kufi",
  primaryColor: "#1e3a5f",
  accentColor: "#b45309",
  skinTone: "#62381f",
};

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

  // Core game progression & settings state
  const [moneyCedis, setMoneyCedis] = useState(180);
  const [energy, setEnergy] = useState(92);
  const [cultureXp, setCultureXp] = useState(15);
  const [gameMinutes, setGameMinutes] = useState(9 * 60 + 15);
  const [weather, setWeather] = useState<WeatherType>("clear");
  const [activeCityEvent, setActiveCityEvent] = useState<ActiveCityEventMode>("ordinary_day");
  const [customization, setCustomization] = useState<PlayerCustomization>(DEFAULT_CUSTOMIZATION);
  const [settings, setSettings] = useState<GameSettings>(createInitialSettings);

  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: "pure_water",
      name: "Chilled Drinking Water",
      dagbaniName: "Kom",
      category: "food",
      quantity: 2,
      energyRestore: 15,
      description: "Cool refreshing water for walking under the savannah sun.",
    },
  ]);
  const [friendships, setFriendships] = useState<Record<string, number>>({});
  const [discoveredLandmarks, setDiscoveredLandmarks] = useState<string[]>(["tamale_interchange"]);
  const [learnedVocabIds, setLearnedVocabIds] = useState<string[]>(["dasuba", "antire"]);
  const [errands, setErrands] = useState<ErrandQuest[]>(INITIAL_ERRANDS);
  const [activeGig, setActiveGig] = useState<CityGigTask | null>(null);
  const [availableGigs, setAvailableGigs] = useState<CityGigTask[]>(() =>
    generateAvailableCityGigs(14, 14)
  );
  const [completedGigsCount, setCompletedGigsCount] = useState(0);
  const [totalEarnedCedis, setTotalEarnedCedis] = useState(0);
  const [activeDiscoveryCard, setActiveDiscoveryCard] = useState<LandmarkData | null>(null);

  // Live HUD state synced from engine
  const [district, setDistrict] = useState("Naa Gbewaa Interchange · Central Tamale");
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isDriving, setIsDriving] = useState(false);
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
  const [playerPos, setPlayerPos] = useState({ x: 14, z: 14, rotY: -Math.PI * 0.78 });
  const [npcStates, setNpcStates] = useState<NpcRuntimeSnapshot[]>([]);

  // Active modals
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [activeInteriorLandmarkId, setActiveInteriorLandmarkId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showDagbaniGuide, setShowDagbaniGuide] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
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
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

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

  // Initialize Three.js TamaleEngine once inside isolated canvasMountRef
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const audio = new TamaleAudioEngine();
    audioRef.current = audio;

    const engine = new TamaleEngine(mountEl, DEFAULT_CUSTOMIZATION, audio, {
      onHudUpdate: (data) => {
        setDistrict(data.district);
        setSpeedKmh(data.speedKmh);
        setIsDriving(data.isDriving);
        setDrivingLabel(data.drivingLabel);
        setDrivingKind(data.drivingKind);
        setNearby(data.nearby);
        setNearbyVehicle(data.nearbyVehicle);
        setNearbyChatter(data.nearbyChatter);
        setNearestGuidance(data.nearestGuidance);
        setPlayerPos(data.playerPos);
        setNpcStates(data.npcStates);
        if (engineRef.current) {
          setGameMinutes(engineRef.current.getGameMinutes());
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
      onInteract: (item) => {
        if (item.kind === "npc") {
          setActiveNpcId(item.id);
        } else if (item.kind === "building") {
          setActiveInteriorLandmarkId(item.id);
        } else if (item.kind === "vendor") {
          if (item.shopId) setActiveShopId(item.shopId);
        } else if (item.kind === "delivery") {
          if (item.isGigDelivery) {
            handleCompleteActiveGig(item.id);
          } else {
            handleCompleteActiveErrand(item.id);
          }
        }
      },
      onWebGLContextChange: (lost) => setWebglLost(lost),
    });

    engineRef.current = engine;
    applySettingsToEngines(settingsRef.current);
    engine.setPaused(true); // Paused while on Main Menu

    return () => {
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, [applySettingsToEngines, handleCompleteActiveErrand, handleCompleteActiveGig, showToast]);

  // Pause engine whenever menu, exit screen, or any modal is open
  const anyModalOpen =
    inMainMenu ||
    exitedScreen ||
    Boolean(activeNpcId) ||
    Boolean(activeShopId) ||
    Boolean(activeInteriorLandmarkId) ||
    showMap ||
    showDagbaniGuide ||
    showCustomize ||
    showInventory ||
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
    audioRef.current?.setIndoorMode(Boolean(activeShopId || activeInteriorLandmarkId));
  }, [activeShopId, activeInteriorLandmarkId]);

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
          showMap ||
          showDagbaniGuide ||
          showCustomize ||
          showInventory ||
          showReferences ||
          showEvents ||
          showContributions ||
          showAbout
        ) {
          setActiveNpcId(null);
          setActiveShopId(null);
          setActiveInteriorLandmarkId(null);
          setShowMap(false);
          setShowDagbaniGuide(false);
          setShowCustomize(false);
          setShowInventory(false);
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
    showMap,
    showDagbaniGuide,
    showCustomize,
    showInventory,
    showReferences,
    showEvents,
    showContributions,
    showAbout,
  ]);

  const handleSaveGame = useCallback(() => {
    const activeErr = errands.find((e) => e.active && !e.completed);
    const saveObj: SavedGameState = {
      version: 3,
      moneyCedis,
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
      showToast("Progress saved to browser storage.");
    } catch {
      showToast("Unable to write save data in this browser session.");
    }
  }, [
    errands,
    moneyCedis,
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
      const s = JSON.parse(raw) as Partial<SavedGameState>;
      setMoneyCedis(s.moneyCedis ?? 180);
      setEnergy(s.energy ?? 90);
      setCultureXp(s.cultureXp ?? 15);
      setGameMinutes(s.gameMinutes ?? 555);
      const nextWeather = s.weather ?? "clear";
      setWeather(nextWeather);
      const ev = s.activeCityEvent ?? "ordinary_day";
      setActiveCityEvent(ev);
      engineRef.current?.setActiveCityEvent(ev);

      if (s.customization) {
        setCustomization(s.customization);
        engineRef.current?.updatePlayerCustomization(s.customization);
      }

      const defaults = createInitialSettings();
      const loadedSettings: GameSettings = {
        ...defaults,
        ...(s.settings ?? {}),
        keyBindings: {
          ...DEFAULT_KEY_BINDINGS,
          ...(s.settings?.keyBindings ?? {}),
        },
      };
      setSettings(loadedSettings);
      applySettingsToEngines(loadedSettings);

      setInventory(s.inventory ?? []);
      setFriendships(s.friendships ?? {});
      setDiscoveredLandmarks(s.discoveredLandmarks ?? ["tamale_interchange"]);
      setLearnedVocabIds(s.learnedVocabIds ?? []);
      setErrands(
        INITIAL_ERRANDS.map((e) => ({
          ...e,
          completed: s.completedErrands?.includes(e.id) ?? false,
          active: s.activeErrandId === e.id,
        }))
      );
      if (s.activeErrandId) {
        const er = INITIAL_ERRANDS.find((e) => e.id === s.activeErrandId);
        engineRef.current?.setActiveErrandLandmark(er ? er.targetLandmarkId : null);
      } else {
        engineRef.current?.setActiveErrandLandmark(null);
      }
      const loadedGig = s.activeGig ?? null;
      setActiveGig(loadedGig);
      setCompletedGigsCount(s.completedGigsCount ?? 0);
      setTotalEarnedCedis(s.totalEarnedCedis ?? 0);
      engineRef.current?.setActiveGigLandmark(loadedGig ? loadedGig.targetLandmarkId : null);

      if (s.playerPos) {
        engineRef.current?.teleportTo(s.playerPos.x, s.playerPos.z, s.playerPos.rotY);
      }
      engineRef.current?.setWeather(nextWeather);
      engineRef.current?.setGameMinutes(s.gameMinutes ?? 555);
      return true;
    } catch {
      return false;
    }
  }, [applySettingsToEngines]);

  const handleNewGame = useCallback(() => {
    audioRef.current?.init();
    setMoneyCedis(180);
    setEnergy(95);
    setCultureXp(15);
    setGameMinutes(9 * 60 + 15);
    setWeather("clear");
    setActiveCityEvent("ordinary_day");
    setErrands(INITIAL_ERRANDS);
    setActiveGig(null);
    setCompletedGigsCount(0);
    setTotalEarnedCedis(0);
    setActiveDiscoveryCard(null);
    setAvailableGigs(generateAvailableCityGigs(14, 14));
    engineRef.current?.setWeather("clear");
    engineRef.current?.setActiveCityEvent("ordinary_day");
    engineRef.current?.setGameMinutes(9 * 60 + 15);
    engineRef.current?.setActiveErrandLandmark(null);
    engineRef.current?.setActiveGigLandmark(null);
    engineRef.current?.teleportTo(14, 14, -Math.PI * 0.78);
    setExitedScreen(false);
    setShowPause(false);
    setInMainMenu(false);
    showToast("Dasuba! Explore Tamale — walk near residents, shops, or a Pragya.");
  }, [showToast]);

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
    if (hasSavedGame) {
      handleContinueGame();
    } else {
      handleNewGame();
    }
  }, [handleContinueGame, handleNewGame, hasSavedGame]);

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

  const handleBuyItem = (item: ShopItem, finalPrice: number) => {
    if (moneyCedis < finalPrice) return;
    setMoneyCedis((m) => m - finalPrice);
    audioRef.current?.playChime("coin");

    if (item.unlockOutfit) {
      const updated = { ...customization, outfit: item.unlockOutfit };
      setCustomization(updated);
      engineRef.current?.updatePlayerCustomization(updated);
      setCultureXp((xp) => xp + 20);
      showToast(`Equipped ${item.name} (${item.dagbaniName})!`);
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
      engineRef.current?.setGameMinutes(nextMins);
    }
    audioRef.current?.playChime("success");
    showToast(`${service.label} (${service.dagbaniLabel}) completed!`);
  };

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
          onChangeLanguageMode={(mode) => updateSettings({ languageMode: mode })}
          onPlay={handlePlay}
          onContinueGame={handleContinueGame}
          onNewGame={handleNewGame}
          onOpenCustomize={() => setShowCustomize(true)}
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
          isDriving={isDriving}
          drivingLabel={drivingLabel}
          speedKmh={speedKmh}
          nearby={nearby}
          nearbyVehicle={nearbyVehicle}
          nearbyChatter={nearbyChatter}
          nearestGuidance={nearestGuidance}
          activeErrandTitle={activeErrand ? activeErrand.title : null}
          activeGigTitle={activeGig ? activeGig.title : null}
          activeCityEventLabel={INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEvent].label}
          weather={weather}
          cameraMode={settings.cameraMode}
          languageMode={settings.languageMode}
          audioEnabled={settings.audioEnabled}
          showLabels={showLabels}
          isTouchControlsVisible={isTouchControlsVisible}
          isPortraitPhone={isPortraitPhone}
          keyBindings={settings.keyBindings}
          onTriggerInteract={() => engineRef.current?.triggerNearbyInteraction()}
          onToggleVehicle={() => engineRef.current?.handleVehicleToggle()}
          onTriggerHorn={() => engineRef.current?.triggerHorn()}
          onOpenMap={() => setShowMap(true)}
          onOpenDagbaniGuide={() => setShowDagbaniGuide(true)}
          onOpenInventory={() => setShowInventory(true)}
          onOpenCustomize={() => setShowCustomize(true)}
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
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#171411]/95 border border-amber-500/45 text-[#f8f5ef] px-4 py-2 rounded-lg text-xs font-medium shadow-xl pointer-events-none max-w-[90vw] text-center">
          {toastMessage}
        </div>
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
          onBuyItem={handleBuyItem}
          onUseService={handleUseShopService}
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
          activeGigLandmarkId={activeGig ? activeGig.targetLandmarkId : null}
          npcStates={npcStates}
          onInspectLandmark={(lm) => {
            setShowMap(false);
            setActiveDiscoveryCard(lm);
          }}
          onFastTravel={(lm: LandmarkData) => {
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
            } else if (lm.id === "scca_red_clay") {
              tx = lm.x - 16;
              tz = lm.z;
            } else if (lm.id === "kukuo_market_pottery") {
              tx = lm.x - 16;
              tz = lm.z;
            } else if (lm.id === "tamale_airport") {
              tx = lm.x;
              tz = lm.z + 14;
            }
            engineRef.current?.teleportTo(tx, tz, 0);
            setShowMap(false);
            showToast(`Arrived at ${lm.name}`);
          }}
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
              engineRef.current?.setGameMinutes(18 * 60 + 45);
            } else if (mode === "stadium_match") {
              setGameMinutes(17 * 60 + 50);
              engineRef.current?.setGameMinutes(17 * 60 + 50);
            }
            audioRef.current?.playChime("success");
            showToast(`City event mode: ${INITIAL_CITY_EVENT_DESCRIPTIONS[mode].label}`);
          }}
          onJumpToLandmark={(landmarkId) => {
            const lm = TAMALE_LANDMARKS.find((l) => l.id === landmarkId);
            if (!lm) return;
            const tx =
              lm.id === "tamale_interchange"
                ? 14
                : lm.id === "central_mosque"
                ? 18
                : lm.id === "scca_red_clay"
                ? lm.x - 16
                : lm.x;
            const tz =
              lm.id === "aliu_mahama_stadium"
                ? lm.z + 27
                : lm.id === "central_mosque"
                ? lm.z
                : lm.z + 15;
            engineRef.current?.teleportTo(tx, tz, 0);
            setInMainMenu(false);
            showToast(`Arrived at ${lm.name}`);
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
          customization={customization}
          onApply={(cust) => {
            setCustomization(cust);
            engineRef.current?.updatePlayerCustomization(cust);
            showToast(`Updated look for ${cust.name}`);
          }}
          onClose={() => setShowCustomize(false)}
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
