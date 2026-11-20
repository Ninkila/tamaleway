import { GeoLocationAuditEntry } from "../types/game";
import { TAMALE_LANDMARKS } from "./tamaleWorldData";

const ROAD_CONNECTIONS_BY_DISTRICT: Record<string, string[]> = {
  Dagbandabo: ["Gbewaa High Street", "Gukpegu Road / Bolgatanga N10", "Dakpema & Central Market North Rd"],
  Central: ["Gbewaa High Street", "Gukpegu Road / Bolgatanga N10"],
  Tishigu: ["Dakpema & Central Market North Rd", "Gukpegu Road / N10", "Jubilee Civic Avenue"],
  Jakarayili: ["Gbewaa High Street East", "Jubilee Civic Avenue", "Kalpohin – Kukuo Avenue"],
  Aboabo: ["Gbewaa High Street West", "Aboabo – Choggu – Lamashegu Rd", "Nyohini – Aboabo Lane"],
  Lamashegu: ["Salaga Road – Lamashegu Corridor", "Aboabo – Lamashegu Rd", "Central Market West Link"],
  Nyohini: ["Nyohini – Sagnarigu – Dungu West Ring", "Gbewaa High Street West"],
  Sagnarigu: ["Sagnarigu / Hospital North Arterial", "Nyohini – Sagnarigu – Dungu West Ring"],
  Dungu: ["Nyohini – Sagnarigu – Dungu West Ring", "Dungu – Kakpagyili South Link"],
  Kalpohin: ["Kalpohin – Kukuo – Dabokpaa Avenue", "Choggu – Kanvilli – Kalpohin Rd"],
  Choggu: ["Choggu – Kanvilli – Kalpohin Rd", "Aboabo – Choggu – Lamashegu Rd"],
  Kukuo: ["Kalpohin – Kukuo – Dabokpaa Avenue", "Gbewaa High Street East"],
  Vittin: ["Vittin – Gumani Eastern Ring Rd", "Gbewaa High Street East"],
  Dabokpaa: ["Salaga Road – Teaching Hospital Corridor", "Dabokpaa – Hospital Side Street"],
  Changli: ["Salaga Road – Teaching Hospital Corridor", "Kalpohin – Kukuo – Dabokpaa Avenue"],
  Kakpagyili: ["Dungu – Kakpagyili South Link", "Salaga Road Corridor"],
  Airport: ["Bolgatanga N10 Spine (North)"],
};

function resolveConnections(district: string): string[] {
  for (const key of Object.keys(ROAD_CONNECTIONS_BY_DISTRICT)) {
    if (district.includes(key)) {
      return ROAD_CONNECTIONS_BY_DISTRICT[key];
    }
  }
  return ["Gbewaa High Street", "Metropolitan Collector Grid"];
}

export const TAMALE_GEO_REGISTRY: GeoLocationAuditEntry[] = TAMALE_LANDMARKS.map((lm) => {
  const nearby = TAMALE_LANDMARKS.filter(
    (other) => other.id !== lm.id && Math.hypot(other.x - lm.x, other.z - lm.z) < 75
  )
    .sort((a, b) => Math.hypot(a.x - lm.x, a.z - lm.z) - Math.hypot(b.x - lm.x, b.z - lm.z))
    .slice(0, 3)
    .map((n) => n.name);

  const hasPhoto = Boolean(lm.referenceImagePath);
  const hasOsm = Boolean(lm.osmCoords && /\d+\.\d+°/.test(lm.osmCoords));

  const confidence: GeoLocationAuditEntry["confidence"] =
    hasPhoto && hasOsm
      ? "verified-osm-photo"
      : hasOsm && !lm.isRepresentativeFictional
      ? "verified-osm"
      : "representative-local";

  return {
    landmarkId: lm.id,
    name: lm.name,
    category: lm.type,
    district: lm.district,
    coordsLabel: lm.osmCoords || `${lm.realDistanceFromInterchangeKm ?? 0} km from Naa Gbewaa Interchange`,
    referenceSource: lm.referenceImagePath
      ? `OSM + Local Reference Photo (${lm.referenceImagePath})`
      : hasOsm
      ? "OpenStreetMap / Metropolitan Tamale Survey"
      : "Representative Local Urban Study (No external map scraping)",
    licenseNote: lm.referenceImagePath
      ? "Wikimedia Commons CC BY-SA / local archived reference; geometry procedurally modeled."
      : "Clean procedural geometry grounded on public Tamale urban planning conventions.",
    roadConnections: resolveConnections(lm.district),
    nearbyBuildings: nearby,
    architecturalNotes: lm.authenticityNote,
    confidence,
  };
});

export function getGeoRegistrySummary(): {
  total: number;
  verifiedOsmPhoto: number;
  verifiedOsm: number;
  representativeLocal: number;
} {
  let verifiedOsmPhoto = 0;
  let verifiedOsm = 0;
  let representativeLocal = 0;
  for (const entry of TAMALE_GEO_REGISTRY) {
    if (entry.confidence === "verified-osm-photo") verifiedOsmPhoto++;
    else if (entry.confidence === "verified-osm") verifiedOsm++;
    else representativeLocal++;
  }
  return {
    total: TAMALE_GEO_REGISTRY.length,
    verifiedOsmPhoto,
    verifiedOsm,
    representativeLocal,
  };
}
