/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CommunityPortalModal } from "./components/CommunityPortalModal";
import { CustomizeModal } from "./components/CustomizeModal";
import { DagbaniGuideModal } from "./components/DagbaniGuideModal";
import { DialogueModal } from "./components/DialogueModal";
import { GameHud } from "./components/GameHud";
import { BuildingInteriorModal, PauseModal } from "./components/InteriorAndPauseModals";
import { InventoryJournalModal } from "./components/InventoryJournalModal";
import { MainMenu } from "./components/MainMenu";
import { MapModal } from "./components/MapModal";
import { ReferenceArchiveModal } from "./components/ReferenceArchiveModal";
import { ShopModal } from "./components/ShopAndErrandsModal";
import { TamaleEventsModal } from "./components/TamaleEventsModal";
import { INITIAL_CITY_EVENT_DESCRIPTIONS } from "./data/tamaleExpansionData";
import {
  INITIAL_ERRANDS,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
} from "./data/tamaleWorldData";
import { TamaleAudioEngine } from "./game/audio";
import { TamaleEngine } from "./game/TamaleEngine";
import {
  ActiveCityEventMode,
  CameraMode,
  ErrandQuest,
  InventoryItem,
  LandmarkData,
  LanguageMode,
  NearbyChatter,
  NearbyInteractable,
  NpcRuntimeSnapshot,
  PlayerCustomization,
  SavedGameState,
  ShopItem,
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
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [webglLost, setWebglLost] = useState(false);

  // Core game progression state
  const [moneyCedis, setMoneyCedis] = useState(180);
  const [energy, setEnergy] = useState(92);
  const [cultureXp, setCultureXp] = useState(15);
  const [gameMinutes, setGameMinutes] = useState(9 * 60 + 15);
  const [weather, setWeather] = useState<WeatherType>("clear");
  const [activeCityEvent, setActiveCityEvent] = useState<ActiveCityEventMode>("ordinary_day");
  const [customization, setCustomization] = useState<PlayerCustomization>(DEFAULT_CUSTOMIZATION);
  const [languageMode, setLanguageMode] = useState<LanguageMode>("mixed");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("third-person");

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

  // Live HUD state synced from engine
  const [district, setDistrict] = useState("Naa Gbewaa Interchange · Central Tamale");
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isDriving, setIsDriving] = useState(false);
  const [drivingLabel, setDrivingLabel] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [nearbyChatter, setNearbyChatter] = useState<NearbyChatter | null>(null);
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
  const [showPause, setShowPause] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const errandsRef = useRef(errands);
  errandsRef.current = errands;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

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
      setCultureXp((xp) => xp + active.rewardCultureXp);
      engineRef.current?.setActiveErrandLandmark(null);
      audioRef.current?.playChime("success");
      showToast(
        `Errand completed! Earned GH₵ ${active.rewardCedis} & +${active.rewardCultureXp} Culture XP`
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
        setNearby(data.nearby);
        setNearbyChatter(data.nearbyChatter);
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
        } else if (item.kind === "delivery") {
          handleCompleteActiveErrand(item.id);
        }
      },
      onWebGLContextChange: (lost) => setWebglLost(lost),
    });

    engineRef.current = engine;
    engine.setPaused(true); // Paused while on Main Menu

    return () => {
      engine.dispose();
      audio.dispose();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, [handleCompleteActiveErrand, showToast]);

  // Pause engine whenever menu or any modal is open
  const anyModalOpen =
    inMainMenu ||
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
    showPause;

  useEffect(() => {
    engineRef.current?.setPaused(anyModalOpen);
  }, [anyModalOpen]);

  useEffect(() => {
    audioRef.current?.setIndoorMode(Boolean(activeShopId || activeInteriorLandmarkId));
  }, [activeShopId, activeInteriorLandmarkId]);

  // Keyboard shortcuts for HUD modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || inMainMenu) return;

      if (e.code === "Escape") {
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
          showContributions
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
        } else {
          setShowPause((p) => !p);
        }
      } else if (e.code === "KeyM" && !anyModalOpen) {
        setShowMap(true);
      } else if (e.code === "KeyL" && !anyModalOpen) {
        setShowDagbaniGuide(true);
      } else if (e.code === "KeyI" && !anyModalOpen) {
        setShowInventory(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    inMainMenu,
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
  ]);

  const handleSaveGame = useCallback(() => {
    const activeErr = errands.find((e) => e.active && !e.completed);
    const saveObj: SavedGameState = {
      version: 1,
      moneyCedis,
      energy,
      cultureXp,
      gameMinutes,
      weather,
      activeCityEvent,
      customization,
      settings: {
        languageMode,
        showSubtitles,
        audioEnabled,
        soundVolume: 0.5,
        cameraMode,
      },
      inventory,
      friendships,
      discoveredLandmarks,
      learnedVocabIds,
      activeErrandId: activeErr ? activeErr.id : null,
      completedErrands: errands.filter((e) => e.completed).map((e) => e.id),
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
    languageMode,
    showSubtitles,
    audioEnabled,
    cameraMode,
    inventory,
    friendships,
    discoveredLandmarks,
    learnedVocabIds,
    playerPos,
    showToast,
  ]);

  const handleContinueGame = () => {
    audioRef.current?.init();
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SavedGameState;
        setMoneyCedis(s.moneyCedis ?? 180);
        setEnergy(s.energy ?? 90);
        setCultureXp(s.cultureXp ?? 15);
        setGameMinutes(s.gameMinutes ?? 555);
        setWeather(s.weather ?? "clear");
        const ev = s.activeCityEvent ?? "ordinary_day";
        setActiveCityEvent(ev);
        engineRef.current?.setActiveCityEvent(ev);
        if (s.customization) {
          setCustomization(s.customization);
          engineRef.current?.updatePlayerCustomization(s.customization);
        }
        if (s.settings) {
          setLanguageMode(s.settings.languageMode);
          setShowSubtitles(s.settings.showSubtitles);
          setAudioEnabled(s.settings.audioEnabled);
          setCameraMode(s.settings.cameraMode);
          audioRef.current?.setEnabled(s.settings.audioEnabled);
          engineRef.current?.setCameraMode(s.settings.cameraMode);
        }
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
        }
        if (s.playerPos) {
          engineRef.current?.teleportTo(s.playerPos.x, s.playerPos.z, s.playerPos.rotY);
        }
        engineRef.current?.setWeather(s.weather ?? "clear");
        engineRef.current?.setGameMinutes(s.gameMinutes ?? 555);
      }
    } catch {
      // fall back cleanly
    }
    setInMainMenu(false);
    showToast("Dasuba / Antire! Welcome back to Tamale.");
  };

  const handleNewGame = () => {
    audioRef.current?.init();
    setMoneyCedis(180);
    setEnergy(95);
    setCultureXp(15);
    setGameMinutes(9 * 60 + 15);
    setWeather("clear");
    setActiveCityEvent("ordinary_day");
    setErrands(INITIAL_ERRANDS);
    engineRef.current?.setWeather("clear");
    engineRef.current?.setActiveCityEvent("ordinary_day");
    engineRef.current?.setGameMinutes(9 * 60 + 15);
    engineRef.current?.setActiveErrandLandmark(null);
    engineRef.current?.teleportTo(14, 14, -Math.PI * 0.78);
    setInMainMenu(false);
    showToast("Dasuba! Explore Tamale — press E near residents, landmarks, or a Pragya.");
  };

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
        active: e.id === errandId ? true : false,
      }))
    );
    engineRef.current?.setActiveErrandLandmark(err.targetLandmarkId);
    setActiveNpcId(null);
    audioRef.current?.playChime("success");
    showToast(`Errand started: Head to ${err.targetLandmarkName} (amber beacon).`);
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
    <div className="relative w-screen h-screen overflow-hidden bg-[#12100e]">
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
      {inMainMenu && (
        <MainMenu
          hasSavedGame={hasSavedGame}
          languageMode={languageMode}
          onChangeLanguageMode={setLanguageMode}
          onNewGame={handleNewGame}
          onContinueGame={handleContinueGame}
          onOpenCustomize={() => setShowCustomize(true)}
          onOpenLanguageGuide={() => setShowDagbaniGuide(true)}
          onOpenReferences={() => setShowReferences(true)}
          onOpenEvents={() => setShowEvents(true)}
          onOpenContributions={() => setShowContributions(true)}
        />
      )}

      {/* Active Gameplay HUD */}
      {!inMainMenu && (
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
          nearbyChatter={nearbyChatter}
          activeErrandTitle={activeErrand ? activeErrand.title : null}
          activeCityEventLabel={INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEvent].label}
          weather={weather}
          cameraMode={cameraMode}
          languageMode={languageMode}
          audioEnabled={audioEnabled}
          showLabels={showLabels}
          onTriggerInteract={() => engineRef.current?.triggerNearbyInteraction()}
          onExitVehicle={() => engineRef.current?.exitVehicle()}
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
            const next = !audioEnabled;
            setAudioEnabled(next);
            audioRef.current?.setEnabled(next);
          }}
          onToggleLabels={() => {
            const next = !showLabels;
            setShowLabels(next);
            engineRef.current?.setShowLabels(next);
          }}
          onChangeWeather={(w) => {
            setWeather(w);
            engineRef.current?.setWeather(w);
          }}
          onChangeTimePreset={(mins) => {
            setGameMinutes(mins);
            engineRef.current?.setGameMinutes(mins);
          }}
          onChangeCameraMode={(m) => {
            setCameraMode(m);
            engineRef.current?.setCameraMode(m);
          }}
          onChangeLanguageMode={setLanguageMode}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#171411]/95 border border-amber-500/45 text-[#f8f5ef] px-4 py-2 rounded-lg text-xs font-medium shadow-xl pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* NPC Dialogue Modal */}
      {activeNpc && (
        <DialogueModal
          npc={activeNpc}
          npcRuntime={npcStates.find((s) => s.npcId === activeNpc.id) ?? null}
          languageMode={languageMode}
          showSubtitles={showSubtitles}
          timePeriod={period}
          friendshipLevel={friendships[activeNpc.id] ?? 1}
          availableErrand={
            errands.find((e) => e.giverNpcId === activeNpc.id && !e.completed) || null
          }
          onChangeLanguageMode={setLanguageMode}
          onToggleSubtitles={() => setShowSubtitles((s) => !s)}
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

      {/* Market / Craft Shop Modal */}
      {activeShopId && (
        <ShopModal
          shopId={activeShopId}
          moneyCedis={moneyCedis}
          onBuyItem={handleBuyItem}
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
          npcStates={npcStates}
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

      {/* Bag, Errands & Progression */}
      {showInventory && (
        <InventoryJournalModal
          inventory={inventory}
          errands={errands}
          moneyCedis={moneyCedis}
          energy={energy}
          cultureXp={cultureXp}
          discoveredCount={discoveredLandmarks.length}
          totalLandmarks={TAMALE_LANDMARKS.length}
          onConsumeItem={handleConsumeItem}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Pause & Save Menu */}
      {showPause && (
        <PauseModal
          languageMode={languageMode}
          showSubtitles={showSubtitles}
          onChangeLanguageMode={setLanguageMode}
          onToggleSubtitles={() => setShowSubtitles((s) => !s)}
          onSaveGame={handleSaveGame}
          onResume={() => setShowPause(false)}
          onReturnMainMenu={() => {
            setShowPause(false);
            setInMainMenu(true);
          }}
        />
      )}
    </div>
  );
}
