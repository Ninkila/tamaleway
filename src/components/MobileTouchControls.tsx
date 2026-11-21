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
  Wrench,
} from "lucide-react";
import { NearbyInteractable } from "../types/game";
import { DeviceLayoutConfig } from "../utils/deviceProfile";

interface MobileTouchControlsProps {
  deviceLayout: DeviceLayoutConfig;
  isDriving: boolean;
  isRidingService?: boolean;
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
  onPinchZoom?: (delta: number) => void;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  deviceLayout,
  isDriving,
  isRidingService = false,
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
  onPinchZoom,
}) => {
  const [runActive, setRunActive] = useState(false);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [stickEngaged, setStickEngaged] = useState(false);
  const [stickSprinting, setStickSprinting] = useState(false);
  const [steerOffset, setSteerOffset] = useState(0);
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [handbrakePressed, setHandbrakePressed] = useState(false);

  const stickPointerId = useRef<number | null>(null);
  const stickCenter = useRef({ x: 0, y: 0 });
  const steerPointerId = useRef<number | null>(null);
  const steerCenterX = useRef(0);
  const camPointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistPrev = useRef<number | null>(null);

  const isTablet = deviceLayout.isTabletLayout;
  const stickDia = deviceLayout.joystickDiameterPx;
  const maxStickRadius = deviceLayout.joystickRadiusPx;
  const knobSize = Math.round(stickDia * 0.42);
  const btnPx = deviceLayout.actionButtonPx;

  const vibrate = (ms = 12) => {
    if (!vibrationEnabled) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  };

  // --- Left Thumb: Virtual Movement Joystick (On Foot) ---
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
    setStickEngaged(true);
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

    const normMag = clamped / Math.max(1, maxStickRadius);
    if (normMag < 0.12) {
      setStickSprinting(false);
      onMoveChange(0, 0);
      return;
    }

    setStickSprinting(normMag >= 0.88);
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
    setStickEngaged(false);
    setStickSprinting(false);
    setStickOffset({ x: 0, y: 0 });
    onMoveChange(0, 0);
  };

  // --- Left Thumb: Virtual Vehicle Steering Pad ---
  const maxSteerRadius = isTablet ? 60 : 48;
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

  // --- Right/Center Side: Multi-Touch Camera Look + Pinch-to-Zoom Surface ---
  const computePinchDistance = (): number | null => {
    if (camPointers.current.size !== 2) return null;
    const pts = Array.from(camPointers.current.values());
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const handleCamDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    camPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (camPointers.current.size === 2) {
      pinchDistPrev.current = computePinchDistance();
    } else {
      pinchDistPrev.current = null;
    }
  };

  const handleCamMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = camPointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    camPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (camPointers.current.size === 1) {
      onCameraRotate(dx * 1.15, dy * 1.15);
    } else if (camPointers.current.size === 2 && onPinchZoom) {
      const nextDist = computePinchDistance();
      if (nextDist !== null && pinchDistPrev.current !== null) {
        onPinchZoom((pinchDistPrev.current - nextDist) * 0.045);
      }
      pinchDistPrev.current = nextDist;
    }
  };

  const handleCamUp = (e: React.PointerEvent<HTMLDivElement>) => {
    camPointers.current.delete(e.pointerId);
    if (camPointers.current.size < 2) {
      pinchDistPrev.current = null;
    }
  };

  const contextLabel =
    nearby?.kind === "service_provider"
      ? nearby.servicePhase === "board_ride"
        ? "BOARD RIDE"
        : "COLLECT"
      : nearby?.kind === "job_action"
      ? nearby.jobActionMode === "pickup_passenger"
        ? "PICK UP"
        : nearby.jobActionMode === "mechanic_repair"
        ? "REPAIR"
        : nearby.jobActionMode === "photo_capture"
        ? "PHOTO"
        : nearby.jobActionMode === "sports_drill"
        ? "DRILL"
        : "WORK"
      : nearby?.interactionVerb === "talk"
      ? "TALK"
      : nearby?.interactionVerb === "enter"
      ? "ENTER"
      : nearby?.interactionVerb === "exit"
      ? "EXIT"
      : nearby?.interactionVerb === "use_station"
      ? "USE"
      : nearby?.interactionVerb === "buy"
      ? "BUY"
      : nearby?.interactionVerb === "deliver"
      ? "DROP OFF"
      : "INTERACT";

  const ContextIcon =
    nearby?.interactionVerb === "talk"
      ? MessageCircle
      : nearby?.interactionVerb === "enter" || nearby?.interactionVerb === "exit"
      ? DoorOpen
      : nearby?.interactionVerb === "repair"
      ? Wrench
      : nearby?.kind === "service_provider"
      ? Bike
      : ShoppingBag;

  const edgeInsetClass = isTablet
    ? "left-7 bottom-7"
    : "left-4 bottom-4";
  const rightInsetClass = isTablet
    ? "right-7 bottom-7"
    : "right-4 bottom-4";

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Camera Swipe & 2-Finger Pinch Region (Isolated from Left Joystick) */}
      <div
        onPointerDown={handleCamDown}
        onPointerMove={handleCamMove}
        onPointerUp={handleCamUp}
        onPointerCancel={handleCamUp}
        aria-label="Touch camera look pad"
        className={`pointer-events-auto touch-gameplay-pad fixed right-0 bottom-0 ${
          isTablet ? "top-16 left-[34%]" : "top-14 left-[40%]"
        }`}
      />

      {/* LEFT SIDE: Movement Joystick or Vehicle Steering */}
      {!isDriving && !isRidingService ? (
        <div className={`fixed ${edgeInsetClass} pointer-events-auto touch-gameplay-pad`}>
          <div
            onPointerDown={handleStickDown}
            onPointerMove={handleStickMove}
            onPointerUp={handleStickUp}
            onPointerCancel={handleStickUp}
            aria-label="Movement virtual joystick"
            style={{ width: stickDia, height: stickDia }}
            className={`relative rounded-full bg-[#14110f]/75 border-2 flex items-center justify-center shadow-xl transition-colors ${
              stickSprinting
                ? "border-amber-400/80"
                : stickEngaged
                ? "border-white/45"
                : "border-white/25"
            }`}
          >
            <div
              style={{ width: Math.round(stickDia * 0.46), height: Math.round(stickDia * 0.46) }}
              className="rounded-full border border-white/15 pointer-events-none"
            />
            <div
              style={{
                width: knobSize,
                height: knobSize,
                transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
              }}
              className={`absolute rounded-full bg-amber-500/92 border-2 border-amber-200 shadow-lg pointer-events-none ${
                stickEngaged ? "" : "transition-transform duration-100 ease-out"
              }`}
            />
          </div>
        </div>
      ) : isDriving ? (
        <div className={`fixed ${edgeInsetClass} pointer-events-auto touch-gameplay-pad`}>
          <div
            onPointerDown={handleSteerDown}
            onPointerMove={handleSteerMove}
            onPointerUp={handleSteerUp}
            onPointerCancel={handleSteerUp}
            aria-label="Vehicle steering control"
            className={`relative rounded-2xl bg-[#14110f]/80 border-2 border-white/25 flex items-center justify-between px-3 shadow-xl ${
              isTablet ? "w-48 h-20" : "w-36 h-16"
            }`}
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
            {drivingKind === "motorcycle" ? "MOTO" : "PRAGYA"}
          </div>
        </div>
      ) : null}

      {/* RIGHT SIDE: Contextual Actions, Jump/Run, or Driving Pedals */}
      {isRidingService ? (
        <div className={`fixed ${rightInsetClass} flex flex-col items-end gap-2.5 pointer-events-none`}>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              vibrate(16);
              onEnterVehicle();
            }}
            className="pointer-events-auto touch-gameplay-pad min-h-[50px] px-4 rounded-xl bg-red-600/92 active:scale-95 text-white border border-red-300/60 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl"
          >
            <LogOut className="w-4 h-4" />
            <span className="whitespace-nowrap">EXIT RIDE</span>
          </button>
        </div>
      ) : !isDriving ? (
        <div
          className={`fixed ${rightInsetClass} flex flex-col items-end ${
            isTablet ? "gap-3.5" : "gap-2.5"
          } pointer-events-none`}
        >
          {/* Contextual Buttons Row — Only rendered when player is near an interactable or vehicle */}
          {(nearby || nearbyVehicle) && (
            <div className="flex items-center gap-2.5">
              {nearby && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    vibrate(16);
                    onInteract();
                  }}
                  className="pointer-events-auto touch-gameplay-pad min-h-[48px] min-w-[92px] px-4 rounded-xl bg-amber-500 active:scale-95 text-[#12100e] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-amber-200"
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
                    vibrate(16);
                    onEnterVehicle();
                  }}
                  className="pointer-events-auto touch-gameplay-pad min-h-[48px] min-w-[104px] px-3.5 rounded-xl bg-emerald-500 active:scale-95 text-[#081c11] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-emerald-200"
                >
                  <Bike className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">RIDE</span>
                </button>
              )}
            </div>
          )}

          {/* Primary On-Foot Buttons: Run Toggle & Jump */}
          <div className={`flex items-center ${isTablet ? "gap-4" : "gap-3"}`}>
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
              style={{ width: btnPx, height: btnPx }}
              className={`pointer-events-auto touch-gameplay-pad rounded-full font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-lg border active:scale-95 transition-transform ${
                runActive || stickSprinting
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
              style={{ width: Math.round(btnPx * 1.14), height: Math.round(btnPx * 1.14) }}
              className="pointer-events-auto touch-gameplay-pad rounded-full bg-[#14110f]/85 active:bg-white/20 active:scale-95 text-[#f8f5ef] border-2 border-white/30 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-xl"
            >
              <ArrowUp className="w-5 h-5 text-amber-400" />
              <span>JUMP</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`fixed ${rightInsetClass} flex flex-col items-end ${
            isTablet ? "gap-3" : "gap-2.5"
          } pointer-events-none`}
        >
          {(nearby?.kind === "delivery" || nearby?.kind === "job_action") && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(18);
                onInteract();
              }}
              className="pointer-events-auto touch-gameplay-pad min-h-[48px] px-4 rounded-xl bg-emerald-500 active:scale-95 text-[#071c0e] border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{contextLabel}</span>
            </button>
          )}
          {/* Top Utility Row: Horn, Stop, Exit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                vibrate(12);
                onHorn();
              }}
              className="pointer-events-auto touch-gameplay-pad min-h-[46px] min-w-[62px] px-3 rounded-xl bg-[#14110f]/85 active:scale-95 text-[#f8f5ef] border border-white/25 font-semibold text-xs flex items-center justify-center gap-1 shadow-lg"
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
              className={`pointer-events-auto touch-gameplay-pad min-h-[46px] min-w-[70px] px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 shadow-lg border ${
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
                vibrate(16);
                onExitVehicle();
              }}
              className="pointer-events-auto touch-gameplay-pad min-h-[46px] px-3.5 rounded-xl bg-red-600/90 active:scale-95 text-white border border-red-300/60 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="whitespace-nowrap">EXIT</span>
            </button>
          </div>

          {/* Bottom Pedals Row: Brake/Reverse & Accelerate */}
          <div className={`flex items-center ${isTablet ? "gap-4" : "gap-3"}`}>
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
              className={`pointer-events-auto touch-gameplay-pad ${
                isTablet ? "w-24 h-18" : "w-20 h-16"
              } rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 shadow-xl border-2 ${
                brakePressed
                  ? "bg-red-600 text-white border-red-200 scale-95"
                  : "bg-[#14110f]/85 text-[#f8f5ef] border-red-400/50"
              }`}
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>BRAKE</span>
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
              className={`pointer-events-auto touch-gameplay-pad ${
                isTablet ? "w-28 h-22" : "w-24 h-20"
              } rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xl border-2 ${
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
