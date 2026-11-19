import React, { useEffect, useState } from "react";
import { RotateCcw, Sliders, Smartphone, Keyboard, X } from "lucide-react";
import {
  ControlDisplayMode,
  DEFAULT_KEY_BINDINGS,
  GameSettings,
  GraphicsQuality,
  KeyBindings,
  LanguageMode,
} from "../types/game";

interface SettingsAndControlsModalProps {
  initialTab?: "settings" | "controls";
  settings: GameSettings;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetKeyBindings: () => void;
  onClose: () => void;
}

const KEY_ACTION_LABELS: Array<{ key: keyof KeyBindings; label: string }> = [
  { key: "forward", label: "Move Forward / Accelerate" },
  { key: "backward", label: "Move Backward / Brake-Reverse" },
  { key: "left", label: "Move Left / Steer Left" },
  { key: "right", label: "Move Right / Steer Right" },
  { key: "jump", label: "Jump / Handbrake" },
  { key: "run", label: "Run / Sprint" },
  { key: "interact", label: "Interact (Talk / Shop / Enter)" },
  { key: "vehicleToggle", label: "Enter / Exit Vehicle" },
  { key: "horn", label: "Vehicle Horn" },
  { key: "map", label: "Open City Map" },
  { key: "inventory", label: "Open Bag & Errands" },
  { key: "pause", label: "Pause / Game Menu" },
];

function formatKeyCode(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Space") return "Space";
  if (code === "Escape") return "Esc";
  return code;
}

export const SettingsAndControlsModal: React.FC<SettingsAndControlsModalProps> = ({
  initialTab = "settings",
  settings,
  onUpdateSettings,
  onResetKeyBindings,
  onClose,
}) => {
  const [tab, setTab] = useState<"settings" | "controls">(initialTab);
  const [listeningAction, setListeningAction] = useState<keyof KeyBindings | null>(null);

  useEffect(() => {
    if (!listeningAction) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next: KeyBindings = {
        ...settings.keyBindings,
        [listeningAction]: e.code,
      };
      onUpdateSettings({ keyBindings: next });
      setListeningAction(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [listeningAction, onUpdateSettings, settings.keyBindings]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[92dvh] bg-[#171411] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("settings")}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                tab === "settings"
                  ? "bg-amber-500 text-[#12100e]"
                  : "bg-[#221d18] text-[#dfd8cd] hover:bg-white/10"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("controls")}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                tab === "controls"
                  ? "bg-amber-500 text-[#12100e]"
                  : "bg-[#221d18] text-[#dfd8cd] hover:bg-white/10"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Controls &amp; Keys</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === "settings" ? (
            <>
              {/* Graphics Quality */}
              <div>
                <div className="text-xs font-semibold text-[#ede8de] mb-2">
                  Graphics Quality (Mobile &amp; Desktop Performance)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "low", label: "Low", note: "Max FPS · No Shadows" },
                      { id: "medium", label: "Medium", note: "Balanced Mobile/Laptop" },
                      { id: "high", label: "High", note: "Full Shadows & Draw" },
                    ] as Array<{ id: GraphicsQuality; label: string; note: string }>
                  ).map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onUpdateSettings({ graphicsQuality: q.id })}
                      className={`min-h-[48px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        settings.graphicsQuality === q.id
                          ? "bg-amber-500 text-[#12100e] border-amber-300 font-semibold"
                          : "bg-[#211c17] text-[#e5dfd5] border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-xs sm:text-sm whitespace-nowrap">{q.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          settings.graphicsQuality === q.id ? "text-[#2b1d07]" : "text-[#9c9487]"
                        }`}
                      >
                        {q.note}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Scale & Camera Sensitivity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#201b17] border border-white/10 rounded-xl p-3.5">
                  <div className="flex justify-between text-xs font-medium text-[#ede8de] mb-2">
                    <span>Render Resolution</span>
                    <span className="font-mono-num text-amber-400">
                      {Math.round(settings.resolutionScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.0}
                    step={0.05}
                    value={settings.resolutionScale}
                    onChange={(e) =>
                      onUpdateSettings({ resolutionScale: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="bg-[#201b17] border border-white/10 rounded-xl p-3.5">
                  <div className="flex justify-between text-xs font-medium text-[#ede8de] mb-2">
                    <span>Camera Sensitivity</span>
                    <span className="font-mono-num text-amber-400">
                      {settings.cameraSensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.1}
                    value={settings.cameraSensitivity}
                    onChange={(e) =>
                      onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Audio & Volume */}
              <div className="bg-[#201b17] border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-[#f5f2eb]">
                      City Audio &amp; Dagbani Voices
                    </div>
                    <div className="text-[11px] text-[#9c9487]">
                      Market chatter, traffic horns, spatial ambience &amp; speech
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
                    className={`min-h-[44px] min-w-[76px] px-4 rounded-lg text-xs font-semibold cursor-pointer ${
                      settings.audioEnabled
                        ? "bg-amber-500 text-[#12100e]"
                        : "bg-[#14110f] text-[#bfb7aa] border border-white/15"
                    }`}
                  >
                    {settings.audioEnabled ? "On" : "Muted"}
                  </button>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-[#cfc8bc] mb-1">
                    <span>Master Volume</span>
                    <span className="font-mono-num text-amber-400">
                      {Math.round(settings.soundVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.soundVolume}
                    onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Touch Controls & Vibration */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#ede8de]">
                  Touchscreen &amp; Mobile Controls
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "auto", label: "Auto-Detect" },
                      { id: "touch", label: "Always On" },
                      { id: "keyboard", label: "Off (Desktop)" },
                    ] as Array<{ id: ControlDisplayMode; label: string }>
                  ).map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => onUpdateSettings({ controlMode: cm.id })}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap cursor-pointer ${
                        settings.controlMode === cm.id
                          ? "bg-amber-500 text-[#12100e] border-amber-300 font-semibold"
                          : "bg-[#211c17] text-[#e5dfd5] border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
                    className="min-h-[46px] px-4 py-2 bg-[#201b17] hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between text-xs sm:text-sm cursor-pointer"
                  >
                    <span>Touch Vibration Feedback</span>
                    <span className="text-amber-400 font-semibold">
                      {settings.vibrationEnabled ? "On" : "Off"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ showSubtitles: !settings.showSubtitles })}
                    className="min-h-[46px] px-4 py-2 bg-[#201b17] hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between text-xs sm:text-sm cursor-pointer"
                  >
                    <span>English Subtitles</span>
                    <span className="text-amber-400 font-semibold">
                      {settings.showSubtitles ? "On" : "Off"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Conversation Language Mode */}
              <div>
                <div className="text-xs font-semibold text-[#ede8de] mb-2">
                  Conversation Language Mode
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["dagbani", "mixed", "english"] as LanguageMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onUpdateSettings({ languageMode: m })}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm capitalize whitespace-nowrap cursor-pointer ${
                        settings.languageMode === m
                          ? "bg-amber-500 text-[#12100e] border-amber-300 font-semibold"
                          : "bg-[#211c17] text-[#e5dfd5] border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {/* Mobile Touch Layout Overview */}
              <div className="bg-[#201b17] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400">
                  <Smartphone className="w-4 h-4" />
                  <span>Touchscreen Controls (Smartphones &amp; Tablets)</span>
                </div>
                <ul className="text-xs text-[#cfc8bc] space-y-1.5 leading-relaxed">
                  <li>
                    <strong className="text-[#f8f5ef]">Left Thumb:</strong> Smooth virtual joystick
                    for walking/running on foot, or steering slider while driving a Pragya or
                    motorcycle.
                  </li>
                  <li>
                    <strong className="text-[#f8f5ef]">Right Thumb Drag:</strong> Drag anywhere on
                    the right half of the screen to rotate the camera while moving simultaneously.
                    Pinch with two fingers to zoom.
                  </li>
                  <li>
                    <strong className="text-[#f8f5ef]">Right Action Buttons:</strong> Jump &amp;
                    Run on foot, plus contextual TALK, INTERACT, ENTER, and ENTER VEHICLE buttons.
                    Switches automatically to GAS, BRAKE / REV, HORN, and EXIT inside vehicles.
                  </li>
                </ul>
              </div>

              {/* Desktop Custom Key Bindings */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-[#f8f5ef]">
                      Desktop Keyboard Controls (Click any key to rebind)
                    </div>
                    <div className="text-[11px] text-[#9c9487]">
                      Drag mouse to rotate camera · Scroll wheel to zoom
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setListeningAction(null);
                      onResetKeyBindings();
                    }}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#241f1a] hover:bg-white/10 border border-white/10 text-xs text-[#e5dfd5] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {KEY_ACTION_LABELS.map(({ key, label }) => {
                    const isListening = listeningAction === key;
                    const code = settings.keyBindings[key] || DEFAULT_KEY_BINDINGS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setListeningAction(isListening ? null : key)}
                        className={`min-h-[46px] px-3.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                          isListening
                            ? "bg-amber-500/20 border-amber-400 text-amber-200"
                            : "bg-[#201b17] border-white/10 hover:bg-white/5 text-[#e5dfd5]"
                        }`}
                      >
                        <span className="text-xs truncate">{label}</span>
                        <span className="font-mono-num text-xs font-semibold px-2.5 py-1 rounded bg-[#12100e] border border-white/15 text-amber-400 whitespace-nowrap shrink-0">
                          {isListening ? "Press key..." : formatKeyCode(code)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
