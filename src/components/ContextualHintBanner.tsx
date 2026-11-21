import React from "react";
import { ContextualHintPayload } from "../types/game";

interface ContextualHintBannerProps {
  hint: ContextualHintPayload | null;
  onDismissOnboarding?: () => void;
}

export const ContextualHintBanner: React.FC<ContextualHintBannerProps> = ({
  hint,
  onDismissOnboarding,
}) => {
  if (!hint) return null;

  const borderClass =
    hint.tone === "emerald"
      ? "border-emerald-400/45 bg-[#121c16]/90 text-emerald-100"
      : hint.tone === "sky"
      ? "border-sky-400/40 bg-[#121820]/90 text-sky-100"
      : "border-amber-400/45 bg-[#171310]/90 text-[#f8f5ef]";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border shadow-lg transition-all duration-200 max-w-[88vw] ${borderClass}`}
    >
      {hint.keyCap && (
        <span className="font-mono-num text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500 text-[#12100e] whitespace-nowrap shrink-0">
          {hint.keyCap}
        </span>
      )}
      <span className="text-xs font-medium tracking-tight truncate">{hint.text}</span>
      {hint.priority === "onboarding" && onDismissOnboarding && (
        <button
          type="button"
          onClick={onDismissOnboarding}
          title="Hide tutorial hints"
          className="text-[11px] font-semibold text-[#b5ada0] hover:text-white pl-1.5 border-l border-white/15 shrink-0 cursor-pointer"
        >
          Hide
        </button>
      )}
    </div>
  );
};
