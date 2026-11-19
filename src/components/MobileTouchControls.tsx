import React, { useRef, useState } from "react";
import {
  ArrowUp,
  Bike,
  DoorOpen,
  Footprints,
  Gauge,
  LogOut,
  MessageCircle,
  OctagonX,
  RotateCcw,
  ShoppingBag,
  Volume2,
} from "lucide-react";
import { NearbyInteractable } from "../types/game";

interface MobileTouchControlsProps {
  isDriving: boolean;
  drivingKind: "pragya" | "motorcycle" | null;
  nearby: NearbyInteractable | null;
  nearbyVehicle: NearbyInteractable | null;
  vibrationEnabled: boolean;
  onMoveChange: (x: number, y: number) => void;
  onToggleRun: (running: boolean) => void;
  onJump: () => void;
  onInteract: () => void;
  onEnterVehicle: () => void;
  onExitVehicle: () => void;
  onVehicleControls: (ctrl: {
    throttle?: number;
    steer?: number;
    brake?: boolean;
    handbrake?: boolean;
  }) => void;
  onHorn: () => void;
  onCameraRotate: (dx: number, dy: number) => void;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  isDriving,
  drivingKind,
  nearby,
  nearbyVehicle,
  vibrationEnabled,
  onMoveChange,
  onToggleRun,
  onJump,
  onInteract,
  onEnterVehicle,
  onExitVehicle,
  onVehicleControls,
  onHorn,
  onCameraRotate,
}) => {
  const [runActive, setRunActive] = useState(false);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [steerOffset, setSteerOffset] = useState(0);
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [handbrakePressed, setHandbrakePressed] = useState(false);

  const stickPointerId = useRef<number | null>(null);
  const stickCenter = useRef({ x: 0, y: 0 });
  const steerPointerId = useRef<number | null>(null);
  const steerCenterX = useRef(0);
  const camPointerId = useRef<number | null>(null);
  const camLastPos = useRef({ x: 0, y: 0 });

  const vibrate = (ms = 14) => {
    if (!vibrationEnabled) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  };

  // --- Left Thumb: Virtual Movement Joystick (On Foot) ---
  const maxStickRadius = 40;
  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    stickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    stickPointerId.current = e.pointerId;
    updateStickFromClient(e.clientX, e.clientY);
  };

  const updateStickFromClient = (cx: number, cy: number) => {
    const dx = cx - stickCenter.current.x;
    const dy = cy - stickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxStickRadius);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clamped;
    const oy = Math.sin(angle) * clamped;
    setStickOffset({ x: ox, y: oy });
    // +x = strafe right, +y = forward (screen up = negative dy)
    onMoveChange(ox / maxStickRadius, -oy / maxStickRadius);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointerId.current) return;
    e.stopPropagation();
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointerId.current) return;
    e.stopPropagation();
    stickPointerId.current = null;
    setStickOffset({ x: 0, y: 0 });
    onMoveChange(0, 0);
  };

  // --- Left Thumb: Virtual Vehicle Steering Pad ---
  const maxSteerRadius = 48;
  const handleSteerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (steerPointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    steerCenterX.current = rect.left + rect.width / 2;
    steerPointerId.current = e.pointerId;
    updateSteerFromClient(e.clientX);
  };

  const updateSteerFromClient = (cx: number) => {
    const dx = Math.max(-maxSteerRadius, Math.min(maxSteerRadius, cx - steerCenterX.current));
    setSteerOffset(dx);
    // In TamaleEngine: steer > 0 turns left, steer < 0 turns right
    onVehicleControls({ steer: -dx / maxSteerRadius });
  };

  const handleSteerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== steerPointerId.current) return;
    e.stopPropagation();
    updateSteerFromClient(e.clientX);
  };

  const handleSteerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== steerPointerId.current) return;
    e.stopPropagation();
    steerPointerId.current = null;
    setSteerOffset(0);
    onVehicleControls({ steer: 0 });
  };

  // --- Right Side: Touch Camera Drag Surface ---
  const handleCamDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (camPointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    camPointerId.current = e.pointerId;
    camLastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleCamMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== camPointerId.current) return;
    const dx = e.clientX - camLastPos.current.x;
    const dy = e.clientY - camLastPos.current.y;
    camLastPos.current = { x: e.clientX, y: e.clientY };
    onCameraRotate(dx * 1.15, dy * 1.15);
  };

  const handleCamUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== camPointerId.current) return;
    camPointerId.current = null;
  };

  const contextLabel =
    nearby?.interactionVerb === "talk"
      ? "TALK"
      : nearby?.interactionVerb === "enter"
      ? "ENTER"
      : nearby?.interactionVerb === "buy"
      ? "BUY"
      : nearby?.interactionVerb === "deliver"
      ? "DROP OFF"
      : "INTERACT";

  const ContextIcon =
    nearby?.interactionVerb === "talk"
      ? MessageCircle
      : nearby?.interactionVerb === "enter"
      ? DoorOpen
      : ShoppingBag;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Right Half Transparent Camera Look Zone */}
      <div
        onPointerDown={handleCamDown}
        onPointerMove={handleCamMove}
        onPointerUp={handleCamUp}
        onPointerCancel={handleCamUp}
        aria-label="Touch camera look pad"
        className="pointer-events-auto touch-gameplay-pad fixed top-14 right-0 bottom-0 w-1/2"
      />

      {/* LEFT SIDE CONTROLS */}
      {!isDriving ? (
        <div className="fixed left-4 bottom-5 sm:left-6 sm:bottom-6 pointer-events-auto touch-gameplay-pad">
          <div
            onPointerDown={handleStickDown}
            onPointerMove={handleStickMove}
            onPointerUp={handleStickUp}
            onPointerCancel={handleStickUp}
            aria-label="Movement virtual joystick"
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#14110f]/70 border-2 border-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl"
          >
            <div className="w-12 h-12 rounded-full border border-white/15 pointer-events-none" />
            <div
              style={{
                transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
              }}
              className="absolute w-12 h-12 rounded-full bg-amber-500/90 border-2 border-amber-200 shadow-lg pointer-events-none"
            />
          </div>
          <div className="text-[10px] text-center text-[#cfc8bc] mt-1 font-medium tracking-wide">
            MOVE
          </div>
        </div>
      ) : (
        <div className="fixed left-4 bottom-5 sm:left-6 sm:bottom-6 pointer-events-auto touch-gameplay-pad">
          <div
            onPointerDown={handleSteerDown}
            onPointerMove={handleSteerMove}
            onPointerUp={handleSteerUp}
            onPointerCancel={handleSteerUp}
            aria-label="Vehicle steering control"
            className="relative w-36 h-16 sm:w-44 sm:h-20 rounded-2xl bg-[#14110f]/75 border-2 border-white/25 backdrop-blur-sm flex items-center justify-between px-3 shadow-xl"
          >
            <span className="text-xs font-bold text-[#bfb7aa] pointer-events-none">L</span>
            <div
              style={{ transform: `translateX(${steerOffset}px)` }}
              className="w-12 h-12 rounded-full bg-amber-500 border-2 border-amber-200 shadow-lg pointer-events-none flex items-center justify-center"
            >
              <Gauge className="w-5 h-5 text-[#12100e]" />
            </div>
            <span className="text-xs font-bold text-[#bfb7aa] pointer-events-none">R</span>
          </div>
          <div className="text-[10px] text-center text-[#cfc8bc] mt-1 font-medium tracking-wide">
            STEER {drivingKind === "motorcycle" ? "MOTO" : "PRAGYA"}
          </div>
        </div>
      )}

      {/* RIGHT SIDE CONTROLS */}
      {!isDriving ? (
        <div className="fixed right-4 bottom-5 sm:right-6 sm:bottom-6 flex flex-col items-end gap-2.5 pointer-events-none">
          {/* Contextual Buttons Row */}
          <div className="flex items-center gap-2.5">
            {nearby && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  vibrate(18);
                  onInteract();
                }}
                className="pointer-events-auto touch-gameplay-pad min-h-[52px] min-w-[92px] px-4 rounded-xl bg-amber-500 active:scale-95 text-[#12100e] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-amber-200"
              >
                <ContextIcon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{contextLabel}</span>
              </button>
            )}

            {nearbyVehicle && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  vibrate(18);
                  onEnterVehicle();
                }}
                className="pointer-events-auto touch-gameplay-pad min-h-[52px] min-w-[116px] px-3.5 rounded-xl bg-emerald-500 active:scale-95 text-[#081c11] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-emerald-200"
              >
                <Bike className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">ENTER VEHICLE</span>
              </button>
            )}
          </div>

          {/* Primary On-Foot Buttons: Run Toggle & Jump */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(12);
                const next = !runActive;
                setRunActive(next);
                onToggleRun(next);
              }}
              aria-pressed={runActive}
              className={`pointer-events-auto touch-gameplay-pad w-14 h-14 rounded-full font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-lg border active:scale-95 transition-transform ${
                runActive
                  ? "bg-amber-500 text-[#12100e] border-amber-200"
                  : "bg-[#14110f]/82 text-[#f5f2eb] border-white/25"
              }`}
            >
              <Footprints className="w-4 h-4" />
              <span>RUN</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(14);
                onJump();
              }}
              className="pointer-events-auto touch-gameplay-pad w-16 h-16 rounded-full bg-[#14110f]/85 active:bg-white/20 active:scale-95 text-[#f8f5ef] border-2 border-white/30 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-xl"
            >
              <ArrowUp className="w-5 h-5 text-amber-400" />
              <span>JUMP</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed right-4 bottom-5 sm:right-6 sm:bottom-6 flex flex-col items-end gap-2.5 pointer-events-none">
          {nearby?.kind === "delivery" && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(20);
                onInteract();
              }}
              className="pointer-events-auto touch-gameplay-pad min-h-[48px] px-4 rounded-xl bg-emerald-500 active:scale-95 text-[#071c0e] border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">DROP OFF / COMPLETE</span>
            </button>
          )}
          {/* Top Utility Row: Horn, Handbrake, Exit Vehicle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(12);
                onHorn();
              }}
              className="pointer-events-auto touch-gameplay-pad min-h-[48px] min-w-[64px] px-3 rounded-xl bg-[#14110f]/85 active:scale-95 text-[#f8f5ef] border border-white/25 font-semibold text-xs flex items-center justify-center gap-1 shadow-lg"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>HORN</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(14);
                setHandbrakePressed(true);
                onVehicleControls({ handbrake: true });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                setHandbrakePressed(false);
                onVehicleControls({ handbrake: false });
              }}
              onPointerCancel={() => {
                setHandbrakePressed(false);
                onVehicleControls({ handbrake: false });
              }}
              className={`pointer-events-auto touch-gameplay-pad min-h-[48px] min-w-[78px] px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 shadow-lg border ${
                handbrakePressed
                  ? "bg-amber-600 text-white border-amber-300"
                  : "bg-[#14110f]/85 text-[#f8f5ef] border-white/25"
              }`}
            >
              <OctagonX className="w-4 h-4" />
              <span>STOP</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(18);
                onExitVehicle();
              }}
              className="pointer-events-auto touch-gameplay-pad min-h-[48px] px-3.5 rounded-xl bg-red-600/90 active:scale-95 text-white border border-red-300/60 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="whitespace-nowrap">EXIT</span>
            </button>
          </div>

          {/* Bottom Pedals Row: Brake/Reverse & Accelerate */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(12);
                setBrakePressed(true);
                onVehicleControls({ brake: true });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                setBrakePressed(false);
                onVehicleControls({ brake: false });
              }}
              onPointerCancel={() => {
                setBrakePressed(false);
                onVehicleControls({ brake: false });
              }}
              className={`pointer-events-auto touch-gameplay-pad w-20 h-16 rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-xl border-2 ${
                brakePressed
                  ? "bg-red-600 text-white border-red-200 scale-95"
                  : "bg-[#14110f]/85 text-[#f8f5ef] border-red-400/50"
              }`}
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>BRAKE / REV</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(12);
                setGasPressed(true);
                onVehicleControls({ throttle: 1 });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                setGasPressed(false);
                onVehicleControls({ throttle: 0 });
              }}
              onPointerCancel={() => {
                setGasPressed(false);
                onVehicleControls({ throttle: 0 });
              }}
              className={`pointer-events-auto touch-gameplay-pad w-24 h-20 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xl border-2 ${
                gasPressed
                  ? "bg-amber-400 text-[#12100e] border-white scale-95"
                  : "bg-amber-500/92 text-[#12100e] border-amber-200"
              }`}
            >
              <ArrowUp className="w-5 h-5" />
              <span>GAS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
