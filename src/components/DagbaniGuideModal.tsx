import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { DAGBANI_DATABASE } from "../data/dagbaniDatabase";
import { DagbaniEntry } from "../types/game";

interface DagbaniGuideModalProps {
  learnedVocabIds: string[];
  onClose: () => void;
}

const CATEGORIES: Array<{ id: "all" | DagbaniEntry["category"]; label: string }> = [
  { id: "all", label: "All Expressions" },
  { id: "greetings", label: "Greetings" },
  { id: "market", label: "Market & Money" },
  { id: "food_culture", label: "Food & Culture" },
  { id: "directions", label: "Places & Roads" },
  { id: "proverbs", label: "Proverbs" },
];

export const DagbaniGuideModal: React.FC<DagbaniGuideModalProps> = ({
  learnedVocabIds,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | DagbaniEntry["category"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DAGBANI_DATABASE.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.dagbani.toLowerCase().includes(q) ||
        entry.english.toLowerCase().includes(q) ||
        entry.usageNote.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">
              Dagbani Language &amp; Cultural Preservation Guide
            </h2>
            <div className="text-xs text-[#b5ada0]">
              Consistent Dagbani orthography (ɛ, ɔ, ɣ, ŋ) · {learnedVocabIds.length} of{" "}
              {DAGBANI_DATABASE.length} encountered in Tamale
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="px-6 py-3 bg-[#120f0d] border-b border-white/10 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8e8679] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Dagbani or English words (e.g. Dasuba, shea butter, proverb)..."
              className="w-full bg-[#0e0c0a] border border-white/12 rounded-lg pl-9 pr-3 py-2 text-sm text-[#f8f5ef] placeholder-[#7c7468] focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  category === c.id
                    ? "bg-amber-500 text-[#12100e] font-semibold"
                    : "bg-[#211c18] text-[#cfc8bc] hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entries */}
        <div className="p-6 overflow-y-auto space-y-3">
          {filtered.map((entry) => {
            const heard = learnedVocabIds.includes(entry.id);
            return (
              <div
                key={entry.id}
                className="p-4 rounded-lg bg-[#201b17] border border-white/10 space-y-1.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-base font-bold text-amber-300">
                    {entry.dagbani}
                  </div>
                  <div className="text-[11px] text-[#9c9487]">
                    {heard ? "Heard in conversation" : "Reference entry"} · Native audio slot pending
                  </div>
                </div>
                <div className="text-sm font-medium text-[#f8f5ef]">{entry.english}</div>
                <div className="text-xs text-[#b5ada0]">
                  Phonetic guide: <span className="text-[#e8e2d7]">{entry.phoneticGuide}</span>
                </div>
                <div className="text-xs text-[#9c9487] leading-relaxed">{entry.usageNote}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
