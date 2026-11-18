import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  MessageSquarePlus,
  Pause,
  Package,
  Tag,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  CameraMode,
  LanguageMode,
  NearbyChatter,
  NearbyInteractable,
  WeatherType,
} from "../types/game";

interface GameHudProps {
  district: string;
  formattedTime: string;
  timePeriodLabel: string;
  moneyCedis: number;
  energy: number;
  cultureXp: number;
  isDriving: boolean;
  drivingLabel: string | null;
  speedKmh: number;
  nearby: NearbyInteractable | null;
  nearbyChatter: NearbyChatter | null;
  activeErrandTitle: string | null;
  activeCityEventLabel: string;
  weather: WeatherType;
  cameraMode: CameraMode;
  languageMode: LanguageMode;
  audioEnabled: boolean;
  showLabels: boolean;
  onTriggerInteract: () => void;
  onExitVehicle: () => void;
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
  onChangeWeather: (w: WeatherType) => void;
  onChangeTimePreset: (minutes: number) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onChangeLanguageMode: (mode: LanguageMode) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  district,
  formattedTime,
  timePeriodLabel,
  moneyCedis,
  energy,
  cultureXp,
  isDriving,
  drivingLabel,
  speedKmh,
  nearby,
  nearbyChatter,
  activeErrandTitle,
  activeCityEventLabel,
  weather,
  cameraMode,
  languageMode,
  audioEnabled,
  showLabels,
  onTriggerInteract,
  onExitVehicle,
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
  onChangeWeather,
  onChangeTimePreset,
  onChangeCameraMode,
  onChangeLanguageMode,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Row: Minimal Corner Anchors Only */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Location, Clock, Wallet & Active Errand */}
        <div className="pointer-events-auto bg-[#14110f]/90 border border-white/12 rounded-lg px-4 py-2.5 max-w-md">
          <div className="font-display text-sm font-semibold text-[#f8f5ef] truncate">
            {district}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#cfc8bc] mt-0.5 font-mono-num">
            <span>{formattedTime}</span>
            <span aria-hidden="true">·</span>
            <span>{timePeriodLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300">{activeCityEventLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-medium">GH₵ {moneyCedis}</span>
            <span aria-hidden="true">·</span>
            <span>Energy {Math.round(energy)}%</span>
            <span aria-hidden="true">·</span>
            <span>Culture {cultureXp}</span>
          </div>
          {activeErrandTitle && (
            <div className="text-xs text-amber-300 mt-1.5 pt-1.5 border-t border-white/10 truncate">
              Errand: {activeErrandTitle}
            </div>
          )}
        </div>

        {/* Top-Right: Compact Single-Row Action Bar */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#14110f]/90 border border-white/12 rounded-lg p-1.5">
          <button
            type="button"
            onClick={onOpenMap}
            title="Tamale City Map (M)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={onOpenDagbaniGuide}
            title="Dagbani Phrasebook (L)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Dagbani</span>
          </button>
          <button
            type="button"
            onClick={onOpenInventory}
            title="Bag & Errands (I)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Bag</span>
          </button>
          <button
            type="button"
            onClick={onOpenCustomize}
            title="Wardrobe & Appearance"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Look</span>
          </button>
          <button
            type="button"
            onClick={onOpenReferences}
            title="Tamale Photo & GIS References"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Refs</span>
          </button>
          <button
            type="button"
            onClick={onOpenEvents}
            title="Tamale Cultural Events & History"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Events</span>
          </button>
          <button
            type="button"
            onClick={onOpenContributions}
            title="Community Knowledge & Photo Portal"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#ede8de] hover:bg-white/10 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Contribute</span>
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            title={audioEnabled ? "Mute Audio" : "Enable Audio"}
            className="p-1.5 text-[#ede8de] hover:bg-white/10 rounded transition-colors shrink-0 cursor-pointer"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[#8c8478]" />}
          </button>
          <button
            type="button"
            onClick={onOpenPause}
            title="Menu / Save (Esc)"
            className="p-1.5 text-[#ede8de] hover:bg-white/10 rounded transition-colors shrink-0 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Area: Street Chatter + Contextual Prompt + Collapsible Bottom Dock */}
      <div className="flex flex-col items-center gap-2.5">
        {/* Nearby Dagbani Street / Market Chatter Caption */}
        {nearbyChatter && (
          <div className="bg-[#14110f]/90 border border-white/12 rounded-lg px-3.5 py-1.5 text-xs text-center max-w-lg shadow-md">
            <span className="text-[#bfb7aa]">{nearbyChatter.speaker}: </span>
            <span className="font-semibold text-amber-300">“{nearbyChatter.dagbani}”</span>
            <span className="text-[#9c9487]"> — {nearbyChatter.english}</span>
          </div>
        )}

        {/* Contextual [E] Interaction Prompt */}
        {nearby && !isDriving && (
          <button
            type="button"
            onClick={onTriggerInteract}
            className="pointer-events-auto flex items-center gap-3 bg-[#171310]/95 hover:bg-[#221c17] border border-amber-500/50 rounded-lg px-4 py-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <span className="font-mono-num text-xs font-bold bg-amber-500 text-[#12100e] px-2 py-0.5 rounded">
              E
            </span>
            <div className="text-left">
              <div className="text-sm font-semibold text-[#f8f5ef] whitespace-nowrap">
                {nearby.label}
              </div>
              {nearby.sublabel && (
                <div className="text-xs text-[#bfb7aa] whitespace-nowrap">{nearby.sublabel}</div>
              )}
            </div>
          </button>
        )}

        {/* Driving Speedometer & Exit Prompt */}
        {isDriving && (
          <div className="pointer-events-auto flex items-center gap-4 bg-[#14110f]/95 border border-amber-500/40 rounded-lg px-4 py-2">
            <div className="text-xs text-[#cfc8bc]">{drivingLabel}</div>
            <div className="font-mono-num text-sm font-semibold text-amber-400">
              {speedKmh} km/h
            </div>
            <button
              type="button"
              onClick={onExitVehicle}
              className="text-xs font-medium bg-white/10 hover:bg-white/20 text-[#f8f5ef] px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              Exit (E)
            </button>
          </div>
        )}

        {/* Collapsible Bottom Control Dock */}
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#14110f]/90 border border-b-0 border-white/12 rounded-t-md text-[11px] font-medium text-[#cfc8bc] hover:text-white transition-colors cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="bg-[#14110f]/92 border border-white/12 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-w-[94vw]">
              {/* Language Switcher */}
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

              {/* Time of Day Presets */}
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

              {/* Weather Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#9c9487] mr-1">Weather</span>
                {(
                  [
                    { id: "clear", label: "Sun" },
                    { id: "harmattan", label: "Harmattan" },
                    { id: "rain", label: "Rain" },
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

              {/* Camera Mode */}
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

              <span className="text-white/15 hidden sm:inline">|</span>

              {/* Landmark & Building Labels Toggle */}
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
