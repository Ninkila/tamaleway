import React, { useMemo, useState } from "react";
import { Camera, ExternalLink, MapPin, X } from "lucide-react";
import { getGeoRegistrySummary } from "../data/tamaleGeoRegistry";

type PhotoCategory =
  | "all"
  | "landmarks"
  | "markets"
  | "houses_streets"
  | "festivals"
  | "sports_arts"
  | "transport";

interface ReferenceEntry {
  id: string;
  title: string;
  category: Exclude<PhotoCategory, "all">;
  imagePath: string;
  photographer: string;
  license: string;
  sourceUrl: string;
  osmLocation: string;
  reconstructionNotes: string;
}

const TAMALE_PHOTO_REFERENCES: ReferenceEntry[] = [
  {
    id: "interchange",
    title: "Tamale (Naa Gbewaa) Interchange",
    category: "landmarks",
    imagePath: "/assets/references/tamale/landmarks/tamale_interchange.jpg",
    photographer: "Sir Amugi",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3ATamale_Interchange_in_Northern_Ghana.jpg",
    osmLocation: "9.40379° N, 0.84202° W · Dagbandabo Fong",
    reconstructionNotes:
      "Box-girder concrete flyover deck, continuous concrete parapets with steel guardrails, tapered vertical piers, roundabout curb below, and green Ghana Highway gantry signage.",
  },
  {
    id: "mosque",
    title: "Tamale Central Mosque",
    category: "landmarks",
    imagePath: "/assets/references/tamale/landmarks/tamale_central_mosque.jpg",
    photographer: "Wumtea",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3ATamale_central_mosque.jpg",
    osmLocation: "9.40180° N, 0.84110° W · Gukpegu Road (SSE)",
    reconstructionNotes:
      "Reconstructed directly from field photography: broad circular cream sanctuary hall, tall green-tinted arched windows, projecting emerald cornice, large dome, and twin 3-tier louvered minarets.",
  },
  {
    id: "hospital",
    title: "Tamale Teaching Hospital",
    category: "landmarks",
    imagePath: "/assets/references/tamale/hospitals/tamale_teaching_hospital.jpg",
    photographer: "Masssly",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tamale_Teaching_Hospital_4.jpg",
    osmLocation: "9.39140° N, 0.82458° W · Changli / High St (SE)",
    reconstructionNotes:
      "Peach-terracotta 4-storey ward wing with horizontal shading louvers, low outpatient forewing, and the prominent exterior open-frame steel staircase tower with red pitched roof.",
  },
  {
    id: "chiefs_house",
    title: "Northern Regional House of Chiefs / Palace Architecture",
    category: "landmarks",
    imagePath: "/assets/references/tamale/landmarks/regional_house_of_chiefs.jpg",
    photographer: "Samaru Samaru",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tamale_Regional_House_of_chiefs.jpg",
    osmLocation: "Central Tamale Traditional & Civic Zone",
    reconstructionNotes:
      "Inspired the Dakpema Chief's Palace courtyard hall: charcoal lower masonry plinth, cylindrical entrance columns, central pediment, burgundy pitched zinc roof, and paved durbar plaza.",
  },
  {
    id: "stadium",
    title: "Aliu Mahama Sports Stadium",
    category: "sports_arts",
    imagePath: "/assets/references/tamale/sports/aliu_mahama_stadium.jpg",
    photographer: "Samaru Samaru",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aliu_Mahama_Sports_Stadium_Tamale.jpg",
    osmLocation: "9.41066° N, 0.86126° W · Sagnarigu / Nyohini",
    reconstructionNotes:
      "Circular white precast concrete radial buttress ribs, exposed white steel truss canopy ring, recessed seating bowl, floodlight masts, and peach/teal gatehouse.",
  },
  {
    id: "scca",
    title: "SCCA Tamale (Savannah Centre for Contemporary Art)",
    category: "sports_arts",
    imagePath: "/assets/references/tamale/cultural_sites/scca_tamale.jpg",
    photographer: "Dnshitobu",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SCCA_Tamale_museum.jpg",
    osmLocation: "Vittin / East Corridor, Tamale",
    reconstructionNotes:
      "Red-brick warehouse gallery with burgundy pitched roof and three shimmering silver woven-aluminum relief panels across the upper gallery facade.",
  },
  {
    id: "red_clay",
    title: "Red Clay Studio (Janna Kpeŋ near Tamale)",
    category: "sports_arts",
    imagePath: "/assets/references/tamale/cultural_sites/red_clay_studio.jpg",
    photographer: "Matti Blume",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Red_Clay,_Jana_(P1100307).jpg",
    osmLocation: "Vittin / Janna Kpeŋ Corridor (East)",
    reconstructionNotes:
      "Informed the earthen sculpture mounds, open courtyard spaces, and red-laterite studio grounds paired with SCCA Tamale.",
  },
  {
    id: "market",
    title: "Tamale Central Market",
    category: "markets",
    imagePath: "/assets/references/tamale/central_market/tamale_market_ghana.jpg",
    photographer: "Ibn Shiraz",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3ATamale_Market%2C_Ghana.jpg",
    osmLocation: "9.40458° N, 0.84287° W · Gbewaa High St (NW)",
    reconstructionNotes:
      "Corrugated zinc open bays (including weathered rust sheets), tilted colorful vendor umbrellas, timber produce tables on cement blocks, tomato/yam displays, and shuttered lock-up stalls.",
  },
  {
    id: "market_traders",
    title: "Tamale Market Traders & Produce Stalls",
    category: "markets",
    imagePath: "/assets/references/tamale/markets/tamale_market_traders.jpg",
    photographer: "Ibn Shiraz",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Market_in_Tamale_Northern_Ghana.jpg",
    osmLocation: "Central Tamale Market Lanes",
    reconstructionNotes:
      "Guided the density of aluminum pans, piled tubers, narrow shade aisles, and trader attire across Central, Aboabo, and Lamashegu markets.",
  },
  {
    id: "kaladan_market",
    title: "Tamale Community Market Section (Kaladan)",
    category: "markets",
    imagePath: "/assets/references/tamale/markets/kaladan_market_tamale.jpg",
    photographer: "Sir Amugi",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:A_section_of_Tamale_kaladan_market_in_Northern_Ghana.jpg",
    osmLocation: "Tamale Community Market Quarters",
    reconstructionNotes:
      "Used to calibrate open-air community markets in Aboabo, Lamashegu, Kukuo, and Kakpagyili with wooden stalls and zinc sheds.",
  },
  {
    id: "airport",
    title: "Tamale International Airport Terminal",
    category: "transport",
    imagePath: "/assets/references/tamale/transportation/tamale_airport_terminal.jpg",
    photographer: "Sm105",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tamale_Airport_Terminal.jpg",
    osmLocation: "9.55663° N, 0.86312° W · Airport Rd / N10 North",
    reconstructionNotes:
      "Tan cantilevered roof canopy supported on tapered V-shaped pillars over bronze curtain glass and yellow 'Departures / Départs' terminal signage.",
  },
  {
    id: "pragya",
    title: "Tamale Pragya (Yellow-Yellow) Tricycle",
    category: "transport",
    imagePath: "/assets/references/tamale/transportation/yellow_yellow_tamale.jpg",
    photographer: "Dnshitobu",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3AYellow_Yellow_tricycle_for_mini_transport_in_Tamale.jpg",
    osmLocation: "Central Tamale, Aboabo, Lamashegu & Hospital Ranks",
    reconstructionNotes:
      "Bajaj RE three-wheeler silhouette with sculpted black headlamp cowl, twin round headlights, amber indicators, blue Ghana front plate, windshield mirrors, and canvas roof curtains.",
  },
  {
    id: "office",
    title: "Tamale High Street Office & Jubilee Precinct",
    category: "houses_streets",
    imagePath: "/assets/references/tamale/commercial_areas/tamale_office_building.jpg",
    photographer: "Matti Blume",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3ANational_Pensions_Regulatory_Authority%2C_Tamale_(P1100287).jpg",
    osmLocation: "9.40361° N, 0.83822° W · Tamale High Street (East)",
    reconstructionNotes:
      "White-and-sky-blue multi-story concrete facade, recessed window grid, entrance portico, interlocking brick forecourt pavers, and corner gatehouse beside Jubilee Park.",
  },
  {
    id: "grnma_house",
    title: "Modern Tamale Residential & Guest House Architecture",
    category: "houses_streets",
    imagePath: "/assets/references/tamale/modern_houses/grnma_tamale_building.jpg",
    photographer: "SA twenty",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ghana_Registered_Nurses_and_Midwives_Association_Guest_House(GRNMA),_Tamale.jpg",
    osmLocation: "Tamale Residential Suburbs (Kalpohin / Vittin / Choggu)",
    reconstructionNotes:
      "Modeled into Tamale's modern gated residential compounds with pastel walls, pitched metal roofs, perimeter block walls, and elevated black Polytank water stands.",
  },
  {
    id: "street",
    title: "Commercial Street, Drains & Utility Poles",
    category: "houses_streets",
    imagePath: "/assets/references/tamale/roads/street_tamale.jpg",
    photographer: "Matti Blume",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3AStreet%2C_Tamale_(P1100294).jpg",
    osmLocation: "Gbewaa High Street Corridor",
    reconstructionNotes:
      "Sun-bleached asphalt with red-orange laterite road shoulders, concrete open storm drainage channels, overhead ECG utility crossbars with sagging cables, and Motor King blue cargo trikes.",
  },
  {
    id: "compound",
    title: "Northern Clay & Thatch Compound House",
    category: "houses_streets",
    imagePath: "/assets/references/tamale/architecture/northern_clay_compound.jpg",
    photographer: "Kwameghana",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3AClay_house_compound_in_the_Northern_Region.jpg",
    osmLocation: "SW Residential Compound Quarter & Kukuo / Kakpagyili",
    reconstructionNotes:
      "Circular earth-and-plaster huts with overhanging conical grass thatch, swept laterite yard, courtyard firewood stacks, connecting clay walls, and a zinc-roofed rectangular room.",
  },
  {
    id: "morning",
    title: "Early Morning Atmosphere in Tamale",
    category: "houses_streets",
    imagePath: "/assets/references/tamale/everyday_life/early_morning_tamale.jpg",
    photographer: "Sir Amugi",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File%3AEarly_morning_view_in_the_streets_of_Tamale_(Northern_Ghana)_01.jpg",
    osmLocation: "Central Tamale Morning Light",
    reconstructionNotes:
      "Calibrated morning/harmattan atmospheric scattering, warm golden sun angle, dusty lower concrete wall patina, and commuter motorcycle/pedestrian rhythm.",
  },
  {
    id: "kebab_vendor",
    title: "Roadside Kebab & Street Food Stand",
    category: "markets",
    imagePath: "/assets/references/tamale/everyday_life/kebab_vendor_tamale.jpg",
    photographer: "Amuzujoe",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kebab_Tamale_01.jpg",
    osmLocation: "Tamale Evening Street Vendors",
    reconstructionNotes:
      "Guided the Aboabo & Ramadan Evening food stall mode with glowing grills and evening vendor tables.",
  },
  {
    id: "damba_festival",
    title: "Damba Festival Celebration in Northern Ghana",
    category: "festivals",
    imagePath: "/assets/references/tamale/festivals/damba_festival_tamale.jpg",
    photographer: "Abdulfatawu12",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Image_from_2021_Damba_festival_celebration_2.jpg",
    osmLocation: "Dakpema Palace & Jubilee Park Durbar Grounds",
    reconstructionNotes:
      "Reference for batakari festival attire, ceremonial canopies, and dondo/gungon drumming circles activated in Damba Festival city event mode.",
  },
  {
    id: "bugum_festival",
    title: "Bugum Chugu (Fire Festival) Celebration",
    category: "festivals",
    imagePath: "/assets/references/tamale/festivals/bugum_chugu_festival.jpg",
    photographer: "Shadrack D Nantomah",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bugum_festival_celebration.jpg",
    osmLocation: "Central Tamale & Traditional Courtyards",
    reconstructionNotes:
      "Reference for respectful dusk-to-night torchlight gatherings and evening drumming in Bugum Chugu city event mode.",
  },
];

const PHOTO_CATEGORIES: Array<{ id: PhotoCategory; label: string }> = [
  { id: "all", label: "All Photos (20)" },
  { id: "landmarks", label: "Civic Landmarks" },
  { id: "markets", label: "Markets & Food" },
  { id: "houses_streets", label: "Houses & Streets" },
  { id: "sports_arts", label: "Sports & Arts" },
  { id: "festivals", label: "Festivals" },
  { id: "transport", label: "Transport" },
];

interface ReferenceArchiveModalProps {
  onClose: () => void;
}

export const ReferenceArchiveModal: React.FC<ReferenceArchiveModalProps> = ({ onClose }) => {
  const [category, setCategory] = useState<PhotoCategory>("all");
  const [selected, setSelected] = useState<ReferenceEntry>(TAMALE_PHOTO_REFERENCES[0]);
  const geoSummary = useMemo(() => getGeoRegistrySummary(), []);

  const filtered = useMemo(() => {
    if (category === "all") return TAMALE_PHOTO_REFERENCES;
    return TAMALE_PHOTO_REFERENCES.filter((e) => e.category === category);
  }, [category]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-5xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef] flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Tamale Photographic &amp; GIS Reference Archive</span>
            </h2>
            <p className="text-xs text-[#b5ada0] mt-0.5">
              20 verified CC BY-SA 4.0 / 3.0 Wikimedia Commons photographs of Tamale · Geo Registry:{" "}
              {geoSummary.total} grounded locations ({geoSummary.verifiedOsm + geoSummary.verifiedOsmPhoto} OSM
              verified, {geoSummary.verifiedOsmPhoto} field-photo referenced)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 border-b border-white/10 bg-[#12100e] flex flex-wrap gap-1.5">
          {PHOTO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id);
                const nextList =
                  c.id === "all"
                    ? TAMALE_PHOTO_REFERENCES
                    : TAMALE_PHOTO_REFERENCES.filter((item) => item.category === c.id);
                if (nextList.length > 0 && !nextList.some((x) => x.id === selected.id)) {
                  setSelected(nextList[0]);
                }
              }}
              className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                category === c.id
                  ? "bg-amber-500 text-[#12100e] font-semibold"
                  : "bg-[#1a1612] text-[#cfc8bc] hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left selector list */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-3 space-y-1.5 bg-[#12100e]">
            {filtered.map((entry) => {
              const active = selected.id === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelected(entry)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-3 ${
                    active
                      ? "bg-[#26201a] border-amber-500/50 text-[#f8f5ef]"
                      : "bg-transparent border-transparent text-[#cfc8bc] hover:bg-white/5"
                  }`}
                >
                  <img
                    src={entry.imagePath}
                    alt={entry.title}
                    className="w-14 h-10 object-cover rounded border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{entry.title}</div>
                    <div className="text-[11px] text-[#9c9487] truncate">
                      {entry.photographer} · {entry.license}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right detail view */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-4">
            <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0e0c0a]">
              <img
                src={selected.imagePath}
                alt={selected.title}
                className="w-full max-h-[340px] object-contain mx-auto"
              />
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] text-emerald-300 font-medium mb-1">
                  Real Photograph (Wikimedia Commons · {selected.license})
                </div>
                <h3 className="font-display text-xl font-bold text-[#f8f5ef]">{selected.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selected.osmLocation}</span>
                </div>
              </div>
              <a
                href={selected.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#26201a] hover:bg-[#322921] text-[#f8f5ef] border border-white/12 rounded-md transition-colors"
              >
                <span>Wikimedia Source</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              </a>
            </div>

            <div className="bg-[#12100e] border border-white/10 rounded-lg p-4 space-y-2">
              <div className="text-xs font-semibold text-[#ede8de]">
                3D Reconstruction Details
              </div>
              <p className="text-sm text-[#cfc8bc] leading-relaxed">
                {selected.reconstructionNotes}
              </p>
              <div className="text-xs text-[#9c9487] pt-2 border-t border-white/10">
                Real Photograph Attribution: {selected.photographer} · License: {selected.license}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
