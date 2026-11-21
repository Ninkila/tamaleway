import {
  ActiveInputMethod,
  ActiveTaskRuntime,
  ContextualHintPayload,
  KeyBindings,
  NearbyInteractable,
} from "../types/game";

export type OnboardingStep = "move" | "camera_run" | "phone" | "complete";

export interface OnboardingState {
  step: OnboardingStep;
  movedSeconds: number;
  rotatedCamera: boolean;
  ranOnce: boolean;
  openedPhone: boolean;
  stepElapsedSec: number;
}

const ONBOARDING_STORAGE_KEY = "tamale3d_onboarding_v1";

export function formatShortKeyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Space") return "Space";
  if (code === "Escape") return "Esc";
  return code;
}

export function loadOnboardingState(): OnboardingState {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (raw === "complete") {
        return {
          step: "complete",
          movedSeconds: 99,
          rotatedCamera: true,
          ranOnce: true,
          openedPhone: true,
          stepElapsedSec: 0,
        };
      }
    }
  } catch {
    // ignore storage access issues
  }
  return {
    step: "move",
    movedSeconds: 0,
    rotatedCamera: false,
    ranOnce: false,
    openedPhone: false,
    stepElapsedSec: 0,
  };
}

export function saveOnboardingComplete() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    }
  } catch {
    // ignore storage access issues
  }
}

export function resetOnboardingStorage() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function advanceOnboardingState(
  prev: OnboardingState,
  opts: {
    dt: number;
    isMoving: boolean;
    isRunning: boolean;
    hasOpenedPhone: boolean;
  }
): OnboardingState {
  if (prev.step === "complete") return prev;

  const movedSeconds = prev.movedSeconds + (opts.isMoving ? opts.dt : 0);
  const ranOnce = prev.ranOnce || opts.isRunning;
  const openedPhone = prev.openedPhone || opts.hasOpenedPhone;
  const stepElapsedSec = prev.stepElapsedSec + opts.dt;

  if (prev.step === "move") {
    if (movedSeconds >= 1.2 || stepElapsedSec >= 8) {
      return {
        step: "camera_run",
        movedSeconds,
        rotatedCamera: prev.rotatedCamera,
        ranOnce,
        openedPhone,
        stepElapsedSec: 0,
      };
    }
  } else if (prev.step === "camera_run") {
    if (ranOnce || stepElapsedSec >= 6) {
      return {
        step: openedPhone ? "complete" : "phone",
        movedSeconds,
        rotatedCamera: prev.rotatedCamera,
        ranOnce,
        openedPhone,
        stepElapsedSec: 0,
      };
    }
  } else if (prev.step === "phone") {
    if (openedPhone || stepElapsedSec >= 6.5) {
      saveOnboardingComplete();
      return {
        step: "complete",
        movedSeconds,
        rotatedCamera: prev.rotatedCamera,
        ranOnce,
        openedPhone: true,
        stepElapsedSec: 0,
      };
    }
  }

  return {
    ...prev,
    movedSeconds,
    ranOnce,
    openedPhone,
    stepElapsedSec,
  };
}

export function computeContextualHint(params: {
  showTutorialHints: boolean;
  onboarding: OnboardingState;
  inputMethod: ActiveInputMethod;
  keyBindings: KeyBindings;
  isDriving: boolean;
  isIndoors: boolean;
  nearby: NearbyInteractable | null;
  nearbyVehicle: NearbyInteractable | null;
  activeTask: ActiveTaskRuntime | null;
  drivingHintTimerSec: number;
}): ContextualHintPayload | null {
  const {
    showTutorialHints,
    onboarding,
    inputMethod,
    keyBindings,
    isDriving,
    isIndoors,
    nearby,
    nearbyVehicle,
    activeTask,
    drivingHintTimerSec,
  } = params;

  const isTouch = inputMethod === "touch";
  const interactKey = formatShortKeyLabel(keyBindings.interact);
  const vehicleKey = formatShortKeyLabel(keyBindings.vehicleToggle);
  const hornKey = formatShortKeyLabel(keyBindings.horn);
  const runKey = formatShortKeyLabel(keyBindings.run);

  // 1. Situational live hints (always respect device input method, never stack)
  if (!isDriving && nearby) {
    if (nearby.kind === "building") {
      return {
        id: `enter_${nearby.id}`,
        priority: "situation",
        tone: "amber",
        keyCap: isTouch ? undefined : interactKey,
        text: isTouch
          ? `Tap Enter · ${nearby.label}`
          : `Press ${interactKey} · ${nearby.label}`,
      };
    }
    if (nearby.kind === "npc") {
      return {
        id: `talk_${nearby.id}`,
        priority: "situation",
        tone: "amber",
        keyCap: isTouch ? undefined : interactKey,
        text: isTouch ? `Tap Talk · ${nearby.label}` : `Press ${interactKey} to talk`,
      };
    }
    if (nearby.kind === "job_action" || nearby.kind === "delivery") {
      return {
        id: `job_${nearby.id}`,
        priority: "situation",
        tone: "emerald",
        keyCap: isTouch ? undefined : interactKey,
        text: isTouch
          ? `Available Job · ${nearby.label}`
          : `Press ${interactKey} · ${nearby.label}`,
      };
    }
    if (nearby.kind === "interior_exit") {
      return {
        id: "interior_exit",
        priority: "situation",
        tone: "amber",
        keyCap: isTouch ? undefined : interactKey,
        text: isTouch ? "Tap Exit to step outside" : `Press ${interactKey} to step outside`,
      };
    }
  }

  if (!isDriving && !isIndoors && nearbyVehicle) {
    return {
      id: `veh_${nearbyVehicle.id}`,
      priority: "situation",
      tone: "emerald",
      keyCap: isTouch ? undefined : vehicleKey,
      text: isTouch
        ? "Tap Enter Vehicle"
        : `Press ${vehicleKey} to enter vehicle`,
    };
  }

  if (isDriving && drivingHintTimerSec > 0 && showTutorialHints) {
    return {
      id: "driving_brief",
      priority: "onboarding",
      tone: "amber",
      keyCap: isTouch ? undefined : vehicleKey,
      text: isTouch
        ? "Steer left · Gas & Brake right · Tap Exit to dismount"
        : `${hornKey} Horn · ${vehicleKey} Exit vehicle`,
    };
  }

  if (!showTutorialHints || onboarding.step === "complete") {
    return null;
  }

  // 2. Gradual new-player onboarding (one gentle hint at a time)
  if (onboarding.step === "move") {
    const moveKeys = `${formatShortKeyLabel(keyBindings.forward)}${formatShortKeyLabel(
      keyBindings.left
    )}${formatShortKeyLabel(keyBindings.backward)}${formatShortKeyLabel(keyBindings.right)}`;
    return {
      id: "onboard_move",
      priority: "onboarding",
      tone: "sky",
      keyCap: isTouch ? undefined : moveKeys,
      text: isTouch
        ? "Use left joystick to move · Drag right screen to look"
        : `Move with ${moveKeys} · Drag mouse to look around`,
    };
  }

  if (onboarding.step === "camera_run") {
    return {
      id: "onboard_run",
      priority: "onboarding",
      tone: "sky",
      keyCap: isTouch ? undefined : runKey,
      text: isTouch
        ? "Tap Run to sprint · Pinch to zoom camera"
        : `Hold ${runKey} to sprint · Scroll wheel to zoom`,
    };
  }

  if (onboarding.step === "phone" && !activeTask) {
    return {
      id: "onboard_phone",
      priority: "onboarding",
      tone: "amber",
      keyCap: isTouch ? undefined : "P",
      text: isTouch
        ? "Open Phone for city jobs, rides & Tamale radio"
        : "Press P or click Phone for jobs, rides & music",
    };
  }

  return null;
}
