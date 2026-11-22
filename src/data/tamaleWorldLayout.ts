import { DrivableVehicleKind } from "../types/game";
import type { ShopArchitecturalStyle, TamaleHouseVariant } from "../game/models";

export interface ShopBuildingSpec {
  x: number;
  z: number;
  rotY: number;
  w: number;
  h: number;
  d: number;
  wall: string;
  awning: string;
  name: string;
  sub: string;
  style?: ShopArchitecturalStyle;
}

export interface HouseBuildingSpec {
  x: number;
  z: number;
  rotY: number;
  variant: TamaleHouseVariant;
  primary: string;
  accent: string;
  halfW: number;
  halfD: number;
}

export interface StallPlacementSpec {
  kind:
    | "kiosk"
    | "food_vendor"
    | "mobile_money"
    | "accessories_cart"
    | "cloth_table"
    | "corn_grill"
    | "ice_cream_cart"
    | "household_table";
  x: number;
  z: number;
  rotY: number;
  color: string;
}

export interface DrivableSpawnSpec {
  id: string;
  kind: DrivableVehicleKind;
  label: string;
  x: number;
  z: number;
  rotY: number;
  color: string;
  canopyColor?: string;
}

export interface LandmarkFootprintBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}

export const TAMALE_COMPOUND_SPECS: Array<[number, number, number]> = [
  [-84, 48, 0],
  [-134, 52, 0],
  [-134, -68, Math.PI],
  [-48, -134, 0],
  [24, 184, Math.PI],
  [48, 184, Math.PI],
  [-134, 184, Math.PI],
  [204, 14, 0],
];

export const TAMALE_LANDMARK_BOX_FOOTPRINTS: LandmarkFootprintBox[] = [
  { id: "central_market", minX: -59, maxX: -29, minZ: -42, maxZ: -18.5, maxY: 4.2 },
  { id: "jubilee_office", minX: 77.5, maxX: 94.5, minZ: 13.5, maxZ: 24, maxY: 10.5 },
  { id: "cultural_centre", minX: -93, maxX: -75, minZ: 12, maxZ: 28, maxY: 4.5 },
  { id: "dakpema_palace", minX: -45.2, maxX: -22.8, minZ: -79, maxZ: -68.2, maxY: 5.4 },
  { id: "tamale_teaching_hospital", minX: 82.5, maxX: 109.5, minZ: 91.5, maxZ: 107, maxY: 10.5 },
  { id: "aliu_mahama_stadium_gate", minX: -138.4, maxX: -129.6, minZ: -102.9, maxZ: -99.5, maxY: 3.2 },
  { id: "tamale_airport", minX: -14, maxX: 14, minZ: -202.5, maxZ: -191, maxY: 6.2 },
  { id: "scca_red_clay", minX: 206.7, maxX: 217.5, minZ: 31.8, maxZ: 52.2, maxY: 6.8 },
  { id: "kukuo_market_pottery", minX: 148.5, maxX: 167.5, minZ: 26.5, maxZ: 33, maxY: 5.0 },
  { id: "gunayili_cattle_timber", minX: 148.5, maxX: 170, minZ: -73.5, maxZ: -62.5, maxY: 5.0 },
  { id: "aboabo_market", minX: -144.5, maxX: -119.5, minZ: 16.5, maxZ: 37.5, maxY: 5.0 },
  { id: "lamashegu_market_hub", minX: -95.5, maxX: -72.5, minZ: 89.5, maxZ: 110.5, maxY: 5.0 },
  { id: "kakpagyili_market", minX: 20.5, maxX: 43.5, minZ: 148, maxZ: 168, maxY: 5.0 },
  { id: "tamale_school", minX: 24.5, maxX: 43.5, minZ: -77, maxZ: -68, maxY: 5.0 },
  { id: "dungu_campus", minX: -143.5, maxX: -124.5, minZ: 151, maxZ: 160, maxY: 5.0 },
  { id: "tamale_police_hq", minX: 48.8, maxX: 59.2, minZ: -38.8, maxZ: -25.2, maxY: 6.0 },
  { id: "player_home", minX: 12.5, maxX: 27.5, minZ: 75, maxZ: 87, maxY: 6.2 },
];

export const TAMALE_LANDMARK_CYLINDERS: Array<{
  id: string;
  x: number;
  z: number;
  radius: number;
  maxY: number;
}> = [
  { id: "central_mosque_dome", x: 34, z: 45, radius: 8.75, maxY: 12.5 },
  { id: "central_mosque_minaret_w", x: 23.8, z: 50.5, radius: 1.65, maxY: 13.5 },
  { id: "central_mosque_minaret_e", x: 44.2, z: 50.5, radius: 1.65, maxY: 13.5 },
  { id: "jubilee_monument", x: 86, z: 44, radius: 2.6, maxY: 6.2 },
  { id: "aliu_mahama_stadium_bowl", x: -134, z: -124, radius: 21.1, maxY: 10.2 },
  { id: "scca_red_clay_plane", x: 201.2, z: 48.5, radius: 3.1, maxY: 2.0 },
];

export const TAMALE_HOUSE_SPECS: HouseBuildingSpec[] = [
  // Kalpohin & Kalpohin Estates
  { x: 84, z: -120, rotY: 0, variant: "modern_gated", primary: "#d1fae5", accent: "#15803d", halfW: 5.5, halfD: 5.0 },
  { x: 108, z: -120, rotY: 0, variant: "modern_gated", primary: "#fef3c7", accent: "#b45309", halfW: 5.5, halfD: 5.0 },
  { x: 109, z: -140, rotY: Math.PI, variant: "uncompleted_build", primary: "#94a3b8", accent: "#78350f", halfW: 5.2, halfD: 4.0 },
  // Gumani Developing Suburb
  { x: 148, z: -120, rotY: 0, variant: "uncompleted_build", primary: "#94a3b8", accent: "#78350f", halfW: 5.2, halfD: 4.0 },
  { x: 168, z: -120, rotY: 0, variant: "uncompleted_build", primary: "#94a3b8", accent: "#78350f", halfW: 5.2, halfD: 4.0 },
  { x: 158, z: -142, rotY: Math.PI, variant: "modern_gated", primary: "#e0f2fe", accent: "#0369a1", halfW: 5.5, halfD: 5.0 },
  // Kanvilli & Gumbihini & Choggu
  { x: 24, z: -120, rotY: 0, variant: "multi_storey_apt", primary: "#f1f5f9", accent: "#1e3a5f", halfW: 6.2, halfD: 4.2 },
  { x: 46, z: -120, rotY: 0, variant: "modern_gated", primary: "#ffedd5", accent: "#c2410c", halfW: 5.5, halfD: 5.0 },
  { x: -24, z: -120, rotY: 0, variant: "multi_storey_apt", primary: "#e7e5e4", accent: "#0f766e", halfW: 6.2, halfD: 4.2 },
  { x: -82, z: -120, rotY: 0, variant: "modern_gated", primary: "#dcfce7", accent: "#166534", halfW: 5.5, halfD: 5.0 },
  // Sagnarigu & Nyohini
  { x: -182, z: -116, rotY: Math.PI / 2, variant: "modern_gated", primary: "#fef9c3", accent: "#a16207", halfW: 5.5, halfD: 5.0 },
  { x: -182, z: -24, rotY: Math.PI / 2, variant: "multi_storey_apt", primary: "#f8fafc", accent: "#991b1b", halfW: 6.2, halfD: 4.2 },
  // Aboabo & Lamashegu Mechanics
  { x: -134, z: -16, rotY: 0, variant: "multi_storey_apt", primary: "#fed7aa", accent: "#9a3412", halfW: 6.2, halfD: 4.2 },
  { x: -124, z: 106, rotY: 0, variant: "mechanic_timber_bay", primary: "#cbd5e1", accent: "#0369a1", halfW: 5.5, halfD: 4.2 },
  { x: -144, z: 106, rotY: 0, variant: "mechanic_timber_bay", primary: "#e2e8f0", accent: "#b45309", halfW: 5.5, halfD: 4.2 },
  { x: -42, z: 106, rotY: 0, variant: "multi_storey_apt", primary: "#f1f5f9", accent: "#1d4ed8", halfW: 6.2, halfD: 4.2 },
  // Dabokpaa & Vittin
  { x: 150, z: 158, rotY: 0, variant: "multi_storey_apt", primary: "#fef3c7", accent: "#0f766e", halfW: 6.2, halfD: 4.2 },
  { x: 170, z: 158, rotY: 0, variant: "uncompleted_build", primary: "#94a3b8", accent: "#78350f", halfW: 5.2, halfD: 4.0 },
  { x: 204, z: 78, rotY: -Math.PI / 2, variant: "modern_gated", primary: "#e0f2fe", accent: "#15803d", halfW: 5.5, halfD: 5.0 },
  // Dungu student hostels
  { x: -182, z: 148, rotY: Math.PI / 2, variant: "multi_storey_apt", primary: "#e0e7ff", accent: "#1e40af", halfW: 6.2, halfD: 4.2 },
  // Changli – Jakarayili Residential Quarter Neighbours
  { x: 19, z: 111, rotY: Math.PI, variant: "multi_storey_apt", primary: "#f1f5f9", accent: "#0f766e", halfW: 6.0, halfD: 4.2 },
  { x: 50, z: 111, rotY: Math.PI, variant: "modern_gated", primary: "#fef3c7", accent: "#b45309", halfW: 5.5, halfD: 4.8 },
];

export const TAMALE_SHOP_SPECS: ShopBuildingSpec[] = [
  { x: -18, z: -13, rotY: 0, w: 8.5, h: 3.9, d: 6.2, wall: "#fef3c7", awning: "#047857", name: "NORTHERN STAR PHARMACY", sub: "GBEWAA HIGH ST · TAMALE" },
  { x: 20, z: -13, rotY: 0, w: 8.5, h: 3.8, d: 6.0, wall: "#e0f2fe", awning: "#b45309", name: "TAMALE MOBILE MONEY", sub: "PROVISIONS & COLD DRINKS" },
  { x: 34, z: -13, rotY: 0, w: 8.5, h: 4.0, d: 6.0, wall: "#1e1b4b", awning: "#f59e0b", name: "JUBILEE AFROBEATS CLUB", sub: "DJ LOUNGE · CHICHINGA · OWARE", style: "nightclub" },
  { x: 48, z: -13, rotY: 0, w: 8.2, h: 4.0, d: 6.2, wall: "#e2e8f0", awning: "#991b1b", name: "DAGBON HARDWARE", sub: "TOOLS & ZINC ROOFING", style: "mechanic" },
  { x: 75.5, z: -13, rotY: 0, w: 8.6, h: 4.1, d: 6.2, wall: "#fff1f2", awning: "#dc2626", name: "SAVANNAH FRIED CHICKEN", sub: "BURGERS · JOLLOF · SHAKES", style: "fast_food" },
  { x: -54, z: -13, rotY: 0, w: 10.2, h: 4.3, d: 6.8, wall: "#f8fafc", awning: "#0284c7", name: "TAMALE CENTRAL MART", sub: "SUPERMARKET & COLD STORE", style: "supermarket" },
  { x: 24, z: 14, rotY: Math.PI, w: 8.5, h: 3.8, d: 6.0, wall: "#fae8ff", awning: "#0f766e", name: "ALHASSAN FABRICS", sub: "SMOCKS & WAX PRINTS" },
  { x: 40, z: 14, rotY: Math.PI, w: 8.5, h: 3.8, d: 6.0, wall: "#ecfccb", awning: "#ca8a04", name: "SHEA CO-OP DEPOT", sub: "PURE KPAKPILI & YAM" },
  { x: -20, z: 14, rotY: Math.PI, w: 8.2, h: 3.7, d: 6.0, wall: "#f1f5f9", awning: "#1e40af", name: "SAVANNAH TELECOM", sub: "AIRTIME & REPAIRS" },
  { x: -36, z: 14, rotY: Math.PI, w: 8.2, h: 3.8, d: 6.0, wall: "#fde68a", awning: "#15803d", name: "TISHIGU BAKERY", sub: "BREAD & ROASTED YAM", style: "cafe" },
  { x: -55, z: 14, rotY: Math.PI, w: 8.4, h: 3.8, d: 6.0, wall: "#fef9c3", awning: "#9a3412", name: "NORTHERN TAILORS ROW", sub: "BATAKARI · LEATHER SANDALS" },
  { x: 88, z: -14, rotY: 0, w: 9.2, h: 4.1, d: 6.5, wall: "#f8fafc", awning: "#0369a1", name: "TAMALE ENTERPRISE BANK", sub: "HIGH ST BRANCH & ATM", style: "bank_momo" },
  { x: 102, z: -13, rotY: 0, w: 8.6, h: 3.9, d: 6.0, wall: "#0f172a", awning: "#0284c7", name: "GBEWAA ELECTRONICS HUB", sub: "PHONES · SOLAR · REPAIRS", style: "electronics" },
  { x: 116, z: -13, rotY: 0, w: 8.2, h: 3.7, d: 6.0, wall: "#fff1f2", awning: "#ec4899", name: "TAMALE COOL SCOOP", sub: "ICE CREAM · SMOOTHIES", style: "ice_cream" },
  { x: 52, z: 14, rotY: Math.PI, w: 8.4, h: 3.8, d: 6.0, wall: "#fdf2f8", awning: "#be185d", name: "SAVANNAH BOUTIQUE", sub: "FASHION · COSMETICS · PERFUME", style: "boutique" },
  { x: 112, z: 14, rotY: Math.PI, w: 9.6, h: 4.3, d: 6.4, wall: "#1e1b4b", awning: "#db2777", name: "SAVANNAH BEATS NIGHTCLUB", sub: "DJ STAGE · LOUNGE · GAMES", style: "nightclub" },
  { x: -82, z: -13, rotY: 0, w: 8.4, h: 3.8, d: 6.0, wall: "#fef3c7", awning: "#7c2d12", name: "NORTHERN FOOTWEAR & BAGS", sub: "SANDALS · SNEAKERS · LEATHER", style: "boutique" },
  { x: -16, z: 42, rotY: Math.PI / 2, w: 8.6, h: 3.8, d: 6.0, wall: "#fffbeb", awning: "#ea580c", name: "GUKPEGU TILAPIA & JOLLOF", sub: "CHARCOAL FISH · BANKU · SOBOLO", style: "restaurant" },
  { x: 112, z: 138, rotY: Math.PI, w: 8.6, h: 3.8, d: 6.2, wall: "#f8fafc", awning: "#0d9488", name: "DABOKPAA HOUSEHOLD MART", sub: "PLASTICS · FLASKS · GROCERIES", style: "supermarket" },
  { x: -18, z: -62, rotY: 0, w: 8.6, h: 3.7, d: 6.4, wall: "#e7e5e4", awning: "#b45309", name: "KALPOHIN BOOKSHOP", sub: "STATIONERY & PRINTS" },
  { x: -114, z: 14, rotY: Math.PI, w: 8.4, h: 3.7, d: 6.0, wall: "#fef3c7", awning: "#b45309", name: "ABOABO CHICHINGA GRILL", sub: "SPICED KEBAB & WAAKYE", style: "restaurant" },
  { x: -116, z: 30, rotY: Math.PI / 2, w: 8.2, h: 3.8, d: 5.8, wall: "#fffbeb", awning: "#b45309", name: "HAJIA MEMUNA TZ & FUFU", sub: "SAƔIM · AYOYO · SOUP", style: "restaurant" },
  { x: -84, z: 142, rotY: 0, w: 8.8, h: 3.8, d: 6.2, wall: "#e2e8f0", awning: "#dc2626", name: "LAMASHEGU SPARE PARTS", sub: "BAJAJ PRAGYA & MOTO", style: "mechanic" },
  { x: 146, z: 14, rotY: Math.PI, w: 8.2, h: 3.7, d: 6.0, wall: "#ffedd5", awning: "#9a3412", name: "KUKUO PROVISIONS", sub: "SHEA BUTTER & GRAINS" },
  { x: 172, z: 14, rotY: Math.PI, w: 8.8, h: 3.9, d: 6.2, wall: "#fff7ed", awning: "#c2410c", name: "VITTIN PIZZA & SUYA BAR", sub: "SMASH BURGERS · GRILL", style: "fast_food" },
  { x: 20, z: -144, rotY: 0, w: 8.6, h: 3.8, d: 6.0, wall: "#f1f5f9", awning: "#0369a1", name: "KANVILLI HIGHWAY MART", sub: "AIRPORT RD FUEL & DRINKS", style: "supermarket" },
  { x: 52, z: -102, rotY: 0, w: 8.4, h: 3.8, d: 6.0, wall: "#fefce8", awning: "#16a34a", name: "KALPOHIN JUICE & PASTRY", sub: "MANGO · BAOBAB · BREAD", style: "cafe" },
  // Enterable Neighbourhood Businesses & Services
  { x: -146, z: -13, rotY: 0, w: 8.4, h: 3.7, d: 6.0, wall: "#f8fafc", awning: "#7c3aed", name: "NYOHINI FADE & BRAIDS", sub: "BARBER & SALON STUDIO", style: "salon" },
  { x: 56, z: 32, rotY: -Math.PI / 2, w: 9.2, h: 4.3, d: 6.6, wall: "#fef3c7", awning: "#0f766e", name: "JUBILEE REST GUEST HOUSE", sub: "COOL ROOMS · OPEN 24H" },
  { x: 150, z: 114, rotY: 0, w: 9.0, h: 3.9, d: 6.2, wall: "#e0f2fe", awning: "#dc2626", name: "SAVANNAH FITNESS & PRINT", sub: "GYM · PHOTOCOPY · DESIGN" },
  { x: 18, z: -32, rotY: Math.PI / 2, w: 8.4, h: 3.8, d: 6.0, wall: "#ecfccb", awning: "#15803d", name: "TISHIGU PHARMACY & BAKERY", sub: "HOT SUGAR BREAD · TONICS", style: "cafe" },
  { x: 86, z: -78, rotY: 0, w: 9.2, h: 3.9, d: 6.4, wall: "#e2e8f0", awning: "#b45309", name: "KALPOHIN HARDWARE & WELDING", sub: "CEMENT · WOOD · STEEL", style: "mechanic" },
  { x: -144, z: 144, rotY: 0, w: 8.8, h: 3.8, d: 6.2, wall: "#eff6ff", awning: "#1d4ed8", name: "DUNGU CAMPUS CAFE & BOOKS", sub: "INTERNET · PRINTS · WAAKYE", style: "cafe" },
  { x: -84, z: -144, rotY: 0, w: 8.8, h: 4.0, d: 6.2, wall: "#1e1b4b", awning: "#ea580c", name: "CHOGGU NIGHT SPOT CLUB", sub: "LIVE RHYTHMS · TILAPIA · LOUNGE", style: "nightclub" },
  { x: 50, z: 81, rotY: 0, w: 8.6, h: 3.8, d: 6.2, wall: "#ecfccb", awning: "#15803d", name: "CHANGLI NEIGHBOURHOOD MART", sub: "PROVISIONS · GROCERIES · WATER", style: "supermarket" },
];

export const TAMALE_STALL_PLACEMENTS: StallPlacementSpec[] = [
  { kind: "food_vendor", x: -36, z: -15.5, rotY: 0, color: "#dc2626" },
  { kind: "food_vendor", x: 34, z: -9.8, rotY: 0, color: "#eab308" },
  { kind: "food_vendor", x: -114, z: 10.6, rotY: Math.PI, color: "#ea580c" },
  { kind: "food_vendor", x: -84, z: 111.5, rotY: 0, color: "#b45309" },
  { kind: "food_vendor", x: -84, z: -139.8, rotY: 0, color: "#ea580c" },
  { kind: "food_vendor", x: -144, z: 139.8, rotY: 0, color: "#15803d" },
  { kind: "food_vendor", x: -10.8, z: 42, rotY: Math.PI / 2, color: "#ea580c" },
  { kind: "mobile_money", x: 12, z: -10.2, rotY: 0, color: "#facc15" },
  { kind: "mobile_money", x: -24, z: 10.6, rotY: Math.PI, color: "#ef4444" },
  { kind: "mobile_money", x: -74, z: 10.4, rotY: Math.PI, color: "#0284c7" },
  { kind: "mobile_money", x: 94, z: -10.2, rotY: 0, color: "#facc15" },
  { kind: "kiosk", x: -55, z: 9.8, rotY: Math.PI, color: "#0284c7" },
  { kind: "kiosk", x: 58, z: -11.5, rotY: 0, color: "#0f766e" },
  { kind: "kiosk", x: -140, z: -12, rotY: 0, color: "#d97706" },
  { kind: "kiosk", x: 138, z: 12, rotY: Math.PI, color: "#15803d" },
  { kind: "kiosk", x: 38, z: 146, rotY: 0, color: "#0369a1" },
  { kind: "accessories_cart", x: -12, z: 9.8, rotY: Math.PI, color: "#facc15" },
  { kind: "accessories_cart", x: -49, z: -9.6, rotY: 0, color: "#0284c7" },
  { kind: "accessories_cart", x: 106, z: -9.8, rotY: 0, color: "#0284c7" },
  { kind: "cloth_table", x: -42, z: -16.2, rotY: 0, color: "#be123c" },
  { kind: "cloth_table", x: -124, z: 18, rotY: Math.PI, color: "#1d4ed8" },
  { kind: "cloth_table", x: 46, z: 10.2, rotY: Math.PI, color: "#be185d" },
  { kind: "corn_grill", x: 16, z: -9.6, rotY: 0, color: "#ea580c" },
  { kind: "corn_grill", x: -77, z: 112.5, rotY: 0, color: "#f59e0b" },
  { kind: "corn_grill", x: 90, z: 109, rotY: Math.PI, color: "#dc2626" },
  { kind: "corn_grill", x: -128, z: -100, rotY: 0, color: "#ea580c" },
  { kind: "ice_cream_cart", x: 112, z: -9.5, rotY: 0, color: "#ec4899" },
  { kind: "ice_cream_cart", x: 32, z: -56, rotY: 0, color: "#0284c7" },
  { kind: "ice_cream_cart", x: -136, z: 140, rotY: 0, color: "#f59e0b" },
  { kind: "household_table", x: -48, z: -41, rotY: Math.PI, color: "#0d9488" },
  { kind: "household_table", x: 112, z: 134, rotY: Math.PI, color: "#0284c7" },
  { kind: "food_vendor", x: 45, z: 89.2, rotY: 0, color: "#15803d" },
  { kind: "kiosk", x: 14, z: 102.5, rotY: Math.PI, color: "#0284c7" },
];

export const TAMALE_BENCH_PLACEMENTS: Array<[number, number, number]> = [
  [-14, -10.2, 0],
  [28, 10.2, Math.PI],
  [-40, 10.2, Math.PI],
  [-80, 40, 0],
  [-126, 48, 0],
  [42, -110, Math.PI],
  [88, -110, Math.PI],
  [148, 22, 0],
  [24, 177.8, 0],
  [84, 36, 0],
  [-84, -138, 0],
  [115, -9.8, 0],
  [-11.2, 46, Math.PI / 2],
  [11, 89.5, 0],
  [29, 102.2, Math.PI],
];

export const TAMALE_TREE_PLACEMENTS: Array<[number, number, "baobab" | "shea" | "neem" | "mango"]> = [
  [-12, -24, "neem"], [14, -26, "shea"], [44, -28, "mango"], [-24, 28, "baobab"],
  [14, 28, "neem"], [56, 42, "shea"], [74, 42, "mango"], [98, 42, "neem"],
  [-76, -24, "baobab"], [-92, -32, "shea"], [-46, 34, "mango"], [-32, 54, "baobab"],
  [14, -64, "neem"], [54, -66, "baobab"], [-94, 28, "neem"],
  [-114, 52, "baobab"], [-150, -74, "shea"], [-50, -112, "neem"], [78, -104, "mango"],
  [144, 52, "shea"], [196, 18, "baobab"], [116, 114, "neem"], [52, 142, "mango"],
  [-114, 146, "baobab"], [-26, -172, "shea"], [26, -172, "neem"],
  [10, 77, "mango"], [30, 77, "neem"], [29, 114, "shea"], [43, 115, "mango"],
];

export const TAMALE_PARKED_MOTOS: Array<[number, number, number, string]> = [
  [-24, -10.5, 0.4, "#dc2626"],
  [-45, -13.5, -0.3, "#1d4ed8"],
  [23, 10.2, Math.PI - 0.3, "#15803d"],
  [43, -10.2, 0.25, "#18181b"],
  [-76, 15, 1.2, "#b45309"],
  [-122, 10.6, -0.4, "#dc2626"],
  [-92, 135, 0.6, "#0284c7"],
  [82, -10.4, -0.2, "#1e3a8a"],
  [144, 10.4, Math.PI + 0.2, "#ca8a04"],
  [28, -112, 0.3, "#dc2626"],
  [-142, -9.8, -0.2, "#7c3aed"],
  [-128, -100, 0.35, "#dc2626"],
  [12, -184, 0.1, "#0284c7"],
  [-140, 139, -0.5, "#1d4ed8"],
  [-78, -139, 0.4, "#ea580c"],
  [154, 22, 0.2, "#15803d"],
  [82, 110, -0.3, "#1e293b"],
  [54, 24, Math.PI / 2, "#b45309"],
  [25.5, 88.5, 0.25, "#0284c7"],
];

export const TAMALE_BUS_STOPS: Array<[number, number, number, string, string]> = [
  [14, -9.8, 0, "INTERCHANGE EAST", "#0284c7"],
  [-28, -9.8, 0, "CENTRAL MARKET", "#eab308"],
  [-114, 9.8, Math.PI, "ABOABO RANK", "#15803d"],
  [-76, 118, Math.PI / 2, "LAMASHEGU HUB", "#0284c7"],
  [78, 118, -Math.PI / 2, "HOSPITAL GATE", "#dc2626"],
  [-128, 146, 0, "UDS DUNGU STOP", "#1d4ed8"],
];

export const TAMALE_POLE_EW_XS = [-148, -120, -92, -74, -52, -32, -16, 16, 36, 56, 76, 96, 144, 170];
export const TAMALE_POLE_NS_ZS = [-140, -112, -76, -58, -32, -14, 16, 36, 56, 78, 108, 144];

export const TAMALE_PLANTER_BINS: Array<[number, number, boolean]> = [
  [-15, -9.6, true], [15, 9.6, true], [44, -9.8, false], [74, 9.8, true],
  [88, 11, true], [104, -9.8, false], [-44, 9.6, false], [-78, -9.8, true],
  [92, 114, true], [-134, -104, false],
];

export const TAMALE_DIRECTION_SIGNS: Array<{
  x: number;
  z: number;
  rotY: number;
  title: string;
  sub: string;
  bg?: string;
}> = [
  { x: 11, z: -10.5, rotY: -Math.PI / 4, title: "<- CENTRAL MARKET", sub: "AIRPORT N10 ->", bg: "#065f46" },
  { x: -11, z: 10.5, rotY: (3 * Math.PI) / 4, title: "<- ABOABO / STADIUM", sub: "MOSQUE / SALAGA ->", bg: "#065f46" },
  { x: -58, z: -9.8, rotY: 0, title: "CENTRAL MARKET", sub: "DAKPEMA PALACE ^", bg: "#047857" },
  { x: 74, z: 10.2, rotY: Math.PI, title: "JUBILEE PARK", sub: "TEACHING HOSPITAL ->", bg: "#0369a1" },
  { x: -95, z: 118, rotY: Math.PI / 2, title: "LAMASHEGU HUB", sub: "<- DUNGU | SALAGA ->", bg: "#065f46" },
  { x: 120, z: 120, rotY: -Math.PI / 2, title: "TEACHING HOSPITAL", sub: "DABOKPAA / VITTIN ->", bg: "#0f766e" },
];

export const TAMALE_SPEED_HUMPS: Array<{ x: number; z: number; rotY: number; w?: number }> = [
  { x: -24, z: 0, rotY: Math.PI / 2, w: 12 },
  { x: 30, z: -48, rotY: Math.PI / 2, w: 8.5 },
  { x: -115, z: 0, rotY: Math.PI / 2, w: 12 },
  { x: -84, z: 128, rotY: Math.PI / 2, w: 9.2 },
  { x: 86, z: 128, rotY: Math.PI / 2, w: 9.2 },
  { x: 0, z: 24, rotY: 0, w: 10.5 },
];

export const TAMALE_DUSTY_LANES: Array<{ x: number; z: number; w: number; d: number }> = [
  { x: -108, z: 56, w: 68, d: 4.6 },
  { x: -134, z: 74, w: 4.6, d: 42 },
  { x: 162, z: 14, w: 48, d: 4.5 },
  { x: 96, z: -130, w: 62, d: 4.5 },
  { x: 36, z: 174, w: 54, d: 4.6 },
];

export const TAMALE_SOLAR_POLYTANK_SPOTS: Array<[number, number, number, boolean]> = [
  [88, 4.1, -14, true],
  [102, 3.9, -13, true],
  [-54, 4.3, -13, true],
  [56, 4.3, 32, false],
  [84, 3.8, -120, true],
  [24, 5.4, -120, false],
];

export const TAMALE_NIGHT_SPOTS: Array<{ x: number; z: number; color: number }> = [
  { x: 34, z: -9.2, color: 0xffa73b },    // Jubilee Afrobeats Club
  { x: 38, z: -9.2, color: 0xf43f5e },
  { x: 20, z: -9.2, color: 0xfde047 },    // Gbewaa Mobile Money
  { x: -120, z: 9.8, color: 0xfb923c },   // Aboabo Chichinga Grill
  { x: -84, z: 112.5, color: 0xffa73b },  // Lamashegu evening chop bar
  { x: 86, z: 36, color: 0xfacc15 },      // Jubilee evening plaza
  { x: -84, z: -139, color: 0xfb923c },   // Choggu Night Spot Club
  { x: -144, z: 139, color: 0x38bdf8 },   // Dungu Student Hub
  { x: 52, z: 32, color: 0xfde047 },      // Jubilee Rest Guest House
  { x: 116, z: -9.2, color: 0xf472b6 },   // Tamale Cool Scoop
  { x: 112, z: 9.8, color: 0xa855f7 },    // Savannah Beats Nightclub
  { x: -10.5, z: 42, color: 0xfb923c },   // Gukpegu Grilled Tilapia Spot
  { x: 52, z: 9.8, color: 0xf472b6 },     // Savannah Glamour Boutique
  { x: 20, z: 87.2, color: 0xfde047 },    // Player Home Gate Security Light
  { x: 50, z: 86.2, color: 0x34d399 },    // Changli Mart Porch Light
];

export const TAMALE_DRIVABLE_SPAWNS: DrivableSpawnSpec[] = [
  { id: "pragya_interchange", kind: "pragya", label: "Bajaj Pragya (Interchange)", x: 11, z: 10.5, rotY: -Math.PI * 0.5, color: "#0284c7", canopyColor: "#6b4f3a" },
  { id: "moto_highst", kind: "motorcycle", label: "Commuter Motorcycle (Tishigu)", x: 18, z: -19, rotY: 0.4, color: "#dc2626" },
  { id: "pragya_hospital", kind: "pragya", label: "Yellow Pragya (Teaching Hospital)", x: 78, z: 118, rotY: Math.PI, color: "#eab308", canopyColor: "#1f2937" },
  { id: "moto_lamashegu", kind: "motorcycle", label: "Cargo Moto (Lamashegu)", x: -86, z: 119, rotY: Math.PI * 0.5, color: "#1d4ed8" },
  { id: "cargo_trike_aboabo", kind: "cargo_trike", label: "Motor King Cargo Trike (Aboabo)", x: -112, z: 20, rotY: Math.PI * 0.5, color: "#1d4ed8" },
  { id: "taxi_jubilee", kind: "taxi", label: "Tamale Saloon Taxi (Jubilee)", x: 24, z: 22, rotY: -Math.PI * 0.5, color: "#eab308" },
  { id: "pickup_market", kind: "pickup_truck", label: "Tamale Utility Pickup Truck (Central Market)", x: -20, z: -22, rotY: 0, color: "#0f766e" },
  { id: "box_truck_lamashegu", kind: "box_truck", label: "Northern Box Freight Truck (Lamashegu Yard)", x: -76, z: 80, rotY: Math.PI * 0.5, color: "#f8fafc" },
  { id: "flatbed_gunayili", kind: "flatbed_truck", label: "Gunayili Heavy Flatbed Truck (Timber Yard)", x: 141, z: -56, rotY: Math.PI, color: "#b45309" },
  { id: "moto_changli_home", kind: "motorcycle", label: "Home Compound Commuter Moto (Changli)", x: 12.2, z: 89.4, rotY: -Math.PI * 0.5, color: "#0f766e" },
];
