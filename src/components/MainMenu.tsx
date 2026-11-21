import React from "react";
import {
  BookOpen,
  Compass,
  Gamepad2,
  Info,
  Play,
  Power,
  RotateCcw,
  Settings,
  User,
} from "lucide-react";
import { LanguageMode } from "../types/game";
import { DeviceLayoutConfig } from "../utils/deviceProfile";

interface MainMenuProps {
  deviceLayout?: DeviceLayoutConfig;
  hasSavedGame: boolean;
  languageMode: LanguageMode;
  activeCharacterName?: string;
  activeCharacterOccupation?: string;
  activeCharacterMoney?: number;
  onChangeLanguageMode: (mode: LanguageMode) => void;
  onPlay: () => void;
  onContinueGame: () => void;
  onNewGame: () => void;
  onOpenCustomize: () => void;
  onOpenSettings: () => void;
  onOpenLanguageGuide: () => void;
  onOpenControls: () => void;
  onOpenAbout: () => void;
  onExit: () => void;
  onOpenReferences: () => void;
  onOpenEvents: () => void;
  onOpenContributions: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  deviceLayout,
  hasSavedGame,
  languageMode,
  activeCharacterName = "Yakubu Alhassan",
  activeCharacterOccupation = "Pragya Tricycle Operator",
  activeCharacterMoney = 220,
  onChangeLanguageMode,
  onPlay,
  onContinueGame,
  onNewGame,
  onOpenCustomize,
  onOpenSettings,
  onOpenLanguageGuide,
  onOpenControls,
  onOpenAbout,
  onExit,
  onOpenReferences,
  onOpenEvents,
  onOpenContributions,
}) => {
  const isPhone = deviceLayout?.isPhoneLayout ?? false;
  const isTablet = deviceLayout?.isTabletLayout ?? false;
  const isLandscapePhone = isPhone && deviceLayout?.orientation === "landscape";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#12100e]/78 p-2.5 sm:p-6">
      <div
        className={`w-full ${
          isTablet ? "max-w-3xl p-6 sm:p-8" : isPhone ? "max-w-xl p-4 sm:p-6" : "max-w-2xl p-6 sm:p-8"
        } max-h-[94dvh] overflow-y-auto border border-white/15 bg-[#171411]/95 shadow-2xl rounded-2xl`}
      >
        <div className="text-[11px] sm:text-xs font-medium tracking-wider text-amber-400/90 mb-1">
          Northern Region, Ghana · Cultural Life Simulation
        </div>
        <h1
          className={`font-display font-bold tracking-tight text-[#f8f5ef] mb-2 ${
            isPhone ? "text-2xl sm:text-4xl" : "text-4xl sm:text-5xl"
          }`}
        >
          Tamale 3D
        </h1>
        <p className="text-xs sm:text-sm text-[#cfc8bc] leading-relaxed mb-4 max-w-xl">
          Explore 17 Tamale communities—from Naa Gbewaa Interchange, Central &amp; Aboabo Markets,
          Dakpema Palace, and Central Mosque out to Lamashegu, Kukuo, Tamale Teaching Hospital,
          Aliu Mahama Stadium, SCCA &amp; Red Clay, and Tamale International Airport.
        </p>

        {/* Active Resident Strip */}
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#120f0d] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[#e8e2d7]">
            <span className="text-[#9c9487]">Resident: </span>
            <span className="font-semibold text-amber-300">{activeCharacterName}</span>
            <span className="text-[#9c9487]"> · {activeCharacterOccupation}</span>
          </div>
          <div className="font-mono-num font-bold text-amber-400">GH₵ {activeCharacterMoney}</div>
        </div>

        {/* Primary Play Actions */}
        <div
          className={`grid gap-2.5 mb-4 ${
            isLandscapePhone ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
          <button
            type="button"
            onClick={onPlay}
            className="min-h-[48px] px-5 py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-[#12100e] font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY</span>
          </button>

          <button
            type="button"
            onClick={onContinueGame}
            className={`min-h-[48px] px-4 py-3 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer border ${
              hasSavedGame
                ? "bg-[#28221b] hover:bg-[#352d24] text-[#f8f5ef] border-amber-500/40"
                : "bg-[#1e1a16] hover:bg-[#27221d] text-[#a8a092] border-white/10"
            }`}
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>CONTINUE</span>
          </button>

          <button
            type="button"
            onClick={onNewGame}
            className="min-h-[48px] px-4 py-3 bg-[#241f1a] hover:bg-[#302922] text-[#f5f2eb] border border-white/15 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>NEW GAME</span>
          </button>
        </div>

        {/* Core Menu Actions Grid */}
        <div
          className={`grid gap-2 sm:gap-2.5 mb-4 ${
            isLandscapePhone ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          <button
            type="button"
            onClick={onOpenCustomize}
            className="min-h-[46px] px-3 py-2.5 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SELECT CHARACTER</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[46px] px-3 py-2.5 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SETTINGS</span>
          </button>

          <button
            type="button"
            onClick={onOpenLanguageGuide}
            className="min-h-[46px] px-3 py-2.5 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span>LANGUAGE</span>
          </button>

          <button
            type="button"
            onClick={onOpenControls}
            className="min-h-[46px] px-3 py-2.5 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>CONTROLS</span>
          </button>

          <button
            type="button"
            onClick={onOpenAbout}
            className="min-h-[46px] px-3 py-2.5 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ABOUT TAMALE</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="min-h-[46px] px-3 py-2.5 bg-[#211816] hover:bg-red-950/60 text-[#f1d8d4] border border-red-400/20 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Power className="w-4 h-4 text-red-400 shrink-0" />
            <span>EXIT</span>
          </button>
        </div>

        {/* Conversation Language Mode Quick Switcher */}
        <div className="mb-4">
          <div className="text-[11px] font-medium text-[#b5ada0] mb-1.5">
            Conversation Language Mode
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0e0c0a] border border-white/10 rounded-xl">
            {(
              [
                { id: "dagbani", label: "Dagbani", desc: "Dagbani + Subtitles" },
                { id: "mixed", label: "Mixed", desc: "Everyday Tamale" },
                { id: "english", label: "English", desc: "English + Terms" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeLanguageMode(opt.id)}
                className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  languageMode === opt.id
                    ? "bg-amber-600 text-[#12100e] font-semibold"
                    : "text-[#d4cdc2] hover:bg-white/5"
                }`}
              >
                <div className="text-xs sm:text-sm whitespace-nowrap">{opt.label}</div>
                <div
                  className={`text-[10px] truncate ${
                    languageMode === opt.id ? "text-[#291b06]" : "text-[#8e8679]"
                  }`}
                >
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cultural Archives & Community Links */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenReferences}
              className="min-h-[40px] px-3 py-1.5 bg-[#1d1915] hover:bg-white/10 border border-white/10 rounded-lg text-[#cfc8bc] hover:text-white whitespace-nowrap cursor-pointer"
            >
              Tamale Photo Archive
            </button>
            <button
              type="button"
              onClick={onOpenEvents}
              className="min-h-[40px] px-3 py-1.5 bg-[#1d1915] hover:bg-white/10 border border-white/10 rounded-lg text-[#cfc8bc] hover:text-white whitespace-nowrap cursor-pointer"
            >
              Events &amp; History
            </button>
            <button
              type="button"
              onClick={onOpenContributions}
              className="min-h-[40px] px-3 py-1.5 bg-[#1d1915] hover:bg-white/10 border border-white/10 rounded-lg text-[#cfc8bc] hover:text-white whitespace-nowrap cursor-pointer"
            >
              Community Portal
            </button>
          </div>
          <span className="text-[11px] text-[#8e8679]">
            {deviceLayout
              ? `${deviceLayout.deviceLabel} · ${deviceLayout.orientation}`
              : "Touchscreen & Desktop Supported"}
          </span>
        </div>
      </div>
    </div>
  );
};
