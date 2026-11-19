import React from "react";
import { Calendar, Camera, MapPin, X } from "lucide-react";

interface AboutTamaleModalProps {
  onOpenReferences: () => void;
  onOpenEvents: () => void;
  onClose: () => void;
}

export const AboutTamaleModal: React.FC<AboutTamaleModalProps> = ({
  onOpenReferences,
  onOpenEvents,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[90dvh] bg-[#171411] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-amber-400">
              Northern Region, Ghana · Geographic &amp; Cultural Simulation
            </div>
            <h2 className="font-display text-xl font-bold text-[#f8f5ef]">About Tamale 3D</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close About Tamale"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-[#dfd8cd] leading-relaxed">
          <p>
            <strong className="text-[#f8f5ef]">Tamale 3D</strong> is a living cultural simulation of
            Tamale, capital of Ghana&apos;s Northern Region—built around everyday work, markets,
            Dagbon heritage, Pragya &amp; motorcycle transport, evening chop bars, and Dagbani
            conversation.
          </p>

          <div className="bg-[#201b17] border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <MapPin className="w-4 h-4" />
              <span>Geographic Structure &amp; Transparent Scaling</span>
            </div>
            <p className="text-xs text-[#cfc8bc]">
              Anchored at <strong className="text-white">Naa Gbewaa Interchange</strong>{" "}
              (9.40379° N, 0.84202° W), the continuous city map connects 17 real Tamale communities—
              Dagbandabo Fong, Aboabo, Tishigu, Kalpohin, Gumani, Jakarayili, Kukuo, Vittin,
              Dabokpaa, Lamashegu, Kakpagyili, Nyohini, Sagnarigu, Choggu, Gumbihini, Kanvilli, and
              Dungu—using a consistent <strong className="text-white">1 unit ≈ 10 metres</strong>{" "}
              corridor scale preserving real bearings and spatial relationships.
            </p>
          </div>

          <div className="bg-[#201b17] border border-white/10 rounded-xl p-4 space-y-1.5">
            <div className="text-xs font-semibold text-amber-400">
              Dagbani Language &amp; Cultural Preservation
            </div>
            <p className="text-xs text-[#cfc8bc]">
              Every resident speaks verified Dagbani expressions using authentic orthography
              (ɛ, ɔ, ɣ, ŋ), time-of-day schedules, and regional market rhythms—from Central Market
              and Kukuo pottery yards to SCCA &amp; Red Clay and evening High Street eateries.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReferences();
              }}
              className="min-h-[44px] px-4 py-2 bg-[#26201b] hover:bg-white/10 border border-white/10 rounded-xl text-xs sm:text-sm font-medium text-[#f8f5ef] flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>View Real Tamale Photo Archive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEvents();
              }}
              className="min-h-[44px] px-4 py-2 bg-[#26201b] hover:bg-white/10 border border-white/10 rounded-xl text-xs sm:text-sm font-medium text-[#f8f5ef] flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Explore Tamale Events &amp; History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
