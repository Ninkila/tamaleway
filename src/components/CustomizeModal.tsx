import React, { useState } from "react";
import { X } from "lucide-react";
import {
  HairstyleOption,
  HeadwearStyle,
  OutfitStyle,
  PlayerCustomization,
} from "../types/game";

interface CustomizeModalProps {
  customization: PlayerCustomization;
  onApply: (cust: PlayerCustomization) => void;
  onClose: () => void;
}

const OUTFITS: Array<{ id: OutfitStyle; label: string; desc: string }> = [
  { id: "batakari", label: "Batakari Smock", desc: "Handwoven Northern fugu" },
  { id: "kaba", label: "Kaba & Wrap", desc: "Traditional print attire" },
  { id: "polo", label: "Tamale Polo", desc: "Smart everyday shirt" },
  { id: "casual", label: "Everyday Tee", desc: "Relaxed street wear" },
  { id: "workwear", label: "Workwear Jacket", desc: "Rider & workshop utility" },
  { id: "formal", label: "Formal Suit & Tie", desc: "Office & palace occasions" },
  { id: "sportswear", label: "Athletic Tracksuit", desc: "Stadium fitness & sport" },
  { id: "nightlife", label: "Evening Lounge Wear", desc: "Evening social & Jubilee spots" },
];

const HEADWEAR: Array<{ id: HeadwearStyle; label: string }> = [
  { id: "none", label: "No Cap (Show Hair)" },
  { id: "kufi", label: "Zanna / Kufi Cap" },
  { id: "headwrap", label: "Traditional Headwrap" },
  { id: "braids", label: "Braided Hair" },
];

const HAIRSTYLES: Array<{ id: HairstyleOption; label: string }> = [
  { id: "natural", label: "Natural Crop" },
  { id: "low_fade", label: "Low Fade" },
  { id: "waves", label: "360 Waves" },
  { id: "afro_trim", label: "Afro Trim" },
  { id: "braided_crown", label: "Braided Crown" },
];

const FABRIC_COLORS = [
  { name: "Indigo Blue", hex: "#1e3a5f" },
  { name: "Savannah Ochre", hex: "#b45309" },
  { name: "Forest Green", hex: "#166534" },
  { name: "Dagbon Ivory", hex: "#e7e5e4" },
  { name: "Kola Crimson", hex: "#991b1b" },
];

const SKIN_TONES = [
  { name: "Deep Ebony", hex: "#4a2a18" },
  { name: "Rich Umber", hex: "#62381f" },
  { name: "Warm Chestnut", hex: "#7c4a2a" },
  { name: "Golden Bronze", hex: "#945b35" },
];

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  customization,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState<PlayerCustomization>(customization);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">
              Character Customisation &amp; Tamale Wardrobe
            </h2>
            <div className="text-xs text-[#b5ada0]">
              Changes update your 3D character immediately
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-[#b5ada0] mb-1.5">
              Resident Name
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={24}
              className="w-full bg-[#0e0c0a] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-[#b5ada0] mb-2">Clothing Style</div>
            <div className="grid grid-cols-2 gap-2">
              {OUTFITS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, outfit: o.id })}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    draft.outfit === o.id
                      ? "bg-amber-500/20 border-amber-500 text-[#f8f5ef]"
                      : "bg-[#201b17] border-white/10 text-[#cfc8bc] hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{o.label}</div>
                  <div className="text-xs text-[#9c9487]">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#b5ada0] mb-2">Headwear</div>
            <div className="grid grid-cols-2 gap-2">
              {HEADWEAR.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, headwear: h.id })}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors cursor-pointer ${
                    draft.headwear === h.id
                      ? "bg-amber-500/20 border-amber-500 text-[#f8f5ef]"
                      : "bg-[#201b17] border-white/10 text-[#cfc8bc] hover:border-white/25"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#b5ada0] mb-2">
              Hairstyle (visible when No Cap is chosen)
            </div>
            <div className="flex flex-wrap gap-2">
              {HAIRSTYLES.map((hs) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, hairstyle: hs.id, headwear: "none" })}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    (draft.hairstyle ?? "natural") === hs.id && draft.headwear === "none"
                      ? "bg-amber-500/20 border-amber-500 text-[#f8f5ef]"
                      : "bg-[#201b17] border-white/10 text-[#cfc8bc] hover:border-white/25"
                  }`}
                >
                  {hs.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-[#b5ada0] mb-2">Fabric Primary</div>
              <div className="flex flex-wrap gap-2">
                {FABRIC_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setDraft({ ...draft, primaryColor: c.hex })}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      draft.primaryColor === c.hex ? "border-amber-400 scale-110" : "border-white/20"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-[#b5ada0] mb-2">Accent / Cap Color</div>
              <div className="flex flex-wrap gap-2">
                {FABRIC_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setDraft({ ...draft, accentColor: c.hex })}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      draft.accentColor === c.hex ? "border-amber-400 scale-110" : "border-white/20"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#b5ada0] mb-2">Skin Tone</div>
            <div className="flex gap-2.5">
              {SKIN_TONES.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  title={s.name}
                  onClick={() => setDraft({ ...draft, skinTone: s.hex })}
                  className={`w-9 h-9 rounded-full border-2 cursor-pointer ${
                    draft.skinTone === s.hex ? "border-amber-400 scale-110" : "border-white/20"
                  }`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-[#120f0d] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#cfc8bc] hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Save Look
          </button>
        </div>
      </div>
    </div>
  );
};
