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
  TAMALE_HOUSE_SPECS,
  TAMALE_LANDMARK_BOX_FOOTPRINTS,
  TAMALE_LANDMARK_CYLINDERS,
  TAMALE_SHOP_SPECS,
} from "../../src/data/tamaleWorldLayout";
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

/**
 * Known broken references in the web data, corrected on export so the UE5 tables stay
 * consistent without editing the original web project. Keep this list short and fix the
 * web source when convenient.
 *  - playableCharacters.ts gives fuseini_artisan homeLandmarkId "lamashegu_market", but the
 *    landmark in tamaleWorldData.ts is "lamashegu_market_hub".
 */
const LANDMARK_ID_FIXES: Record<string, string> = {
  lamashegu_market: "lamashegu_market_hub",
};
const fixLandmarkId = (id: string) => LANDMARK_ID_FIXES[id] ?? id;

function writeTable(fileName: string, rows: unknown[]) {
  const path = resolve(OUT_DIR, fileName);
  writeFileSync(path, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Exported ${rows.length} rows -> ${fileName}`);
}

// 1. Roads
writeTable(
  "DT_TamaleRoads.json",
  TAMALE_ROADS.map((r) => {
    // In the web data, `width` is the box size along world X and `depth` along world Z.
    // An east-west road runs along X, so its length is `width` and its carriageway width is `depth`;
    // a north-south road is the reverse. (Exporting width/depth directly swapped every E-W road.)
    const isEastWest = r.orientation === "ew";
    const lengthM = isEastWest ? r.width : r.depth;
    const carriagewayM = isEastWest ? r.depth : r.width;
    const cx = r.x * METERS_TO_UE_CM;
    const cy = r.z * METERS_TO_UE_CM;
    const half = (lengthM * METERS_TO_UE_CM) / 2;
    return {
      Name: r.id,
      RoadId: r.id,
      DisplayName: r.name,
      Orientation: isEastWest ? "EastWest" : "NorthSouth",
      CenterLocationCm: { X: Math.round(cx), Y: Math.round(cy), Z: 0 },
      StartLocationCm: isEastWest
        ? { X: Math.round(cx - half), Y: Math.round(cy), Z: 0 }
        : { X: Math.round(cx), Y: Math.round(cy - half), Z: 0 },
      EndLocationCm: isEastWest
        ? { X: Math.round(cx + half), Y: Math.round(cy), Z: 0 }
        : { X: Math.round(cx), Y: Math.round(cy + half), Z: 0 },
      WidthCm: Math.round(carriagewayM * METERS_TO_UE_CM),
      LengthCm: Math.round(lengthM * METERS_TO_UE_CM),
      SurfaceType: r.id.includes("residential") ? "PavedLateriteShoulder" : "Asphalt",
    };
  })
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
    HomeLandmarkId: fixLandmarkId(p.homeLandmarkId),
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

// 13. Building footprints (src/data/tamaleWorldLayout.ts) - landmark boxes & cylinders, houses, shop rows.
// Rotation: Three.js rotY is counter-clockwise about +Y seen from above; with X->X and Z->Y the UE
// yaw (clockwise about +Z seen from above in UE's left-handed frame) is -rotY.
const rotYToUeYawDeg = (rotY: number) => Math.round(((-rotY * 180) / Math.PI) * 100) / 100;
const cm = (m: number) => Math.round(m * METERS_TO_UE_CM);
// The web house models don't store a height; these approximate the procedural models' storeys.
const HOUSE_HEIGHT_M: Record<string, number> = {
  modern_gated: 3.8,
  multi_storey_apt: 7.6,
  uncompleted_build: 4.2,
  mechanic_timber_bay: 4.5,
};
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const buildingRows = [
  ...TAMALE_LANDMARK_BOX_FOOTPRINTS.map((b) => ({
    Name: `lmbox_${b.id}`,
    BuildingId: `lmbox_${b.id}`,
    DisplayName: TAMALE_LANDMARKS.find((l) => l.id === b.id)?.name ?? b.id,
    Category: "Landmark",
    Shape: "Box",
    LandmarkId: TAMALE_LANDMARKS.some((l) => l.id === b.id) ? b.id : "",
    CenterLocationCm: { X: cm((b.minX + b.maxX) / 2), Y: cm((b.minZ + b.maxZ) / 2), Z: 0 },
    SizeCm: { X: cm(b.maxX - b.minX), Y: cm(b.maxZ - b.minZ), Z: cm(b.maxY) },
    YawDegrees: 0,
    Style: "",
    WallColorHex: "",
    AccentColorHex: "",
  })),
  ...TAMALE_LANDMARK_CYLINDERS.map((c) => ({
    Name: `lmcyl_${c.id}`,
    BuildingId: `lmcyl_${c.id}`,
    DisplayName: c.id,
    Category: "Landmark",
    Shape: "Cylinder",
    LandmarkId: "",
    CenterLocationCm: { X: cm(c.x), Y: cm(c.z), Z: 0 },
    SizeCm: { X: cm(c.radius * 2), Y: cm(c.radius * 2), Z: cm(c.maxY) },
    YawDegrees: 0,
    Style: "",
    WallColorHex: "",
    AccentColorHex: "",
  })),
  ...TAMALE_HOUSE_SPECS.map((h, i) => ({
    Name: `house_${String(i + 1).padStart(2, "0")}`,
    BuildingId: `house_${String(i + 1).padStart(2, "0")}`,
    DisplayName: `Residential house (${h.variant})`,
    Category: "House",
    Shape: "Box",
    LandmarkId: "",
    CenterLocationCm: { X: cm(h.x), Y: cm(h.z), Z: 0 },
    SizeCm: { X: cm(h.halfW * 2), Y: cm(h.halfD * 2), Z: cm(HOUSE_HEIGHT_M[h.variant] ?? 4) },
    YawDegrees: rotYToUeYawDeg(h.rotY),
    Style: h.variant,
    WallColorHex: h.primary,
    AccentColorHex: h.accent,
  })),
  ...TAMALE_SHOP_SPECS.map((sp, i) => ({
    Name: `shop_${String(i + 1).padStart(2, "0")}_${slug(sp.name).slice(0, 32)}`,
    BuildingId: `shop_${String(i + 1).padStart(2, "0")}_${slug(sp.name).slice(0, 32)}`,
    DisplayName: sp.name,
    Category: "Shop",
    Shape: "Box",
    LandmarkId: "",
    CenterLocationCm: { X: cm(sp.x), Y: cm(sp.z), Z: 0 },
    SizeCm: { X: cm(sp.w), Y: cm(sp.d), Z: cm(sp.h) },
    YawDegrees: rotYToUeYawDeg(sp.rotY),
    Style: sp.style ?? "standard",
    WallColorHex: sp.wall,
    AccentColorHex: sp.awning,
  })),
];
writeTable("DT_TamaleBuildings.json", buildingRows);
