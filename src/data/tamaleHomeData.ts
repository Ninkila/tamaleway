import {
  HomeIngredientId,
  HomeLaundryState,
  HomeRoomKey,
  HomeState,
  HomeUpgradeId,
  OutfitStyle,
  PlayableCharacterProfile,
  PlayerNeedsState,
} from "../types/game";

export interface HomeIngredientMeta {
  id: HomeIngredientId;
  name: string;
  dagbaniName: string;
  unitLabel: string;
  retailPriceCedis: number;
  description: string;
}

export const HOME_INGREDIENTS_CATALOG: HomeIngredientMeta[] = [
  {
    id: "cornmeal_millet",
    name: "Maize & Millet Flour Pack",
    dagbaniName: "Kawana / Zaɣim Zom",
    unitLabel: "bag",
    retailPriceCedis: 14,
    description: "Stone-milled northern maize and millet flour for Tuo Zaafi & Hausa Koko.",
  },
  {
    id: "rice_beans",
    name: "Perfumed Rice & Black-Eyed Peas",
    dagbaniName: "Shinkaafa ni Tuya",
    unitLabel: "pack",
    retailPriceCedis: 18,
    description: "Local northern rice & beans pack for Waakye and Tamale Jollof.",
  },
  {
    id: "yam_tubers",
    name: "Pona Yam Tubers (2 pcs)",
    dagbaniName: "Nyuli",
    unitLabel: "pair",
    retailPriceCedis: 20,
    description: "Sweet Northern Pona yam tubers for boiling, ampesi, or fufu pounding.",
  },
  {
    id: "groundnut_paste",
    name: "Roasted Groundnut Paste Jar",
    dagbaniName: "Simli Dɛɛm",
    unitLabel: "jar",
    retailPriceCedis: 15,
    description: "Rich stone-ground Tamale peanut butter for groundnut soup & stews.",
  },
  {
    id: "fresh_greens",
    name: "Ayoyo, Okro & Fresh Tomatoes",
    dagbaniName: "Ayoyo ni Maana",
    unitLabel: "basket",
    retailPriceCedis: 12,
    description: "Fresh jute leaves, garden eggs, onions, pepper, and tomatoes.",
  },
  {
    id: "meat_fish",
    name: "Smoked Guinea Fowl / Tilapia / Beef",
    dagbaniName: "Kpamli / Zom / Naɣi Nimdi",
    unitLabel: "cut",
    retailPriceCedis: 28,
    description: "Savannah protein cut ready for steaming soups or charcoal grilling.",
  },
  {
    id: "eggs_bread",
    name: "Farm Eggs & Sugar Bread",
    dagbaniName: "Noorim ni Paano",
    unitLabel: "set",
    retailPriceCedis: 14,
    description: "Half-dozen farm eggs with warm Tamale bakery sugar loaf.",
  },
  {
    id: "tea_sugar",
    name: "Spiced Tea, Ginger & Sugar",
    dagbaniName: "Tiɛ ni Sikaari",
    unitLabel: "tin",
    retailPriceCedis: 10,
    description: "Quick morning beverage blend with cloves and northern ginger.",
  },
  {
    id: "cooking_oil",
    name: "Shea & Vegetable Cooking Oil",
    dagbaniName: "Kpaam",
    unitLabel: "bottle",
    retailPriceCedis: 16,
    description: "Traditional refined shea oil and palm cooking oil for stews.",
  },
  {
    id: "clean_water",
    name: "Sealed Water Sachet Bag / Dispenser Bottle",
    dagbaniName: "Kom Maasim",
    unitLabel: "pack",
    retailPriceCedis: 8,
    description: "Purified drinking water refills hydration cleanly at home.",
  },
];

export interface HomeCookingRecipe {
  id: string;
  name: string;
  dagbaniName: string;
  description: string;
  cookMinutes: number;
  hungerRestore: number;
  energyRestore: number;
  thirstRestore: number;
  comfortRestore: number;
  cultureXp: number;
  ingredients: Partial<Record<HomeIngredientId, number>>;
}

export const HOME_COOKING_RECIPES: HomeCookingRecipe[] = [
  {
    id: "tuo_zaafi_home",
    name: "Tuo Zaafi & Ayoyo Soup",
    dagbaniName: "Saɣim ni Ayoyo",
    description: "Tamale's signature steaming millet swallow paired with rich ayoyo and smoked fish.",
    cookMinutes: 35,
    hungerRestore: 48,
    energyRestore: 34,
    thirstRestore: 8,
    comfortRestore: 22,
    cultureXp: 14,
    ingredients: { cornmeal_millet: 1, fresh_greens: 1, meat_fish: 1 },
  },
  {
    id: "waakye_home",
    name: "Home-Steamed Waakye & Stew",
    dagbaniName: "Waakye ni Shito",
    description: "Sorghum-leaf tinted rice & beans topped with tomato stew and egg.",
    cookMinutes: 30,
    hungerRestore: 44,
    energyRestore: 30,
    thirstRestore: 4,
    comfortRestore: 18,
    cultureXp: 10,
    ingredients: { rice_beans: 1, cooking_oil: 1, eggs_bread: 1 },
  },
  {
    id: "jollof_home",
    name: "Smoky Pot Jollof Rice & Beef",
    dagbaniName: "Shinkaafa Moɣili",
    description: "Slow-simmered tomato pepper rice with tender spiced beef cuts.",
    cookMinutes: 40,
    hungerRestore: 50,
    energyRestore: 32,
    thirstRestore: 2,
    comfortRestore: 24,
    cultureXp: 10,
    ingredients: { rice_beans: 1, fresh_greens: 1, meat_fish: 1, cooking_oil: 1 },
  },
  {
    id: "yam_egg_stew",
    name: "Boiled Pona Yam & Egg Stew",
    dagbaniName: "Nyuli ni Noorim",
    description: "Fluffy northern yam slices served with spicy onion-tomato egg stew.",
    cookMinutes: 25,
    hungerRestore: 40,
    energyRestore: 28,
    thirstRestore: 6,
    comfortRestore: 18,
    cultureXp: 8,
    ingredients: { yam_tubers: 1, eggs_bread: 1, fresh_greens: 1 },
  },
  {
    id: "groundnut_soup_home",
    name: "Pounded Yam & Groundnut Soup",
    dagbaniName: "Simli Zɛri",
    description: "Creamy roasted peanut soup with guinea fowl and soft pounded yam.",
    cookMinutes: 45,
    hungerRestore: 54,
    energyRestore: 38,
    thirstRestore: 12,
    comfortRestore: 26,
    cultureXp: 14,
    ingredients: { yam_tubers: 1, groundnut_paste: 1, meat_fish: 1 },
  },
  {
    id: "hausa_koko_bread",
    name: "Spiced Hausa Koko & Sugar Bread",
    dagbaniName: "Koko ni Paano",
    description: "Hot fermented millet porridge infused with cloves & ginger plus bread.",
    cookMinutes: 15,
    hungerRestore: 28,
    energyRestore: 22,
    thirstRestore: 18,
    comfortRestore: 16,
    cultureXp: 8,
    ingredients: { cornmeal_millet: 1, tea_sugar: 1, eggs_bread: 1 },
  },
  {
    id: "tea_bread_eggs",
    name: "Morning Tea, Toast & Omelette",
    dagbaniName: "Tiɛ ni Paano",
    description: "Fast balanced breakfast before heading into central Tamale.",
    cookMinutes: 12,
    hungerRestore: 26,
    energyRestore: 20,
    thirstRestore: 20,
    comfortRestore: 12,
    cultureXp: 4,
    ingredients: { eggs_bread: 1, tea_sugar: 1 },
  },
  {
    id: "chilled_water_drink",
    name: "Drink Chilled Drinking Water",
    dagbaniName: "Kom Maasim",
    description: "Rehydrate immediately from your home water supply.",
    cookMinutes: 2,
    hungerRestore: 0,
    energyRestore: 6,
    thirstRestore: 40,
    comfortRestore: 8,
    cultureXp: 0,
    ingredients: { clean_water: 1 },
  },
];

export interface HomeUpgradeDefinition {
  id: HomeUpgradeId;
  name: string;
  dagbaniName: string;
  category: string;
  maxLevel: number;
  levels: Array<{
    level: number;
    title: string;
    costCedis: number;
    effectSummary: string;
  }>;
}

export const HOME_UPGRADES_CATALOG: HomeUpgradeDefinition[] = [
  {
    id: "bed_tier",
    name: "Bedroom Comfort & Orthopedic Mattress",
    dagbaniName: "Gɔbu Shee",
    category: "Bedroom",
    maxLevel: 3,
    levels: [
      { level: 1, title: "Standard Foam Mattress", costCedis: 0, effectSummary: "Restores up to 85% Energy overnight" },
      { level: 2, title: "Orthopedic Queen Bed & Mosquito Net", costCedis: 180, effectSummary: "Restores 100% Energy + +15% Comfort" },
      { level: 3, title: "Executive Carved Hardwood Suite", costCedis: 360, effectSummary: "100% Energy + +30% Comfort & faster recovery" },
    ],
  },
  {
    id: "solar_power",
    name: "Rooftop Solar Panel & Inverter Backup",
    dagbaniName: "Wuntaŋa Laati",
    category: "Utilities",
    maxLevel: 2,
    levels: [
      { level: 1, title: "ECG Grid Meter Only", costCedis: 0, effectSummary: "Standard daily power bill (GH₵ 12/day)" },
      { level: 2, title: "2kW Solar Array & Inverter", costCedis: 260, effectSummary: "Cuts daily electricity bill by 65%" },
    ],
  },
  {
    id: "polytank_plumbing",
    name: "Polytank Pressure Pump & Filtered Shower",
    dagbaniName: "Kom Tanki",
    category: "Plumbing",
    maxLevel: 2,
    levels: [
      { level: 1, title: "Gravity-Fed Yard Drum & Cold Shower", costCedis: 0, effectSummary: "Standard shower & laundry efficiency" },
      { level: 2, title: "Pressurized 2500L Polytank & Heater", costCedis: 210, effectSummary: "+25% Hygiene bonus & cuts laundry wash time" },
    ],
  },
  {
    id: "kitchen_appliance",
    name: "4-Burner Gas Cooker & Frost-Free Fridge",
    dagbaniName: "Duɣibu Nɛma",
    category: "Kitchen",
    maxLevel: 2,
    levels: [
      { level: 1, title: "Tabletop Gas Burner & Mini Fridge", costCedis: 0, effectSummary: "Standard home meal cooking speed" },
      { level: 2, title: "Double-Door Fridge & 4-Burner Oven", costCedis: 240, effectSummary: "40% faster cooking + +10% Comfort bonus" },
    ],
  },
  {
    id: "tv_entertainment",
    name: "Living Room Smart TV & Carved Sofa Set",
    dagbaniName: "Teebuli ni TV",
    category: "Living Room",
    maxLevel: 2,
    levels: [
      { level: 1, title: "Woven Rug & Radio Table", costCedis: 0, effectSummary: "Basic sitting room relaxation" },
      { level: 2, title: "55\" Smart TV, Soundbar & Plush Sofa", costCedis: 290, effectSummary: "+35% Comfort & +15% Social when relaxing indoors" },
    ],
  },
  {
    id: "security_gate",
    name: "Compound Security Floodlights & Lock Gate",
    dagbaniName: "Duɣu Gubu",
    category: "Compound",
    maxLevel: 2,
    levels: [
      { level: 1, title: "Manual Latch Gate & Porch Bulb", costCedis: 0, effectSummary: "Standard compound perimeter lighting" },
      { level: 2, title: "Solar Security Floodlights & Reinforced Gate", costCedis: 170, effectSummary: "Nighttime courtyard security & +10% overnight Comfort" },
    ],
  },
];

export interface WardrobeOutfitMeta {
  id: OutfitStyle;
  label: string;
  dagbaniLabel: string;
  category: "Traditional" | "Everyday" | "Work" | "Formal" | "Sport" | "Evening";
  description: string;
  unlockCostCedis: number;
}

export const HOME_OUTFIT_CATALOG: WardrobeOutfitMeta[] = [
  {
    id: "batakari",
    label: "Dagbon Smock (Batakari)",
    dagbaniLabel: "Binaŋ / Batakari",
    category: "Traditional",
    description: "Hand-loomed northern fugu smock with embroidered chest pleats.",
    unlockCostCedis: 0,
  },
  {
    id: "kaba",
    label: "Kaba & Slit Wrap",
    dagbaniLabel: "Kaba ni Zana",
    category: "Traditional",
    description: "Classic tailored patterned cotton ensemble worn across Tamale.",
    unlockCostCedis: 0,
  },
  {
    id: "casual",
    label: "Street Tee & Trousers",
    dagbaniLabel: "Nɛma Zaɣi",
    category: "Everyday",
    description: "Breathable everyday cotton wear suited for northern afternoons.",
    unlockCostCedis: 0,
  },
  {
    id: "polo",
    label: "Smart Tamale Polo",
    dagbaniLabel: "Polo Kpaŋa",
    category: "Everyday",
    description: "Collared knit polo shirt for errands, market runs, or meetings.",
    unlockCostCedis: 0,
  },
  {
    id: "workwear",
    label: "Utility Jacket & Work Trousers",
    dagbaniLabel: "Tumtuma Nɛma",
    category: "Work",
    description: "Durable pockets and high-visibility trim for riders, logistics, and mechanics.",
    unlockCostCedis: 75,
  },
  {
    id: "formal",
    label: "Tailored Blazer & Dress Slacks",
    dagbaniLabel: "Kpamba Nɛma",
    category: "Formal",
    description: "Crisp formal jacket and collared shirt for bank, palace, or civic meetings.",
    unlockCostCedis: 110,
  },
  {
    id: "sportswear",
    label: "Alhassan Stadium Athletic Tracksuit",
    dagbaniLabel: "Diɛma Nɛma",
    category: "Sport",
    description: "Lightweight breathable training jersey and joggers for fitness runs.",
    unlockCostCedis: 65,
  },
  {
    id: "nightlife",
    label: "Savannah Evening Lounge Jacket",
    dagbaniLabel: "Zaawuni Nɛma",
    category: "Evening",
    description: "Sleek evening cut tailored for Jubilee Square dining and Tamale nightlife.",
    unlockCostCedis: 95,
  },
];

export interface DailyRoutineSuggestion {
  id: string;
  label: string;
  dagbaniLabel: string;
  hint: string;
}

export const DAILY_ROUTINE_SUGGESTIONS: DailyRoutineSuggestion[] = [
  {
    id: "morning_hygiene",
    label: "Morning shower & brush teeth",
    dagbaniLabel: "Kɔm suɣibu",
    hint: "Use your Bathroom Shower or Sink",
  },
  {
    id: "tidy_home",
    label: "Tidy house or wash dishes",
    dagbaniLabel: "Piiyi duɣu",
    hint: "Sweep yard, mop room, or clear sink dishes",
  },
  {
    id: "home_meal",
    label: "Cook or eat a nourishing meal",
    dagbaniLabel: "Duɣi bindirigu",
    hint: "Prepare food on Kitchen Stove or eat from Pantry",
  },
  {
    id: "city_hustle",
    label: "Work a City Job, Gig, or explore Tamale",
    dagbaniLabel: "Tum tuma",
    hint: "Complete a shift, ride, delivery, or shop visit",
  },
  {
    id: "laundry_care",
    label: "Wash or change into clean clothes",
    dagbaniLabel: "Piiyi nɛma",
    hint: "Use courtyard washing tub & clothesline or change outfit",
  },
  {
    id: "evening_rest",
    label: "Wind down & sleep at home",
    dagbaniLabel: "Gɔhi yiŋa",
    hint: "Relax on the sofa or sleep in your bedroom",
  },
];

export function createDefaultNeedsForCharacter(): PlayerNeedsState {
  return {
    hygiene: 88,
    hunger: 82,
    thirst: 80,
    social: 76,
    comfort: 82,
  };
}

export function createDefaultLaundryState(): HomeLaundryState {
  return {
    dirtyClothesCount: 1,
    washedWetCount: 0,
    dryingOnLineCount: 0,
    dryReadyAtMinutes: null,
    dryReadyDay: null,
    cleanOutfitsStored: 3,
    outfitCleanliness: 92,
  };
}

export function createDefaultHomeStateForCharacter(
  profile: PlayableCharacterProfile
): HomeState {
  const isHospitality = profile.id === "adiza_chef" || profile.id === "mariama_trader";
  const isBuilder = profile.id === "fuseini_artisan" || profile.id === "yakubu_pragya";
  const isScholarOrMoto = profile.id === "karim_student" || profile.id === "sulemana_moto";

  const baseIngredients: Record<HomeIngredientId, number> = {
    cornmeal_millet: isHospitality ? 3 : 2,
    rice_beans: isHospitality ? 3 : 2,
    yam_tubers: isHospitality ? 2 : 1,
    groundnut_paste: 2,
    fresh_greens: isHospitality ? 3 : 2,
    meat_fish: isHospitality ? 2 : 1,
    eggs_bread: 2,
    tea_sugar: 2,
    cooking_oil: 2,
    clean_water: 4,
  };

  const roomDirt: Record<HomeRoomKey, number> = {
    courtyard: 14,
    livingRoom: 10,
    kitchen: 12,
    bedroom: 8,
    bathroom: 10,
  };

  const homeLabelMap: Record<string, string> = {
    yakubu_pragya: "Yakubu's Changli Compound",
    sulemana_moto: "Sulemana's Tishigu Quarters",
    mariama_trader: "Mariama's Changli Compound",
    karim_student: "Karim's Study Compound",
    fuseini_artisan: "Master Fuseini's Compound",
    adiza_chef: "Adiza's Kitchen Residence",
  };

  return {
    homeName: homeLabelMap[profile.id] ?? `${profile.nickname}'s Tamale Home`,
    homeDistrict: "Changli – Jakarayili Residential Quarter",
    cleanliness: 89,
    dirtyDishesCount: 1,
    rubbishCount: 1,
    roomDirt,
    upgrades: {
      bed_tier: profile.id === "mariama_trader" ? 2 : 1,
      solar_power: isScholarOrMoto ? 2 : 1,
      polytank_plumbing: isBuilder ? 2 : 1,
      kitchen_appliance: isHospitality ? 2 : 1,
      tv_entertainment: isScholarOrMoto ? 2 : 1,
      security_gate: 1,
    },
    fridgeIngredients: baseIngredients,
    cookedMealsReady: [],
    lastMaintainedDay: 1,
    dailyBillsOwed: 0,
    dailyRoutineIdsDone: [],
    remindersEnabled: true,
  };
}

export function computeHomeCleanlinessFromRooms(
  roomDirt: Record<HomeRoomKey, number>,
  dirtyDishesCount: number,
  rubbishCount: number
): number {
  const avgDirt =
    (roomDirt.courtyard +
      roomDirt.livingRoom +
      roomDirt.kitchen +
      roomDirt.bedroom +
      roomDirt.bathroom) /
    5;
  const penalty = avgDirt * 0.72 + dirtyDishesCount * 3.5 + rubbishCount * 4;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function computeDailyHomeBillCedis(home: HomeState): number {
  const baseElectric = home.upgrades.solar_power >= 2 ? 4 : 12;
  const waterBill = home.upgrades.polytank_plumbing >= 2 ? 5 : 4;
  const municipalRates = 4;
  return baseElectric + waterBill + municipalRates;
}
