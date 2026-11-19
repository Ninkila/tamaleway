import React from "react";
import { Briefcase, Compass, MapPin, Palette, Sparkles, UserCheck, X } from "lucide-react";
import { computeCareerRankTitle, PLAYABLE_CHARACTERS } from "../data/playableCharacters";
import { CharacterRuntimeState, SkillKey } from "../types/game";

interface CharacterSwitchModalProps {
  activeCharacterId: string;
  characterStates: Record<string, CharacterRuntimeState>;
  onSelectCharacter: (characterId: string) => void;
  onOpenCustomize: (characterId: string) => void;
  onClose: () => void;
}

const SKILL_LABELS: Array<{ key: SkillKey; label: string }> = [
  { key: "riding", label: "Riding" },
  { key: "trade", label: "Trade" },
  { key: "stamina", label: "Stamina" },
  { key: "culture", label: "Culture" },
  { key: "craft", label: "Craft" },
];

export const CharacterSwitchModal: React.FC<CharacterSwitchModalProps> = ({
  activeCharacterId,
  characterStates,
  onSelectCharacter,
  onOpenCustomize,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[92dvh] bg-[#171411] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-amber-400">
              Tamale Residents · Independent Lives, Wallets &amp; Careers
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#f8f5ef]">
              Select &amp; Switch Playable Character
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close character switcher"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[#120f0d] border-b border-white/10 text-xs text-[#b5ada0]">
          Each resident keeps their own wallet, energy, inventory, job history, friendships, owned
          businesses, and city position. Inactive characters remain visible at their stations in
          Tamale.
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLAYABLE_CHARACTERS.map((profile) => {
            const state = characterStates[profile.id];
            const isActive = profile.id === activeCharacterId;
            const money = state ? state.moneyCedis : profile.startingMoney;
            const energy = state ? state.energy : profile.startingEnergy;
            const xp = state ? state.cultureXp : 15;
            const completedJobs = state ? state.completedJobsCount : 0;
            const skills = state ? state.skills : profile.initialSkills;
            const ownedCount = state ? state.ownedBusinessIds.length : 0;
            const discoveredCount = state
              ? state.discoveredLandmarks.length
              : profile.startingDiscoveredLandmarks.length;
            const achievementsCount = state ? state.achievements.length : 0;
            const rank = computeCareerRankTitle(profile, completedJobs, xp);
            const look = state ? state.customization : profile.customization;

            return (
              <div
                key={profile.id}
                className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isActive
                    ? "bg-[#241d15] border-amber-500/70 shadow-lg"
                    : "bg-[#1c1814] border-white/10 hover:border-white/25"
                }`}
              >
                <div className="space-y-3">
                  {/* Identity Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl border border-white/20 shrink-0 flex items-center justify-center font-display font-bold text-base text-white shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${look.primaryColor} 0%, ${look.accentColor} 100%)`,
                        }}
                      >
                        {profile.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[#f8f5ef] truncate">
                            {look.name || profile.name}
                          </h3>
                          {isActive && (
                            <span className="text-[11px] font-semibold text-amber-300">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-400 font-medium">
                          {rank.title} · Tier {rank.tier}
                        </div>
                        <div className="text-[11px] text-[#9c9487] mt-0.5">
                          {profile.dagbaniTitle} · “{profile.nickname}”
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono-num shrink-0">
                      <div className="text-sm font-bold text-amber-400">GH₵ {money}</div>
                      <div className="text-[11px] text-[#cfc8bc]">
                        Energy {Math.round(energy)}%
                      </div>
                    </div>
                  </div>

                  {/* Bio & Daily Routine */}
                  <p className="text-xs text-[#cfc8bc] leading-relaxed">{profile.bio}</p>

                  <div className="bg-[#120f0d] border border-white/10 rounded-lg p-3 space-y-1.5 text-[11px] text-[#b5ada0]">
                    <div className="flex items-center gap-1.5 text-[#e8e2d7]">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{profile.homeDistrict}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{profile.startingVehicleLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{profile.dailyRoutineSummary}</span>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                    {SKILL_LABELS.map((sk) => {
                      const val = skills[sk.key] ?? 1;
                      return (
                        <div
                          key={sk.key}
                          className="bg-[#14110f] border border-white/8 rounded-lg px-2 py-1.5 text-center"
                        >
                          <div className="text-[10px] text-[#9c9487] truncate">{sk.label}</div>
                          <div className="font-mono-num text-xs font-bold text-[#f8f5ef] mt-0.5">
                            {val}/10
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unboxed Progress Summary */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#9c9487] font-mono-num">
                    <span>{completedJobs} jobs done</span>
                    <span aria-hidden="true">·</span>
                    <span>{xp} Culture XP</span>
                    <span aria-hidden="true">·</span>
                    <span>{discoveredCount} landmarks</span>
                    <span aria-hidden="true">·</span>
                    <span>{ownedCount} businesses</span>
                    {achievementsCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Sparkles className="w-3 h-3" />
                          {achievementsCount} badges
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => onSelectCharacter(profile.id)}
                    className={`min-h-[44px] flex-1 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-emerald-600/25 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/35"
                        : "bg-amber-500 hover:bg-amber-400 text-[#12100e]"
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>{isActive ? "Play as " + profile.nickname : "Switch to " + profile.nickname}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenCustomize(profile.id)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#26201b] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#e8e2d7] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Wardrobe</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
