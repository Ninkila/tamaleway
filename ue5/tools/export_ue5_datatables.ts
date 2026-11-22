import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DAGBANI_DATABASE } from "../../src/data/dagbaniDatabase";
import { PLAYABLE_CHARACTERS } from "../../src/data/playableCharacters";
import { TAMALE_COMMUNITIES, TAMALE_EVENTS } from "../../src/data/tamaleExpansionData";
import {
  HOME_COOKING_RECIPES,
  HOME_INGREDIENTS_CATALOG,
  HOME_UPGRADES_CATALOG,
} from "../../src/data/tamaleHomeData";
import { TAMALE_MUSIC_TRACKS } from "../../src/data/tamaleMusicAndRadio";
import {
  SHOP_METADATA,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
  TAMALE_ROADS,
} from "../../src/data/tamaleWorldData";

/**
 * Converts TAMALE 3D Three.js coordinates (meters, Y-up, +Z South)
 * into Unreal Engine 5 coordinates (centimeters, Z-up, +Y South).
 */
const METERS_TO_UE_CM = 100;
const OUT_DIR = resolve(process.cwd(), "ue5/Tamale3D/Content/DataTables");

mkdirSync(OUT_DIR, { recursive: true });

function writeTable(fileName: string, rows: unknown[]) {
  const path = resolve(OUT_DIR, fileName);
  writeFileSync(path, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Exported ${rows.length} rows -> ${fileName}`);
}

// 1. Roads
writeTable(
  "DT_TamaleRoads.json",
  TAMALE_ROADS.map((r) => ({
    Name: r.id,
    RoadId: r.id,
    DisplayName: r.name,
    Orientation: r.orientation === "ew" ? "EastWest" : "NorthSouth",
    CenterLocationCm: {
      X: Math.round(r.x * METERS_TO_UE_CM),
      Y: Math.round(r.z * METERS_TO_UE_CM),
      Z: 0,
    },
    WidthCm: Math.round(r.width * METERS_TO_UE_CM),
    LengthCm: Math.round(r.depth * METERS_TO_UE_CM),
    SurfaceType: r.id.includes("residential") ? "PavedLateriteShoulder" : "Asphalt",
  }))
);

// 2. Landmarks
writeTable(
  "DT_TamaleLandmarks.json",
  TAMALE_LANDMARKS.map((lm) => ({
    Name: lm.id,
    LandmarkId: lm.id,
    DisplayName: lm.name,
    DagbaniLabel: lm.dagbaniLabel,
    District: lm.district,
    LandmarkType: lm.type,
    LocationCm: {
      X: Math.round(lm.x * METERS_TO_UE_CM),
      Y: Math.round(lm.z * METERS_TO_UE_CM),
      Z: 0,
    },
    TriggerRadiusCm: Math.round(lm.radius * METERS_TO_UE_CM),
    bEnterable: Boolean(lm.enterable),
    ShopId: lm.shopId ?? "",
    OsmCoords: lm.osmCoords ?? "",
    bIsRepresentativeFictional: Boolean(lm.isRepresentativeFictional),
    AuthenticityNote: lm.authenticityNote,
  }))
);

// 3. Districts / Communities
writeTable(
  "DT_TamaleDistricts.json",
  TAMALE_COMMUNITIES.map((c) => ({
    Name: c.id,
    DistrictId: c.id,
    DisplayName: c.name,
    DagbaniName: c.dagbaniName ?? "",
    OsmCoords: c.osmCoords,
    BearingFromInterchange: c.bearingFromInterchange,
    CenterLocationCm: {
      X: Math.round(c.x * METERS_TO_UE_CM),
      Y: Math.round(c.z * METERS_TO_UE_CM),
      Z: 0,
    },
    RadiusCm: Math.round(c.radius * METERS_TO_UE_CM),
    CharacterSummary: c.character,
  }))
);

// 4. Playable Characters
writeTable(
  "DT_PlayableCharacters.json",
  PLAYABLE_CHARACTERS.map((p) => ({
    Name: p.id,
    CharacterId: p.id,
    DisplayName: p.name,
    Nickname: p.nickname,
    Occupation: p.occupation,
    DagbaniTitle: p.dagbaniTitle,
    HomeDistrict: p.homeDistrict,
    HomeLandmarkId: p.homeLandmarkId,
    SpawnLocationCm: {
      X: Math.round(p.spawnPos.x * METERS_TO_UE_CM),
      Y: Math.round(p.spawnPos.z * METERS_TO_UE_CM),
      Z: 92,
    },
    StartingMoneyCedis: p.startingMoney,
    StartingEnergy: p.startingEnergy,
    DefaultOutfitStyle: p.customization.outfit,
    PrimaryColorHex: p.customization.primaryColor,
    SecondaryColorHex: p.customization.accentColor,
    CareerTrack: p.careerTrack,
    DailyRoutineSummary: p.dailyRoutineSummary,
  }))
);

// 5. Named NPCs
writeTable(
  "DT_TamaleNPCs.json",
  TAMALE_NPCS.map((n) => ({
    Name: n.id,
    NpcId: n.id,
    DisplayName: n.name,
    Role: n.role,
    District: n.district,
    HomeLocationCm: {
      X: Math.round(n.homeX * METERS_TO_UE_CM),
      Y: Math.round(n.homeZ * METERS_TO_UE_CM),
      Z: 92,
    },
    ShopId: n.shopId ?? "",
    MorningGreetingDagbani: n.greetings.morning.dagbani,
    MorningGreetingEnglish: n.greetings.morning.english,
    EveningGreetingDagbani: n.greetings.evening.dagbani,
    EveningGreetingEnglish: n.greetings.evening.english,
  }))
);

// 6. Shops
writeTable(
  "DT_TamaleShops.json",
  Object.values(SHOP_METADATA).map((s) => ({
    Name: s.id,
    ShopId: s.id,
    Title: s.title,
    DagbaniTitle: s.dagbaniTitle,
    District: s.district,
    Category: s.category,
    OpenHour: s.openHour,
    CloseHour: s.closeHour,
    StaffName: s.staffName ?? "",
    BuyableSharePriceCedis: s.buyableSharePrice ?? 0,
    DailyRevenueCedis: s.dailyRevenueCedis ?? 0,
    AuthenticityStatus: s.authenticityStatus,
  }))
);

// 7. Home Recipes
writeTable(
  "DT_HomeRecipes.json",
  HOME_COOKING_RECIPES.map((r) => ({
    Name: r.id,
    RecipeId: r.id,
    DisplayName: r.name,
    DagbaniName: r.dagbaniName,
    Description: r.description,
    CookMinutes: r.cookMinutes,
    HungerRestore: r.hungerRestore,
    EnergyRestore: r.energyRestore,
    ThirstRestore: r.thirstRestore,
    ComfortRestore: r.comfortRestore,
    CultureXp: r.cultureXp,
  }))
);

// 8. Home Ingredients
writeTable(
  "DT_HomeIngredients.json",
  HOME_INGREDIENTS_CATALOG.map((ing) => ({
    Name: ing.id,
    IngredientId: ing.id,
    DisplayName: ing.name,
    DagbaniName: ing.dagbaniName,
    UnitLabel: ing.unitLabel,
    RetailPriceCedis: ing.retailPriceCedis,
    Description: ing.description,
  }))
);

// 9. Home Upgrades
writeTable(
  "DT_HomeUpgrades.json",
  HOME_UPGRADES_CATALOG.map((u) => ({
    Name: u.id,
    UpgradeId: u.id,
    DisplayName: u.name,
    DagbaniName: u.dagbaniName,
    Category: u.category,
    MaxLevel: u.maxLevel,
    Level2CostCedis: u.levels[1]?.costCedis ?? 0,
    Level2Title: u.levels[1]?.title ?? "",
    Level2Effect: u.levels[1]?.effectSummary ?? "",
  }))
);

// 10. Dagbani Language Terms
writeTable(
  "DT_DagbaniTerms.json",
  DAGBANI_DATABASE.map((d) => ({
    Name: d.id,
    TermId: d.id,
    Dagbani: d.dagbani,
    English: d.english,
    PhoneticGuide: d.phoneticGuide,
    Category: d.category,
    UsageNote: d.usageNote,
    VerificationStatus: d.verificationStatus,
    AudioStatus: d.audioStatus,
  }))
);

// 11. Cultural & City Events
writeTable(
  "DT_TamaleEvents.json",
  TAMALE_EVENTS.map((ev) => ({
    Name: ev.id,
    EventId: ev.id,
    DisplayName: ev.name,
    DagbaniName: ev.dagbaniName ?? "",
    Category: ev.category,
    Location: ev.location,
    LandmarkId: ev.landmarkId ?? "",
    VerificationStatus: ev.verificationStatus,
    CityEffectSummary: ev.cityEffectSummary,
  }))
);

// 12. Music Catalog (preserving license/permission audit metadata)
writeTable(
  "DT_MusicTracks.json",
  TAMALE_MUSIC_TRACKS.map((tr) => ({
    Name: tr.id,
    TrackId: tr.id,
    Title: tr.title,
    Artist: tr.artist,
    Album: tr.album,
    Region: tr.region,
    Genre: tr.genre,
    Bpm: tr.bpm,
    DurationSec: tr.durationSec,
    LicenseStatus: tr.licenseStatus,
    PermissionStatus: tr.permissionStatus,
    LicenseOwner: tr.licenseOwner,
    AudioAssetPath: tr.audioUrl ?? "",
  }))
);
