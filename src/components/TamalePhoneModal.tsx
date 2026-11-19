import React, { useMemo, useState } from "react";
import {
  Award,
  Bike,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  MapPin,
  Navigation,
  PackageCheck,
  Palette,
  PhoneCall,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import {
  computeCareerRankTitle,
  PLAYABLE_CHARACTERS,
  TAMALE_ACHIEVEMENTS,
} from "../data/playableCharacters";
import {
  calculateServiceFare,
  SERVICE_CATALOG,
  TASK_CATEGORIES_META,
} from "../data/tamaleJobsAndServices";
import {
  isShopOpenAtMinutes,
  SHOP_METADATA,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
} from "../data/tamaleWorldData";
import {
  ActiveTaskRuntime,
  CharacterRuntimeState,
  CityTaskCategory,
  CityTaskJob,
  LandmarkData,
  PlayableCharacterProfile,
  ServiceRequestKind,
  ServiceRequestRuntime,
  SkillKey,
} from "../types/game";

interface TamalePhoneModalProps {
  activeProfile: PlayableCharacterProfile;
  characterState: CharacterRuntimeState;
  allCharacterStates: Record<string, CharacterRuntimeState>;
  playerPos: { x: number; z: number };
  gameMinutes: number;
  availableJobs: CityTaskJob[];
  activeTask: ActiveTaskRuntime | null;
  activeService: ServiceRequestRuntime | null;
  onAcceptTask: (job: CityTaskJob) => void;
  onAbandonTask: () => void;
  onRefreshJobs: () => void;
  onDispatchService: (
    kind: ServiceRequestKind,
    destLandmarkId?: string,
    packageOptionId?: string
  ) => void;
  onCancelService: () => void;
  onSwitchCharacter: (characterId: string) => void;
  onOpenCustomize: () => void;
  onInvestBusiness: (shopId: string) => void;
  onFastTravelLandmark: (landmark: LandmarkData) => void;
  onClose: () => void;
}

type PhoneTab = "jobs" | "services" | "businesses" | "characters" | "skills";

const SKILL_DISPLAY: Array<{ key: SkillKey; label: string; hint: string }> = [
  { key: "riding", label: "Riding & Dispatch", hint: "Pragya, moto & transport mastery" },
  { key: "trade", label: "Market Trade", hint: "Pricing, retail & co-op margins" },
  { key: "stamina", label: "Endurance & Sport", hint: "Sprinting, stadium & field haulage" },
  { key: "culture", label: "Dagbon Culture", hint: "Language, heritage & field press" },
  { key: "craft", label: "Craft & Mechanics", hint: "Engine repairs, culinary & tailoring" },
];

export const TamalePhoneModal: React.FC<TamalePhoneModalProps> = ({
  activeProfile,
  characterState,
  allCharacterStates,
  playerPos,
  gameMinutes,
  availableJobs,
  activeTask,
  activeService,
  onAcceptTask,
  onAbandonTask,
  onRefreshJobs,
  onDispatchService,
  onCancelService,
  onSwitchCharacter,
  onOpenCustomize,
  onInvestBusiness,
  onFastTravelLandmark,
  onClose,
}) => {
  const [tab, setTab] = useState<PhoneTab>("jobs");
  const [jobCategory, setJobCategory] = useState<CityTaskCategory | "all">("all");
  const [selectedDestByKind, setSelectedDestByKind] = useState<Record<string, string>>({});
  const [selectedPkgByKind, setSelectedPkgByKind] = useState<Record<string, string>>({});

  const rank = computeCareerRankTitle(
    activeProfile,
    characterState.completedJobsCount,
    characterState.cultureXp
  );

  const filteredJobs = useMemo(() => {
    if (jobCategory === "all") return availableJobs;
    return availableJobs.filter((j) => j.category === jobCategory);
  }, [availableJobs, jobCategory]);

  const businessesList = useMemo(() => {
    return Object.values(SHOP_METADATA).filter(
      (s) => s.category !== "street_vendor"
    );
  }, []);

  const getDestForKind = (kind: string): LandmarkData => {
    const chosenId = selectedDestByKind[kind];
    const found = chosenId ? TAMALE_LANDMARKS.find((l) => l.id === chosenId) : undefined;
    if (found) return found;
    // Pick a landmark at least 35 units away as default ride target
    const remote =
      TAMALE_LANDMARKS.find(
        (l) => Math.hypot(l.x - playerPos.x, l.z - playerPos.z) > 35
      ) || TAMALE_LANDMARKS[1];
    return remote;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92dvh] bg-[#171411] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Device Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#120f0d]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Tamale City Phone · {activeProfile.name} ({rank.title})
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#cfc8bc] font-mono-num mt-0.5">
              <span className="text-amber-400 font-bold">GH₵ {characterState.moneyCedis}</span>
              <span aria-hidden="true">·</span>
              <span>Energy {Math.round(characterState.energy)}%</span>
              <span aria-hidden="true">·</span>
              <span>{characterState.completedJobsCount} Jobs Done</span>
              <span aria-hidden="true">·</span>
              <span>{characterState.cultureXp} XP</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tamale phone"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-6 py-2 bg-[#14110f] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: "jobs", label: "Jobs & Tasks", Icon: Briefcase },
              { id: "services", label: "Rides & Services", Icon: PhoneCall },
              { id: "businesses", label: "Businesses & GPS", Icon: Building2 },
              { id: "characters", label: "Characters", Icon: Users },
              { id: "skills", label: "Skills & Album", Icon: Award },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-[42px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === id
                  ? "bg-amber-500 text-[#12100e]"
                  : "bg-[#211c17] text-[#d4cdc2] hover:bg-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: JOBS & TASKS */}
          {tab === "jobs" && (
            <div className="space-y-4">
              {activeTask && (
                <div className="p-4 rounded-xl bg-emerald-950/35 border border-emerald-500/40 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-emerald-300">
                      Active Task ·{" "}
                      {activeTask.stage === "go_to_pickup"
                        ? `Stage 1: Head to ${activeTask.job.pickupLabel}`
                        : `Stage 2: Proceed to ${activeTask.job.targetLandmarkName}`}
                    </div>
                    <button
                      type="button"
                      onClick={onAbandonTask}
                      className="min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg bg-white/10 hover:bg-red-500/25 text-[#ede8de] hover:text-red-200 cursor-pointer"
                    >
                      Abandon Task
                    </button>
                  </div>
                  <div className="text-sm font-bold text-[#f8f5ef]">{activeTask.job.title}</div>
                  <div className="text-xs text-[#cfc8bc]">{activeTask.job.requirements}</div>
                  <div className="text-xs font-mono-num text-amber-300">
                    Pays GH₵ {activeTask.job.rewardCedis} · +{activeTask.job.rewardCultureXp} XP ·{" "}
                    +{activeTask.job.skillReward.points} {activeTask.job.skillReward.skill}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {TASK_CATEGORIES_META.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setJobCategory(cat.id)}
                      className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer border ${
                        jobCategory === cat.id
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-[#1e1915] border-white/10 text-[#b5ada0] hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onRefreshJobs}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#221d18] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#ede8de] flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-3">
                {filteredJobs.map((job) => {
                  const isCurrent = activeTask?.job.id === job.id;
                  const isRecommended = activeProfile.recommendedJobCategories.includes(
                    job.category
                  );
                  return (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#9c9487] font-mono-num">
                          <span className="text-amber-400 font-semibold">
                            {job.dagbaniTitle}
                          </span>
                          {isRecommended && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400">
                                Matches {activeProfile.nickname}&apos;s trade
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{job.distanceMeters ?? 250}m away</span>
                        </div>
                        <div className="text-sm font-bold text-[#f8f5ef]">{job.title}</div>
                        <div className="text-xs text-[#cfc8bc]">{job.description}</div>
                        <div className="text-[11px] text-[#9c9487]">
                          Pickup: {job.pickupLabel} → Target: {job.targetLandmarkName} · Energy -
                          {job.energyCost}%
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="text-right font-mono-num">
                          <div className="text-sm font-bold text-amber-400">
                            +GH₵ {job.rewardCedis}
                          </div>
                          <div className="text-[11px] text-emerald-400">
                            +{job.rewardCultureXp} XP · +{job.skillReward.points}{" "}
                            {job.skillReward.skill}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => onAcceptTask(job)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-emerald-600/25 disabled:text-emerald-200 text-[#12100e] font-bold text-xs whitespace-nowrap cursor-pointer"
                        >
                          {isCurrent ? "Active Task" : "Accept Job"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: REAL 3D SERVICES & RIDES */}
          {tab === "services" && (
            <div className="space-y-4">
              {activeService && (
                <div className="p-4 rounded-xl bg-[#18222a] border border-sky-400/45 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-sky-300">
                      Live 3D Dispatch · {activeService.providerName}
                    </div>
                    <button
                      type="button"
                      onClick={onCancelService}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-200 text-xs font-medium cursor-pointer"
                    >
                      Cancel Dispatch
                    </button>
                  </div>
                  <div className="text-sm font-bold text-[#f8f5ef]">{activeService.title}</div>
                  <div className="text-xs text-[#d4cdc2]">{activeService.statusNote}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-num text-amber-300">
                    <span>Status: {activeService.status.replace(/_/g, " ")}</span>
                    {activeService.etaSeconds > 0 && (
                      <span>· ETA ~{activeService.etaSeconds}s</span>
                    )}
                    <span>· Fare GH₵ {activeService.estimatedCostCedis}</span>
                  </div>
                  {activeService.status === "arrived_waiting" && (
                    <div className="text-xs text-emerald-300 font-medium pt-1">
                      Your provider is waiting right beside you outside! Close your phone and tap
                      BOARD RIDE / COLLECT (E).
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-[#b5ada0]">
                Dispatched riders, taxis, food couriers, and mechanics physically spawn on nearby
                Tamale roads and drive through real intersections directly to you.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {SERVICE_CATALOG.map((entry) => {
                  const dest = getDestForKind(entry.kind);
                  const distMeters = entry.requiresDestination
                    ? Math.max(
                        120,
                        Math.round(Math.hypot(dest.x - playerPos.x, dest.z - playerPos.z) * 10)
                      )
                    : 450;
                  const chosenPkgId =
                    selectedPkgByKind[entry.kind] ?? entry.packageOptions?.[0]?.id;
                  const chosenPkg = entry.packageOptions?.find((p) => p.id === chosenPkgId);
                  const fare = calculateServiceFare(
                    entry,
                    distMeters,
                    chosenPkg?.extraCostCedis ?? 0
                  );
                  const canAfford = characterState.moneyCedis >= fare;

                  return (
                    <div
                      key={entry.kind}
                      className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-amber-400 font-medium">
                              {entry.dagbaniTitle} · {entry.speedHint}
                            </div>
                            <h3 className="text-sm font-bold text-[#f8f5ef]">{entry.title}</h3>
                          </div>
                          <div className="text-right font-mono-num shrink-0">
                            <div className="text-sm font-bold text-amber-400">GH₵ {fare}</div>
                          </div>
                        </div>

                        <p className="text-xs text-[#b5ada0] leading-relaxed">
                          {entry.description}
                        </p>

                        {entry.requiresDestination && (
                          <div>
                            <label className="block text-[11px] text-[#9c9487] mb-1">
                              Drop-Off Destination
                            </label>
                            <select
                              value={dest.id}
                              onChange={(e) =>
                                setSelectedDestByKind((prev) => ({
                                  ...prev,
                                  [entry.kind]: e.target.value,
                                }))
                              }
                              className="w-full min-h-[42px] bg-[#120f0d] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-[#f8f5ef]"
                            >
                              {TAMALE_LANDMARKS.map((lm) => (
                                <option key={lm.id} value={lm.id}>
                                  {lm.name} ({lm.district})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {entry.packageOptions && entry.packageOptions.length > 0 && (
                          <div>
                            <label className="block text-[11px] text-[#9c9487] mb-1">
                              Select Order Package
                            </label>
                            <select
                              value={chosenPkgId}
                              onChange={(e) =>
                                setSelectedPkgByKind((prev) => ({
                                  ...prev,
                                  [entry.kind]: e.target.value,
                                }))
                              }
                              className="w-full min-h-[42px] bg-[#120f0d] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-[#f8f5ef]"
                            >
                              {entry.packageOptions.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>
                                  {pkg.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() =>
                          onDispatchService(
                            entry.kind,
                            entry.requiresDestination ? dest.id : undefined,
                            chosenPkg?.id
                          )
                        }
                        className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#071c0e] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {entry.requiresDestination ? (
                          <Bike className="w-4 h-4" />
                        ) : (
                          <PackageCheck className="w-4 h-4" />
                        )}
                        <span>
                          {canAfford
                            ? `Dispatch Now · GH₵ ${fare}`
                            : `Need GH₵ ${fare}`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BUSINESSES & GPS */}
          {tab === "businesses" && (
            <div className="space-y-3">
              <div className="text-xs text-[#b5ada0]">
                Co-own active Tamale businesses to collect daily midnight dividends in GH₵, or
                navigate straight to any shop during opening hours.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {businessesList.map((shop) => {
                  const { isOpen, hoursLabel } = isShopOpenAtMinutes(shop.id, gameMinutes);
                  const isOwned = characterState.ownedBusinessIds.includes(shop.id);
                  const sharePrice = shop.buyableSharePrice ?? 350;
                  const dailyRev = shop.dailyRevenueCedis ?? 35;
                  const landmark = TAMALE_LANDMARKS.find((l) => l.shopId === shop.id);
                  const canInvest = !isOwned && characterState.moneyCedis >= sharePrice;

                  return (
                    <div
                      key={shop.id}
                      className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className={isOpen ? "text-emerald-400 font-semibold" : "text-rose-300"}>
                            {isOpen ? "Open Now" : "Closed"} · {hoursLabel}
                          </span>
                          <span className="text-[#9c9487] font-mono-num">
                            +{dailyRev} GH₵/day
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[#f8f5ef]">{shop.title}</div>
                        <div className="text-xs text-amber-400">
                          {shop.dagbaniTitle} · {shop.district}
                        </div>
                        <div className="text-xs text-[#9c9487]">{shop.authenticityNote}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          disabled={isOwned || !canInvest}
                          onClick={() => onInvestBusiness(shop.id)}
                          className={`min-h-[42px] flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                            isOwned
                              ? "bg-emerald-500/20 border border-emerald-500/35 text-emerald-200"
                              : "bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-[#7c7468] text-[#12100e]"
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>
                            {isOwned
                              ? `Co-Owner (+GH₵ ${dailyRev}/day)`
                              : `Invest · GH₵ ${sharePrice}`}
                          </span>
                        </button>

                        {landmark && (
                          <button
                            type="button"
                            onClick={() => onFastTravelLandmark(landmark)}
                            className="min-h-[42px] px-3 py-1.5 rounded-xl bg-[#26201b] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#ede8de] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 text-amber-400" />
                            <span>Visit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: QUICK CHARACTER SWITCH & FRIENDSHIPS */}
          {tab === "characters" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLAYABLE_CHARACTERS.map((profile) => {
                  const st = allCharacterStates[profile.id];
                  const isActive = profile.id === activeProfile.id;
                  return (
                    <div
                      key={profile.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                        isActive
                          ? "bg-[#241d15] border-amber-500/65"
                          : "bg-[#1f1a16] border-white/10"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-bold text-[#f8f5ef]">{profile.name}</div>
                          <div className="font-mono-num text-xs font-bold text-amber-400">
                            GH₵ {st?.moneyCedis ?? profile.startingMoney}
                          </div>
                        </div>
                        <div className="text-xs text-amber-300/90">{profile.occupation}</div>
                        <div className="text-[11px] text-[#9c9487] flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{profile.homeDistrict}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSwitchCharacter(profile.id)}
                          className={`min-h-[42px] flex-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                            isActive
                              ? "bg-emerald-600/25 border border-emerald-500/40 text-emerald-200"
                              : "bg-amber-500 hover:bg-amber-400 text-[#12100e]"
                          }`}
                        >
                          {isActive ? "Active Resident" : `Switch to ${profile.nickname}`}
                        </button>
                        {isActive && (
                          <button
                            type="button"
                            onClick={onOpenCustomize}
                            className="min-h-[42px] px-3 py-1.5 rounded-xl bg-[#26201b] hover:bg-white/10 border border-white/10 text-xs text-[#e8e2d7] flex items-center gap-1 cursor-pointer"
                          >
                            <Palette className="w-3.5 h-3.5 text-amber-400" />
                            <span>Look</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#120f0d] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="text-xs font-semibold text-amber-400">
                  Tamale Neighbour Relationships ({activeProfile.nickname})
                </div>
                <div className="flex flex-wrap gap-2">
                  {TAMALE_NPCS.map((npc) => {
                    const level = characterState.friendships[npc.id] ?? 1;
                    return (
                      <div
                        key={npc.id}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1f1a16] border border-white/10 text-xs"
                      >
                        <span className="text-[#f8f5ef] font-medium">{npc.name}</span>{" "}
                        <span className="font-mono-num text-amber-400">Lv.{level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SKILLS, ACHIEVEMENTS & PHOTO ALBUM */}
          {tab === "skills" && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  {activeProfile.name}&apos;s Skills · {rank.title} (Tier {rank.tier})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SKILL_DISPLAY.map((sk) => {
                    const val = characterState.skills[sk.key] ?? 1;
                    return (
                      <div
                        key={sk.key}
                        className="p-3 rounded-xl bg-[#1f1a16] border border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#f8f5ef]">{sk.label}</span>
                          <span className="font-mono-num font-bold text-amber-400">
                            {val} / 10
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#120f0d] overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${Math.min(100, val * 10)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-[#9c9487]">{sk.hint}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Tamale Milestones ({characterState.achievements.length}/
                  {TAMALE_ACHIEVEMENTS.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TAMALE_ACHIEVEMENTS.map((ach) => {
                    const unlocked = characterState.achievements.includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          unlocked
                            ? "bg-emerald-950/25 border-emerald-500/35"
                            : "bg-[#1a1612] border-white/8 opacity-75"
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            unlocked ? "text-emerald-400" : "text-[#6e675d]"
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold text-[#f8f5ef]">
                            {ach.title}{" "}
                            <span className="text-amber-300 font-normal">({ach.dagbaniHint})</span>
                          </div>
                          <div className="text-[11px] text-[#9c9487]">{ach.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Field Photo Album ({characterState.capturedPhotos.length})</span>
                </div>
                {characterState.capturedPhotos.length === 0 ? (
                  <div className="text-xs text-[#9c9487] p-4 rounded-xl bg-[#1f1a16] border border-white/10">
                    Accept a Photo &amp; Press job from the Jobs tab to capture real 3D photographs
                    of Tamale landmarks.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {characterState.capturedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="rounded-xl overflow-hidden border border-white/10 bg-[#1f1a16]"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.title}
                          className="w-full h-36 object-cover"
                        />
                        <div className="p-2.5">
                          <div className="text-xs font-semibold text-[#f8f5ef] truncate">
                            {photo.title}
                          </div>
                          <div className="text-[11px] text-[#9c9487] font-mono-num">
                            {photo.district} · {photo.capturedAtClock}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
