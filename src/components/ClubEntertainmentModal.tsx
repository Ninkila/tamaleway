import React, { useEffect, useRef, useState } from "react";
import { Dices, RotateCcw, Sparkles, Trophy, X } from "lucide-react";

interface ClubEntertainmentModalProps {
  venueTitle: string;
  onGameComplete: (result: {
    game: "oware" | "ludo";
    won: boolean;
    xpEarned: number;
    energyBoost: number;
  }) => void;
  onClose: () => void;
}

// Traditional 12-pit Oware board: indices 0..5 = Player (bottom, left->right),
// indices 6..11 = Local Rival (top, right->left counter-clockwise).
const INITIAL_OWARE_PITS = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

const LUDO_TRACK_LEN = 20;

export const ClubEntertainmentModal: React.FC<ClubEntertainmentModalProps> = ({
  venueTitle,
  onGameComplete,
  onClose,
}) => {
  const [gameTab, setGameTab] = useState<"oware" | "ludo">("oware");
  const timeoutRef = useRef<number | null>(null);

  // --- OWARE STATE ---
  const [pits, setPits] = useState<number[]>(INITIAL_OWARE_PITS);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [owareTurn, setOwareTurn] = useState<"player" | "ai">("player");
  const [owareStatus, setOwareStatus] = useState(
    "Tap any of your bottom 6 houses to sow seeds counter-clockwise."
  );
  const [owareDone, setOwareDone] = useState(false);

  // --- LUDO STATE ---
  const [ludoPlayerPos, setLudoPlayerPos] = useState(0);
  const [ludoAiPos, setLudoAiPos] = useState(0);
  const [ludoTurn, setLudoTurn] = useState<"player" | "ai">("player");
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [ludoStatus, setLudoStatus] = useState("Roll the die to race around the Tamale lounge board.");
  const [ludoDone, setLudoDone] = useState(false);

  const clearPendingTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPendingTimer();
  }, []);

  const sowOwarePit = (
    board: number[],
    startPit: number,
    actor: "player" | "ai"
  ): { nextBoard: number[]; captured: number } => {
    const next = [...board];
    let seeds = next[startPit];
    next[startPit] = 0;
    let idx = startPit;
    while (seeds > 0) {
      idx = (idx + 1) % 12;
      if (idx === startPit) continue; // Classic Oware grand-slam skip
      next[idx] += 1;
      seeds -= 1;
    }
    let captured = 0;
    const inOpponentSide = (p: number) => (actor === "player" ? p >= 6 && p <= 11 : p >= 0 && p <= 5);
    let check = idx;
    while (inOpponentSide(check) && (next[check] === 2 || next[check] === 3)) {
      captured += next[check];
      next[check] = 0;
      check = (check + 11) % 12;
    }
    return { nextBoard: next, captured };
  };

  const handleResetOware = () => {
    clearPendingTimer();
    setPits(INITIAL_OWARE_PITS);
    setPlayerScore(0);
    setAiScore(0);
    setOwareTurn("player");
    setOwareDone(false);
    setOwareStatus("Fresh Oware match started! Your move.");
  };

  const handlePlayerOwareMove = (pitIdx: number) => {
    if (owareDone || owareTurn !== "player" || pits[pitIdx] === 0) return;
    const { nextBoard, captured } = sowOwarePit(pits, pitIdx, "player");
    const nextPlayerScore = playerScore + captured;
    setPits(nextBoard);
    setPlayerScore(nextPlayerScore);

    const remainingTotal = nextBoard.reduce((a, b) => a + b, 0);
    const aiHasMoves = nextBoard.slice(6, 12).some((s) => s > 0);
    if (nextPlayerScore >= 25 || remainingTotal <= 4 || !aiHasMoves) {
      const won = nextPlayerScore >= aiScore;
      setOwareDone(true);
      setOwareStatus(
        won
          ? `Victory in Oware! (${nextPlayerScore} – ${aiScore} seeds).`
          : `Match finished (${nextPlayerScore} – ${aiScore} seeds).`
      );
      onGameComplete({ game: "oware", won, xpEarned: won ? 20 : 10, energyBoost: 10 });
      return;
    }

    setOwareTurn("ai");
    setOwareStatus(
      captured > 0
        ? `Captured +${captured} seeds! Rival is planning their counter-move...`
        : "Sowed cleanly. Rival is thinking..."
    );

    clearPendingTimer();
    timeoutRef.current = window.setTimeout(() => {
      const aiChoices = [6, 7, 8, 9, 10, 11].filter((i) => nextBoard[i] > 0);
      if (aiChoices.length === 0) {
        setOwareDone(true);
        setOwareStatus(`No seeds on rival side — you win ${nextPlayerScore} – ${aiScore}!`);
        onGameComplete({ game: "oware", won: true, xpEarned: 20, energyBoost: 10 });
        return;
      }
      // Prefer capturing pit if available
      let chosen = aiChoices[Math.floor(Math.random() * aiChoices.length)];
      let bestCap = -1;
      for (const c of aiChoices) {
        const sim = sowOwarePit(nextBoard, c, "ai");
        if (sim.captured > bestCap) {
          bestCap = sim.captured;
          chosen = c;
        }
      }
      const aiRes = sowOwarePit(nextBoard, chosen, "ai");
      const nextAiScore = aiScore + aiRes.captured;
      setPits(aiRes.nextBoard);
      setAiScore(nextAiScore);

      const playerHasMoves = aiRes.nextBoard.slice(0, 6).some((s) => s > 0);
      const totalLeft = aiRes.nextBoard.reduce((a, b) => a + b, 0);
      if (nextAiScore >= 25 || totalLeft <= 4 || !playerHasMoves) {
        const won = nextPlayerScore >= nextAiScore;
        setOwareDone(true);
        setOwareStatus(
          won
            ? `Match won ${nextPlayerScore} – ${nextAiScore}!`
            : `Rival finished ahead (${nextPlayerScore} – ${nextAiScore}).`
        );
        onGameComplete({ game: "oware", won, xpEarned: won ? 20 : 10, energyBoost: 10 });
        return;
      }

      setOwareTurn("player");
      setOwareStatus(
        aiRes.captured > 0
          ? `Rival captured ${aiRes.captured} seeds from house ${chosen - 5}. Your move.`
          : `Rival played house ${chosen - 5}. Your move.`
      );
    }, 650);
  };

  const handleResetLudo = () => {
    clearPendingTimer();
    setLudoPlayerPos(0);
    setLudoAiPos(0);
    setLudoTurn("player");
    setLastRoll(null);
    setLudoDone(false);
    setLudoStatus("Fresh Ludo sprint started! Roll the die.");
  };

  const handlePlayerLudoRoll = () => {
    if (ludoDone || ludoTurn !== "player") return;
    const roll = Math.floor(Math.random() * 6) + 1;
    setLastRoll(roll);
    const nextPos = Math.min(LUDO_TRACK_LEN, ludoPlayerPos + roll);
    setLudoPlayerPos(nextPos);

    if (nextPos >= LUDO_TRACK_LEN) {
      setLudoDone(true);
      setLudoStatus(`Rolled ${roll} and reached Home Base first! Social Ludo Victory.`);
      onGameComplete({ game: "ludo", won: true, xpEarned: 18, energyBoost: 10 });
      return;
    }

    if (roll === 6) {
      setLudoStatus(`Rolled a 6! Bonus roll — advance again from square ${nextPos}/${LUDO_TRACK_LEN}.`);
      return;
    }

    setLudoTurn("ai");
    setLudoStatus(`Rolled ${roll} → Square ${nextPos}/${LUDO_TRACK_LEN}. Rival rolling...`);

    clearPendingTimer();
    timeoutRef.current = window.setTimeout(() => {
      const aiRoll = Math.floor(Math.random() * 6) + 1;
      const nextAiPos = Math.min(LUDO_TRACK_LEN, ludoAiPos + aiRoll);
      setLudoAiPos(nextAiPos);
      if (nextAiPos >= LUDO_TRACK_LEN) {
        setLudoDone(true);
        setLudoStatus(`Rival rolled ${aiRoll} and reached Home Base (${nextPos} vs ${nextAiPos}).`);
        onGameComplete({ game: "ludo", won: false, xpEarned: 10, energyBoost: 10 });
        return;
      }
      setLudoTurn("player");
      setLudoStatus(`Rival rolled ${aiRoll} → Square ${nextAiPos}/${LUDO_TRACK_LEN}. Your turn.`);
    }, 650);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-2xl bg-[#171411] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="px-5 py-4 border-b border-white/10 bg-[#120f0d] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-amber-400 truncate">
              {venueTitle} · Social Lounge Table (No-Money Play)
            </div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">
              Traditional Oware &amp; Ludo
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              clearPendingTimer();
              onClose();
            }}
            aria-label="Leave game table"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 border-b border-white/10 flex items-center justify-between gap-2 bg-[#1a1612]">
          <div className="flex items-center gap-2 pb-3">
            <button
              type="button"
              onClick={() => {
                clearPendingTimer();
                setGameTab("oware");
              }}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold cursor-pointer ${
                gameTab === "oware"
                  ? "bg-amber-500 text-[#12100e]"
                  : "bg-[#221d18] text-[#cfc8bc] hover:bg-white/10"
              }`}
            >
              Oware (Awale)
            </button>
            <button
              type="button"
              onClick={() => {
                clearPendingTimer();
                setGameTab("ludo");
              }}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold cursor-pointer ${
                gameTab === "ludo"
                  ? "bg-amber-500 text-[#12100e]"
                  : "bg-[#221d18] text-[#cfc8bc] hover:bg-white/10"
              }`}
            >
              Tamale Ludo
            </button>
          </div>
          <div className="pb-3 text-[11px] text-emerald-300 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>0 GH₵ Wager · Culture XP &amp; +10% Mood</span>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {gameTab === "oware" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 font-mono-num">
                <div className="p-3 rounded-xl bg-[#1f1a16] border border-emerald-500/35">
                  <div className="text-[11px] text-[#b5ada0]">Your Captured Seeds</div>
                  <div className="text-lg font-bold text-emerald-300">{playerScore}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#1f1a16] border border-white/10">
                  <div className="text-[11px] text-[#b5ada0]">Lounge Rival Seeds</div>
                  <div className="text-lg font-bold text-amber-300">{aiScore}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#271d14] border border-amber-500/30 space-y-3">
                <div className="text-[11px] text-[#bfb7aa]">Rival&apos;s Row (Top Houses)</div>
                <div className="grid grid-cols-6 gap-2">
                  {[11, 10, 9, 8, 7, 6].map((idx) => (
                    <div
                      key={idx}
                      className="min-h-[54px] rounded-xl bg-[#16110d] border border-white/12 flex flex-col items-center justify-center font-mono-num"
                    >
                      <span className="text-base font-bold text-amber-300">{pits[idx]}</span>
                      <span className="text-[10px] text-[#8c8478]">H{idx - 5}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-emerald-300 pt-1">
                  Your Row (Tap a house to sow counter-clockwise)
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={owareDone || owareTurn !== "player" || pits[idx] === 0}
                      onClick={() => handlePlayerOwareMove(idx)}
                      className="min-h-[58px] rounded-xl bg-[#1f1a16] hover:bg-amber-500/20 disabled:opacity-45 border border-amber-500/35 flex flex-col items-center justify-center font-mono-num cursor-pointer"
                    >
                      <span className="text-base font-bold text-[#f8f5ef]">{pits[idx]}</span>
                      <span className="text-[10px] text-amber-300">P{idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#120f0d] border border-white/10 text-xs text-[#e5dfd5] flex items-center gap-2">
                {owareDone && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
                <span>{owareStatus}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetOware}
                  className="min-h-[44px] flex-1 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearPendingTimer();
                    onClose();
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-[#241f1a] hover:bg-white/10 border border-white/15 text-[#ede8de] font-semibold text-xs cursor-pointer"
                >
                  Leave Table
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 font-mono-num">
                <div className="p-3 rounded-xl bg-[#1f1a16] border border-emerald-500/35">
                  <div className="text-[11px] text-[#b5ada0]">Your Token Progress</div>
                  <div className="text-lg font-bold text-emerald-300">
                    {ludoPlayerPos} / {LUDO_TRACK_LEN}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#1f1a16] border border-white/10">
                  <div className="text-[11px] text-[#b5ada0]">Rival Token Progress</div>
                  <div className="text-lg font-bold text-amber-300">
                    {ludoAiPos} / {LUDO_TRACK_LEN}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1f1a16] border border-white/10 space-y-3">
                <div className="grid grid-cols-10 gap-1.5">
                  {Array.from({ length: LUDO_TRACK_LEN }, (_, idx) => {
                    const sq = idx + 1;
                    const hasP = ludoPlayerPos === sq;
                    const hasAi = ludoAiPos === sq;
                    return (
                      <div
                        key={sq}
                        className={`h-9 rounded-lg border flex items-center justify-center text-[10px] font-mono-num font-bold ${
                          sq === LUDO_TRACK_LEN
                            ? "bg-amber-500/25 border-amber-400 text-amber-200"
                            : "bg-[#120f0d] border-white/10 text-[#9c9487]"
                        }`}
                      >
                        {hasP && hasAi ? "P·R" : hasP ? "YOU" : hasAi ? "RIV" : sq}
                      </div>
                    );
                  })}
                </div>
                {lastRoll !== null && (
                  <div className="text-xs font-mono-num text-amber-300 text-center">
                    Last Die Roll: {lastRoll}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#120f0d] border border-white/10 text-xs text-[#e5dfd5]">
                {ludoStatus}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={ludoDone || ludoTurn !== "player"}
                  onClick={handlePlayerLudoRoll}
                  className="min-h-[46px] flex-1 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-[#071c0e] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{ludoTurn === "player" ? "Roll Die" : "Rival Turn..."}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetLudo}
                  className="min-h-[46px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
