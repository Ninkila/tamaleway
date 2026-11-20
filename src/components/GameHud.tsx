import React, { useState } from "react";
import {
  Bike,
  BookOpen,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  DoorOpen,
  Map as MapIcon,
  Maximize2,
  MessageSquarePlus,
  MoreHorizontal,
  Package,
  Pause,
  Radio,
  Smartphone,
  Tag,
  User,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { MusicPlayerSnapshot } from "../game/musicPlayer";
import {
  ActiveTaskRuntime,
  CameraMode,
  KeyBindings,
  LanguageMode,
  NearbyChatter,
  NearbyInteractable,
  ServiceRequestRuntime,
  WeatherType,
} from "../types/game";
import { MiniMusicRadioBar } from "./MusicRadioApp";

interface GameHudProps {
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
  isTouchControlsVisible: boolean;
  isPortraitPhone: boolean;
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

function keyHint(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code === "Space") return "Space";
  return code;
}

export const GameHud: React.FC<GameHudProps> = ({
  district,
  formattedTime,
  timePeriodLabel,
  moneyCedis,
  energy,
  cultureXp,
  activeCharacterName,
  activeCareerTitle,
  isDriving,
  isRidingService = false,
  drivingLabel,
  speedKmh,
  nearby,
  nearbyVehicle,
  nearbyChatter,
  nearestGuidance,
  activeErrandTitle,
  activeGigTitle = null,
  activeTask = null,
  activeService = null,
  activeCityEventLabel,
  weather,
  cameraMode,
  languageMode,
  audioEnabled,
  showLabels,
  isTouchControlsVisible,
  isPortraitPhone,
  isIndoors = false,
  musicSnapshot = null,
  showMiniRadioBar = false,
  keyBindings,
  onTriggerInteract,
  onExitInterior,
  onToggleVehicle,
  onTriggerHorn,
  onOpenPhone,
  onOpenPhoneRadio,
  onToggleMiniRadioPlay,
  onMiniRadioNext,
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
  const [dockCollapsed, setDockCollapsed] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [dismissPortraitTip, setDismissPortraitTip] = useState(false);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
      {/* Top Row: Compact Responsive Corner Anchors */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left: Location, Character, Clock, Wallet & GPS Guidance */}
        <div className="pointer-events-auto bg-[#14110f]/94 border border-white/12 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 max-w-[58vw] sm:max-w-md shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-xs sm:text-sm font-semibold text-[#f8f5ef] truncate">
              {district}
            </span>
          </div>
          {activeCharacterName && (
            <div className="text-[11px] text-amber-300/95 truncate mt-0.5">
              {activeCharacterName}
              {activeCareerTitle ? ` · ${activeCareerTitle}` : ""}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-[#cfc8bc] mt-0.5 font-mono-num">
            <span>{formattedTime}</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline">{timePeriodLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold">GH₵ {moneyCedis}</span>
            <span aria-hidden="true">·</span>
            <span>E {Math.round(energy)}%</span>
            <span className="hidden md:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden md:inline text-amber-300">{activeCityEventLabel}</span>
            <span className="hidden lg:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden lg:inline">XP {cultureXp}</span>
          </div>
          {nearestGuidance && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#b5ada0] mt-1 truncate">
              <Compass className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">
                {nearestGuidance.isErrandTarget ? "Target: " : "Nearest: "}
                {nearestGuidance.name} · {nearestGuidance.distanceMeters}m{" "}
                {nearestGuidance.bearingLabel}
              </span>
            </div>
          )}
          {activeTask && (
            <div className="text-[11px] text-emerald-300 mt-1 pt-1 border-t border-white/10 truncate">
              Task ({activeTask.stage === "go_to_pickup" ? "Pickup" : "Target"}):{" "}
              {activeTask.job.title}
            </div>
          )}
          {activeErrandTitle && !activeTask && (
            <div className="text-[11px] text-amber-300 mt-1 pt-1 border-t border-white/10 truncate">
              Errand: {activeErrandTitle}
            </div>
          )}
          {activeGigTitle && !activeTask && (
            <div className="text-[11px] text-emerald-300 mt-1 pt-1 border-t border-white/10 truncate">
              Gig: {activeGigTitle}
            </div>
          )}
          {activeService && activeService.status !== "completed" && activeService.status !== "cancelled" && (
            <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-sky-300">
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
              className="mt-1.5 min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/45 text-xs font-semibold text-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Step Outside</span>
            </button>
          )}
        </div>

        {/* Top-Right: Responsive Single-Row Action Bar */}
        <div className="pointer-events-auto relative flex items-center gap-1 bg-[#14110f]/94 border border-white/12 rounded-xl p-1 shadow-lg">
          {onOpenPhone && (
            <button
              type="button"
              onClick={onOpenPhone}
              title="Tamale Phone: Jobs, Rides, Bank & Music (P)"
              className="min-h-[40px] sm:min-h-[34px] flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#12100e] bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">Phone</span>
            </button>
          )}

          {onOpenPhoneRadio && (
            <button
              type="button"
              onClick={onOpenPhoneRadio}
              title="Tamale Music & 7 FM Radio Stations"
              className="hidden sm:flex min-h-[34px] items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Radio</span>
            </button>
          )}

          {onOpenCharacterSwitch && (
            <button
              type="button"
              onClick={onOpenCharacterSwitch}
              title="Switch Playable Character (C)"
              className="hidden sm:flex min-h-[34px] items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Switch</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenMap}
            title="Tamale City Map (M)"
            className="min-h-[40px] sm:min-h-[34px] flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Map</span>
          </button>

          <button
            type="button"
            onClick={onOpenInventory}
            title="Bag & Errands (I)"
            className="min-h-[40px] sm:min-h-[34px] flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Package className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Bag</span>
          </button>

          {/* Desktop Extended Toolbar */}
          <button
            type="button"
            onClick={onOpenDagbaniGuide}
            title="Dagbani Phrasebook (L)"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Dagbani</span>
          </button>
          <button
            type="button"
            onClick={onOpenCustomize}
            title="Wardrobe & Appearance"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Look</span>
          </button>
          <button
            type="button"
            onClick={onOpenReferences}
            title="Tamale Photo & GIS References"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Refs</span>
          </button>
          <button
            type="button"
            onClick={onOpenEvents}
            title="Tamale Cultural Events & History"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Events</span>
          </button>
          <button
            type="button"
            onClick={onOpenContributions}
            title="Community Knowledge & Photo Portal"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Contribute</span>
          </button>

          {/* Mobile/Compact Overflow Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileMoreOpen((o) => !o)}
            title="More city tools"
            className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center text-[#ede8de] hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            title={audioEnabled ? "Mute Audio" : "Enable Audio"}
            className="min-h-[40px] min-w-[40px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#8c8478]" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen"
            className="hidden sm:flex min-h-[34px] min-w-[34px] items-center justify-center text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenPause}
            title="Menu / Save (Esc)"
            className="min-h-[40px] min-w-[40px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center text-[#ede8de] hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>

          {mobileMoreOpen && (
            <div className="lg:hidden absolute right-0 top-full mt-2 w-52 bg-[#171411]/98 border border-white/15 rounded-xl p-1.5 shadow-2xl space-y-1 z-30">
              {onOpenCharacterSwitch && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    onOpenCharacterSwitch();
                  }}
                  className="w-full min-h-[42px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch Character</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  onOpenDagbaniGuide();
                }}
                className="w-full min-h-[42px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Dagbani Phrasebook</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  onOpenCustomize();
                }}
                className="w-full min-h-[42px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Customize Wardrobe</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  onOpenReferences();
                }}
                className="w-full min-h-[40px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Photo References</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  onOpenEvents();
                }}
                className="w-full min-h-[40px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Events &amp; History</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  onOpenContributions();
                }}
                className="w-full min-h-[40px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Community Portal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  onToggleFullscreen();
                }}
                className="w-full min-h-[40px] px-3 py-1.5 text-left text-xs text-[#f5f2eb] hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Fullscreen</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Non-blocking Portrait Smartphone Orientation Hint */}
      {isPortraitPhone && !dismissPortraitTip && (
        <div className="pointer-events-auto self-center bg-[#171411]/92 border border-amber-500/40 rounded-lg px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2 shadow-lg">
          <span>Rotate to landscape for wider Tamale driving &amp; touch controls</span>
          <button
            type="button"
            onClick={() => setDismissPortraitTip(true)}
            className="text-xs font-bold text-amber-400 px-1.5 py-0.5 cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* Bottom Area: Mini Radio + Street Chatter + Contextual Prompts + Collapsible Dock */}
      <div
        className={`flex flex-col items-center gap-2 ${
          isTouchControlsVisible ? "mb-32 sm:mb-36 md:mb-4" : ""
        }`}
      >
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

        {/* Nearby Dagbani Street / Market Chatter Caption */}
        {nearbyChatter && (
          <div className="bg-[#14110f]/88 border border-white/12 rounded-lg px-3 py-1.5 text-[11px] sm:text-xs text-center max-w-md shadow-md">
            <span className="text-[#bfb7aa]">{nearbyChatter.speaker}: </span>
            <span className="font-semibold text-amber-300">“{nearbyChatter.dagbani}”</span>
            <span className="text-[#9c9487]"> — {nearbyChatter.english}</span>
          </div>
        )}

        {/* Desktop Contextual Prompts (On mobile touch mode, MobileTouchControls renders dedicated right-thumb buttons) */}
        {!isTouchControlsVisible &&
          ((!isDriving && (nearby || nearbyVehicle)) ||
            (isDriving && (nearby?.kind === "delivery" || nearby?.kind === "job_action"))) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {nearby && (
                <button
                  type="button"
                  onClick={onTriggerInteract}
                  className="pointer-events-auto flex items-center gap-2.5 bg-[#171310]/95 hover:bg-[#221c17] border border-amber-500/50 rounded-xl px-4 py-2 shadow-lg transition-colors cursor-pointer"
                >
                  <span className="font-mono-num text-xs font-bold bg-amber-500 text-[#12100e] px-2 py-0.5 rounded">
                    {keyHint(keyBindings.interact)}
                  </span>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-semibold text-[#f8f5ef] whitespace-nowrap">
                      {nearby.label}
                    </div>
                    {nearby.sublabel && (
                      <div className="text-[11px] text-[#bfb7aa] whitespace-nowrap">
                        {nearby.sublabel}
                      </div>
                    )}
                  </div>
                </button>
              )}

              {!isDriving && nearbyVehicle && (
                <button
                  type="button"
                  onClick={onToggleVehicle}
                  className="pointer-events-auto flex items-center gap-2.5 bg-[#142018]/95 hover:bg-[#1c2e22] border border-emerald-500/50 rounded-xl px-4 py-2 shadow-lg transition-colors cursor-pointer"
                >
                  <span className="font-mono-num text-xs font-bold bg-emerald-500 text-[#071c0e] px-2 py-0.5 rounded">
                    {keyHint(keyBindings.vehicleToggle)}
                  </span>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-semibold text-[#f8f5ef] whitespace-nowrap flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{nearbyVehicle.label}</span>
                    </div>
                    {nearbyVehicle.sublabel && (
                      <div className="text-[11px] text-[#b8d4c2] whitespace-nowrap">
                        {nearbyVehicle.sublabel}
                      </div>
                    )}
                  </div>
                </button>
              )}
            </div>
          )}

        {/* Service Ride Passenger Status Bar */}
        {isRidingService && activeService && (
          <div className="pointer-events-auto flex items-center gap-3 bg-[#121a22]/94 border border-sky-400/50 rounded-xl px-3.5 py-2 shadow-lg">
            <div className="text-xs text-[#d8e6f3] truncate max-w-[180px] sm:max-w-none">
              Passenger on {activeService.providerName} → {activeService.destinationName}
            </div>
            <div className="font-mono-num text-sm font-bold text-sky-300 whitespace-nowrap">
              {speedKmh} km/h
            </div>
            {!isTouchControlsVisible && (
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

        {/* Driving Speedometer & Desktop/Touch Vehicle Info */}
        {isDriving && (
          <div className="pointer-events-auto flex items-center gap-3 bg-[#14110f]/92 border border-amber-500/40 rounded-xl px-3.5 py-2 shadow-lg">
            <div className="text-xs text-[#cfc8bc] truncate max-w-[140px] sm:max-w-none">
              {drivingLabel}
            </div>
            <div className="font-mono-num text-sm font-bold text-amber-400 whitespace-nowrap">
              {speedKmh} km/h
            </div>
            {!isTouchControlsVisible && (
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

        {/* Collapsible Bottom Control Dock (Hidden or tucked compactly on touchscreens unless expanded) */}
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#14110f]/88 border border-b-0 border-white/12 rounded-t-lg text-[11px] font-medium text-[#cfc8bc] hover:text-white transition-colors cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Environment</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Bar</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="bg-[#14110f]/92 border border-white/12 rounded-xl px-3 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 max-w-[94vw]">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#9c9487] mr-1">Language</span>
                {(["dagbani", "mixed", "english"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChangeLanguageMode(m)}
                    className={`px-2 py-1 text-xs rounded capitalize transition-colors whitespace-nowrap cursor-pointer ${
                      languageMode === m
                        ? "bg-amber-500 text-[#12100e] font-semibold"
                        : "text-[#d4cdc2] hover:bg-white/10"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <span className="text-white/15 hidden sm:inline">|</span>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#9c9487] mr-1">Time</span>
                {[
                  { label: "Morning", mins: 8 * 60 },
                  { label: "Noon", mins: 13 * 60 },
                  { label: "Dusk", mins: 17 * 60 + 45 },
                  { label: "Night", mins: 21 * 60 },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => onChangeTimePreset(t.mins)}
                    className="px-2 py-1 text-xs text-[#d4cdc2] hover:bg-white/10 rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <span className="text-white/15 hidden sm:inline">|</span>

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-[#9c9487] mr-1">Weather</span>
                {(
                  [
                    { id: "clear", label: "Sun" },
                    { id: "cloudy", label: "Cloudy" },
                    { id: "heat", label: "Heat" },
                    { id: "harmattan", label: "Harmattan" },
                    { id: "light_rain", label: "Drizzle" },
                    { id: "rain", label: "Rain" },
                    { id: "thunderstorm", label: "Storm" },
                  ] as const
                ).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onChangeWeather(w.id)}
                    className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                      weather === w.id
                        ? "bg-white/20 text-white font-semibold"
                        : "text-[#d4cdc2] hover:bg-white/10"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <span className="text-white/15 hidden sm:inline">|</span>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#9c9487] mr-1">Camera</span>
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
                    className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                      cameraMode === c.id
                        ? "bg-white/20 text-white font-semibold"
                        : "text-[#d4cdc2] hover:bg-white/10"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onToggleLabels}
                title="Toggle 3D Landmark & Building Labels"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                  showLabels
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 font-semibold"
                    : "text-[#d4cdc2] hover:bg-white/10"
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>Labels {showLabels ? "On" : "Off"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
