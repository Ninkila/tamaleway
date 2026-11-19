import React, { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Target,
  Utensils,
  Wrench,
  X,
} from "lucide-react";
import { ActiveTaskRuntime, CapturedPhotoRecord } from "../types/game";

interface WorkAndActivityModalProps {
  task: ActiveTaskRuntime;
  district: string;
  gameMinutesFormatted: string;
  onCaptureSnapshot: () => string;
  onCompleteActivity: (result: {
    bonusCedis?: number;
    photoRecord?: CapturedPhotoRecord;
  }) => void;
  onClose: () => void;
}

const KITCHEN_MENU_ITEMS = [
  { id: "sagim", label: "Hot Tuo Zaafi & Ayoyo", dagbani: "Saɣim" },
  { id: "waakye", label: "Sorghum-Leaf Waakye", dagbani: "Bɛŋa ni Shinkaafa" },
  { id: "fried_chicken", label: "Fried Chicken & Jollof", dagbani: "Noo ni Shinkaafa" },
  { id: "sobolo", label: "Chilled Ginger Sobolo", dagbani: "Sobolo Kom" },
  { id: "sugar_bread", label: "Warm Tamale Sugar Bread", dagbani: "Paano" },
  { id: "shea_jar", label: "Golden Shea Butter Jar", dagbani: "Kpakpili" },
];

const REPAIR_STEPS = [
  {
    id: "carb",
    part: "Fuel & Carburettor Jet",
    symptom: "Engine sputters at low idle near roundabout",
    actionLabel: "Clean Jet & Set Idle Screw",
  },
  {
    id: "spark",
    part: "Ignition Spark Plug",
    symptom: "Weak spark after morning harmattan dust",
    actionLabel: "Gap & Swap Fresh Spark Plug",
  },
  {
    id: "chain",
    part: "Drive Chain & Sprocket",
    symptom: "Loose chain slapping over speed humps",
    actionLabel: "Tension Chain & Grease Links",
  },
  {
    id: "tire",
    part: "Rear Tire & Valve Core",
    symptom: "Soft tread carrying passenger loads",
    actionLabel: "Patch Tube & Calibrate to 32 PSI",
  },
];

const BUSINESS_AUDIT_ROWS = [
  {
    id: "yam_crates",
    item: "Pona Yam Bundles (Central Market)",
    stockCount: 18,
    unitCost: 25,
    options: [410, 450, 490],
    correctTotal: 450,
  },
  {
    id: "shea_tins",
    item: "Pure Shea Butter Tins (Kukuo Co-op)",
    stockCount: 12,
    unitCost: 30,
    options: [340, 360, 390],
    correctTotal: 360,
  },
  {
    id: "smock_strips",
    item: "Batakari Woven Strips (Cultural Guild)",
    stockCount: 8,
    unitCost: 45,
    options: [320, 360, 405],
    correctTotal: 360,
  },
  {
    id: "sobolo_crates",
    item: "Ginger Sobolo Coolers (High St)",
    stockCount: 15,
    unitCost: 14,
    options: [195, 210, 225],
    correctTotal: 210,
  },
];

export const WorkAndActivityModal: React.FC<WorkAndActivityModalProps> = ({
  task,
  district,
  gameMinutesFormatted,
  onCaptureSnapshot,
  onCompleteActivity,
  onClose,
}) => {
  const mode = task.job.executionMode;

  // 1. Work Shift (Customer Orders)
  const shiftOrders = useMemo(() => {
    const startIdx = task.job.id.length % KITCHEN_MENU_ITEMS.length;
    return Array.from({ length: 5 }, (_, i) => {
      const item = KITCHEN_MENU_ITEMS[(startIdx + i * 2) % KITCHEN_MENU_ITEMS.length];
      return {
        orderNo: i + 1,
        customer: ["Amina", "Yakubu", "Zainab", "Mohammed", "Fati"][i],
        item,
      };
    });
  }, [task.job.id]);
  const [shiftIndex, setShiftIndex] = useState(0);
  const [shiftMistakes, setShiftMistakes] = useState(0);
  const [shiftFeedback, setShiftFeedback] = useState<string>(
    "Tap the matching item below to pack each Tamale customer order accurately."
  );

  // 2. Mechanic Repair Steps
  const [repairedStepIds, setRepairedStepIds] = useState<string[]>([]);

  // 3. Photo Survey
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState(task.job.targetLandmarkName + " · Field Study");

  useEffect(() => {
    if (mode === "photo_survey" && !capturedUrl) {
      try {
        const snap = onCaptureSnapshot();
        if (snap) setCapturedUrl(snap);
      } catch {
        // user can click capture manually
      }
    }
  }, [mode, capturedUrl, onCaptureSnapshot]);

  // 4. Sports Drill (Oscillating Timing Bar)
  const [cursorPos, setCursorPos] = useState(15);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [goalsScored, setGoalsScored] = useState(0);
  const [drillNote, setDrillNote] = useState(
    "Strike when the marker enters the green target zone (38–62) to score 3 of 5 shots!"
  );

  useEffect(() => {
    if (mode !== "sports_drill" || shotsTaken >= 5) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) * 0.0026;
      const pct = 50 + Math.sin(t) * 46;
      setCursorPos(pct);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [mode, shotsTaken]);

  // 5. Business Ledger Audit
  const [selectedTotals, setSelectedTotals] = useState<Record<string, number>>({});
  const [marginBoostApplied, setMarginBoostApplied] = useState(false);

  const handlePickShiftItem = (itemId: string) => {
    const current = shiftOrders[shiftIndex];
    if (!current) return;
    if (itemId === current.item.id) {
      const next = shiftIndex + 1;
      setShiftIndex(next);
      setShiftFeedback(`Served Order #${current.orderNo} (${current.item.label}) cleanly!`);
    } else {
      setShiftMistakes((m) => m + 1);
      setShiftFeedback(
        `Wrong tray — ${current.customer} asked for ${current.item.label} (${current.item.dagbani}).`
      );
    }
  };

  const handleShootBall = () => {
    if (shotsTaken >= 5) return;
    const inZone = cursorPos >= 36 && cursorPos <= 64;
    const nextShots = shotsTaken + 1;
    const nextGoals = inZone ? goalsScored + 1 : goalsScored;
    setShotsTaken(nextShots);
    setGoalsScored(nextGoals);
    setDrillNote(
      inZone
        ? `Goal! Clean finish into the corner (${nextGoals}/${nextShots}).`
        : `Saved by the keeper — aim closer to center (${nextGoals}/${nextShots}).`
    );
  };

  const handleTakePhoto = () => {
    const url = onCaptureSnapshot();
    setCapturedUrl(url);
  };

  const allLedgerMatched = BUSINESS_AUDIT_ROWS.every(
    (r) => selectedTotals[r.id] === r.correctTotal
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[92dvh] bg-[#171411] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-amber-400">
              {task.job.dagbaniTitle} · {task.job.targetLandmarkName}
            </div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef] truncate">
              {task.job.title}
            </h2>
            <div className="text-xs text-[#9c9487] font-mono-num mt-0.5">
              Reward: GH₵ {task.job.rewardCedis} · +{task.job.rewardCultureXp} Culture XP · +
              {task.job.skillReward.points} {task.job.skillReward.skill}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. WORK SHIFT MODE */}
          {mode === "work_shift" && (
            <div className="space-y-4">
              {shiftIndex < shiftOrders.length ? (
                <>
                  <div className="bg-[#120f0d] border border-amber-500/35 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-amber-400 font-mono-num">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Utensils className="w-4 h-4" />
                        Order {shiftIndex + 1} of {shiftOrders.length}
                      </span>
                      <span>Mistakes: {shiftMistakes}</span>
                    </div>
                    <div className="text-base font-bold text-[#f8f5ef]">
                      {shiftOrders[shiftIndex].customer}: “{shiftOrders[shiftIndex].item.label}”
                    </div>
                    <div className="text-xs text-[#b5ada0]">
                      Dagbani order: {shiftOrders[shiftIndex].item.dagbani}
                    </div>
                  </div>

                  <div className="text-xs text-[#cfc8bc]">{shiftFeedback}</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {KITCHEN_MENU_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handlePickShiftItem(item.id)}
                        className="min-h-[48px] p-3 rounded-xl bg-[#221d18] hover:bg-amber-500/15 border border-white/12 hover:border-amber-500/50 text-left transition-colors cursor-pointer"
                      >
                        <div className="text-xs sm:text-sm font-semibold text-[#f8f5ef]">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-amber-300/90">{item.dagbani}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-5 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div className="font-display text-lg font-bold text-[#f8f5ef]">
                    Counter Shift Complete!
                  </div>
                  <div className="text-xs text-[#cfc8bc]">
                    Served all 5 customers{" "}
                    {shiftMistakes === 0
                      ? "(Flawless service · +GH₵ 18 tip bonus!)"
                      : `(${shiftMistakes} minor mix-ups)`}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onCompleteActivity({ bonusCedis: shiftMistakes === 0 ? 18 : 0 })
                    }
                    className="min-h-[48px] px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-sm rounded-xl cursor-pointer"
                  >
                    Collect Shift Pay (GH₵{" "}
                    {task.job.rewardCedis + (shiftMistakes === 0 ? 18 : 0)})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. MECHANIC DISPATCH MODE */}
          {mode === "mechanic_dispatch" && (
            <div className="space-y-3.5">
              <div className="text-xs text-[#cfc8bc]">
                Complete all 4 hands-on workshop checks to restore the Bajaj Pragya / motorcycle
                engine to peak Tamale road condition.
              </div>
              {REPAIR_STEPS.map((step) => {
                const done = repairedStepIds.includes(step.id);
                return (
                  <div
                    key={step.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      done
                        ? "bg-emerald-950/25 border-emerald-500/35"
                        : "bg-[#201b17] border-white/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#f8f5ef] flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{step.part}</span>
                      </div>
                      <div className="text-xs text-[#9c9487] mt-0.5">{step.symptom}</div>
                    </div>
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => setRepairedStepIds((p) => [...p, step.id])}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        done
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500 hover:bg-amber-400 text-[#12100e]"
                      }`}
                    >
                      {done ? "Tuned & Verified" : step.actionLabel}
                    </button>
                  </div>
                );
              })}

              {repairedStepIds.length === REPAIR_STEPS.length && (
                <button
                  type="button"
                  onClick={() => onCompleteActivity({ bonusCedis: 15 })}
                  className="w-full min-h-[48px] py-3 bg-emerald-500 hover:bg-emerald-400 text-[#071c0e] font-bold text-sm rounded-xl cursor-pointer"
                >
                  Sign Off Repair &amp; Collect GH₵ {task.job.rewardCedis + 15} (+Tip)
                </button>
              )}
            </div>
          )}

          {/* 3. PHOTO SURVEY MODE */}
          {mode === "photo_survey" && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-white/15 bg-black aspect-video flex items-center justify-center">
                {capturedUrl ? (
                  <img
                    src={capturedUrl}
                    alt={photoTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-[#9c9487]">
                    Ready to snap 3D camera frame at {district}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b5ada0] mb-1">
                  Archive Photo Caption
                </label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  maxLength={64}
                  className="w-full min-h-[44px] bg-[#0e0c0a] border border-white/15 rounded-xl px-3.5 py-2 text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="min-h-[46px] px-4 py-2 bg-[#25201b] hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-semibold text-[#f8f5ef] rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>{capturedUrl ? "Retake Frame" : "Snap Live 3D Photo"}</span>
                </button>

                <button
                  type="button"
                  disabled={!capturedUrl}
                  onClick={() => {
                    if (!capturedUrl) return;
                    const record: CapturedPhotoRecord = {
                      id: "photo_" + Date.now(),
                      title: photoTitle.trim() || task.job.targetLandmarkName,
                      district,
                      landmarkId: task.job.targetLandmarkId,
                      dataUrl: capturedUrl,
                      capturedAtClock: gameMinutesFormatted,
                    };
                    onCompleteActivity({ photoRecord: record });
                  }}
                  className="min-h-[46px] flex-1 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Save Photo to Album &amp; Complete (GH₵ {task.job.rewardCedis})</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. SPORTS DRILL MODE */}
          {mode === "sports_drill" && (
            <div className="space-y-4">
              <div className="bg-[#120f0d] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono-num">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    Aliu Mahama Stadium Conditioning
                  </span>
                  <span className="text-[#f8f5ef]">
                    Goals: {goalsScored} / 3 needed · Shots: {shotsTaken} / 5
                  </span>
                </div>

                <div className="relative h-8 rounded-full bg-[#241f1a] border border-white/15 overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/35 border-x border-emerald-400"
                    style={{ left: "36%", width: "28%" }}
                  />
                  <div
                    className="absolute top-1 bottom-1 w-3 rounded-full bg-amber-400 shadow"
                    style={{ left: `calc(${cursorPos}% - 6px)` }}
                  />
                </div>

                <div className="text-xs text-[#cfc8bc]">{drillNote}</div>
              </div>

              {shotsTaken < 5 ? (
                <button
                  type="button"
                  onClick={handleShootBall}
                  className="w-full min-h-[50px] py-3 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-sm rounded-xl cursor-pointer"
                >
                  Strike Shot #{shotsTaken + 1}
                </button>
              ) : goalsScored >= 3 ? (
                <button
                  type="button"
                  onClick={() => onCompleteActivity({ bonusCedis: goalsScored === 5 ? 20 : 0 })}
                  className="w-full min-h-[50px] py-3 bg-emerald-500 hover:bg-emerald-400 text-[#071c0e] font-bold text-sm rounded-xl cursor-pointer"
                >
                  Finish Match Drill · Claim GH₵{" "}
                  {task.job.rewardCedis + (goalsScored === 5 ? 20 : 0)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShotsTaken(0);
                    setGoalsScored(0);
                    setDrillNote("Reset drill — score at least 3 shots inside the green zone.");
                  }}
                  className="w-full min-h-[48px] py-3 bg-[#26201b] hover:bg-white/10 border border-white/15 text-[#f8f5ef] font-semibold text-sm rounded-xl cursor-pointer"
                >
                  Retry 5-Shot Penalty Drill
                </button>
              )}
            </div>
          )}

          {/* 5. BUSINESS MANAGE MODE */}
          {mode === "business_manage" && (
            <div className="space-y-3.5">
              <div className="text-xs text-[#cfc8bc]">
                Verify each Tamale supply line (Quantity × Unit GH₵) to balance today&apos;s market
                cooperative books.
              </div>

              {BUSINESS_AUDIT_ROWS.map((row) => {
                const chosen = selectedTotals[row.id];
                const ok = chosen === row.correctTotal;
                return (
                  <div
                    key={row.id}
                    className="p-3.5 rounded-xl bg-[#201b17] border border-white/10 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-semibold text-[#f8f5ef]">
                        {row.item}
                      </div>
                      <div className="text-xs font-mono-num text-amber-300">
                        {row.stockCount} units × GH₵ {row.unitCost}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setSelectedTotals((prev) => ({ ...prev, [row.id]: opt }))
                          }
                          className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-mono-num font-semibold border cursor-pointer ${
                            chosen === opt
                              ? opt === row.correctTotal
                                ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                                : "bg-rose-500/25 border-rose-400 text-rose-200"
                              : "bg-[#14110f] border-white/10 text-[#cfc8bc] hover:bg-white/10"
                          }`}
                        >
                          GH₵ {opt}
                        </button>
                      ))}
                      {ok && (
                        <span className="self-center text-[11px] text-emerald-400 font-medium">
                          Balanced
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <label className="flex items-center gap-2.5 text-xs text-[#cfc8bc] p-2.5 rounded-lg bg-[#14110f] border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marginBoostApplied}
                  onChange={(e) => setMarginBoostApplied(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span>Approve fair cooperative restock pricing for afternoon traders (+GH₵ 12 bonus)</span>
              </label>

              <button
                type="button"
                disabled={!allLedgerMatched}
                onClick={() =>
                  onCompleteActivity({ bonusCedis: marginBoostApplied ? 12 : 0 })
                }
                className="w-full min-h-[48px] py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>
                  Submit Audited Ledger (GH₵{" "}
                  {task.job.rewardCedis + (marginBoostApplied ? 12 : 0)})
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
