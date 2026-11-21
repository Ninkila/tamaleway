import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  Camera,
  Compass,
  DoorOpen,
  Map as MapIcon,
  Maximize2,
  MessageSquarePlus,
  Music,
  Package,
  Pause,
  Play,
  Radio,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Smartphone,
  Tag,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { MusicPlayerSnapshot } from "../game/musicPlayer";
import {
  ActiveTaskRuntime,
  CameraMode,
  ContextualHintPayload,
  KeyBindings,
  LanguageMode,
  NearbyChatter,
  NearbyInteractable,
  ServiceRequestRuntime,
  WeatherType,
} from "../types/game";
import { DeviceLayoutConfig } from "../utils/deviceProfile";
import { ContextualHintBanner } from "./ContextualHintBanner";
import { MiniMusicRadioBar } from "./MusicRadioApp";

interface GameHudProps {
  deviceLayout: DeviceLayoutConfig;
  contextualHint: ContextualHintPayload | null;
  onDismissOnboarding: () => void;
  district: string;
  formattedTime: string;
  timePeriodLabel: string;
  moneyCedis: number;
  energy: number;
  cultureXp: number;
  activeCharacterName?: string;
  activeCareerTitle?: string;
  isDriving: boolean;
  isRidingService?: boolean;
  drivingLabel: string | null;
  speedKmh: number;
  nearby: NearbyInteractable | null;
  nearbyVehicle: NearbyInteractable | null;
  nearbyChatter: NearbyChatter | null;
  nearestGuidance: {
    id: string;
    name: string;
    dagbaniLabel: string;
    distanceMeters: number;
    bearingLabel: string;
    isErrandTarget: boolean;
  } | null;
  activeErrandTitle: string | null;
  activeGigTitle?: string | null;
  activeTask?: ActiveTaskRuntime | null;
  activeService?: ServiceRequestRuntime | null;
  activeCityEventLabel: string;
  weather: WeatherType;
  cameraMode: CameraMode;
  languageMode: LanguageMode;
  audioEnabled: boolean;
  showLabels: boolean;
  isIndoors?: boolean;
  musicSnapshot?: MusicPlayerSnapshot | null;
  showMiniRadioBar?: boolean;
  keyBindings: KeyBindings;
  onTriggerInteract: () => void;
  onExitInterior?: () => void;
  onToggleVehicle: () => void;
  onTriggerHorn: () => void;
  onOpenPhone?: () => void;
  onOpenPhoneRadio?: () => void;
  onToggleMiniRadioPlay?: () => void;
  onMiniRadioNext?: () => void;
  onMiniRadioPrev?: () => void;
  onToggleVehicleRadio?: () => void;
  onToggleVehicleAudioSource?: () => void;
  onCloseMiniRadio?: () => void;
  onOpenCharacterSwitch?: () => void;
  onCancelService?: () => void;
  onOpenMap: () => void;
  onOpenDagbaniGuide: () => void;
  onOpenInventory: () => void;
  onOpenCustomize: () => void;
  onOpenReferences: () => void;
  onOpenEvents: () => void;
  onOpenContributions: () => void;
  onOpenPause: () => void;
  onToggleAudio: () => void;
  onToggleLabels: () => void;
  onToggleFullscreen: () => void;
  onChangeWeather: (w: WeatherType) => void;
  onChangeTimePreset: (minutes: number) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onChangeLanguageMode: (mode: LanguageMode) => void;
}

const WEATHER_SHORT: Record<WeatherType, string> = {
  clear: "Sunny",
  cloudy: "Cloudy",
  heat: "Hot",
  harmattan: "Harmattan",
  light_rain: "Drizzle",
  rain: "Rain",
  thunderstorm: "Storm",
};

function keyHint(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code === "Space") return "Space";
  return code;
}

export const GameHud: React.FC<GameHudProps> = ({
  deviceLayout,
  contextualHint,
  onDismissOnboarding,
  district,
  formattedTime,
  moneyCedis,
  energy,
  activeCharacterName,
  isDriving,
  isRidingService = false,
  drivingLabel,
  speedKmh,
  nearby,
  nearbyChatter,
  nearestGuidance,
  activeErrandTitle,
  activeGigTitle = null,
  activeTask = null,
  activeService = null,
  weather,
  cameraMode,
  languageMode,
  audioEnabled,
  showLabels,
  isIndoors = false,
  musicSnapshot = null,
  showMiniRadioBar = false,
  keyBindings,
  onExitInterior,
  onToggleVehicle,
  onTriggerHorn,
  onOpenPhone,
  onOpenPhoneRadio,
  onToggleMiniRadioPlay,
  onMiniRadioNext,
  onMiniRadioPrev,
  onToggleVehicleRadio,
  onToggleVehicleAudioSource,
  onCloseMiniRadio,
  onOpenCharacterSwitch,
  onCancelService,
  onOpenMap,
  onOpenDagbaniGuide,
  onOpenInventory,
  onOpenCustomize,
  onOpenReferences,
  onOpenEvents,
  onOpenContributions,
  onOpenPause,
  onToggleAudio,
  onToggleLabels,
  onToggleFullscreen,
  onChangeWeather,
  onChangeTimePreset,
  onChangeCameraMode,
  onChangeLanguageMode,
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [dismissPortraitTip, setDismissPortraitTip] = useState(false);

  const isPhone = deviceLayout.isPhoneLayout;
  const isTablet = deviceLayout.isTabletLayout;
  const isMinimal = deviceLayout.hudVisibility === "minimal";
  const touchVisible = deviceLayout.showTouchControls;
  const energyPct = Math.max(0, Math.min(100, Math.round(energy)));

  const activeMissionText = activeTask
    ? `${activeTask.stage === "go_to_pickup" ? "Pickup" : "Go to"}: ${activeTask.job.title}`
    : activeErrandTitle
    ? `Errand: ${activeErrandTitle}`
    : activeGigTitle
    ? `Gig: ${activeGigTitle}`
    : null;

  const hasLiveService =
    activeService && activeService.status !== "completed" && activeService.status !== "cancelled";

  // Bottom spacing avoids overlapping joystick & right thumb buttons on touch devices
  const bottomLiftClass = touchVisible
    ? isPhone && deviceLayout.orientation === "portrait"
      ? "mb-36"
      : isPhone
      ? "mb-28"
      : "mb-4"
    : "";

  const compactHint =
    contextualHint &&
    !(isPhone && contextualHint.priority === "onboarding" && (nearby || isDriving))
      ? contextualHint
      : null;

  return (
    <div
      style={
        deviceLayout.uiScaleFactor !== 1
          ? { fontSize: `${Math.round(deviceLayout.uiScaleFactor * 100)}%` }
          : undefined
      }
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4"
    >
      {/* TOP BAR — Tailored per Device Class */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* TOP-LEFT STATUS */}
        {isPhone ? (
          <div className="pointer-events-auto bg-[#14110f]/86 border border-white/12 rounded-xl px-2.5 py-1.5 max-w-[54vw] shadow-md space-y-1">
            <div className="flex items-center gap-2 font-mono-num text-xs">
              <span className="text-amber-400 font-bold whitespace-nowrap">GH₵ {moneyCedis}</span>
              <span className="text-white/25" aria-hidden="true">
                |
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-10 h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      energyPct < 25 ? "bg-red-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${energyPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#cfc8bc]">{energyPct}%</span>
              </div>
            </div>

            {!isMinimal && (
              <div className="text-[11px] text-[#ded8cc] font-medium truncate">
                {district} · <span className="font-mono-num text-[#b5ada0]">{formattedTime}</span>
              </div>
            )}

            {activeMissionText && (
              <div className="text-[10px] text-emerald-300 truncate border-t border-white/10 pt-0.5">
                {activeMissionText}
              </div>
            )}

            {hasLiveService && activeService && (
              <div className="flex items-center justify-between gap-1.5 text-[10px] text-sky-300 border-t border-white/10 pt-0.5">
                <span className="truncate">
                  {activeService.providerName}
                  {activeService.etaSeconds > 0 ? ` (${activeService.etaSeconds}s)` : " · Ready"}
                </span>
                {onCancelService && (
                  <button
                    type="button"
                    onClick={onCancelService}
                    className="text-red-300 font-semibold shrink-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}

            {isIndoors && onExitInterior && (
              <button
                type="button"
                onClick={onExitInterior}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/45 text-[11px] font-semibold text-amber-200 flex items-center gap-1 cursor-pointer"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            )}
          </div>
        ) : (
          /* Desktop & Tablet Top-Left Status */
          <div className="pointer-events-auto bg-[#14110f]/88 border border-white/12 rounded-xl px-3.5 py-2 max-w-[46vw] sm:max-w-sm shadow-lg space-y-1">
            {!isMinimal ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs sm:text-sm font-semibold text-[#f8f5ef] truncate">
                    {district}
                  </span>
                  <span className="text-[11px] font-mono-num text-[#b5ada0] whitespace-nowrap shrink-0">
                    {formattedTime} · {WEATHER_SHORT[weather]}
                  </span>
                </div>
                {activeCharacterName && (
                  <div className="text-[11px] text-amber-300/90 truncate">
                    {activeCharacterName}
                  </div>
                )}
                {nearestGuidance && nearestGuidance.isErrandTarget && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 truncate">
                    <Compass className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {nearestGuidance.name} · {nearestGuidance.distanceMeters}m{" "}
                      {nearestGuidance.bearingLabel}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs font-medium text-[#ede8de] truncate">{district}</div>
            )}

            {activeMissionText && (
              <div className="text-[11px] text-emerald-300 pt-1 border-t border-white/10 truncate">
                {activeMissionText}
              </div>
            )}

            {hasLiveService && activeService && (
              <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-sky-300">
                <span className="truncate">
                  {activeService.providerName}: {activeService.statusNote}
                  {activeService.etaSeconds > 0 ? ` (${activeService.etaSeconds}s)` : ""}
                </span>
                {onCancelService && (
                  <button
                    type="button"
                    onClick={onCancelService}
                    className="text-[10px] font-semibold text-red-300 hover:text-red-200 shrink-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}

            {isIndoors && onExitInterior && (
              <button
                type="button"
                onClick={onExitInterior}
                className="mt-1 min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/45 text-xs font-semibold text-amber-200 flex items-center gap-1.5 cursor-pointer"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>Step Outside</span>
              </button>
            )}
          </div>
        )}

        {/* TOP-RIGHT ACTIONS */}
        {isPhone ? (
          /* Mobile Phone: Strictly <= 3 compact >=44px action buttons */
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#14110f]/88 border border-white/12 rounded-xl p-1 shadow-lg">
            {onOpenPhone && (
              <button
                type="button"
                onClick={onOpenPhone}
                aria-label="Open Tamale Phone"
                className="min-h-[44px] min-w-[44px] px-2.5 flex items-center justify-center gap-1 text-xs font-bold text-[#12100e] bg-amber-500 active:scale-95 rounded-lg cursor-pointer"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenMap}
              aria-label="Open Tamale Map"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#ede8de] active:bg-white/15 rounded-lg cursor-pointer"
            >
              <MapIcon className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={onOpenPause}
              aria-label="Pause Menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#ede8de] active:bg-white/15 rounded-lg cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Desktop & Tablet Top-Right Action Bar */
          <div className="pointer-events-auto relative flex items-center gap-1.5 bg-[#14110f]/90 border border-white/12 rounded-xl px-2.5 py-1.5 shadow-lg">
            {/* Compact Wallet + Energy Bar */}
            <div className="flex items-center gap-2.5 pr-2 border-r border-white/12 font-mono-num">
              <span className="text-xs sm:text-sm font-bold text-amber-400 whitespace-nowrap">
                GH₵ {moneyCedis}
              </span>
              <div
                className="hidden sm:flex items-center gap-1.5"
                title={`Energy ${energyPct}%`}
              >
                <div className="w-12 h-2 rounded-full bg-white/12 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      energyPct < 25 ? "bg-red-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${energyPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#cfc8bc]">{energyPct}%</span>
              </div>
            </div>

            {onOpenPhone && (
              <button
                type="button"
                onClick={onOpenPhone}
                title="Tamale Phone (P)"
                className={`${
                  isTablet ? "min-h-[42px] px-3" : "min-h-[34px] px-2.5"
                } flex items-center gap-1.5 text-xs font-semibold text-[#12100e] bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Phone</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenMap}
              title={`Tamale City Map (${keyHint(keyBindings.map)})`}
              className={`${
                isTablet ? "min-h-[42px] px-3" : "min-h-[34px] px-2.5"
              } flex items-center gap-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer`}
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Map</span>
            </button>

            <button
              type="button"
              onClick={onOpenInventory}
              title={`Bag & Errands (${keyHint(keyBindings.inventory)})`}
              className={`${
                isTablet ? "min-h-[42px] px-3" : "min-h-[34px] px-2.5"
              } flex items-center gap-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer`}
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Bag</span>
            </button>

            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              title="City & Environment Tools"
              aria-expanded={toolsOpen}
              className={`${
                isTablet ? "min-h-[42px] min-w-[42px]" : "min-h-[34px] min-w-[34px]"
              } flex items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
                toolsOpen
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-[#ede8de] hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              title={audioEnabled ? "Mute Audio" : "Enable Audio"}
              className={`${
                isTablet ? "min-h-[42px] min-w-[42px]" : "min-h-[34px] min-w-[34px]"
              } flex items-center justify-center text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer`}
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#8c8478]" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenPause}
              title="Menu / Save (Esc)"
              className={`${
                isTablet ? "min-h-[42px] min-w-[42px]" : "min-h-[34px] min-w-[34px]"
              } flex items-center justify-center text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer`}
            >
              <Pause className="w-4 h-4" />
            </button>

            {/* Quick Tools Popover (Houses secondary city/environment controls without cluttering the screen) */}
            {toolsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#171411]/98 border border-white/15 rounded-2xl p-3.5 shadow-2xl space-y-3 z-30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">
                    City &amp; World Tools
                  </span>
                  <button
                    type="button"
                    onClick={() => setToolsOpen(false)}
                    aria-label="Close city tools"
                    className="p-1 text-[#bfb7aa] hover:text-white rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick App Shortcuts */}
                <div className="grid grid-cols-2 gap-1.5">
                  {onOpenPhoneRadio && (
                    <button
                      type="button"
                      onClick={() => {
                        setToolsOpen(false);
                        onOpenPhoneRadio();
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      <span>Radio FM</span>
                    </button>
                  )}
                  {onOpenCharacterSwitch && (
                    <button
                      type="button"
                      onClick={() => {
                        setToolsOpen(false);
                        onOpenCharacterSwitch();
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Switch (C)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenDagbaniGuide();
                    }}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dagbani (L)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenCustomize();
                    }}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Wardrobe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenEvents();
                    }}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>City Events</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenReferences();
                    }}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Photo Refs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenContributions();
                    }}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Community</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToolsOpen(false);
                      onToggleFullscreen();
                    }}
                    className="min-h-[36px] px-2.5 rounded-lg bg-[#221d18] hover:bg-white/10 text-xs text-[#f5f2eb] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fullscreen</span>
                  </button>
                </div>

                {/* Camera & Labels */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#9c9487]">Camera</span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: "third-person", label: "Follow" },
                          { id: "wide", label: "Wide" },
                          { id: "overhead", label: "City" },
                        ] as const
                      ).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onChangeCameraMode(c.id)}
                          className={`px-2 py-1 text-[11px] rounded cursor-pointer ${
                            cameraMode === c.id
                              ? "bg-amber-500 text-[#12100e] font-semibold"
                              : "bg-[#221d18] text-[#d4cdc2] hover:bg-white/10"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#9c9487]">Language</span>
                    <div className="flex items-center gap-1">
                      {(["dagbani", "mixed", "english"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => onChangeLanguageMode(m)}
                          className={`px-2 py-1 text-[11px] rounded capitalize cursor-pointer ${
                            languageMode === m
                              ? "bg-amber-500 text-[#12100e] font-semibold"
                              : "bg-[#221d18] text-[#d4cdc2] hover:bg-white/10"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#9c9487]">Time</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: "AM", mins: 8 * 60 },
                        { label: "Noon", mins: 13 * 60 },
                        { label: "Dusk", mins: 17 * 60 + 45 },
                        { label: "Night", mins: 21 * 60 },
                      ].map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => onChangeTimePreset(t.mins)}
                          className="px-2 py-1 text-[11px] bg-[#221d18] text-[#d4cdc2] hover:bg-white/10 rounded cursor-pointer"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-[#9c9487]">Weather</span>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          { id: "clear", label: "Sun" },
                          { id: "cloudy", label: "Cloud" },
                          { id: "heat", label: "Heat" },
                          { id: "harmattan", label: "Dust" },
                          { id: "light_rain", label: "Drizzle" },
                          { id: "rain", label: "Rain" },
                          { id: "thunderstorm", label: "Storm" },
                        ] as const
                      ).map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onChangeWeather(w.id)}
                          className={`px-2 py-1 text-[11px] rounded cursor-pointer ${
                            weather === w.id
                              ? "bg-amber-500 text-[#12100e] font-semibold"
                              : "bg-[#221d18] text-[#d4cdc2] hover:bg-white/10"
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleLabels}
                    className={`w-full min-h-[34px] flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs rounded-lg cursor-pointer ${
                      showLabels
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 font-semibold"
                        : "bg-[#221d18] text-[#d4cdc2] hover:bg-white/10"
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>3D Landmark Labels: {showLabels ? "On" : "Off"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle Portrait Mobile Orientation Tip (only when user prefers landscape & is in portrait) */}
      {deviceLayout.showOrientationPrompt && !dismissPortraitTip && (
        <div className="pointer-events-auto self-center bg-[#171411]/92 border border-amber-500/35 rounded-xl px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2 shadow-lg">
          <span>Rotate to landscape for wider view</span>
          <button
            type="button"
            onClick={() => setDismissPortraitTip(true)}
            className="text-xs font-bold text-amber-400 px-1.5 py-0.5 cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* BOTTOM AREA: Mini Radio, Optional Street Chatter, Active Vehicle Bar, and Single Contextual Hint */}
      <div className={`flex flex-col items-center gap-2 ${bottomLiftClass}`}>
        {showMiniRadioBar &&
          musicSnapshot &&
          onToggleMiniRadioPlay &&
          onMiniRadioNext &&
          onCloseMiniRadio &&
          onOpenPhoneRadio && (
            <MiniMusicRadioBar
              snapshot={musicSnapshot}
              onTogglePlay={onToggleMiniRadioPlay}
              onNext={onMiniRadioNext}
              onStop={onCloseMiniRadio}
              onOpenApp={onOpenPhoneRadio}
            />
          )}

        {nearbyChatter && !isMinimal && !isPhone && (
          <div className="bg-[#14110f]/86 border border-white/12 rounded-xl px-3 py-1.5 text-[11px] sm:text-xs text-center max-w-md shadow-md">
            <span className="text-[#bfb7aa]">{nearbyChatter.speaker}: </span>
            <span className="font-semibold text-amber-300">“{nearbyChatter.dagbani}”</span>
            <span className="text-[#9c9487]"> — {nearbyChatter.english}</span>
          </div>
        )}

        {/* Service Ride Passenger Status Bar */}
        {isRidingService && activeService && (
          <div className="pointer-events-auto flex items-center gap-3 bg-[#121a22]/92 border border-sky-400/50 rounded-xl px-3.5 py-2 shadow-lg">
            <div className="text-xs text-[#d8e6f3] truncate max-w-[170px] sm:max-w-none">
              {activeService.providerName} → {activeService.destinationName}
            </div>
            <div className="font-mono-num text-sm font-bold text-sky-300 whitespace-nowrap">
              {speedKmh} km/h
            </div>
            {!touchVisible && (
              <button
                type="button"
                onClick={onToggleVehicle}
                className="text-xs font-medium bg-red-500/20 hover:bg-red-500/35 text-red-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Disembark ({keyHint(keyBindings.vehicleToggle)})
              </button>
            )}
          </div>
        )}

        {/* Driving Speedometer & Compact Radio Bar */}
        {isDriving && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-[#14110f]/90 border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-lg max-w-[92vw]">
            <div className="text-xs text-[#cfc8bc] truncate max-w-[120px] sm:max-w-none">
              {drivingLabel}
            </div>
            <div className="font-mono-num text-sm font-bold text-amber-400 whitespace-nowrap">
              {speedKmh} km/h
            </div>

            {musicSnapshot && (
              <div className="flex items-center gap-1 pl-2 border-l border-white/12">
                <button
                  type="button"
                  onClick={onToggleVehicleRadio ?? onToggleMiniRadioPlay}
                  title={musicSnapshot.isPlaying ? "Pause Radio" : "Play Radio"}
                  className={`min-h-[34px] px-2 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    musicSnapshot.isPlaying
                      ? "bg-amber-500 text-[#12100e]"
                      : "bg-white/10 hover:bg-white/20 text-[#f8f5ef]"
                  }`}
                >
                  {musicSnapshot.isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {musicSnapshot.isPlaying
                      ? musicSnapshot.mode === "radio"
                        ? musicSnapshot.currentStation.frequency
                        : "Playing"
                      : "Radio"}
                  </span>
                </button>
                {onToggleVehicleAudioSource && (
                  <button
                    type="button"
                    onClick={onToggleVehicleAudioSource}
                    title="Switch FM / Music"
                    className="min-h-[34px] px-2 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium text-[#ede8de] flex items-center gap-1 cursor-pointer"
                  >
                    {musicSnapshot.mode === "radio" ? (
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{musicSnapshot.mode === "radio" ? "FM" : "Mix"}</span>
                  </button>
                )}
                {onMiniRadioPrev && (
                  <button
                    type="button"
                    onClick={onMiniRadioPrev}
                    aria-label="Previous station or track"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-[#f8f5ef] cursor-pointer"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                )}
                {onMiniRadioNext && (
                  <button
                    type="button"
                    onClick={onMiniRadioNext}
                    aria-label="Next station or track"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-[#f8f5ef] cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {!touchVisible && (
              <>
                <button
                  type="button"
                  onClick={onTriggerHorn}
                  className="text-xs font-medium bg-white/10 hover:bg-white/20 text-[#f8f5ef] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Horn ({keyHint(keyBindings.horn)})
                </button>
                <button
                  type="button"
                  onClick={onToggleVehicle}
                  className="text-xs font-medium bg-red-500/20 hover:bg-red-500/35 text-red-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Exit ({keyHint(keyBindings.vehicleToggle)})
                </button>
              </>
            )}
          </div>
        )}

        {/* Single-Slot Contextual Hint Banner (Never Stacks, Adapts to Live Input) */}
        <ContextualHintBanner hint={compactHint} onDismissOnboarding={onDismissOnboarding} />
      </div>
    </div>
  );
};
