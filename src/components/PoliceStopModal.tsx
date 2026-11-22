import React from "react";
import { AlertTriangle, Banknote, ShieldAlert, Smartphone, ShieldCheck } from "lucide-react";
import { PoliceStopNotice } from "../types/game";

interface PoliceStopModalProps {
  notice: PoliceStopNotice;
  moneyCedis: number;
  momoBalanceCedis: number;
  isDriving: boolean;
  onResolve: (action: "pay_cash" | "pay_momo" | "accept_warning" | "impound") => void;
}

export const PoliceStopModal: React.FC<PoliceStopModalProps> = ({
  notice,
  moneyCedis,
  momoBalanceCedis,
  isDriving,
  onResolve,
}) => {
  const canPayCash = moneyCedis >= notice.fineCedis;
  const canPayMomo = momoBalanceCedis >= notice.fineCedis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-3 sm:p-5">
      <div className="w-full max-w-lg bg-[#171411] border border-red-500/45 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 bg-[#14161e] flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600/25 border border-blue-400/50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-blue-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
              Ghana Police Service · Tamale MTTD
            </div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef] truncate">
              {notice.title}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#1f1a16] border border-white/10 space-y-1.5">
            <div className="text-xs font-semibold text-amber-300">{notice.officerName}</div>
            <p className="text-sm text-[#e5dfd5] leading-relaxed">{notice.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono-num">
            <div className="p-3 rounded-xl bg-[#120f0d] border border-white/10">
              <div className="text-[11px] text-[#9c9487]">Citation Amount</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {notice.warningEligible ? "GH₵ 0 (1st Warning)" : `GH₵ ${notice.fineCedis}`}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#120f0d] border border-white/10">
              <div className="text-[11px] text-[#9c9487]">Recorded Offenses</div>
              <div className="text-base font-bold text-[#f8f5ef] mt-0.5">
                {notice.offenseCountAfter}
              </div>
            </div>
          </div>

          {notice.impoundRisk && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/45 text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>
                Repeat traffic violations carry impound risk. Settle the fine below or surrender the
                vehicle to Tamale Central Police HQ yard.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num text-[#cfc8bc] pt-1">
            <span>Cash: GH₵ {moneyCedis}</span>
            <span>MoMo: GH₵ {momoBalanceCedis}</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {notice.warningEligible && (
              <button
                type="button"
                onClick={() => onResolve("accept_warning")}
                className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#071c0e] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Accept Official 1st Warning</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canPayCash}
              onClick={() => onResolve("pay_cash")}
              className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#12100e] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>
                {canPayCash
                  ? `Pay Fine in Cash · GH₵ ${notice.fineCedis}`
                  : `Insufficient Cash (Need GH₵ ${notice.fineCedis})`}
              </span>
            </button>

            <button
              type="button"
              disabled={!canPayMomo}
              onClick={() => onResolve("pay_momo")}
              className="min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/35 disabled:opacity-40 border border-yellow-400/45 text-yellow-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>
                {canPayMomo
                  ? `Pay Fine via MoMo · GH₵ ${notice.fineCedis}`
                  : `Insufficient MoMo (Need GH₵ ${notice.fineCedis})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onResolve("impound")}
              className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-[#241c1a] hover:bg-red-950/60 border border-red-500/35 text-red-200 font-semibold text-xs cursor-pointer"
            >
              {isDriving
                ? "Surrender Vehicle to Police HQ Impound Yard (Release later at Station)"
                : "Accept Impound / Record Fine at Tamale Police HQ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
