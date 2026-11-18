import React from "react";
import { BookOpen, Save, X } from "lucide-react";
import { LandmarkData, LanguageMode } from "../types/game";

interface BuildingInteriorModalProps {
  landmark: LandmarkData;
  onClose: () => void;
  onOpenShop?: (shopId: string) => void;
  onOpenDagbaniGuide: () => void;
}

export const BuildingInteriorModal: React.FC<BuildingInteriorModalProps> = ({
  landmark,
  onClose,
  onOpenShop,
  onOpenDagbaniGuide,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-medium">
              {landmark.district} · {landmark.dagbaniLabel}
            </div>
            <h2 className="font-display text-xl font-bold text-[#f8f5ef]">
              {landmark.interiorTitle || landmark.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#dfd8cd] leading-relaxed">
            {landmark.interiorDescription}
          </p>
          <div className="text-xs text-[#9c9487] bg-[#201b17] border border-white/10 rounded-lg p-3">
            {landmark.authenticityNote}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {landmark.shopId && onOpenShop && (
              <button
                type="button"
                onClick={() => onOpenShop(landmark.shopId!)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {landmark.id === "cultural_centre" || landmark.id === "scca_red_clay"
                  ? "Visit Smock & Craft Guild"
                  : landmark.id === "kukuo_market_pottery"
                  ? "Browse Kukuo Pottery"
                  : landmark.id === "lamashegu_market_hub"
                  ? "Browse Parts & Kɔɔsɛ Stall"
                  : "Browse Market & Goods"}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenDagbaniGuide}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#26201b] hover:bg-[#322b24] text-[#f5f2eb] border border-white/10 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Study Cultural Vocabulary</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#cfc8bc] hover:text-white cursor-pointer"
            >
              Step Back Outside
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  languageMode: LanguageMode;
  showSubtitles: boolean;
  onChangeLanguageMode: (m: LanguageMode) => void;
  onToggleSubtitles: () => void;
  onSaveGame: () => void;
  onResume: () => void;
  onReturnMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  languageMode,
  showSubtitles,
  onChangeLanguageMode,
  onToggleSubtitles,
  onSaveGame,
  onResume,
  onReturnMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#171411] border border-white/15 rounded-xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#f8f5ef]">Game Menu</h2>
          <button
            type="button"
            onClick={onResume}
            className="p-1 text-[#bfb7aa] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-[#9c9487] mb-1.5">Language Mode</div>
            <div className="grid grid-cols-3 gap-1.5 bg-[#0e0c0a] p-1 rounded-lg border border-white/10">
              {(["dagbani", "mixed", "english"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeLanguageMode(m)}
                  className={`py-1.5 text-xs rounded capitalize cursor-pointer ${
                    languageMode === m
                      ? "bg-amber-500 text-[#12100e] font-semibold"
                      : "text-[#cfc8bc] hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleSubtitles}
            className="w-full py-2.5 px-4 bg-[#221d18] hover:bg-[#2c251f] border border-white/10 rounded-lg text-sm text-[#f5f2eb] flex items-center justify-between cursor-pointer"
          >
            <span>English Subtitles</span>
            <span className="text-amber-400 font-medium">{showSubtitles ? "On" : "Off"}</span>
          </button>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-lg cursor-pointer"
          >
            Resume Exploring
          </button>
          <button
            type="button"
            onClick={onSaveGame}
            className="w-full py-2.5 bg-[#241f1a] hover:bg-[#302922] text-[#f5f2eb] border border-white/10 font-medium text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Save Progress</span>
          </button>
          <button
            type="button"
            onClick={onReturnMainMenu}
            className="w-full py-2 text-xs text-[#9c9487] hover:text-white cursor-pointer"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};
