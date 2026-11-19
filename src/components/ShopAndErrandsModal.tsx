import React, { useState } from "react";
import { Clock, ShieldCheck, Sparkles, Store, X } from "lucide-react";
import {
  isShopOpenAtMinutes,
  SHOP_INVENTORIES,
  SHOP_METADATA,
} from "../data/tamaleWorldData";
import { ShopItem, ShopServiceAction } from "../types/game";

interface ShopModalProps {
  shopId: string;
  moneyCedis: number;
  energy: number;
  gameMinutes: number;
  ownedBusinessIds?: string[];
  onBuyItem: (item: ShopItem, finalPrice: number, consumeImmediately?: boolean) => void;
  onUseService: (service: ShopServiceAction, shopId: string) => void;
  onInvestBusiness?: (shopId: string) => void;
  onOpenCityJobs?: () => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  shopId,
  moneyCedis,
  energy,
  gameMinutes,
  ownedBusinessIds = [],
  onBuyItem,
  onUseService,
  onInvestBusiness,
  onOpenCityJobs,
  onClose,
}) => {
  const items = SHOP_INVENTORIES[shopId] || [];
  const meta = SHOP_METADATA[shopId];
  const { isOpen, hoursLabel } = isShopOpenAtMinutes(shopId, gameMinutes);
  const [bargained, setBargained] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const title = meta?.title || "Tamale Market Stall";
  const services = meta?.services || [];
  const isOwned = ownedBusinessIds.includes(shopId);

  const handleBargain = () => {
    if (bargained || !isOpen) return;
    setBargained(true);
    setFeedback("You greeted warmly and said 'Boogima!' — 15% market discount applied.");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-2xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  isOpen
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{isOpen ? "Open Now" : "Closed Right Now"}</span>
              </span>
              <span className="text-[11px] text-[#a39b8e] font-mono-num">Hours: {hoursLabel}</span>
              {meta && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#bfb7aa]">
                  {meta.authenticityStatus === "real-institution" ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Real Location</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-3 h-3 text-sky-400" />
                      <span>Representative Local Business</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">{title}</h2>
            <div className="text-xs text-[#b5ada0] font-mono-num mt-0.5">
              Wallet: GH₵ {moneyCedis} · Energy: {Math.round(energy)}%
              {meta ? ` · ${meta.district}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shop"
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Closed Banner or Dagbani Bargaining Action */}
        {!isOpen ? (
          <div className="px-6 py-3 bg-rose-950/35 border-b border-rose-500/25 text-xs text-rose-200">
            This Tamale business operates {hoursLabel}. Come back during open hours, visit a
            24-hour guest house, or check evening chichinga &amp; grill spots after 16:30.
          </div>
        ) : (
          <div className="px-6 py-3 bg-[#120f0d] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-[#cfc8bc]">
              {feedback || "Speak Dagbani to bargain respectfully on market goods before buying."}
            </div>
            {items.length > 0 && (
              <button
                type="button"
                disabled={bargained}
                onClick={handleBargain}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 text-amber-300 border border-amber-500/30 cursor-pointer whitespace-nowrap"
              >
                {bargained ? "Boogima! Applied (-15%)" : "Say 'Boogima!' (Bargain)"}
              </button>
            )}
          </div>
        )}

        {/* Services & Item List */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {meta?.authenticityNote && (
            <div className="text-xs text-[#9c9487] bg-[#120f0d] border border-white/10 rounded-lg px-3 py-2">
              {meta.authenticityNote}
            </div>
          )}

          {services.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Local Services</span>
              </div>
              {services.map((svc) => {
                const canAfford = moneyCedis >= svc.price;
                return (
                  <div
                    key={svc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#201b17] border border-amber-500/25"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#f8f5ef]">
                        {svc.label}{" "}
                        <span className="text-amber-400 font-normal">({svc.dagbaniLabel})</span>
                      </div>
                      <div className="text-xs text-[#a39b8e] mt-0.5">{svc.description}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!isOpen || !canAfford}
                      onClick={() => {
                        onUseService(svc, shopId);
                        setFeedback(`Completed ${svc.label} for GH₵ ${svc.price}.`);
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#071c0e] transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono-num"
                    >
                      Use Service · GH₵ {svc.price}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {meta?.buyableSharePrice && onInvestBusiness && (
            <div className="p-3.5 rounded-xl bg-[#201b17] border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-400">
                  Local Business Partnership
                </div>
                <div className="text-xs text-[#cfc8bc] mt-0.5">
                  Co-own {title} to earn GH₵ {meta.dailyRevenueCedis ?? 35}/day at midnight.
                </div>
              </div>
              <button
                type="button"
                disabled={isOwned || moneyCedis < meta.buyableSharePrice}
                onClick={() => {
                  onInvestBusiness(shopId);
                  setFeedback(`Became a co-owner of ${title}!`);
                }}
                className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer font-mono-num ${
                  isOwned
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/35"
                    : "bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#12100e]"
                }`}
              >
                {isOwned
                  ? `Co-Owner (+GH₵ ${meta.dailyRevenueCedis ?? 35}/day)`
                  : `Invest Share · GH₵ ${meta.buyableSharePrice}`}
              </button>
            </div>
          )}

          {onOpenCityJobs && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onOpenCityJobs}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-[#241f1a] hover:bg-white/10 border border-white/12 text-xs font-semibold text-amber-300 cursor-pointer"
              >
                Browse City Jobs &amp; Shifts
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Goods &amp; Provisions
              </div>
              {items.map((item) => {
                const finalPrice = bargained
                  ? Math.max(1, Math.round(item.price * 0.85))
                  : item.price;
                const canAfford = moneyCedis >= finalPrice;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#201b17] border border-white/10"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#f8f5ef]">
                        {item.name}{" "}
                        <span className="text-amber-400 font-normal">({item.dagbaniName})</span>
                      </div>
                      <div className="text-xs text-[#a39b8e] mt-0.5">{item.description}</div>
                      {item.energyRestore && (
                        <div className="text-[11px] text-emerald-400 mt-1">
                          Restores +{item.energyRestore}% Energy
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.energyRestore && (
                        <button
                          type="button"
                          disabled={!isOpen || !canAfford}
                          onClick={() => {
                            onBuyItem(item, finalPrice, true);
                            setFeedback(
                              `Enjoyed ${item.name} fresh (+${item.energyRestore}% Energy) for GH₵ ${finalPrice}.`
                            );
                          }}
                          className="min-h-[42px] px-3.5 py-2 text-xs font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#071c0e] transition-colors whitespace-nowrap cursor-pointer font-mono-num"
                        >
                          Eat Now · GH₵ {finalPrice}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!isOpen || !canAfford}
                        onClick={() => {
                          onBuyItem(item, finalPrice, false);
                          setFeedback(
                            `Purchased ${item.name} (${item.dagbaniName}) for GH₵ ${finalPrice}.`
                          );
                        }}
                        className="min-h-[42px] px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#12100e] transition-colors whitespace-nowrap cursor-pointer font-mono-num"
                      >
                        {item.energyRestore ? `Pack · GH₵ ${finalPrice}` : `Buy · GH₵ ${finalPrice}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

