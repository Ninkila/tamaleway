import React from "react";
import { X } from "lucide-react";
import { ErrandQuest, InventoryItem } from "../types/game";

interface InventoryJournalModalProps {
  inventory: InventoryItem[];
  errands: ErrandQuest[];
  moneyCedis: number;
  energy: number;
  cultureXp: number;
  discoveredCount: number;
  totalLandmarks: number;
  onConsumeItem: (itemId: string) => void;
  onClose: () => void;
}

export const InventoryJournalModal: React.FC<InventoryJournalModalProps> = ({
  inventory,
  errands,
  moneyCedis,
  energy,
  cultureXp,
  discoveredCount,
  totalLandmarks,
  onConsumeItem,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl flex flex-col max-h-[86vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">
              Traveler Bag, Errands &amp; Progression
            </h2>
            <div className="text-xs text-[#b5ada0] font-mono-num">
              GH₵ {moneyCedis} · Energy {Math.round(energy)}% · Culture XP {cultureXp} ·{" "}
              {discoveredCount}/{totalLandmarks} Landmarks
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

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Inventory */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
              Your Bag ({inventory.length} items)
            </h3>
            {inventory.length === 0 ? (
              <div className="text-sm text-[#8e8679] bg-[#201b17] border border-white/10 rounded-lg p-4">
                Your bag is empty. Visit Mama Fati at Central Market or Alhassan at the Cultural
                Centre to buy Tuo Zaafi, shea butter, or a handwoven batakari.
              </div>
            ) : (
              <div className="space-y-2.5">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#201b17] border border-white/10"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#f8f5ef]">
                        {item.name} ({item.dagbaniName}) × {item.quantity}
                      </div>
                      <div className="text-xs text-[#a39b8e]">{item.description}</div>
                    </div>
                    {item.energyRestore && (
                      <button
                        type="button"
                        onClick={() => onConsumeItem(item.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer"
                      >
                        Eat (+{item.energyRestore}% Energy)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Errands */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
              Tamale Community Errands
            </h3>
            <div className="space-y-2.5">
              {errands.map((err) => (
                <div
                  key={err.id}
                  className="p-3.5 rounded-lg bg-[#201b17] border border-white/10 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#f8f5ef]">{err.title}</div>
                    <div className="text-xs text-amber-300/90 mt-0.5">{err.dagbaniTitle}</div>
                    <div className="text-xs text-[#a39b8e] mt-1">{err.description}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono-num">
                    <div className="text-xs font-semibold text-amber-400">
                      +GH₵ {err.rewardCedis}
                    </div>
                    <div className="text-[11px] text-[#9c9487] mt-1">
                      {err.completed ? "Completed" : err.active ? "Active" : "Talk to Giver"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
