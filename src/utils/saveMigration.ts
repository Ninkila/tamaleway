import { createInitialCharacterState, PLAYABLE_CHARACTERS } from "../data/playableCharacters";
import {
  CharacterRuntimeState,
  DEFAULT_KEY_BINDINGS,
  GameSettings,
  SavedGameState,
  WeatherType,
} from "../types/game";

export const CURRENT_SAVE_VERSION = 5;

const VALID_WEATHERS: ReadonlySet<WeatherType> = new Set([
  "clear",
  "cloudy",
  "heat",
  "harmattan",
  "light_rain",
  "rain",
  "thunderstorm",
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
  const settings: GameSettings = {
    ...defaultSettings,
    ...(raw.settings ?? {}),
    keyBindings: {
      ...DEFAULT_KEY_BINDINGS,
      ...(raw.settings?.keyBindings ?? {}),
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
