import React from "react";
import { Compass, Navigation } from "lucide-react";
import { TAMALE_LANDMARKS, TAMALE_ROADS } from "../data/tamaleWorldData";
import { NavRouteSnapshot } from "../types/game";
import { DeviceLayoutConfig } from "../utils/deviceProfile";

interface MiniMapHudProps {
  deviceLayout: DeviceLayoutConfig;
  playerPos: { x: number; z: number; rotY: number };
  navSnapshot: NavRouteSnapshot | null;
  policeCruiserPositions?: Array<{ x: number; z: number }>;
  roadIncidentPositions?: Array<{ id: string; title: string; x: number; z: number }>;
  servicePos?: { x: number; z: number } | null;
  onOpenFullMap: () => void;
}

export const MiniMapHud: React.FC<MiniMapHudProps> = ({
  deviceLayout,
  playerPos,
  navSnapshot,
  policeCruiserPositions = [],
  roadIncidentPositions = [],
  servicePos = null,
  onOpenFullMap,
}) => {
  const isPhone = deviceLayout.isPhoneLayout;
  const isMinimal = deviceLayout.hudVisibility === "minimal";

  // Follow-camera local radar span centered near playerPos, clamped within metropolitan world
  const VIEW_RADIUS = isPhone ? 92 : 115;
  const SIZE = 140;
  const HALF = SIZE / 2;

  const toLocalX = (wx: number) => HALF + ((wx - playerPos.x) / VIEW_RADIUS) * HALF;
  const toLocalY = (wz: number) => HALF + ((wz - playerPos.z) / VIEW_RADIUS) * HALF;
  const toLocalSize = (u: number) => (u / VIEW_RADIUS) * HALF;

  // Player heading angle for SVG arrow (0 rad in Three.js faces -Z or +Z depending on yaw; match playerPos.rotY)
  const arrowDeg = (-playerPos.rotY * 180) / Math.PI + 180;

  if (isMinimal && isPhone && !navSnapshot) {
    return null;
  }

  const routePolyline =
    navSnapshot && navSnapshot.routePoints.length > 0
      ? [
          `${toLocalX(playerPos.x).toFixed(1)},${toLocalY(playerPos.z).toFixed(1)}`,
          ...navSnapshot.routePoints.map(
            (pt) => `${toLocalX(pt.x).toFixed(1)},${toLocalY(pt.z).toFixed(1)}`
          ),
        ].join(" ")
      : null;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onOpenFullMap}
        aria-label="Open full Tamale metropolitan map"
        title="Click to open full Tamale Map (M)"
        className={`group relative overflow-hidden rounded-2xl bg-[#1a1511]/92 border border-amber-500/35 shadow-xl cursor-pointer transition-colors hover:border-amber-400/70 ${
          isPhone ? "w-24 h-24" : "w-36 h-36"
        }`}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full block bg-[#2a2018]">
          {/* Roads */}
          {TAMALE_ROADS.map((r) => {
            const rx = toLocalX(r.x - r.width / 2);
            const ry = toLocalY(r.z - r.depth / 2);
            const rw = toLocalSize(r.width);
            const rh = toLocalSize(r.depth);
            if (rx + rw < -10 || ry + rh < -10 || rx > SIZE + 10 || ry > SIZE + 10) return null;
            return (
              <rect
                key={r.id}
                x={rx}
                y={ry}
                width={Math.max(1.5, rw)}
                height={Math.max(1.5, rh)}
                fill="#1d1f23"
              />
            );
          })}

          {/* Active GPS Route Polyline */}
          {routePolyline && (
            <polyline
              points={routePolyline}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 2.5"
            />
          )}

          {/* Landmark Dots */}
          {TAMALE_LANDMARKS.map((lm) => {
            const lx = toLocalX(lm.x);
            const ly = toLocalY(lm.z);
            if (lx < -6 || ly < -6 || lx > SIZE + 6 || ly > SIZE + 6) return null;
            const isTarget = navSnapshot?.targetLandmarkId === lm.id;
            const isHome = lm.id === "player_home";
            return (
              <circle
                key={lm.id}
                cx={lx}
                cy={ly}
                r={isTarget ? 4.2 : isHome ? 3.4 : 2.3}
                fill={isTarget ? "#22d3ee" : isHome ? "#10b981" : "#d97706"}
                stroke="#12100e"
                strokeWidth="0.9"
              />
            );
          })}

          {/* Breakdown Road Incidents */}
          {roadIncidentPositions.map((inc) => {
            const ix = toLocalX(inc.x);
            const iy = toLocalY(inc.z);
            if (ix < -6 || iy < -6 || ix > SIZE + 6 || iy > SIZE + 6) return null;
            return (
              <rect
                key={inc.id}
                x={ix - 2.6}
                y={iy - 2.6}
                width={5.2}
                height={5.2}
                fill="#f97316"
                stroke="#12100e"
                strokeWidth="0.9"
              />
            );
          })}

          {/* MTTD Police Cruisers */}
          {policeCruiserPositions.map((pc, idx) => {
            const px = toLocalX(pc.x);
            const py = toLocalY(pc.z);
            if (px < -6 || py < -6 || px > SIZE + 6 || py > SIZE + 6) return null;
            return (
              <circle
                key={`pc_${idx}`}
                cx={px}
                cy={py}
                r={3}
                fill="#60a5fa"
                stroke="#ef4444"
                strokeWidth="1.1"
              />
            );
          })}

          {/* Dispatched Service Vehicle */}
          {servicePos && (
            <circle
              cx={toLocalX(servicePos.x)}
              cy={toLocalY(servicePos.z)}
              r={3.5}
              fill="#34d399"
              stroke="#0f172a"
              strokeWidth="1"
            />
          )}

          {/* Player Directional Arrow at Center */}
          <g transform={`translate(${HALF}, ${HALF}) rotate(${arrowDeg})`}>
            <polygon
              points="0,-7 5,5 0,2.5 -5,5"
              fill="#ffffff"
              stroke="#b45309"
              strokeWidth="1.4"
            />
          </g>
        </svg>

        <div className="absolute top-1 left-1.5 flex items-center gap-1 text-[9px] font-semibold text-amber-300/90 pointer-events-none">
          <Compass className="w-2.5 h-2.5" />
          <span>N</span>
        </div>
        <div className="absolute bottom-1 right-1.5 text-[9px] font-medium text-[#cfc8bc]/85 group-hover:text-amber-300 pointer-events-none">
          Map
        </div>
      </button>

      {navSnapshot && !isPhone && (
        <div className="max-w-[190px] bg-[#14110f]/92 border border-sky-400/40 rounded-xl px-2.5 py-1.5 shadow-lg text-[11px]">
          <div className="flex items-center justify-between gap-2 text-sky-300 font-semibold">
            <span className="flex items-center gap-1 truncate">
              <Navigation className="w-3 h-3 shrink-0" />
              <span className="truncate">{navSnapshot.targetLabel}</span>
            </span>
            <span className="font-mono-num shrink-0">{navSnapshot.remainingMeters}m</span>
          </div>
          <div className="text-[10px] text-[#cfc8bc] truncate mt-0.5">
            {navSnapshot.nextTurnLabel}
          </div>
        </div>
      )}
    </div>
  );
};
