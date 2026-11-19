import React from "react";
import { Compass, MapPin, ShieldCheck, Store, X } from "lucide-react";
import { LandmarkData } from "../types/game";

interface DiscoveryCardOverlayProps {
  landmark: LandmarkData;
  onClose: () => void;
}

export const DiscoveryCardOverlay: React.FC<DiscoveryCardOverlayProps> = ({
  landmark,
  onClose,
}) => {
  return (
    <div className="fixed top-20 right-3 sm:right-4 z-30 w-[min(92vw,340px)] pointer-events-auto bg-[#171411]/95 border border-amber-500/45 rounded-xl shadow-2xl overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-start justify-between gap-2 bg-[#120f0d]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
            {landmark.isRepresentativeFictional ? (
              <span className="inline-flex items-center gap-1 text-sky-300">
                <Store className="w-3 h-3" />
                <span>Representative Neighbourhood Business</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Tamale Landmark</span>
              </span>
            )}
          </div>
          <h3 className="font-display text-sm font-bold text-[#f8f5ef] truncate mt-0.5">
            {landmark.name}
          </h3>
          <div className="text-[11px] text-amber-400 truncate">
            {landmark.dagbaniLabel} · {landmark.district}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss landmark card"
          className="p-1 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {landmark.referenceImagePath && (
        <div className="relative bg-black/50 border-b border-white/10">
          <img
            src={landmark.referenceImagePath}
            alt={landmark.name}
            className="w-full h-32 object-cover"
          />
          <div className="px-2.5 py-1 bg-black/75 text-[10px] text-[#cfc8bc]">
            Real Tamale Reference Photo · Wikimedia Commons / Field Reference
          </div>
        </div>
      )}

      <div className="p-3.5 space-y-2">
        {(landmark.osmCoords || landmark.realDistanceFromInterchangeKm !== undefined) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#b5ada0] font-mono-num">
            {landmark.osmCoords && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                {landmark.osmCoords}
              </span>
            )}
            {landmark.realDistanceFromInterchangeKm !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Compass className="w-3 h-3 text-emerald-400" />
                {landmark.realDistanceFromInterchangeKm.toFixed(2)} km from Interchange
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-[#dfd8cd] leading-relaxed">
          {landmark.historicalSignificance || landmark.authenticityNote}
        </p>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-[#12100e] transition-colors cursor-pointer"
          >
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
