import React from "react";
import { LanguageMode } from "../types/game";

interface MainMenuProps {
  hasSavedGame: boolean;
  languageMode: LanguageMode;
  onChangeLanguageMode: (mode: LanguageMode) => void;
  onNewGame: () => void;
  onContinueGame: () => void;
  onOpenCustomize: () => void;
  onOpenLanguageGuide: () => void;
  onOpenReferences: () => void;
  onOpenEvents: () => void;
  onOpenContributions: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  hasSavedGame,
  languageMode,
  onChangeLanguageMode,
  onNewGame,
  onContinueGame,
  onOpenCustomize,
  onOpenLanguageGuide,
  onOpenReferences,
  onOpenEvents,
  onOpenContributions,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#12100e]/78 px-6">
      <div className="w-full max-w-2xl border border-white/15 bg-[#171411]/95 p-8 md:p-10 shadow-2xl rounded-xl">
        <div className="text-xs font-medium tracking-wider text-amber-400/90 mb-2">
          Northern Region, Ghana · Cultural Life Simulation
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#f8f5ef] mb-3">
          Tamale 3D
        </h1>
        <p className="text-sm md:text-base text-[#cfc8bc] leading-relaxed mb-7 max-w-xl">
          Explore 17 Tamale communities—from Naa Gbewaa Interchange, Central &amp; Aboabo Markets,
          Dakpema Palace, and Central Mosque out to Lamashegu, Kukuo, Tamale Teaching Hospital,
          Aliu Mahama Stadium, SCCA &amp; Red Clay, and Tamale International Airport.
        </p>

        {/* Language Mode Selector */}
        <div className="mb-7">
          <div className="text-xs font-medium text-[#b5ada0] mb-2">
            Conversation Language Mode
          </div>
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#0e0c0a] border border-white/10 rounded-lg">
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
                className={`px-3 py-2.5 rounded-md text-left transition-colors cursor-pointer ${
                  languageMode === opt.id
                    ? "bg-amber-600 text-[#12100e] font-semibold"
                    : "text-[#d4cdc2] hover:bg-white/5"
                }`}
              >
                <div className="text-sm whitespace-nowrap">{opt.label}</div>
                <div
                  className={`text-xs truncate ${
                    languageMode === opt.id ? "text-[#291b06]" : "text-[#8e8679]"
                  }`}
                >
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-7">
          {hasSavedGame && (
            <button
              type="button"
              onClick={onContinueGame}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Continue Game
            </button>
          )}
          <button
            type="button"
            onClick={onNewGame}
            className={`px-6 py-3 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              hasSavedGame
                ? "bg-[#26211c] hover:bg-[#322b25] text-[#f5f2eb] border border-white/15"
                : "bg-amber-500 hover:bg-amber-400 text-[#12100e]"
            }`}
          >
            {hasSavedGame ? "Start New Journey" : "Enter Tamale"}
          </button>
          <button
            type="button"
            onClick={onOpenCustomize}
            className="px-4 py-3 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Customize Character
          </button>
          <button
            type="button"
            onClick={onOpenLanguageGuide}
            className="px-4 py-3 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Dagbani Phrasebook
          </button>
          <button
            type="button"
            onClick={onOpenReferences}
            className="px-4 py-3 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tamale Photo Archive
          </button>
          <button
            type="button"
            onClick={onOpenEvents}
            className="px-4 py-3 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Events &amp; History
          </button>
          <button
            type="button"
            onClick={onOpenContributions}
            className="px-4 py-3 bg-[#211d18] hover:bg-[#2b2620] text-[#e8e2d7] border border-white/10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Community Portal
          </button>
        </div>

        {/* Concise Controls Reference */}
        <div className="pt-5 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#a39b8e]">
          <span>WASD / Arrows · Move</span>
          <span aria-hidden="true">·</span>
          <span>Shift · Run</span>
          <span aria-hidden="true">·</span>
          <span>Space · Jump</span>
          <span aria-hidden="true">·</span>
          <span>Drag Mouse · Look</span>
          <span aria-hidden="true">·</span>
          <span>E · Talk, Shop, Enter or Drive Pragya</span>
          <span aria-hidden="true">·</span>
          <span>M · Map</span>
        </div>
      </div>
    </div>
  );
};
