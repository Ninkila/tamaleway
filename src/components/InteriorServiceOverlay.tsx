import React, { useMemo, useState } from "react";
import {
  Banknote,
  BedDouble,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  Landmark,
  Music,
  Scissors,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Stethoscope,
  Utensils,
  Wrench,
  X,
} from "lucide-react";
import {
  calculateMomoCashOutFee,
  calculateSupermarketCheckout,
  TAMALE_ECONOMY_CONFIG,
} from "../data/tamaleEconomy";
import { SHOP_INVENTORIES, SHOP_METADATA, TAMALE_LANDMARKS } from "../data/tamaleWorldData";
import {
  HairstyleOption,
  HeadwearStyle,
  InteriorRoomSpec,
  InteriorStationKind,
  PlayerCustomization,
  ShopItem,
} from "../types/game";

interface InteriorServiceOverlayProps {
  room: InteriorRoomSpec;
  stationKind: Exclude<InteriorStationKind, "exit_door">;
  stationLabel: string;
  shopId?: string;
  moneyCedis: number;
  bankBalanceCedis: number;
  momoBalanceCedis: number;
  savingsBalanceCedis: number;
  energy: number;
  vehicleCondition: number;
  customization: PlayerCustomization;
  onAdjustWallets: (patch: {
    cashDelta?: number;
    bankDelta?: number;
    momoDelta?: number;
    savingsDelta?: number;
    xpDelta?: number;
    message?: string;
  }) => void;
  onBuyItem: (
    item: ShopItem,
    finalPrice: number,
    consumeImmediately?: boolean,
    payWith?: "cash" | "momo"
  ) => boolean;
  onApplyEnergyAndTime: (opts: {
    costCedis?: number;
    payWith?: "cash" | "momo";
    energyDelta?: number;
    setFullEnergy?: boolean;
    advanceMinutes?: number;
    xpBonus?: number;
    message?: string;
  }) => boolean;
  onRepairVehicle: (newCondition: number, costCedis: number, label: string) => boolean;
  onApplyCustomization: (
    next: PlayerCustomization,
    costCedis?: number,
    label?: string
  ) => boolean;
  onOpenDagbaniGuide: () => void;
  onClose: () => void;
}

const HAIRSTYLE_CHOICES: Array<{
  id: HairstyleOption;
  label: string;
  price: number;
  note: string;
}> = [
  { id: "low_fade", label: "Crisp Tamale Low Fade", price: TAMALE_ECONOMY_CONFIG.services.barberBasicFade, note: "Clean skin taper & hairline" },
  { id: "waves", label: "360 Waves Cut", price: TAMALE_ECONOMY_CONFIG.services.barberBasicFade + 5, note: "Trimmed crown waves" },
  { id: "afro_trim", label: "Shaped Afro Trim", price: TAMALE_ECONOMY_CONFIG.services.barberFullGrooming, note: "Balanced rounded crown" },
  { id: "braided_crown", label: "Braided Cornrow Crown", price: TAMALE_ECONOMY_CONFIG.services.barberBraidsOrWeave, note: "Structured braided style" },
  { id: "natural", label: "Natural Close Crop", price: TAMALE_ECONOMY_CONFIG.services.barberBeardTrim, note: "Simple neat everyday trim" },
];

export const InteriorServiceOverlay: React.FC<InteriorServiceOverlayProps> = ({
  room,
  stationKind,
  stationLabel,
  shopId,
  moneyCedis,
  bankBalanceCedis,
  momoBalanceCedis,
  savingsBalanceCedis,
  energy,
  vehicleCondition,
  customization,
  onAdjustWallets,
  onBuyItem,
  onApplyEnergyAndTime,
  onRepairVehicle,
  onApplyCustomization,
  onOpenDagbaniGuide,
  onClose,
}) => {
  const effectiveShopId = shopId ?? room.shopId;
  const shopMeta = effectiveShopId ? SHOP_METADATA[effectiveShopId] : undefined;
  const shopItems = useMemo(() => {
    if (effectiveShopId && SHOP_INVENTORIES[effectiveShopId]?.length) {
      return SHOP_INVENTORIES[effectiveShopId];
    }
    if (stationKind === "food_counter" || stationKind === "dining_table") {
      return SHOP_INVENTORIES.aboabo_tz_kitchen ?? [];
    }
    return SHOP_INVENTORIES.central_market_stalls ?? [];
  }, [effectiveShopId, stationKind]);

  const landmark = useMemo(
    () => TAMALE_LANDMARKS.find((l) => l.id === room.landmarkId) ?? null,
    [room.landmarkId]
  );

  const [payWith, setPayWith] = useState<"cash" | "momo">("cash");
  const [txAmount, setTxAmount] = useState<number>(50);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [diningPrepActive, setDiningPrepActive] = useState(false);
  const [diningStatus, setDiningStatus] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const availablePayFunds = payWith === "momo" ? momoBalanceCedis : moneyCedis;

  const basketSummary = useMemo(() => {
    let subtotal = 0;
    let count = 0;
    const entries: Array<{ item: ShopItem; qty: number }> = [];
    for (const [id, qty] of Object.entries(basket)) {
      if (qty <= 0) continue;
      const found = shopItems.find((i) => i.id === id);
      if (found) {
        subtotal += found.price * qty;
        count += qty;
        entries.push({ item: found, qty });
      }
    }
    const checkout =
      room.archetype === "supermarket"
        ? calculateSupermarketCheckout(subtotal)
        : { subtotal, discount: 0, total: subtotal };
    return { entries, count, ...checkout };
  }, [basket, room.archetype, shopItems]);

  const handleCheckoutBasket = () => {
    if (basketSummary.count === 0) return;
    if (availablePayFunds < basketSummary.total) {
      setStatusFeedback(`Insufficient ${payWith === "momo" ? "MoMo" : "Cash"} funds.`);
      return;
    }
    const itemsCopy = [...basketSummary.entries];
    const discountPerItemRatio =
      basketSummary.subtotal > 0 ? basketSummary.total / basketSummary.subtotal : 1;
    for (const entry of itemsCopy) {
      for (let q = 0; q < entry.qty; q++) {
        const unitPrice = Math.max(1, Math.round(entry.item.price * discountPerItemRatio));
        onBuyItem(entry.item, unitPrice, false, payWith);
      }
    }
    setBasket({});
    setStatusFeedback(
      `Checked out ${basketSummary.count} items for GH₵ ${basketSummary.total}${
        basketSummary.discount > 0 ? ` (Saved GH₵ ${basketSummary.discount} bulk discount)` : ""
      }!`
    );
  };

  const handleOrderFood = (item: ShopItem, dineIn: boolean) => {
    if (availablePayFunds < item.price) {
      setStatusFeedback(`Need GH₵ ${item.price} (${payWith.toUpperCase()}).`);
      return;
    }
    if (dineIn) {
      setDiningPrepActive(true);
      setDiningStatus(`Preparing fresh ${item.name} for your table...`);
      window.setTimeout(() => {
        setDiningPrepActive(false);
        const bonusItem: ShopItem = {
          ...item,
          energyRestore: (item.energyRestore ?? 20) + TAMALE_ECONOMY_CONFIG.restaurants.dineInEnergyBonus,
        };
        const ok = onBuyItem(bonusItem, item.price, true, payWith);
        if (ok) {
          setDiningStatus(
            `Served at your table! Restored +${bonusItem.energyRestore}% Energy (+8% dine-in warmth bonus).`
          );
        }
      }, 1100);
    } else {
      const ok = onBuyItem(item, item.price, false, payWith);
      if (ok) {
        setStatusFeedback(`Packed ${item.name} (${item.dagbaniName}) into your bag!`);
      }
    }
  };

  const renderIcon = () => {
    switch (stationKind) {
      case "bank_teller":
      case "atm_kiosk":
        return <Landmark className="w-5 h-5 text-sky-400" />;
      case "momo_agent":
        return <Smartphone className="w-5 h-5 text-amber-400" />;
      case "food_counter":
      case "dining_table":
        return <Utensils className="w-5 h-5 text-orange-400" />;
      case "barber_chair":
        return <Scissors className="w-5 h-5 text-rose-400" />;
      case "mechanic_bay":
        return <Wrench className="w-5 h-5 text-emerald-400" />;
      case "clinic_triage":
        return <Stethoscope className="w-5 h-5 text-red-400" />;
      case "guesthouse_desk":
      case "home_bed":
        return <BedDouble className="w-5 h-5 text-indigo-400" />;
      case "gym_rack":
        return <Dumbbell className="w-5 h-5 text-amber-400" />;
      default:
        return <ShoppingBasket className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-[90dvh] bg-[#171411] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#120f0d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#221d18] border border-white/10 flex items-center justify-center shrink-0">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-amber-400 truncate">
                {room.title} · {room.dagbaniTitle}
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#f8f5ef] truncate">
                {stationLabel}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close station panel"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white hover:bg-white/10 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Wallets Strip */}
        <div className="px-5 py-2.5 bg-[#1a1612] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#cfc8bc]">
            <span>
              Cash: <strong className="text-amber-400">GH₵ {moneyCedis}</strong>
            </span>
            <span>
              Bank: <strong className="text-sky-300">GH₵ {bankBalanceCedis}</strong>
            </span>
            <span>
              MoMo: <strong className="text-yellow-300">GH₵ {momoBalanceCedis}</strong>
            </span>
            <span>
              Savings: <strong className="text-emerald-300">GH₵ {savingsBalanceCedis}</strong>
            </span>
          </div>
          <div className="text-emerald-300">Energy {Math.round(energy)}%</div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {statusFeedback && (
            <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* BANKING / ATM / MOMO AGENT */}
          {(stationKind === "bank_teller" ||
            stationKind === "atm_kiosk" ||
            stationKind === "momo_agent") && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#1f1a16] border border-white/10 space-y-2.5">
                <div className="text-xs font-semibold text-[#ede8de]">Select Transaction Amount</div>
                <div className="flex flex-wrap gap-2">
                  {[20, 50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTxAmount(amt)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-mono-num font-bold cursor-pointer border ${
                        txAmount === amt
                          ? "bg-amber-500 text-[#12100e] border-amber-400"
                          : "bg-[#120f0d] text-[#d4cdc2] border-white/10 hover:bg-white/10"
                      }`}
                    >
                      GH₵ {amt}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={5000}
                    value={txAmount}
                    onChange={(e) => setTxAmount(Math.max(1, Number(e.target.value) || 0))}
                    className="w-24 min-h-[40px] bg-[#120f0d] border border-white/15 rounded-lg px-2.5 text-xs font-mono-num text-[#f8f5ef]"
                  />
                </div>
              </div>

              {(stationKind === "bank_teller" || stationKind === "atm_kiosk") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stationKind === "bank_teller" && (
                    <button
                      type="button"
                      disabled={moneyCedis < txAmount}
                      onClick={() => {
                        onAdjustWallets({
                          cashDelta: -txAmount,
                          bankDelta: txAmount,
                          message: `Deposited GH₵ ${txAmount} cash into Bank Account.`,
                        });
                        setStatusFeedback(`Deposited GH₵ ${txAmount} into your Tamale Bank Account.`);
                      }}
                      className="min-h-[46px] p-3 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 disabled:opacity-40 border border-sky-400/40 text-left cursor-pointer"
                    >
                      <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4" />
                        <span>Deposit Cash → Bank</span>
                      </div>
                      <div className="text-[11px] text-[#b5ada0] mt-0.5">0% teller fee</div>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={bankBalanceCedis < txAmount}
                    onClick={() => {
                      onAdjustWallets({
                        bankDelta: -txAmount,
                        cashDelta: txAmount,
                        message: `Withdrew GH₵ ${txAmount} cash from Bank.`,
                      });
                      setStatusFeedback(`Dispensed GH₵ ${txAmount} cash.`);
                    }}
                    className="min-h-[46px] p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-40 border border-amber-400/40 text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Withdraw Bank → Cash</span>
                    </div>
                    <div className="text-[11px] text-[#b5ada0] mt-0.5">Instant cash dispensing</div>
                  </button>

                  {stationKind === "bank_teller" && (
                    <>
                      <button
                        type="button"
                        disabled={bankBalanceCedis < txAmount}
                        onClick={() => {
                          onAdjustWallets({
                            bankDelta: -txAmount,
                            savingsDelta: txAmount,
                            message: `Moved GH₵ ${txAmount} into Savings (+1.5%/day yield).`,
                          });
                          setStatusFeedback(
                            `Transferred GH₵ ${txAmount} to Savings (Earns 1.5% interest every midnight).`
                          );
                        }}
                        className="min-h-[46px] p-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 disabled:opacity-40 border border-emerald-400/40 text-left cursor-pointer"
                      >
                        <div className="text-xs font-bold text-emerald-200">
                          Transfer Bank → Savings
                        </div>
                        <div className="text-[11px] text-[#b5ada0] mt-0.5">
                          Earns {(TAMALE_ECONOMY_CONFIG.banking.savingsInterestDailyRate * 100).toFixed(1)}% daily yield
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={savingsBalanceCedis < txAmount}
                        onClick={() => {
                          onAdjustWallets({
                            savingsDelta: -txAmount,
                            bankDelta: txAmount,
                            message: `Moved GH₵ ${txAmount} back from Savings to Bank.`,
                          });
                          setStatusFeedback(`Returned GH₵ ${txAmount} to Bank balance.`);
                        }}
                        className="min-h-[46px] p-3 rounded-xl bg-[#221d18] hover:bg-white/10 disabled:opacity-40 border border-white/15 text-left cursor-pointer"
                      >
                        <div className="text-xs font-bold text-[#f8f5ef]">
                          Redeem Savings → Bank
                        </div>
                        <div className="text-[11px] text-[#b5ada0] mt-0.5">Available anytime</div>
                      </button>
                    </>
                  )}
                </div>
              )}

              {(stationKind === "momo_agent" || stationKind === "bank_teller") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    disabled={moneyCedis < txAmount}
                    onClick={() => {
                      onAdjustWallets({
                        cashDelta: -txAmount,
                        momoDelta: txAmount,
                        message: `MoMo Cash-In: +GH₵ ${txAmount} loaded to Mobile Money.`,
                      });
                      setStatusFeedback(`MoMo Cash-In complete: +GH₵ ${txAmount}.`);
                    }}
                    className="min-h-[46px] p-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/35 disabled:opacity-40 border border-yellow-400/40 text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-yellow-200">
                      MoMo Cash-In (Cash → MoMo)
                    </div>
                    <div className="text-[11px] text-[#b5ada0] mt-0.5">0% agent deposit fee</div>
                  </button>

                  {(() => {
                    const fee = calculateMomoCashOutFee(txAmount);
                    const totalRequired = txAmount + fee;
                    return (
                      <button
                        type="button"
                        disabled={momoBalanceCedis < totalRequired}
                        onClick={() => {
                          onAdjustWallets({
                            momoDelta: -totalRequired,
                            cashDelta: txAmount,
                            message: `MoMo Cash-Out: GH₵ ${txAmount} cash (Fee GH₵ ${fee}).`,
                          });
                          setStatusFeedback(`Cashed out GH₵ ${txAmount} (Agent fee GH₵ ${fee}).`);
                        }}
                        className="min-h-[46px] p-3 rounded-xl bg-[#221d18] hover:bg-white/10 disabled:opacity-40 border border-white/15 text-left cursor-pointer"
                      >
                        <div className="text-xs font-bold text-[#f8f5ef]">
                          MoMo Cash-Out (MoMo → Cash)
                        </div>
                        <div className="text-[11px] text-[#b5ada0] mt-0.5">
                          Standard 1% fee: GH₵ {fee}
                        </div>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    disabled={bankBalanceCedis < txAmount}
                    onClick={() => {
                      onAdjustWallets({
                        bankDelta: -txAmount,
                        momoDelta: txAmount,
                        message: `Bank-to-MoMo transfer: GH₵ ${txAmount}.`,
                      });
                      setStatusFeedback(`Loaded GH₵ ${txAmount} from Bank to MoMo wallet.`);
                    }}
                    className="min-h-[46px] p-3 rounded-xl bg-[#221d18] hover:bg-white/10 disabled:opacity-40 border border-white/15 text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-sky-200">Transfer Bank → MoMo</div>
                    <div className="text-[11px] text-[#b5ada0] mt-0.5">Instant mobile top-up</div>
                  </button>

                  <button
                    type="button"
                    disabled={momoBalanceCedis < 10}
                    onClick={() => {
                      onAdjustWallets({
                        momoDelta: -10,
                        xpDelta: 12,
                        message: "Bought GH₵ 10 Airtime & Data Bundle (+12 Culture XP).",
                      });
                      setStatusFeedback("Recharged airtime & data bundle for GH₵ 10!");
                    }}
                    className="min-h-[46px] p-3 rounded-xl bg-[#221d18] hover:bg-white/10 disabled:opacity-40 border border-white/15 text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-emerald-200">
                      Buy Airtime &amp; Data Bundle (GH₵ 10 MoMo)
                    </div>
                    <div className="text-[11px] text-[#b5ada0] mt-0.5">+12 City Social XP</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* RESTAURANT COUNTER & SEATED DINING */}
          {(stationKind === "food_counter" || stationKind === "dining_table") && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[#cfc8bc]">
                  {stationKind === "dining_table"
                    ? "Seated at a dining table — freshly prepared dine-in meals grant +8% extra energy."
                    : "Order at the counter for immediate dine-in or pack food into your travel bag."}
                </div>
                <div className="flex items-center gap-1 bg-[#120f0d] p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPayWith("cash")}
                    className={`min-h-[34px] px-2.5 text-xs rounded-md font-semibold cursor-pointer ${
                      payWith === "cash" ? "bg-amber-500 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    Pay Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayWith("momo")}
                    className={`min-h-[34px] px-2.5 text-xs rounded-md font-semibold cursor-pointer ${
                      payWith === "momo" ? "bg-yellow-400 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    Pay MoMo
                  </button>
                </div>
              </div>

              {diningStatus && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
                  {diningStatus}
                </div>
              )}

              <div className="space-y-2.5">
                {shopItems.map((item) => {
                  const canAfford = availablePayFunds >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#1f1a16] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#f8f5ef]">
                          {item.name}{" "}
                          <span className="text-xs font-normal text-amber-400">
                            ({item.dagbaniName})
                          </span>
                        </div>
                        <div className="text-xs text-[#b5ada0]">{item.description}</div>
                        {item.energyRestore && (
                          <div className="text-[11px] text-emerald-400 font-mono-num mt-0.5">
                            +{item.energyRestore}% Bag · +{item.energyRestore + TAMALE_ECONOMY_CONFIG.restaurants.dineInEnergyBonus}% Seated Dine-In
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!canAfford || diningPrepActive}
                          onClick={() => handleOrderFood(item, true)}
                          className="min-h-[42px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] text-xs font-bold cursor-pointer"
                        >
                          Eat Fresh · GH₵ {item.price}
                        </button>
                        <button
                          type="button"
                          disabled={!canAfford || diningPrepActive}
                          onClick={() => handleOrderFood(item, false)}
                          className="min-h-[42px] px-3 py-1.5 rounded-xl bg-[#27211b] hover:bg-white/10 disabled:opacity-40 border border-white/15 text-[#ede8de] text-xs font-semibold cursor-pointer"
                        >
                          Takeaway
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SHELF BROWSE / CHECKOUT COUNTER / ELECTRONICS */}
          {(stationKind === "shelf_browse" ||
            stationKind === "checkout_counter" ||
            stationKind === "electronics_desk") && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[#b5ada0]">
                  {room.archetype === "supermarket"
                    ? `Supermarket shelves — orders GH₵ ${TAMALE_ECONOMY_CONFIG.supermarket.bulkDiscountThresholdCedis}+ receive an 8% bulk discount.`
                    : shopMeta?.authenticityNote || "Add items to your basket or pay at the counter."}
                </div>
                <div className="flex items-center gap-1 bg-[#120f0d] p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPayWith("cash")}
                    className={`min-h-[34px] px-2.5 text-xs rounded-md font-semibold cursor-pointer ${
                      payWith === "cash" ? "bg-amber-500 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayWith("momo")}
                    className={`min-h-[34px] px-2.5 text-xs rounded-md font-semibold cursor-pointer ${
                      payWith === "momo" ? "bg-yellow-400 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    MoMo
                  </button>
                </div>
              </div>

              {effectiveShopId === "sagnarigu_fitness_print" && (
                <button
                  type="button"
                  disabled={availablePayFunds < TAMALE_ECONOMY_CONFIG.services.printingAndBindingFee}
                  onClick={() => {
                    onApplyEnergyAndTime({
                      costCedis: TAMALE_ECONOMY_CONFIG.services.printingAndBindingFee,
                      payWith,
                      xpBonus: 12,
                      message: "Printed & bound Tamale coursework/documents (+12 XP).",
                    });
                    setStatusFeedback("Printed & bound documents cleanly (+12 XP).");
                  }}
                  className="min-h-[44px] w-full p-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 border border-sky-400/35 text-xs font-bold text-sky-200 cursor-pointer"
                >
                  Print &amp; Spiral-Bind Documents · GH₵ {TAMALE_ECONOMY_CONFIG.services.printingAndBindingFee}
                </button>
              )}

              <div className="space-y-2">
                {shopItems.map((item) => {
                  const qty = basket[item.id] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#1f1a16] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#f8f5ef]">
                          {item.name}{" "}
                          <span className="text-xs font-normal text-amber-400">
                            ({item.dagbaniName})
                          </span>
                        </div>
                        <div className="text-xs text-[#9c9487]">{item.description}</div>
                        <div className="text-xs font-mono-num text-amber-300 mt-0.5">
                          GH₵ {item.price}
                          {item.energyRestore ? ` · +${item.energyRestore}% Energy` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBasket((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                              }))
                            }
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-[#2a231d] text-white font-bold text-sm cursor-pointer"
                          >
                            -
                          </button>
                        )}
                        {qty > 0 && (
                          <span className="font-mono-num text-xs font-bold text-amber-300 px-1.5">
                            {qty}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setBasket((prev) => ({
                              ...prev,
                              [item.id]: (prev[item.id] ?? 0) + 1,
                            }))
                          }
                          className="min-h-[40px] px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs cursor-pointer"
                        >
                          {qty > 0 ? "+1" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {basketSummary.count > 0 && (
                <div className="p-4 rounded-xl bg-[#120f0d] border border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono-num space-y-0.5">
                    <div className="text-[#f8f5ef] font-bold">
                      Basket: {basketSummary.count} items · Subtotal GH₵ {basketSummary.subtotal}
                    </div>
                    {basketSummary.discount > 0 && (
                      <div className="text-emerald-400">
                        Bulk Discount: -GH₵ {basketSummary.discount}
                      </div>
                    )}
                    <div className="text-amber-400 font-bold">
                      Total Due: GH₵ {basketSummary.total} ({payWith.toUpperCase()})
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={availablePayFunds < basketSummary.total}
                    onClick={handleCheckoutBasket}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#071c0e] font-bold text-xs cursor-pointer"
                  >
                    Checkout Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BARBER & HAIR SALON */}
          {stationKind === "barber_chair" && (
            <div className="space-y-4">
              <div className="text-xs text-[#cfc8bc]">
                Sit in the Nyohini barber &amp; braiding chair to update your 3D character&apos;s
                hairstyle and headwear directly.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {HAIRSTYLE_CHOICES.map((hs) => {
                  const selected = (customization.hairstyle ?? "natural") === hs.id;
                  return (
                    <button
                      key={hs.id}
                      type="button"
                      disabled={!selected && moneyCedis < hs.price}
                      onClick={() => {
                        const ok = onApplyCustomization(
                          {
                            ...customization,
                            hairstyle: hs.id,
                            headwear: "none",
                          },
                          selected ? 0 : hs.price,
                          `Styled ${hs.label}`
                        );
                        if (ok) setStatusFeedback(`Applied ${hs.label}!`);
                      }}
                      className={`min-h-[54px] p-3 rounded-xl border text-left cursor-pointer ${
                        selected
                          ? "bg-amber-500/20 border-amber-500 text-[#f8f5ef]"
                          : "bg-[#1f1a16] border-white/10 hover:border-white/25 text-[#d4cdc2]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span>{hs.label}</span>
                        <span className="font-mono-num text-amber-400">
                          {selected ? "Current" : `GH₵ ${hs.price}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9c9487] mt-0.5">{hs.note}</div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10">
                <div className="text-xs font-semibold text-[#b5ada0] mb-2">
                  Headwear Finish (Optional)
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "none", label: "Show Haircut" },
                      { id: "kufi", label: "Zanna / Kufi Cap" },
                      { id: "headwrap", label: "Headwrap" },
                      { id: "braids", label: "Braided Plaits" },
                    ] as Array<{ id: HeadwearStyle; label: string }>
                  ).map((hw) => (
                    <button
                      key={hw.id}
                      type="button"
                      onClick={() => {
                        onApplyCustomization({ ...customization, headwear: hw.id }, 0, hw.label);
                        setStatusFeedback(`Updated headwear: ${hw.label}.`);
                      }}
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        customization.headwear === hw.id
                          ? "bg-amber-500 text-[#12100e] border-amber-400"
                          : "bg-[#1f1a16] text-[#d4cdc2] border-white/10"
                      }`}
                    >
                      {hw.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MECHANIC SERVICE BAY */}
          {stationKind === "mechanic_bay" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#f8f5ef]">
                    Current Pragya / Moto Mechanical Condition
                  </span>
                  <span className="font-mono-num font-bold text-emerald-400">
                    {Math.round(vehicleCondition)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#120f0d] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      vehicleCondition > 65
                        ? "bg-emerald-500"
                        : vehicleCondition > 35
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, vehicleCondition))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={
                    moneyCedis < TAMALE_ECONOMY_CONFIG.services.mechanicBasicTuneUp ||
                    vehicleCondition >= 98
                  }
                  onClick={() => {
                    const next = Math.min(100, vehicleCondition + 35);
                    if (
                      onRepairVehicle(
                        next,
                        TAMALE_ECONOMY_CONFIG.services.mechanicBasicTuneUp,
                        "Lamashegu Tune-Up & Chain Oil"
                      )
                    ) {
                      setStatusFeedback(`Tune-up complete! Vehicle condition is now ${next}%.`);
                    }
                  }}
                  className="min-h-[54px] p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-40 border border-amber-400/40 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-amber-200">
                    Oil Change, Spark Plug &amp; Tune-Up (+35%)
                  </div>
                  <div className="text-xs font-mono-num text-amber-400 mt-1">
                    GH₵ {TAMALE_ECONOMY_CONFIG.services.mechanicBasicTuneUp}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={
                    moneyCedis < TAMALE_ECONOMY_CONFIG.services.mechanicFullOverhaul ||
                    vehicleCondition >= 99
                  }
                  onClick={() => {
                    if (
                      onRepairVehicle(
                        100,
                        TAMALE_ECONOMY_CONFIG.services.mechanicFullOverhaul,
                        "Full Pragya / Moto Overhaul"
                      )
                    ) {
                      setStatusFeedback("Full overhaul finished — vehicle restored to 100%!");
                    }
                  }}
                  className="min-h-[54px] p-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 disabled:opacity-40 border border-emerald-400/40 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-200">
                    Complete Engine &amp; Brake Overhaul (100%)
                  </div>
                  <div className="text-xs font-mono-num text-emerald-300 mt-1">
                    GH₵ {TAMALE_ECONOMY_CONFIG.services.mechanicFullOverhaul}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* CLINIC / HOSPITAL / PHARMACY */}
          {stationKind === "clinic_triage" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={moneyCedis < TAMALE_ECONOMY_CONFIG.services.clinicConsultation}
                  onClick={() => {
                    if (
                      onApplyEnergyAndTime({
                        costCedis: TAMALE_ECONOMY_CONFIG.services.clinicConsultation,
                        energyDelta: 45,
                        advanceMinutes: 45,
                        xpBonus: 10,
                        message: "Completed clinic checkup (+45% Energy).",
                      })
                    ) {
                      setStatusFeedback("Medical consultation & hydration complete (+45% Energy).");
                    }
                  }}
                  className="min-h-[54px] p-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 disabled:opacity-40 border border-sky-400/40 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-sky-200">
                    Outpatient Checkup &amp; Rehydration (+45% Energy)
                  </div>
                  <div className="text-xs font-mono-num text-amber-400 mt-1">
                    GH₵ {TAMALE_ECONOMY_CONFIG.services.clinicConsultation}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={moneyCedis < TAMALE_ECONOMY_CONFIG.services.clinicFullRecovery}
                  onClick={() => {
                    if (
                      onApplyEnergyAndTime({
                        costCedis: TAMALE_ECONOMY_CONFIG.services.clinicFullRecovery,
                        setFullEnergy: true,
                        advanceMinutes: 90,
                        xpBonus: 15,
                        message: "Full hospital wellness recovery (100% Energy).",
                      })
                    ) {
                      setStatusFeedback("Full wellness recovery complete (100% Energy).");
                    }
                  }}
                  className="min-h-[54px] p-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 disabled:opacity-40 border border-emerald-400/40 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-200">
                    Full Recovery &amp; Rest Ward (100% Energy)
                  </div>
                  <div className="text-xs font-mono-num text-emerald-300 mt-1">
                    GH₵ {TAMALE_ECONOMY_CONFIG.services.clinicFullRecovery}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* GUESTHOUSE / HOME BED */}
          {(stationKind === "guesthouse_desk" || stationKind === "home_bed") && (
            <div className="space-y-3">
              {(() => {
                const isHome = room.archetype === "compound_home";
                const shortCost = isHome ? 0 : TAMALE_ECONOMY_CONFIG.services.guesthouseShortRest;
                const fullCost = isHome ? 0 : TAMALE_ECONOMY_CONFIG.services.guesthouseOvernight;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={moneyCedis < shortCost}
                      onClick={() => {
                        if (
                          onApplyEnergyAndTime({
                            costCedis: shortCost,
                            energyDelta: 45,
                            advanceMinutes: 90,
                            message: "Rested peacefully (+45% Energy, +1h 30m).",
                          })
                        ) {
                          setStatusFeedback("Refreshed after resting (+45% Energy, +1h 30m).");
                        }
                      }}
                      className="min-h-[54px] p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-40 border border-amber-400/40 text-left cursor-pointer"
                    >
                      <div className="text-xs font-bold text-amber-200">
                        Short Afternoon Rest (+45% Energy · +1.5 hrs)
                      </div>
                      <div className="text-xs font-mono-num text-amber-400 mt-1">
                        {shortCost === 0 ? "Free at Compound Home" : `GH₵ ${shortCost}`}
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={moneyCedis < fullCost}
                      onClick={() => {
                        if (
                          onApplyEnergyAndTime({
                            costCedis: fullCost,
                            setFullEnergy: true,
                            advanceMinutes: 360,
                            message: "Slept soundly (100% Energy, +6 hours).",
                          })
                        ) {
                          setStatusFeedback("Woke up fully rested (100% Energy, +6 hours).");
                        }
                      }}
                      className="min-h-[54px] p-3.5 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/40 disabled:opacity-40 border border-indigo-400/45 text-left cursor-pointer"
                    >
                      <div className="text-xs font-bold text-indigo-200">
                        Full Overnight Sleep (100% Energy · +6 hrs)
                      </div>
                      <div className="text-xs font-mono-num text-indigo-300 mt-1">
                        {fullCost === 0 ? "Free at Compound Home" : `GH₵ ${fullCost}`}
                      </div>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* GYM RACK */}
          {stationKind === "gym_rack" && (
            <div className="space-y-3">
              <div className="text-xs text-[#cfc8bc]">
                Complete a strength &amp; stamina conditioning set to build Endurance Skill.
              </div>
              <button
                type="button"
                disabled={moneyCedis < TAMALE_ECONOMY_CONFIG.services.gymSessionFee}
                onClick={() => {
                  if (
                    onApplyEnergyAndTime({
                      costCedis: TAMALE_ECONOMY_CONFIG.services.gymSessionFee,
                      energyDelta: -12,
                      advanceMinutes: 45,
                      xpBonus: 25,
                      message: "Completed Sagnarigu gym session (+25 XP)!",
                    })
                  ) {
                    setStatusFeedback("Finished workout set (+25 XP)!");
                  }
                }}
                className="min-h-[48px] w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] font-bold text-xs cursor-pointer"
              >
                Train Stamina Set · GH₵ {TAMALE_ECONOMY_CONFIG.services.gymSessionFee} (+25 XP)
              </button>
            </div>
          )}

          {/* CULTURAL BENCH / REFLECTION / HERITAGE */}
          {stationKind === "cultural_bench" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#1f1a16] border border-amber-500/30 space-y-2">
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{landmark?.name ?? room.title} Heritage</span>
                </div>
                <p className="text-sm text-[#e8e2d7] leading-relaxed">
                  {landmark?.historicalSignificance ||
                    landmark?.interiorDescription ||
                    landmark?.authenticityNote ||
                    "Take a peaceful moment inside this iconic Tamale institution."}
                </p>
                {landmark?.osmCoords && (
                  <div className="text-[11px] font-mono-num text-[#9c9487]">
                    GIS Coordinates: {landmark.osmCoords}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApplyEnergyAndTime({
                      energyDelta: 12,
                      xpBonus: 10,
                      message: "Reflected calmly (+12% Energy, +10 Culture XP).",
                    });
                    setStatusFeedback("Mindful reflection complete (+12% Energy, +10 Culture XP).");
                  }}
                  className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-400/40 text-xs font-bold text-emerald-200 cursor-pointer"
                >
                  Pause &amp; Reflect (+12% Energy, +10 XP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDagbaniGuide();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] text-xs font-bold cursor-pointer"
                >
                  Open Dagbani Phrasebook
                </button>
              </div>
            </div>
          )}

          {/* Fallback note if room radio somehow triggers here */}
          {stationKind === "room_radio" && (
            <div className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 text-xs text-[#cfc8bc] flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Radio playback toggled via your Tamale Music &amp; Radio tuner!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
