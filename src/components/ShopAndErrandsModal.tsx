import React, { useState } from "react";
import { X } from "lucide-react";
import { SHOP_INVENTORIES } from "../data/tamaleWorldData";
import { ShopItem } from "../types/game";

interface ShopModalProps {
  shopId: string;
  moneyCedis: number;
  onBuyItem: (item: ShopItem, finalPrice: number) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  shopId,
  moneyCedis,
  onBuyItem,
  onClose,
}) => {
  const items = SHOP_INVENTORIES[shopId] || [];
  const [bargained, setBargained] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const SHOP_TITLES: Record<string, string> = {
    cultural_crafts: "Centre for National Culture & SCCA · Smock & Craft Guild",
    aboabo_electronics_cloth: "Aboabo Market · Cloth, Solar & Chichinga Lane",
    lamashegu_parts: "Lamashegu Hub · Pragya Parts & Kɔɔsɛ Stall",
    kukuo_pottery: "Kukuo Pottery Centre · Hand-Fired Duɣu Craft",
    market_provisions: "Tamale Central Market · Mama Fati's Provisions",
  };
  const title = SHOP_TITLES[shopId] || "Tamale Market Stall";

  const handleBargain = () => {
    if (bargained) return;
    setBargained(true);
    setFeedback("You greeted warmly and said 'Boogima!' — 15% market discount applied.");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">{title}</h2>
            <div className="text-xs text-[#b5ada0] font-mono-num">
              Your Wallet: GH₵ {moneyCedis}
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

        {/* Dagbani Bargaining Action */}
        <div className="px-6 py-3 bg-[#120f0d] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[#cfc8bc]">
            {feedback || "Speak Dagbani to bargain respectfully before buying."}
          </div>
          <button
            type="button"
            disabled={bargained}
            onClick={handleBargain}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 text-amber-300 border border-amber-500/30 cursor-pointer whitespace-nowrap"
          >
            {bargained ? "Boogima! Applied (-15%)" : "Say 'Boogima!' (Bargain)"}
          </button>
        </div>

        {/* Item List */}
        <div className="p-6 space-y-3 overflow-y-auto">
          {items.map((item) => {
            const finalPrice = bargained ? Math.max(1, Math.round(item.price * 0.85)) : item.price;
            const canAfford = moneyCedis >= finalPrice;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#201b17] border border-white/10"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#f8f5ef]">
                    {item.name} <span className="text-amber-400 font-normal">({item.dagbaniName})</span>
                  </div>
                  <div className="text-xs text-[#a39b8e] mt-0.5">{item.description}</div>
                  {item.energyRestore && (
                    <div className="text-[11px] text-emerald-400 mt-1">
                      Restores +{item.energyRestore}% Energy
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => {
                    onBuyItem(item, finalPrice);
                    setFeedback(`Purchased ${item.name} (${item.dagbaniName}) for GH₵ ${finalPrice}.`);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#12100e] transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono-num"
                >
                  Buy · GH₵ {finalPrice}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
