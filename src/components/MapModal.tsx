import React, { useState } from "react";
import { Layers, Navigation, X } from "lucide-react";
import { TAMALE_COMMUNITIES } from "../data/tamaleExpansionData";
import { TAMALE_LANDMARKS, TAMALE_NPCS, TAMALE_ROADS } from "../data/tamaleWorldData";
import { CommunityZone, LandmarkData, NpcProfile, NpcRuntimeSnapshot } from "../types/game";

interface MapModalProps {
  playerPos: { x: number; z: number };
  discoveredLandmarks: string[];
  activeErrandLandmarkId: string | null;
  npcStates?: NpcRuntimeSnapshot[];
  onFastTravel: (landmark: LandmarkData) => void;
  onFastTravelCoords?: (x: number, z: number, label: string) => void;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  playerPos,
  discoveredLandmarks,
  activeErrandLandmarkId,
  npcStates = [],
  onFastTravel,
  onFastTravelCoords,
  onClose,
}) => {
  const [selectedLandmark, setSelectedLandmark] = useState<LandmarkData | null>(
    TAMALE_LANDMARKS[0]
  );
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityZone | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<NpcProfile | null>(null);
  const [showCommunities, setShowCommunities] = useState(true);

  // Map expanded metropolitan world coordinates (-235..235) uniformly into SVG viewBox (0..460)
  const WORLD_SPAN = 470;
  const toMapX = (wx: number) => ((wx + 235) / WORLD_SPAN) * 460;
  const toMapY = (wz: number) => ((wz + 235) / WORLD_SPAN) * 460;
  const toSize = (units: number) => (units / WORLD_SPAN) * 460;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef]">
              Tamale Metropolitan Map &amp; 17 Communities Guide
            </h2>
            <div className="text-xs text-[#b5ada0]">
              Anchored on Naa Gbewaa Interchange (9.40379° N, 0.84202° W) · {TAMALE_LANDMARKS.length} Landmarks &amp; {TAMALE_COMMUNITIES.length} Communities
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCommunities((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                showCommunities
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-[#221d18] border-white/10 text-[#cfc8bc]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showCommunities ? "Communities On" : "Communities Off"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Interactive SVG Map */}
          <div className="md:col-span-7 bg-[#261e17] p-4 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
            <svg
              viewBox="0 0 460 460"
              className="w-full max-w-[440px] aspect-square rounded-lg bg-[#3a2a1e] border border-white/10"
            >
              {/* Community Regions Overlay */}
              {showCommunities &&
                TAMALE_COMMUNITIES.map((comm) => {
                  const cx = toMapX(comm.x);
                  const cy = toMapY(comm.z);
                  const isSel = selectedCommunity?.id === comm.id;
                  return (
                    <g
                      key={comm.id}
                      onClick={() => {
                        setSelectedCommunity(comm);
                        setSelectedLandmark(null);
                        setSelectedNpc(null);
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={toSize(comm.radius * 0.72)}
                        fill={isSel ? "rgba(245, 158, 11, 0.22)" : "rgba(217, 119, 6, 0.08)"}
                        stroke={isSel ? "#f59e0b" : "rgba(245, 158, 11, 0.28)"}
                        strokeWidth={isSel ? "1.6" : "0.8"}
                        strokeDasharray="3 2"
                      />
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fill={isSel ? "#fef08a" : "#cbb394"}
                        fontSize="7.5"
                        fontWeight="600"
                      >
                        {comm.dagbaniName || comm.name}
                      </text>
                    </g>
                  );
                })}

              {/* Roads */}
              {TAMALE_ROADS.map((r) => (
                <rect
                  key={r.id}
                  x={toMapX(r.x - r.width / 2)}
                  y={toMapY(r.z - r.depth / 2)}
                  width={toSize(r.width)}
                  height={toSize(r.depth)}
                  fill="#25272b"
                />
              ))}

              {/* Landmarks */}
              {TAMALE_LANDMARKS.map((lm) => {
                const mx = toMapX(lm.x);
                const my = toMapY(lm.z);
                const isSelected = selectedLandmark?.id === lm.id;
                const isErrandTarget = activeErrandLandmarkId === lm.id;
                const isDiscovered = discoveredLandmarks.includes(lm.id);

                return (
                  <g
                    key={lm.id}
                    onClick={() => {
                      setSelectedLandmark(lm);
                      setSelectedCommunity(null);
                      setSelectedNpc(null);
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={mx}
                      cy={my}
                      r={isSelected ? 8.5 : 6}
                      fill={
                        isErrandTarget
                          ? "#10b981"
                          : isSelected
                          ? "#f59e0b"
                          : isDiscovered
                          ? "#d97706"
                          : "#6b7280"
                      }
                      stroke="#12100e"
                      strokeWidth="1.6"
                    />
                    <text
                      x={mx}
                      y={my - 9}
                      textAnchor="middle"
                      fill="#f8f5ef"
                      fontSize="7.5"
                      fontWeight={isSelected ? "700" : "500"}
                    >
                      {lm.dagbaniLabel}
                    </text>
                  </g>
                );
              })}

              {/* NPCs (Live Schedule Positions) */}
              {TAMALE_NPCS.map((npc) => {
                const live = npcStates.find((s) => s.npcId === npc.id);
                const nx = live ? live.x : npc.homeX;
                const nz = live ? live.z : npc.homeZ;
                const mx = toMapX(nx);
                const my = toMapY(nz);
                const isSel = selectedNpc?.id === npc.id;
                const dotColor =
                  live?.state === "commuting"
                    ? "#38bdf8"
                    : live?.state === "resting"
                    ? "#93c5fd"
                    : "#60a5fa";
                return (
                  <g
                    key={npc.id}
                    onClick={() => {
                      setSelectedNpc(npc);
                      setSelectedLandmark(null);
                      setSelectedCommunity(null);
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={mx}
                      cy={my}
                      r={isSel ? 5.2 : 3.5}
                      fill={dotColor}
                      stroke={isSel ? "#ffffff" : "#0f172a"}
                      strokeWidth={isSel ? "1.6" : "1"}
                    />
                    {isSel && (
                      <text
                        x={mx}
                        y={my + 11}
                        textAnchor="middle"
                        fill="#93c5fd"
                        fontSize="7.5"
                        fontWeight="700"
                      >
                        {npc.name}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Player Marker */}
              <g transform={`translate(${toMapX(playerPos.x)}, ${toMapY(playerPos.z)})`}>
                <circle r="5.5" fill="#ffffff" stroke="#b45309" strokeWidth="2" />
              </g>
            </svg>
          </div>

          {/* Selected Landmark or Community Details & Fast Travel */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between overflow-y-auto space-y-5">
            {selectedLandmark ? (
              <div>
                <div className="text-xs text-amber-400 font-medium mb-1">
                  {selectedLandmark.district} · {selectedLandmark.dagbaniLabel}
                </div>
                <h3 className="font-display text-xl font-bold text-[#f8f5ef] mb-1">
                  {selectedLandmark.name}
                </h3>
                {selectedLandmark.osmCoords && (
                  <div className="text-[11px] font-mono-num text-[#a39b8e] mb-3">
                    OSM: {selectedLandmark.osmCoords}
                  </div>
                )}
                <p className="text-sm text-[#cfc8bc] leading-relaxed mb-4">
                  {selectedLandmark.authenticityNote}
                </p>
              </div>
            ) : selectedCommunity ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-amber-400 font-medium mb-1">
                    Community Zone · {selectedCommunity.bearingFromInterchange}
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#f8f5ef]">
                    {selectedCommunity.name}
                  </h3>
                  <div className="text-[11px] font-mono-num text-[#a39b8e] mt-0.5">
                    OSM: {selectedCommunity.osmCoords}
                  </div>
                </div>
                <p className="text-sm text-[#cfc8bc] leading-relaxed">
                  {selectedCommunity.character}
                </p>
                <div className="bg-[#12100e] border border-white/10 rounded-lg p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#ede8de]">
                    Local Architecture &amp; Everyday Life
                  </div>
                  <div className="text-xs text-[#cfc8bc]">
                    Architecture: {selectedCommunity.architectureMix.join(" · ")}
                  </div>
                  <div className="text-xs text-[#b5ada0]">
                    Daily Life: {selectedCommunity.keyActivities.join(" · ")}
                  </div>
                </div>
              </div>
            ) : selectedNpc ? (
              (() => {
                const live = npcStates.find((s) => s.npcId === selectedNpc.id);
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-sky-400 font-medium mb-1">
                        Resident · {selectedNpc.dagbaniRole} · {live?.district ?? selectedNpc.district}
                      </div>
                      <h3 className="font-display text-xl font-bold text-[#f8f5ef]">
                        {selectedNpc.name}
                      </h3>
                      <div className="text-xs text-[#b5ada0] mt-0.5">{selectedNpc.role}</div>
                    </div>
                    <div className="bg-[#12100e] border border-white/10 rounded-lg p-3 space-y-1.5">
                      <div className="text-xs font-semibold text-amber-300">
                        Current Status: {live ? `${live.state.toUpperCase()} · ${live.destinationLabel}` : selectedNpc.district}
                      </div>
                      <div className="text-xs text-[#cfc8bc]">
                        {live ? live.activityLabel : selectedNpc.personality}
                      </div>
                      <div className="text-[11px] text-[#a39b8e]">
                        Home Quarter: {selectedNpc.homeDistrict}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}

            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[#9c9487]">Map Legend</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#d4cdc2]">
                  <span>White · You</span>
                  <span>Amber · Landmarks</span>
                  <span>Dashed · Communities</span>
                  <span>Green · Errand</span>
                  <span>Blue · Live Residents</span>
                </div>
              </div>

              {selectedLandmark && (
                <button
                  type="button"
                  onClick={() => onFastTravel(selectedLandmark)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Travel to {selectedLandmark.name}</span>
                </button>
              )}

              {selectedCommunity && onFastTravelCoords && (
                <button
                  type="button"
                  onClick={() =>
                    onFastTravelCoords(
                      selectedCommunity.x,
                      selectedCommunity.z + 12,
                      selectedCommunity.name
                    )
                  }
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Travel to {selectedCommunity.name}</span>
                </button>
              )}

              {selectedNpc && onFastTravelCoords && (
                (() => {
                  const live = npcStates.find((s) => s.npcId === selectedNpc.id);
                  const tx = (live ? live.x : selectedNpc.homeX) + 2;
                  const tz = (live ? live.z : selectedNpc.homeZ) + 2;
                  return (
                    <button
                      type="button"
                      onClick={() => onFastTravelCoords(tx, tz, `${selectedNpc.name}'s location`)}
                      className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-[#0f172a] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Meet {selectedNpc.name}</span>
                    </button>
                  );
                })()
              )}

              <div className="text-[11px] text-[#9c9487] text-center">
                Discovered {discoveredLandmarks.length} of {TAMALE_LANDMARKS.length} Tamale landmarks
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
