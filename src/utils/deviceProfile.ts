import {
  ActiveInputMethod,
  ControlDisplayMode,
  DEFAULT_KEY_BINDINGS,
  DeviceClass,
  GameSettings,
  GraphicsQuality,
  HudVisibilityMode,
  JoystickSize,
  PreferredOrientation,
  UiScaleMode,
} from "../types/game";

export interface DeviceSignals {
  width: number;
  height: number;
  hasTouch: boolean;
  maxTouchPoints: number;
  coarsePrimary: boolean;
  finePrimary: boolean;
  anyFinePointer: boolean;
  anyCoarsePointer: boolean;
  canHover: boolean;
  lastInputMethod: ActiveInputMethod;
}

export interface DeviceLayoutConfig {
  deviceClass: DeviceClass;
  orientation: "portrait" | "landscape";
  aspectRatio: number;
  effectiveInput: ActiveInputMethod;
  showTouchControls: boolean;
  isPhoneLayout: boolean;
  isTabletLayout: boolean;
  isDesktopLayout: boolean;
  isHybridDevice: boolean;
  showOrientationPrompt: boolean;
  hudDensity: "minimal-desktop" | "touch-mobile" | "hybrid-tablet";
  hudVisibility: HudVisibilityMode;
  uiScaleMode: UiScaleMode;
  uiScaleFactor: number;
  joystickDiameterPx: number;
  joystickRadiusPx: number;
  actionButtonPx: number;
  deviceLabel: string;
}

export function readBrowserDeviceSignals(
  lastInputMethod: ActiveInputMethod = "keyboard"
): DeviceSignals {
  if (typeof window === "undefined") {
    return {
      width: 1280,
      height: 720,
      hasTouch: false,
      maxTouchPoints: 0,
      coarsePrimary: false,
      finePrimary: true,
      anyFinePointer: true,
      anyCoarsePointer: false,
      canHover: true,
      lastInputMethod,
    };
  }

  const mm = (q: string) =>
    typeof window.matchMedia === "function" ? window.matchMedia(q).matches : false;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const coarsePrimary = mm("(pointer: coarse)");
  const finePrimary = mm("(pointer: fine)");
  const anyFinePointer = mm("(any-pointer: fine)");
  const anyCoarsePointer = mm("(any-pointer: coarse)");
  const canHover = mm("(hover: hover)");
  const hasTouch =
    maxTouchPoints > 0 || coarsePrimary || anyCoarsePointer || "ontouchstart" in window;

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    hasTouch,
    maxTouchPoints,
    coarsePrimary,
    finePrimary,
    anyFinePointer,
    anyCoarsePointer,
    canHover,
    lastInputMethod,
  };
}

/**
 * Classifies device using screen dimensions, aspect ratio, pointer capability,
 * hover support, touch capability, and orientation.
 * Explicitly prevents touchscreen laptops (large screen + fine pointer/hover)
 * from being misclassified as mobile phones.
 */
export function detectDeviceClass(signals: DeviceSignals): DeviceClass {
  const minDim = Math.min(signals.width, signals.height);
  const maxDim = Math.max(signals.width, signals.height);

  // Desktop / Laptop (including touchscreen laptops!)
  // If primary pointer is fine (mouse/trackpad) AND viewport is laptop-sized or larger:
  if (signals.finePrimary && signals.canHover && minDim >= 600 && maxDim >= 900) {
    return signals.hasTouch && signals.anyCoarsePointer ? "hybrid" : "desktop";
  }

  // Mobile phones: compact physical dimensions OR coarse primary pointer with narrow screen
  if (minDim < 580 || (maxDim < 920 && signals.coarsePrimary && !signals.anyFinePointer)) {
    if (signals.hasTouch || signals.coarsePrimary || minDim < 560) {
      return "mobile";
    }
  }

  // Tablets & iPads: medium/large touch screens (shortest edge >= 580px, longest up to ~1400px)
  // where primary interaction is coarse touch (or iPadOS desktop-UA touch devices)
  if (signals.hasTouch && (signals.coarsePrimary || !signals.canHover) && minDim >= 580) {
    return signals.anyFinePointer ? "hybrid" : "tablet";
  }

  // Small resized desktop window with fine pointer and no coarse primary
  if (!signals.coarsePrimary && (signals.finePrimary || !signals.hasTouch)) {
    return "desktop";
  }

  // Fallback for touch-capable medium/large screens
  if (signals.hasTouch) {
    return minDim >= 580 ? "tablet" : "mobile";
  }

  return "desktop";
}

export function resolveEffectiveInput(
  deviceClass: DeviceClass,
  controlMode: ControlDisplayMode,
  lastInputMethod: ActiveInputMethod
): { effectiveInput: ActiveInputMethod; showTouchControls: boolean } {
  if (controlMode === "touch") {
    return { effectiveInput: "touch", showTouchControls: true };
  }
  if (controlMode === "keyboard") {
    return { effectiveInput: "keyboard", showTouchControls: false };
  }
  if (controlMode === "hybrid") {
    // Hybrid mode keeps touch controls active while prioritizing whichever input was just used for hints
    return { effectiveInput: lastInputMethod, showTouchControls: true };
  }

  // Auto-detection policy:
  if (deviceClass === "mobile") {
    return { effectiveInput: "touch", showTouchControls: true };
  }
  if (deviceClass === "tablet") {
    // Tablets show touch controls by default, unless the user explicitly pressed a keyboard key
    // and we still keep touch accessible; if keyboard was just used on tablet, hints reflect keyboard
    return { effectiveInput: lastInputMethod === "keyboard" ? "keyboard" : "touch", showTouchControls: true };
  }
  if (deviceClass === "hybrid") {
    // 2-in-1 touch laptops default to keyboard/mouse unless user actively touches the screen
    const touchedRecently = lastInputMethod === "touch";
    return {
      effectiveInput: touchedRecently ? "touch" : "keyboard",
      showTouchControls: touchedRecently,
    };
  }

  return { effectiveInput: "keyboard", showTouchControls: false };
}

function resolveUiScaleFactor(mode: UiScaleMode, deviceClass: DeviceClass): number {
  const base = deviceClass === "tablet" ? 1.06 : deviceClass === "mobile" ? 0.96 : 1.0;
  if (mode === "compact") return Number((base * 0.9).toFixed(2));
  if (mode === "large") return Number((base * 1.12).toFixed(2));
  return Number(base.toFixed(2));
}

function resolveJoystickDims(
  size: JoystickSize,
  deviceClass: DeviceClass,
  orientation: "portrait" | "landscape"
): { diameter: number; radius: number; actionBtn: number } {
  const isTablet = deviceClass === "tablet" || deviceClass === "hybrid";
  const baseDia = isTablet ? 132 : orientation === "portrait" ? 108 : 114;
  const mult = size === "small" ? 0.86 : size === "large" ? 1.18 : 1.0;
  const diameter = Math.round(baseDia * mult);
  const radius = Math.round(diameter * 0.36);
  const actionBtn = isTablet ? Math.round(62 * mult) : Math.round(54 * mult);
  return { diameter, radius, actionBtn };
}

export function computeDeviceLayoutConfig(
  signals: DeviceSignals,
  settings: Pick<
    GameSettings,
    "controlMode" | "joystickSize" | "uiScale" | "hudVisibility" | "preferredOrientation"
  >
): DeviceLayoutConfig {
  const deviceClass = detectDeviceClass(signals);
  const orientation: "portrait" | "landscape" =
    signals.height > signals.width ? "portrait" : "landscape";
  const aspectRatio = signals.height > 0 ? signals.width / signals.height : 1.77;

  const { effectiveInput, showTouchControls } = resolveEffectiveInput(
    deviceClass,
    settings.controlMode,
    signals.lastInputMethod
  );

  const isPhoneLayout =
    deviceClass === "mobile" ||
    (settings.controlMode === "touch" && Math.min(signals.width, signals.height) < 580);
  const isTabletLayout =
    !isPhoneLayout &&
    (deviceClass === "tablet" ||
      (deviceClass === "hybrid" && showTouchControls) ||
      (settings.controlMode === "touch" && Math.min(signals.width, signals.height) >= 580));
  const isDesktopLayout = !isPhoneLayout && !isTabletLayout;

  const hudDensity: DeviceLayoutConfig["hudDensity"] = isPhoneLayout
    ? "touch-mobile"
    : isTabletLayout
    ? "hybrid-tablet"
    : "minimal-desktop";

  const showOrientationPrompt =
    isPhoneLayout &&
    settings.preferredOrientation === "landscape" &&
    orientation === "portrait";

  const { diameter, radius, actionBtn } = resolveJoystickDims(
    settings.joystickSize,
    deviceClass,
    orientation
  );

  const deviceLabel =
    deviceClass === "mobile"
      ? "Mobile Phone"
      : deviceClass === "tablet"
      ? "Tablet / iPad"
      : deviceClass === "hybrid"
      ? "Touch Hybrid Laptop"
      : "Desktop / Laptop";

  return {
    deviceClass,
    orientation,
    aspectRatio,
    effectiveInput,
    showTouchControls,
    isPhoneLayout,
    isTabletLayout,
    isDesktopLayout,
    isHybridDevice: deviceClass === "hybrid",
    showOrientationPrompt,
    hudDensity,
    hudVisibility: settings.hudVisibility,
    uiScaleMode: settings.uiScale,
    uiScaleFactor: resolveUiScaleFactor(settings.uiScale, deviceClass),
    joystickDiameterPx: diameter,
    joystickRadiusPx: radius,
    actionButtonPx: actionBtn,
    deviceLabel,
  };
}

export function getDefaultSettingsForDevice(signals?: DeviceSignals): GameSettings {
  const sig = signals ?? readBrowserDeviceSignals("keyboard");
  const deviceClass = detectDeviceClass(sig);

  let graphicsQuality: GraphicsQuality = "high";
  let resolutionScale = 1.0;

  if (deviceClass === "mobile") {
    graphicsQuality = "low";
    resolutionScale = 0.8;
  } else if (deviceClass === "tablet") {
    graphicsQuality = "medium";
    resolutionScale = 0.88;
  } else if (deviceClass === "hybrid") {
    graphicsQuality = "medium";
    resolutionScale = 0.95;
  }

  return {
    languageMode: "mixed",
    showSubtitles: true,
    audioEnabled: true,
    soundVolume: 0.55,
    cameraMode: "third-person",
    graphicsQuality,
    resolutionScale,
    cameraSensitivity: deviceClass === "mobile" ? 1.15 : 1.0,
    vibrationEnabled: true,
    controlMode: "auto",
    joystickSize: deviceClass === "tablet" ? "large" : "medium",
    uiScale: "normal",
    hudVisibility: "standard",
    showTutorialHints: true,
    preferredOrientation: deviceClass === "mobile" ? "landscape" : "auto",
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
  };
}
