import React, { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  History,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import {
  INITIAL_CITY_EVENT_DESCRIPTIONS,
  TAMALE_EVENTS,
  TAMALE_HISTORICAL_TIMELINE,
} from "../data/tamaleExpansionData";
import {
  ActiveCityEventMode,
  CityEventCategory,
  CityEventVerification,
} from "../types/game";

interface TamaleEventsModalProps {
  activeCityEvent: ActiveCityEventMode;
  onSelectCityEvent: (mode: ActiveCityEventMode) => void;
  onJumpToLandmark?: (landmarkId: string) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Array<{ id: "all" | CityEventCategory; label: string }> = [
  { id: "all", label: "All Events" },
  { id: "traditional", label: "Traditional" },
  { id: "religious", label: "Religious" },
  { id: "social", label: "Social & Community" },
  { id: "educational", label: "Educational & Youth" },
  { id: "business", label: "Business & Markets" },
  { id: "sports_entertainment", label: "Sports & Arts" },
];

function getVerificationBadge(status: CityEventVerification): {
  label: string;
  classes: string;
} {
  switch (status) {
    case "verified-historical":
      return {
        label: "Verified Record",
        classes: "text-emerald-300 border-emerald-500/40 bg-emerald-950/40",
      };
    case "lunar-dependent-no-fixed-date":
      return {
        label: "Lunar Calendar · Date Announced Annually",
        classes: "text-amber-300 border-amber-500/40 bg-amber-950/40",
      };
    case "annual-recurring":
      return {
        label: "Annual Civic / Seasonal Cycle",
        classes: "text-sky-300 border-sky-500/40 bg-sky-950/40",
      };
    case "date-announced":
      return {
        label: "Scheduled Fixture",
        classes: "text-indigo-300 border-indigo-500/40 bg-indigo-950/40",
      };
    default:
      return {
        label: "Representative Simulation",
        classes: "text-stone-300 border-stone-500/40 bg-stone-900/60",
      };
  }
}

export const TamaleEventsModal: React.FC<TamaleEventsModalProps> = ({
  activeCityEvent,
  onSelectCityEvent,
  onJumpToLandmark,
  onClose,
}) => {
  const [tab, setTab] = useState<"events" | "timeline" | "simulation">("events");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CityEventCategory>("all");

  const filteredEvents = useMemo(() => {
    if (categoryFilter === "all") return TAMALE_EVENTS;
    return TAMALE_EVENTS.filter((e) => e.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-5xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Tamale City Events, Cultural Calendar &amp; History</span>
            </h2>
            <p className="text-xs text-[#b5ada0] mt-0.5">
              Lunar festivals state seasonal cycles honestly without inventing fixed Gregorian dates · Active Mode:{" "}
              <span className="text-amber-300 font-medium">
                {INITIAL_CITY_EVENT_DESCRIPTIONS[activeCityEvent].label}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-white/10 flex flex-wrap items-center gap-2 bg-[#12100e]">
          <button
            type="button"
            onClick={() => setTab("events")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === "events"
                ? "bg-amber-500 text-[#12100e] font-semibold"
                : "text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            City Events ({TAMALE_EVENTS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("timeline")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === "timeline"
                ? "bg-amber-500 text-[#12100e] font-semibold"
                : "text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historical Timeline (1907–2023)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("simulation")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === "simulation"
                ? "bg-amber-500 text-[#12100e] font-semibold"
                : "text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live 3D City Event Mode</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "events" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_LABELS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id)}
                    className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                      categoryFilter === c.id
                        ? "bg-white/20 text-white font-semibold"
                        : "bg-[#12100e] text-[#bfb7aa] border border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEvents.map((ev) => {
                  const badge = getVerificationBadge(ev.verificationStatus);
                  const isModeActive = ev.activeModeId && activeCityEvent === ev.activeModeId;
                  return (
                    <div
                      key={ev.id}
                      className="bg-[#12100e] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between"
                    >
                      {ev.referenceImagePath && (
                        <div className="h-36 bg-[#0b0a08] border-b border-white/10 overflow-hidden">
                          <img
                            src={ev.referenceImagePath}
                            alt={ev.name}
                            className="w-full h-full object-cover opacity-90"
                          />
                        </div>
                      )}
                      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded border ${badge.classes}`}>
                              {badge.label}
                            </span>
                            {ev.dagbaniName && (
                              <span className="text-xs font-medium text-amber-400">
                                {ev.dagbaniName}
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-base font-bold text-[#f8f5ef]">
                            {ev.name}
                          </h3>
                          <p className="text-xs text-[#cfc8bc] leading-relaxed">
                            {ev.description}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-white/10 space-y-1.5 text-[11px] text-[#a39b8e]">
                          <div className="flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{ev.dateOrCycle}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>
                              {ev.location} · Organiser: {ev.organisingInstitution}
                            </span>
                          </div>
                          <div className="text-[#e6dfd3] bg-[#1c1814] border border-white/8 rounded px-2.5 py-1.5">
                            City Effect: {ev.cityEffectSummary}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                            <div className="flex items-center gap-2">
                              {ev.activeModeId && (
                                <button
                                  type="button"
                                  onClick={() => onSelectCityEvent(ev.activeModeId!)}
                                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                    isModeActive
                                      ? "bg-emerald-500 text-[#0c140e]"
                                      : "bg-amber-500 hover:bg-amber-400 text-[#12100e]"
                                  }`}
                                >
                                  {isModeActive ? "Active in City" : "Experience in 3D City"}
                                </button>
                              )}
                              {ev.landmarkId && onJumpToLandmark && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onJumpToLandmark(ev.landmarkId!);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1.5 rounded text-xs bg-[#241f1a] hover:bg-[#322b24] text-[#ede8de] border border-white/10 cursor-pointer"
                                >
                                  Go to Venue
                                </button>
                              )}
                            </div>
                            <a
                              href={ev.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                            >
                              <span>Source</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "timeline" && (
            <div className="space-y-3 max-w-3xl mx-auto">
              <p className="text-xs text-[#b5ada0] mb-4">
                Documented civic, architectural, and cultural milestones shaping modern Tamale.
              </p>
              {TAMALE_HISTORICAL_TIMELINE.map((m) => (
                <div
                  key={m.year + m.title}
                  className="bg-[#12100e] border border-white/10 rounded-xl p-4 flex gap-4 items-start"
                >
                  <div className="font-mono-num text-lg font-bold text-amber-400 bg-[#1e1914] border border-amber-500/30 rounded-lg px-3 py-1.5 shrink-0">
                    {m.year}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-bold text-[#f8f5ef]">{m.title}</h3>
                    <p className="text-xs text-[#cfc8bc] leading-relaxed">{m.description}</p>
                    <div className="text-[11px] text-[#9c9487] pt-1">
                      {m.location} · {m.sourceNote}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "simulation" && (
            <div className="space-y-4">
              <p className="text-xs text-[#cfc8bc] leading-relaxed max-w-2xl">
                Switch the live 3D Tamale environment between everyday life and major cultural or civic occasions. Selecting an event transforms venues around Dakpema Palace, Central Mosque, Jubilee Park, Central Market, and Aliu Mahama Stadium in real time.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(INITIAL_CITY_EVENT_DESCRIPTIONS) as ActiveCityEventMode[]).map(
                  (modeKey) => {
                    const info = INITIAL_CITY_EVENT_DESCRIPTIONS[modeKey];
                    const selected = activeCityEvent === modeKey;
                    return (
                      <button
                        key={modeKey}
                        type="button"
                        onClick={() => onSelectCityEvent(modeKey)}
                        className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                          selected
                            ? "bg-[#261f16] border-amber-500 text-[#f8f5ef]"
                            : "bg-[#12100e] border-white/10 text-[#cfc8bc] hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-display text-sm font-bold text-[#f8f5ef]">
                            {info.label}
                          </span>
                          {selected && (
                            <span className="text-[11px] font-semibold text-amber-400">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#b5ada0] leading-relaxed">{info.shortNote}</p>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
