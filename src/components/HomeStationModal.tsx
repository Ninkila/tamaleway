import React, { useState } from "react";
import {
  AlertTriangle,
  Bath,
  BedDouble,
  CheckCircle2,
  ChefHat,
  Clock,
  Droplets,
  Home,
  Shirt,
  Sparkles,
  Trash2,
  Tv,
  Utensils,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  computeDailyHomeBillCedis,
  DAILY_ROUTINE_SUGGESTIONS,
  HOME_COOKING_RECIPES,
  HOME_INGREDIENTS_CATALOG,
  HOME_OUTFIT_CATALOG,
  HOME_UPGRADES_CATALOG,
} from "../data/tamaleHomeData";
import {
  HomeIngredientId,
  HomeLaundryState,
  HomeState,
  HomeUpgradeId,
  InteriorStationKind,
  OutfitStyle,
  PlayerCustomization,
  PlayerNeedsState,
} from "../types/game";

export type HomeStationKind = Extract<
  InteriorStationKind,
  | "home_bed"
  | "wardrobe"
  | "home_shower"
  | "home_sink_hygiene"
  | "home_toilet"
  | "home_mirror"
  | "home_kitchen_fridge"
  | "home_kitchen_stove"
  | "home_kitchen_sink"
  | "home_clean_sweep"
  | "home_clean_mop"
  | "home_rubbish_bin"
  | "home_laundry_wash"
  | "home_clothesline"
  | "home_sofa_tv"
  | "home_upgrade_desk"
  | "home_charger"
>;

interface HomeStationModalProps {
  stationKind: HomeStationKind;
  stationLabel: string;
  dayCount: number;
  gameMinutes: number;
  energy: number;
  moneyCedis: number;
  momoBalanceCedis: number;
  needs: PlayerNeedsState;
  homeState: HomeState;
  laundryState: HomeLaundryState;
  customization: PlayerCustomization;
  ownedOutfits: OutfitStyle[];
  policePursuitActive: boolean;
  onSleepUntil: (mode: "nap" | "wake_6" | "wake_7" | "wake_8" | "wake_9" | "sleep_8h") => { ok: boolean; message: string };
  onHygieneAction: (kind: "shower" | "sink" | "toilet" | "mirror") => string;
  onCookRecipe: (recipeId: string) => { ok: boolean; message: string };
  onEatCookedMeal: (mealId: string) => string;
  onDrinkHomeWater: () => { ok: boolean; message: string };
  onCleanAction: (kind: "sweep" | "mop" | "dishes" | "rubbish") => string;
  onLaundryAction: (kind: "wash" | "hang" | "collect" | "instant_wear_clean") => { ok: boolean; message: string };
  onRelaxSofaTv: () => string;
  onPurchaseHomeUpgrade: (upgradeId: HomeUpgradeId, payWith: "cash" | "momo") => { ok: boolean; message: string };
  onPayHomeBills: (payWith: "cash" | "momo") => { ok: boolean; message: string };
  onSelectWardrobeOutfit: (outfit: OutfitStyle) => { ok: boolean; message: string };
  onBuyWardrobeOutfit: (outfit: OutfitStyle, cost: number, payWith: "cash" | "momo") => { ok: boolean; message: string };
  onToggleReminders: () => void;
  onClose: () => void;
}

function formatClock(minutes: number): string {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export const HomeStationModal: React.FC<HomeStationModalProps> = ({
  stationKind,
  stationLabel,
  dayCount,
  gameMinutes,
  energy,
  moneyCedis,
  momoBalanceCedis,
  needs,
  homeState,
  laundryState,
  customization,
  ownedOutfits,
  policePursuitActive,
  onSleepUntil,
  onHygieneAction,
  onCookRecipe,
  onEatCookedMeal,
  onDrinkHomeWater,
  onCleanAction,
  onLaundryAction,
  onRelaxSofaTv,
  onPurchaseHomeUpgrade,
  onPayHomeBills,
  onSelectWardrobeOutfit,
  onBuyWardrobeOutfit,
  onToggleReminders,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [payWith, setPayWith] = useState<"cash" | "momo">("cash");

  const availableFunds = payWith === "momo" ? momoBalanceCedis : moneyCedis;
  const dailyBillEst = computeDailyHomeBillCedis(homeState);

  const isBathroom =
    stationKind === "home_shower" ||
    stationKind === "home_sink_hygiene" ||
    stationKind === "home_toilet" ||
    stationKind === "home_mirror";

  const isKitchen =
    stationKind === "home_kitchen_fridge" ||
    stationKind === "home_kitchen_stove" ||
    stationKind === "home_kitchen_sink";

  const isCleaning =
    stationKind === "home_clean_sweep" ||
    stationKind === "home_clean_mop" ||
    stationKind === "home_rubbish_bin";

  const isLaundry =
    stationKind === "home_laundry_wash" || stationKind === "home_clothesline";

  const hasEnoughForRecipe = (ingredients: Partial<Record<HomeIngredientId, number>>) =>
    Object.entries(ingredients).every(
      ([k, req]) => (homeState.fridgeIngredients[k as HomeIngredientId] ?? 0) >= (req ?? 0)
    );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-2.5 sm:p-4">
      <div className="w-full max-w-2xl bg-[#171411] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#120f0d] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {homeState.homeName} · Day {dayCount} ({formatClock(gameMinutes)})
              </span>
            </div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#f8f5ef] truncate">
              {stationLabel}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close home station"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#bfb7aa] hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Live Needs Strip */}
        <div className="px-5 py-2.5 bg-[#1b1612] border-b border-white/10 grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] font-mono-num">
          <div>
            <span className="text-[#9c9487]">Energy</span>
            <div className="font-bold text-emerald-400">{Math.round(energy)}%</div>
          </div>
          <div>
            <span className="text-[#9c9487]">Hygiene</span>
            <div className="font-bold text-sky-300">{Math.round(needs.hygiene)}%</div>
          </div>
          <div>
            <span className="text-[#9c9487]">Hunger</span>
            <div className="font-bold text-amber-300">{Math.round(needs.hunger)}%</div>
          </div>
          <div>
            <span className="text-[#9c9487]">Thirst</span>
            <div className="font-bold text-cyan-300">{Math.round(needs.thirst)}%</div>
          </div>
          <div>
            <span className="text-[#9c9487]">Comfort</span>
            <div className="font-bold text-violet-300">{Math.round(needs.comfort)}%</div>
          </div>
          <div>
            <span className="text-[#9c9487]">House</span>
            <div className="font-bold text-emerald-300">{Math.round(homeState.cleanliness)}%</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{feedback}</span>
            </div>
          )}

          {/* SLEEP & WAKE-UP ALARM */}
          {stationKind === "home_bed" && (
            <div className="space-y-4">
              {policePursuitActive && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/45 text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>Cannot sleep while actively pursued by Tamale MTTD Patrol! Resolve or lose pursuit first.</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#201a15] border border-white/10 text-xs text-[#d6cfc3] space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4" />
                  <span>Bed Comfort Level {homeState.upgrades.bed_tier}/3 · House Cleanliness {Math.round(homeState.cleanliness)}%</span>
                </div>
                <p className="text-[#a89f92]">
                  Sleeping overnight advances to your chosen wake-up hour, settles daily utility fees
                  (est. GH₵ {dailyBillEst}/day), dries hanging laundry, and refreshes Tamale shops &amp; NPC schedules.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: "nap" as const, title: "Afternoon Power Nap", sub: "+35% Energy · +1h 30m", accent: "bg-amber-500/20 border-amber-500/45 text-amber-200" },
                  { id: "sleep_8h" as const, title: "Full 8-Hour Rest", sub: "100% Energy · +8 hours", accent: "bg-indigo-500/25 border-indigo-400/45 text-indigo-200" },
                  { id: "wake_6" as const, title: "Sleep Until 06:00 AM", sub: "Early Dawn Start (Next Morning)", accent: "bg-emerald-500/20 border-emerald-500/45 text-emerald-200" },
                  { id: "wake_7" as const, title: "Sleep Until 07:00 AM", sub: "Standard Tamale Morning", accent: "bg-emerald-500/20 border-emerald-500/45 text-emerald-200" },
                  { id: "wake_8" as const, title: "Sleep Until 08:00 AM", sub: "Market Opening Hour", accent: "bg-sky-500/20 border-sky-400/45 text-sky-200" },
                  { id: "wake_9" as const, title: "Sleep Until 09:00 AM", sub: "Relaxed Late Morning", accent: "bg-sky-500/20 border-sky-400/45 text-sky-200" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={policePursuitActive}
                    onClick={() => {
                      const res = onSleepUntil(opt.id);
                      setFeedback(res.message);
                    }}
                    className={`min-h-[54px] p-3.5 rounded-xl border text-left hover:brightness-110 disabled:opacity-40 cursor-pointer ${opt.accent}`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{opt.title}</span>
                    </div>
                    <div className="text-[11px] opacity-85 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BATHROOM HYGIENE */}
          {isBathroom && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#201a15] border border-white/10 text-xs text-[#cfc8bc] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bath className="w-4 h-4 text-sky-400" />
                  <span>Polytank Pressure Tier {homeState.upgrades.polytank_plumbing}/2</span>
                </span>
                <span className="font-mono-num text-sky-300 font-semibold">
                  Outfit Cleanliness: {Math.round(laundryState.outfitCleanliness)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFeedback(onHygieneAction("shower"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-sky-200">Take Full Refreshing Shower</div>
                  <div className="text-[11px] text-sky-300/85 mt-0.5">+65% Hygiene · +15% Comfort · +20 min</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onHygieneAction("sink"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-200">Brush Teeth &amp; Wash Face/Hands</div>
                  <div className="text-[11px] text-emerald-300/85 mt-0.5">+28% Hygiene · +8% Comfort · +10 min</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onHygieneAction("toilet"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-amber-200">Use Private Toilet &amp; Wash Hands</div>
                  <div className="text-[11px] text-amber-300/85 mt-0.5">+15% Comfort · +10% Hygiene · +8 min</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onHygieneAction("mirror"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-[#241f1a] hover:bg-white/10 border border-white/15 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-[#f8f5ef]">Check Mirror &amp; Groom Hair</div>
                  <div className="text-[11px] text-[#b5ada0] mt-0.5">+10% Social Confidence · +5% Hygiene</div>
                </button>
              </div>
            </div>
          )}

          {/* KITCHEN: COOKING, FRIDGE & DISHES */}
          {isKitchen && (
            <div className="space-y-4">
              {/* Ready Cooked Meals */}
              {homeState.cookedMealsReady.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Hot Prepared Meals Ready to Eat</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {homeState.cookedMealsReady.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFeedback(onEatCookedMeal(m.id))}
                        className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/45 text-left cursor-pointer"
                      >
                        <div className="text-xs font-bold text-emerald-100">{m.name}</div>
                        <div className="text-[11px] text-emerald-300 mt-0.5">
                          Eat Now (+{m.hungerRestore}% Hunger, +{m.energyRestore}% Energy)
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Sink Dishwashing & Water */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFeedback(onCleanAction("dishes"))}
                  className="min-h-[48px] p-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-sky-200 flex items-center justify-between">
                    <span>Wash Dirty Dishes &amp; Pots</span>
                    <span className="font-mono-num">{homeState.dirtyDishesCount} waiting</span>
                  </div>
                  <div className="text-[11px] text-sky-300/85 mt-0.5">Clears kitchen sink &amp; lifts house cleanliness</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const res = onDrinkHomeWater();
                    setFeedback(res.message);
                  }}
                  className="min-h-[48px] p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-cyan-200 flex items-center justify-between">
                    <span>Drink Chilled Pantry Water</span>
                    <span className="font-mono-num">{homeState.fridgeIngredients.clean_water ?? 0} packs</span>
                  </div>
                  <div className="text-[11px] text-cyan-300/85 mt-0.5">+40% Thirst · +6% Energy</div>
                </button>
              </div>

              {/* Cook Ghanaian Meals */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Cook at Home Stove (Uses Pantry Ingredients)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HOME_COOKING_RECIPES.map((rec) => {
                    const canCook = hasEnoughForRecipe(rec.ingredients);
                    const ingSummary = Object.entries(rec.ingredients)
                      .map(([id, qty]) => {
                        const meta = HOME_INGREDIENTS_CATALOG.find((i) => i.id === id);
                        const owned = homeState.fridgeIngredients[id as HomeIngredientId] ?? 0;
                        return `${meta?.name.split(" ")[0] ?? id} ${owned}/${qty}`;
                      })
                      .join(" · ");

                    return (
                      <div
                        key={rec.id}
                        className="p-3 rounded-xl bg-[#201b17] border border-white/10 flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#f8f5ef]">{rec.name}</div>
                          <div className="text-[10px] text-amber-300">{rec.dagbaniName}</div>
                          <div className="text-[11px] text-[#9c9487] mt-1">{ingSummary}</div>
                        </div>
                        <button
                          type="button"
                          disabled={!canCook}
                          onClick={() => {
                            const res = onCookRecipe(rec.id);
                            setFeedback(res.message);
                          }}
                          className="min-h-[36px] w-full px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-35 text-[#12100e] font-bold text-xs cursor-pointer"
                        >
                          {canCook ? `Prepare (${rec.cookMinutes}m)` : "Buy Ingredients at Changli Mart"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* HOUSE CLEANING & RUBBISH */}
          {isCleaning && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#201a15] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-300">
                  <span>Overall Compound Cleanliness</span>
                  <span className="font-mono-num">{Math.round(homeState.cleanliness)}%</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#cfc8bc]">
                  <div>Courtyard Dirt: {Math.round(homeState.roomDirt.courtyard)}%</div>
                  <div>Living Room: {Math.round(homeState.roomDirt.livingRoom)}%</div>
                  <div>Kitchen: {Math.round(homeState.roomDirt.kitchen)}%</div>
                  <div>Bedroom: {Math.round(homeState.roomDirt.bedroom)}%</div>
                  <div>Bathroom: {Math.round(homeState.roomDirt.bathroom)}%</div>
                  <div>Rubbish Bags: {homeState.rubbishCount}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFeedback(onCleanAction("sweep"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Sweep Courtyard &amp; Compound Rooms</span>
                  </div>
                  <div className="text-[11px] text-amber-300/85 mt-0.5">Clears courtyard, bedroom &amp; lounge dust</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onCleanAction("mop"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4" />
                    <span>Mop Kitchen, Lounge &amp; Bathroom</span>
                  </div>
                  <div className="text-[11px] text-sky-300/85 mt-0.5">Scrubs indoor tiles (+15% Comfort)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onCleanAction("rubbish"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" />
                    <span>Take Out Household Rubbish</span>
                  </div>
                  <div className="text-[11px] text-emerald-300/85 mt-0.5">Empties compound bin to municipal pickup</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onCleanAction("dishes"))}
                  className="min-h-[54px] p-3.5 rounded-xl bg-[#241f1a] hover:bg-white/10 border border-white/15 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-[#f8f5ef]">Clear Dirty Sink Dishes ({homeState.dirtyDishesCount})</div>
                  <div className="text-[11px] text-[#b5ada0] mt-0.5">Restores kitchen hygiene cleanly</div>
                </button>
              </div>
            </div>
          )}

          {/* LAUNDRY WASHING & CLOTHESLINE */}
          {isLaundry && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#201a15] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-num">
                <div>
                  <span className="text-[#9c9487] text-[10px]">Dirty Basket</span>
                  <div className="font-bold text-amber-300">{laundryState.dirtyClothesCount} loads</div>
                </div>
                <div>
                  <span className="text-[#9c9487] text-[10px]">Washed Wet</span>
                  <div className="font-bold text-sky-300">{laundryState.washedWetCount} loads</div>
                </div>
                <div>
                  <span className="text-[#9c9487] text-[10px]">On Clothesline</span>
                  <div className="font-bold text-emerald-300">{laundryState.dryingOnLineCount} drying</div>
                </div>
                <div>
                  <span className="text-[#9c9487] text-[10px]">Clean Stored</span>
                  <div className="font-bold text-[#f8f5ef]">{laundryState.cleanOutfitsStored} sets</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFeedback(onLaundryAction("wash").message)}
                  className="min-h-[54px] p-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-sky-200">1. Wash Clothes at Courtyard Basin</div>
                  <div className="text-[11px] text-sky-300/85 mt-0.5">Soaps &amp; rinses worn clothes (+18 min)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onLaundryAction("hang").message)}
                  className="min-h-[54px] p-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-amber-200">2. Hang Laundry on Sun Clothesline</div>
                  <div className="text-[11px] text-amber-300/85 mt-0.5">Visible outdoors · dries in Tamale sun or overnight</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onLaundryAction("collect").message)}
                  className="min-h-[54px] p-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/45 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-200">3. Collect Dry Clothes to Wardrobe</div>
                  <div className="text-[11px] text-emerald-300/85 mt-0.5">Stores clean pressed outfits (+5% Comfort)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback(onLaundryAction("instant_wear_clean").message)}
                  className="min-h-[54px] p-3.5 rounded-xl bg-[#241f1a] hover:bg-white/10 border border-white/15 text-left cursor-pointer"
                >
                  <div className="text-xs font-bold text-[#f8f5ef]">Put On Fresh Clean Clothes Now</div>
                  <div className="text-[11px] text-[#b5ada0] mt-0.5">Uses 1 clean stored set (100% Outfit Cleanliness)</div>
                </button>
              </div>
            </div>
          )}

          {/* LIVING ROOM SOFA & TV */}
          {stationKind === "home_sofa_tv" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#201a15] border border-white/10 text-xs text-[#cfc8bc] space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Tv className="w-4 h-4" />
                  <span>Entertainment Setup Tier {homeState.upgrades.tv_entertainment}/2</span>
                </div>
                <p>
                  Sit back on your compound living room sofa to catch Northern Ghana cultural broadcasts,
                  recharge energy, and relieve city stress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(onRelaxSofaTv())}
                className="min-h-[48px] w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs cursor-pointer"
              >
                Unwind &amp; Watch Tamale Evening Broadcast (+Comfort, +Energy, +30m)
              </button>
            </div>
          )}

          {/* WARDROBE */}
          {stationKind === "wardrobe" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#cfc8bc]">
                  Active Outfit Cleanliness:{" "}
                  <strong className="text-emerald-300 font-mono-num">
                    {Math.round(laundryState.outfitCleanliness)}%
                  </strong>
                </span>
                <div className="flex items-center gap-1 bg-[#120f0d] p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPayWith("cash")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      payWith === "cash" ? "bg-amber-500 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    Cash (GH₵ {moneyCedis})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayWith("momo")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      payWith === "momo" ? "bg-yellow-400 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    MoMo (GH₵ {momoBalanceCedis})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {HOME_OUTFIT_CATALOG.map((outfit) => {
                  const isOwned = ownedOutfits.includes(outfit.id) || outfit.unlockCostCedis === 0;
                  const isEquipped = customization.outfit === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className={`p-3 rounded-xl border space-y-2 ${
                        isEquipped
                          ? "bg-amber-500/15 border-amber-500/60"
                          : "bg-[#201b17] border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#f8f5ef]">{outfit.label}</div>
                          <div className="text-[10px] text-amber-300">
                            {outfit.category} · {outfit.dagbaniLabel}
                          </div>
                        </div>
                        <Shirt className="w-4 h-4 text-[#b5ada0] shrink-0" />
                      </div>
                      <p className="text-[11px] text-[#9c9487]">{outfit.description}</p>
                      {isOwned ? (
                        <button
                          type="button"
                          onClick={() =>
                            setFeedback(onSelectWardrobeOutfit(outfit.id).message)
                          }
                          className={`min-h-[36px] w-full rounded-lg text-xs font-bold cursor-pointer ${
                            isEquipped
                              ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
                              : "bg-amber-500 hover:bg-amber-400 text-[#12100e]"
                          }`}
                        >
                          {isEquipped ? "Currently Worn" : "Wear Fresh Outfit"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={availableFunds < outfit.unlockCostCedis}
                          onClick={() =>
                            setFeedback(
                              onBuyWardrobeOutfit(outfit.id, outfit.unlockCostCedis, payWith).message
                            )
                          }
                          className="min-h-[36px] w-full rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-[#0f172a] font-bold text-xs cursor-pointer"
                        >
                          Order &amp; Tailoring · GH₵ {outfit.unlockCostCedis}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HOME UPGRADES & DAILY UTILITY BILLS / ROUTINE */}
          {(stationKind === "home_upgrade_desk" || stationKind === "home_charger") && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#201a15] border border-white/10 text-xs">
                <div>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Daily Utility Rate: GH₵ {dailyBillEst}/day · Owed: GH₵ {homeState.dailyBillsOwed}</span>
                  </div>
                  <div className="text-[11px] text-[#a89f92]">
                    {homeState.upgrades.solar_power >= 2
                      ? "Solar inverter active — 65% electricity savings"
                      : "ECG prepaid meter active — upgrade to Solar to cut bills"}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#120f0d] p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPayWith("cash")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      payWith === "cash" ? "bg-amber-500 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    Cash (GH₵ {moneyCedis})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayWith("momo")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      payWith === "momo" ? "bg-yellow-400 text-[#12100e]" : "text-[#b5ada0]"
                    }`}
                  >
                    MoMo (GH₵ {momoBalanceCedis})
                  </button>
                </div>
              </div>

              {homeState.dailyBillsOwed > 0 && (
                <button
                  type="button"
                  disabled={availableFunds < homeState.dailyBillsOwed}
                  onClick={() => setFeedback(onPayHomeBills(payWith).message)}
                  className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] font-bold text-xs cursor-pointer"
                >
                  Pay Outstanding ECG &amp; Water Bill · GH₵ {homeState.dailyBillsOwed}
                </button>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Home Ownership Upgrades</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {HOME_UPGRADES_CATALOG.map((upg) => {
                    const curLevel = homeState.upgrades[upg.id] ?? 1;
                    const nextTier = upg.levels.find((l) => l.level === curLevel + 1);
                    const curTierMeta = upg.levels.find((l) => l.level === curLevel);
                    return (
                      <div
                        key={upg.id}
                        className="p-3 rounded-xl bg-[#201b17] border border-white/10 flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#f8f5ef]">{upg.name}</span>
                            <span className="text-[10px] font-mono-num text-emerald-300">
                              Lv {curLevel}/{upg.maxLevel}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#b5ada0] mt-0.5">
                            Current: {curTierMeta?.title}
                          </div>
                          {nextTier && (
                            <div className="text-[11px] text-amber-300 mt-1">
                              Next: {nextTier.title} ({nextTier.effectSummary})
                            </div>
                          )}
                        </div>

                        {nextTier ? (
                          <button
                            type="button"
                            disabled={availableFunds < nextTier.costCedis}
                            onClick={() => setFeedback(onPurchaseHomeUpgrade(upg.id, payWith).message)}
                            className="min-h-[36px] w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#071c0e] font-bold text-xs cursor-pointer"
                          >
                            Upgrade · GH₵ {nextTier.costCedis}
                          </button>
                        ) : (
                          <div className="text-[11px] text-emerald-400 font-semibold">
                            Max Tier Installed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional Daily Routine Checklist & Reminder Toggle */}
              <div className="p-3.5 rounded-xl bg-[#201a15] border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-300">
                    Optional Daily Rhythm (Non-Mandatory)
                  </span>
                  <button
                    type="button"
                    onClick={onToggleReminders}
                    className="px-2.5 py-1 rounded bg-[#120f0d] border border-white/10 text-[11px] text-[#cfc8bc] cursor-pointer"
                  >
                    Home Reminders: {homeState.remindersEnabled ? "On" : "Off"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  {DAILY_ROUTINE_SUGGESTIONS.map((item) => {
                    const done = homeState.dailyRoutineIdsDone.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`px-2.5 py-1.5 rounded-lg border ${
                          done
                            ? "bg-emerald-950/40 border-emerald-500/35 text-emerald-200"
                            : "bg-[#171310] border-white/10 text-[#b5ada0]"
                        }`}
                      >
                        <span className="font-semibold">{done ? "✓ " : "○ "}</span>
                        <span>{item.label}</span>
                      </div>
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
