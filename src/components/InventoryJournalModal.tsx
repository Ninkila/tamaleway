import React, { useState } from "react";
import { Bike, Briefcase, Camera, Package, RefreshCw, Utensils, X } from "lucide-react";
import { TAMALE_LANDMARKS } from "../data/tamaleWorldData";
import { CityGigCategory, CityGigTask, ErrandQuest, InventoryItem } from "../types/game";

interface InventoryJournalModalProps {
  inventory: InventoryItem[];
  errands: ErrandQuest[];
  moneyCedis: number;
  energy: number;
  cultureXp: number;
  discoveredCount: number;
  totalLandmarks: number;
  playerPos: { x: number; z: number };
  activeGig: CityGigTask | null;
  availableGigs: CityGigTask[];
  completedGigsCount: number;
  totalEarnedCedis: number;
  onAcceptGig: (gig: CityGigTask) => void;
  onAbandonGig: () => void;
  onRefreshGigs: () => void;
  onAcceptErrand: (errandId: string) => void;
  onConsumeItem: (itemId: string) => void;
  onClose: () => void;
}

const GIG_CATEGORY_META: Record<
  CityGigCategory,
  { label: string; badgeClass: string; Icon: React.FC<{ className?: string }> }
> = {
  passenger_ride: {
    label: "Passenger Fare",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    Icon: Bike,
  },
  food_delivery: {
    label: "Hot Food Delivery",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Icon: Utensils,
  },
  supply_run: {
    label: "Supply Run",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Icon: Package,
  },
  city_survey: {
    label: "City Photo Survey",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    Icon: Camera,
  },
};

export const InventoryJournalModal: React.FC<InventoryJournalModalProps> = ({
  inventory,
  errands,
  moneyCedis,
  energy,
  cultureXp,
  discoveredCount,
  totalLandmarks,
  playerPos,
  activeGig,
  availableGigs,
  completedGigsCount,
  totalEarnedCedis,
  onAcceptGig,
  onAbandonGig,
  onRefreshGigs,
  onAcceptErrand,
  onConsumeItem,
  onClose,
}) => {
  const [tab, setTab] = useState<"gigs" | "errands" | "bag">("gigs");
  const completedErrandsCount = errands.filter((e) => e.completed).length;

  const getDistanceMeters = (landmarkId: string) => {
    const lm = TAMALE_LANDMARKS.find((l) => l.id === landmarkId);
    if (!lm) return 0;
    return Math.round(Math.hypot(lm.x - playerPos.x, lm.z - playerPos.z) * 10);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">
              Tamale City Dispatch, Errands &amp; Bag
            </h2>
            <div className="text-xs text-[#b5ada0] font-mono-num mt-0.5">
              Wallet GH₵ {moneyCedis} · Earned GH₵ {totalEarnedCedis} ({completedGigsCount} gigs) ·{" "}
              Energy {Math.round(energy)}% · XP {cultureXp} · {discoveredCount}/{totalLandmarks}{" "}
              Landmarks
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close journal"
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-6 py-2.5 bg-[#120f0d] border-b border-white/10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("gigs")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "gigs"
                ? "bg-amber-500 text-[#12100e]"
                : "bg-[#201b17] text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            Tamale Gigs &amp; Earn GH₵
          </button>
          <button
            type="button"
            onClick={() => setTab("errands")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "errands"
                ? "bg-amber-500 text-[#12100e]"
                : "bg-[#201b17] text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            Community Errands ({completedErrandsCount}/{errands.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("bag")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === "bag"
                ? "bg-amber-500 text-[#12100e]"
                : "bg-[#201b17] text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            Traveler Bag ({inventory.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {tab === "gigs" && (
            <>
              {/* Active Gig Banner */}
              {activeGig && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <Briefcase className="w-4 h-4" />
                      <span>Active Dispatch · Follow the Green Beacon / Compass</span>
                    </div>
                    <button
                      type="button"
                      onClick={onAbandonGig}
                      className="px-2.5 py-1 text-[11px] font-medium rounded bg-white/10 hover:bg-red-500/25 text-[#dfd8cd] hover:text-red-200 cursor-pointer"
                    >
                      Abandon Gig
                    </button>
                  </div>
                  <div className="text-sm font-bold text-[#f8f5ef]">{activeGig.title}</div>
                  <div className="text-xs text-amber-300">{activeGig.dagbaniTitle}</div>
                  <div className="text-xs text-[#cfc8bc]">{activeGig.description}</div>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono-num text-emerald-300">
                    <span>Destination: {activeGig.targetLandmarkName}</span>
                    <span>· {getDistanceMeters(activeGig.targetLandmarkId)}m away</span>
                    <span className="text-amber-400 font-semibold">
                      · Pays GH₵ {activeGig.rewardCedis} + {activeGig.rewardCultureXp} XP
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Available City Gigs (Pragya, Moto &amp; Foot)
                  </h3>
                  <p className="text-xs text-[#a39b8e] mt-0.5">
                    Pick up passengers, deliver hot food, carry supplies, or survey Tamale landmarks
                    for repeatable GH₵ payouts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRefreshGigs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#201b17] hover:bg-white/10 text-[#ede8de] border border-white/10 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Refresh Board</span>
                </button>
              </div>

              <div className="space-y-3">
                {availableGigs.map((gig) => {
                  const meta = GIG_CATEGORY_META[gig.category];
                  const Icon = meta.Icon;
                  const isCurrent = activeGig?.id === gig.id;
                  return (
                    <div
                      key={gig.id}
                      className="p-4 rounded-xl bg-[#201b17] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border ${meta.badgeClass}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{meta.label}</span>
                          </span>
                          <span className="text-[11px] text-[#9c9487] font-mono-num">
                            {gig.distanceMeters}m dispatch · Pickup: {gig.pickupLabel}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-[#f8f5ef]">{gig.title}</div>
                        <div className="text-xs text-amber-300/90">{gig.dagbaniTitle}</div>
                        <div className="text-xs text-[#a39b8e]">{gig.description}</div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="text-right font-mono-num">
                          <div className="text-sm font-bold text-amber-400">
                            +GH₵ {gig.rewardCedis}
                          </div>
                          <div className="text-[11px] text-emerald-400">
                            +{gig.rewardCultureXp} Culture XP
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => onAcceptGig(gig)}
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-emerald-600/30 disabled:text-emerald-200 text-[#12100e] transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {isCurrent ? "In Progress" : "Accept Gig"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "errands" && (
            <div className="space-y-2.5">
              {errands.map((err) => {
                const distM = getDistanceMeters(err.targetLandmarkId);
                return (
                  <div
                    key={err.id}
                    className="p-3.5 rounded-lg bg-[#201b17] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#f8f5ef]">{err.title}</div>
                      <div className="text-xs text-amber-300/90 mt-0.5">{err.dagbaniTitle}</div>
                      <div className="text-xs text-[#a39b8e] mt-1">{err.description}</div>
                      <div className="text-[11px] text-[#9c9487] font-mono-num mt-1">
                        Destination: {err.targetLandmarkName} · {distM}m away
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 font-mono-num">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-amber-400">
                          +GH₵ {err.rewardCedis}
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          +{err.rewardCultureXp} XP
                        </div>
                      </div>
                      {err.completed ? (
                        <span className="px-2.5 py-1 text-[11px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Completed
                        </span>
                      ) : err.active ? (
                        <span className="px-2.5 py-1 text-[11px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Active Beacon
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAcceptErrand(err.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-[#12100e] cursor-pointer whitespace-nowrap"
                        >
                          Start Errand
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "bag" && (
            <div>
              {inventory.length === 0 ? (
                <div className="text-sm text-[#8e8679] bg-[#201b17] border border-white/10 rounded-lg p-4">
                  Your bag is empty. Visit Central Market, Tishigu Sugar Bakery, Dungu Campus
                  Café, or street water/kɔɔsɛ hawkers to stock up on food and Tamale crafts.
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
                          Consume (+{item.energyRestore}% Energy)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
