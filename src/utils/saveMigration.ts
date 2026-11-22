import { createInitialCharacterState, PLAYABLE_CHARACTERS } from "../data/playableCharacters";
import {
  CharacterRuntimeState,
  ControlDisplayMode,
  DEFAULT_KEY_BINDINGS,
  GameSettings,
  HudVisibilityMode,
  JoystickSize,
  PreferredOrientation,
  SavedGameState,
  UiScaleMode,
  WeatherType,
} from "../types/game";

export const CURRENT_SAVE_VERSION = 7;

const VALID_WEATHERS: ReadonlySet<WeatherType> = new Set([
  "clear",
  "cloudy",
  "heat",
  "harmattan",
  "light_rain",
  "rain",
  "thunderstorm",
]);

const VALID_CONTROL_MODES: ReadonlySet<ControlDisplayMode> = new Set([
  "auto",
  "touch",
  "keyboard",
  "hybrid",
]);
const VALID_JOYSTICK_SIZES: ReadonlySet<JoystickSize> = new Set(["small", "medium", "large"]);
const VALID_UI_SCALES: ReadonlySet<UiScaleMode> = new Set(["compact", "normal", "large"]);
const VALID_HUD_VISIBILITIES: ReadonlySet<HudVisibilityMode> = new Set(["standard", "minimal"]);
const VALID_ORIENTATIONS: ReadonlySet<PreferredOrientation> = new Set([
  "auto",
  "landscape",
  "portrait",
]);

export function normalizeWeather(w: unknown): WeatherType {
  if (typeof w === "string" && VALID_WEATHERS.has(w as WeatherType)) {
    return w as WeatherType;
  }
  return "clear";
}

export function normalizeCharacterState(
  charId: string,
  partial?: Partial<CharacterRuntimeState> | null
): CharacterRuntimeState {
  const profile =
    PLAYABLE_CHARACTERS.find((p) => p.id === charId) ?? PLAYABLE_CHARACTERS[0];
  const base = createInitialCharacterState(profile);
  if (!partial) return base;

  return {
    ...base,
    ...partial,
    characterId: profile.id,
    moneyCedis: partial.moneyCedis ?? base.moneyCedis,
    bankBalanceCedis: partial.bankBalanceCedis ?? base.bankBalanceCedis,
    momoBalanceCedis: partial.momoBalanceCedis ?? base.momoBalanceCedis,
    savingsBalanceCedis: partial.savingsBalanceCedis ?? base.savingsBalanceCedis,
    vehicleCondition: partial.vehicleCondition ?? base.vehicleCondition,
    skills: { ...base.skills, ...(partial.skills ?? {}) },
    customization: {
      ...base.customization,
      ...(partial.customization ?? {}),
      hairstyle: partial.customization?.hairstyle ?? base.customization.hairstyle ?? "natural",
    },
    inventory: Array.isArray(partial.inventory) ? partial.inventory : base.inventory,
    friendships: { ...base.friendships, ...(partial.friendships ?? {}) },
    discoveredLandmarks: Array.isArray(partial.discoveredLandmarks)
      ? partial.discoveredLandmarks
      : base.discoveredLandmarks,
    learnedVocabIds: Array.isArray(partial.learnedVocabIds)
      ? partial.learnedVocabIds
      : base.learnedVocabIds,
    completedErrands: Array.isArray(partial.completedErrands)
      ? partial.completedErrands
      : base.completedErrands,
    activeGig: partial.activeGig ?? null,
    completedGigsCount: partial.completedGigsCount ?? 0,
    ownedBusinessIds: Array.isArray(partial.ownedBusinessIds)
      ? partial.ownedBusinessIds
      : base.ownedBusinessIds,
    achievements: Array.isArray(partial.achievements) ? partial.achievements : base.achievements,
    capturedPhotos: Array.isArray(partial.capturedPhotos)
      ? partial.capturedPhotos
      : base.capturedPhotos,
    phoneMessages:
      Array.isArray(partial.phoneMessages) && partial.phoneMessages.length > 0
        ? partial.phoneMessages
        : base.phoneMessages,
    playerPos: partial.playerPos ?? base.playerPos,
    policeFinesOwedCedis: partial.policeFinesOwedCedis ?? base.policeFinesOwedCedis ?? 0,
    trafficViolationsCount: partial.trafficViolationsCount ?? base.trafficViolationsCount ?? 0,
    cleanDrivingStreak: partial.cleanDrivingStreak ?? base.cleanDrivingStreak ?? 0,
    cargoDeliveriesCount: partial.cargoDeliveriesCount ?? base.cargoDeliveriesCount ?? 0,
    dayCount: typeof partial.dayCount === "number" && partial.dayCount >= 1 ? partial.dayCount : (base.dayCount ?? 1),
    needs: {
      ...(base.needs ?? { hygiene: 88, hunger: 82, thirst: 80, social: 76, comfort: 82 }),
      ...(partial.needs ?? {}),
    },
    homeState: partial.homeState && base.homeState
      ? {
          ...base.homeState,
          ...partial.homeState,
          roomDirt: { ...base.homeState.roomDirt, ...(partial.homeState.roomDirt ?? {}) },
          upgrades: { ...base.homeState.upgrades, ...(partial.homeState.upgrades ?? {}) },
          fridgeIngredients: {
            ...base.homeState.fridgeIngredients,
            ...(partial.homeState.fridgeIngredients ?? {}),
          },
          cookedMealsReady: Array.isArray(partial.homeState.cookedMealsReady)
            ? partial.homeState.cookedMealsReady
            : base.homeState.cookedMealsReady,
          dailyRoutineIdsDone: Array.isArray(partial.homeState.dailyRoutineIdsDone)
            ? partial.homeState.dailyRoutineIdsDone
            : base.homeState.dailyRoutineIdsDone,
        }
      : base.homeState,
    laundryState: partial.laundryState && base.laundryState
      ? { ...base.laundryState, ...partial.laundryState }
      : base.laundryState,
    ownedOutfits: Array.isArray(partial.ownedOutfits) && partial.ownedOutfits.length > 0
      ? partial.ownedOutfits
      : base.ownedOutfits,
  };
}

export function buildAllDefaultCharacterStates(): Record<string, CharacterRuntimeState> {
  const map: Record<string, CharacterRuntimeState> = {};
  for (const profile of PLAYABLE_CHARACTERS) {
    map[profile.id] = createInitialCharacterState(profile);
  }
  return map;
}

/**
 * Normalizes and migrates v1-v5 saves cleanly without discarding existing player progress,
 * keeping each playable character's wallet, bank/MoMo accounts, active tasks, and gigs isolated.
 */
export function migrateSavedGameState(
  raw: Partial<SavedGameState>,
  defaultSettings: GameSettings
): {
  activeCharacterId: string;
  characterStates: Record<string, CharacterRuntimeState>;
  settings: GameSettings;
  weather: WeatherType;
  gameMinutes: number;
  activeCityEvent: NonNullable<SavedGameState["activeCityEvent"]>;
  musicLibrary?: SavedGameState["musicLibrary"];
} {
  const defaultsMap = buildAllDefaultCharacterStates();
  const rawSettings = (raw.settings ?? {}) as Partial<GameSettings>;
  const settings: GameSettings = {
    ...defaultSettings,
    ...rawSettings,
    controlMode: VALID_CONTROL_MODES.has(rawSettings.controlMode as ControlDisplayMode)
      ? (rawSettings.controlMode as ControlDisplayMode)
      : defaultSettings.controlMode,
    joystickSize: VALID_JOYSTICK_SIZES.has(rawSettings.joystickSize as JoystickSize)
      ? (rawSettings.joystickSize as JoystickSize)
      : defaultSettings.joystickSize,
    uiScale: VALID_UI_SCALES.has(rawSettings.uiScale as UiScaleMode)
      ? (rawSettings.uiScale as UiScaleMode)
      : defaultSettings.uiScale,
    hudVisibility: VALID_HUD_VISIBILITIES.has(rawSettings.hudVisibility as HudVisibilityMode)
      ? (rawSettings.hudVisibility as HudVisibilityMode)
      : defaultSettings.hudVisibility,
    showTutorialHints:
      typeof rawSettings.showTutorialHints === "boolean"
        ? rawSettings.showTutorialHints
        : defaultSettings.showTutorialHints,
    preferredOrientation: VALID_ORIENTATIONS.has(
      rawSettings.preferredOrientation as PreferredOrientation
    )
      ? (rawSettings.preferredOrientation as PreferredOrientation)
      : defaultSettings.preferredOrientation,
    keyBindings: {
      ...DEFAULT_KEY_BINDINGS,
      ...(rawSettings.keyBindings ?? {}),
    },
  };

  const weather = normalizeWeather(raw.weather);
  const gameMinutes = typeof raw.gameMinutes === "number" ? raw.gameMinutes : 555;
  const activeCityEvent = raw.activeCityEvent ?? "ordinary_day";

  if (raw.characterStates && raw.activeCharacterId) {
    const mergedMap: Record<string, CharacterRuntimeState> = { ...defaultsMap };
    for (const key of Object.keys(raw.characterStates)) {
      const normalized = normalizeCharacterState(key, raw.characterStates[key]);
      // Migrate legacy top-level activeGig into active character if characterStates lacked it
      if (
        key === raw.activeCharacterId &&
        (raw.version ?? 1) < 5 &&
        !normalized.activeGig &&
        raw.activeGig
      ) {
        normalized.activeGig = raw.activeGig;
      }
      if (
        key === raw.activeCharacterId &&
        (raw.version ?? 1) < 5 &&
        !normalized.completedGigsCount &&
        raw.completedGigsCount
      ) {
        normalized.completedGigsCount = raw.completedGigsCount;
      }
      mergedMap[key] = normalized;
    }
    const targetId = mergedMap[raw.activeCharacterId]
      ? raw.activeCharacterId
      : PLAYABLE_CHARACTERS[0].id;
    return {
      activeCharacterId: targetId,
      characterStates: mergedMap,
      settings,
      weather,
      gameMinutes,
      activeCityEvent,
      musicLibrary: raw.musicLibrary,
    };
  }

  // Legacy v1-v3 single-character save
  const targetId = PLAYABLE_CHARACTERS[0].id;
  const migrated = normalizeCharacterState(targetId, {
    moneyCedis: raw.moneyCedis,
    bankBalanceCedis: raw.bankBalanceCedis,
    momoBalanceCedis: raw.momoBalanceCedis,
    savingsBalanceCedis: raw.savingsBalanceCedis,
    energy: raw.energy,
    cultureXp: raw.cultureXp,
    customization: raw.customization,
    inventory: raw.inventory,
    friendships: raw.friendships,
    discoveredLandmarks: raw.discoveredLandmarks,
    learnedVocabIds: raw.learnedVocabIds,
    activeErrandId: raw.activeErrandId ?? null,
    completedErrands: raw.completedErrands ?? [],
    activeGig: raw.activeGig ?? null,
    completedGigsCount: raw.completedGigsCount ?? 0,
    completedJobsCount: raw.completedGigsCount ?? 0,
    totalEarnedCedis: raw.totalEarnedCedis ?? 0,
    playerPos: raw.playerPos,
  });
  defaultsMap[targetId] = migrated;

  return {
    activeCharacterId: targetId,
    characterStates: defaultsMap,
    settings,
    weather,
    gameMinutes,
    activeCityEvent,
    musicLibrary: raw.musicLibrary,
  };
}
