#!/usr/bin/env python3
"""
TAMALE 3D - UE5 DataTable validator.

Checks the exported JSON DataTables in ue5/Tamale3D/Content/DataTables against the
C++ row structs in Source/Tamale3D/Public/Data/TamaleWorldTypes.h, then validates
IDs, cross-references, units/coordinates, Unicode (Dagbani orthography), the road
network's connectivity and landmark/spawn access to that network.

Usage (from the repo root):
    python ue5/tools/validate_ue5_data.py            # prints report, exit 1 on errors
    python ue5/tools/validate_ue5_data.py --write    # also writes ue5/Documentation/DATA_VALIDATION_REPORT.md

Standard library only, so it runs on Windows with any Python 3.9+.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UE_PROJECT = ROOT / "ue5" / "Tamale3D"
TABLE_DIR = UE_PROJECT / "Content" / "DataTables"
TYPES_HEADER = UE_PROJECT / "Source" / "Tamale3D" / "Public" / "Data" / "TamaleWorldTypes.h"
REPORT_PATH = ROOT / "ue5" / "Documentation" / "DATA_VALIDATION_REPORT.md"

# DataTable file -> (row struct, id field)
TABLES = {
    "DT_TamaleRoads.json": ("FTamaleRoadRow", "RoadId"),
    "DT_TamaleLandmarks.json": ("FTamaleLandmarkRow", "LandmarkId"),
    "DT_TamaleDistricts.json": ("FTamaleDistrictRow", "DistrictId"),
    "DT_PlayableCharacters.json": ("FTamalePlayableCharacterRow", "CharacterId"),
    "DT_TamaleNPCs.json": ("FTamaleNpcRow", "NpcId"),
    "DT_TamaleShops.json": ("FTamaleShopRow", "ShopId"),
    "DT_HomeRecipes.json": ("FTamaleRecipeRow", "RecipeId"),
    "DT_HomeIngredients.json": ("FTamaleIngredientRow", "IngredientId"),
    "DT_HomeUpgrades.json": ("FTamaleHomeUpgradeRow", "UpgradeId"),
    "DT_DagbaniTerms.json": ("FTamaleDagbaniTermRow", "TermId"),
    "DT_TamaleEvents.json": ("FTamaleEventRow", "EventId"),
    "DT_MusicTracks.json": ("FTamaleMusicTrackRow", "TrackId"),
    "DT_TamaleBuildings.json": ("FTamaleBuildingRow", "BuildingId"),
}

# Thresholds (centimetres)
WORLD_HALF_EXTENT_CM = 60_000          # the web map spans roughly +/-250 m; anything beyond 600 m is suspect
ROAD_JOIN_TOLERANCE_CM = 50            # rectangles closer than this count as connected
LANDMARK_MAX_ROAD_DISTANCE_CM = 6_000  # a landmark further than 60 m from any road is flagged as hard to reach
MOJIBAKE = re.compile("[�]|Ã.|â€")
DAGBANI_LETTERS = set("ɛɔɣŋʒƐƆƔŊƷ")
PLAYABLE_LICENSES = {"original-composition", "licensed", "permission-granted", "creative-commons"}


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    info: list[str] = field(default_factory=list)

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def note(self, msg: str) -> None:
        self.info.append(msg)


# ---------------------------------------------------------------- struct parsing
PROP_RE = re.compile(r"UPROPERTY\([^)]*\)\s*(\w+)\s+(\w+)\s*(?:=[^;]*)?;")


def parse_row_structs(header: Path) -> dict[str, dict[str, str]]:
    text = header.read_text(encoding="utf-8")
    structs: dict[str, dict[str, str]] = {}
    for m in re.finditer(r"struct\s+TAMALE3D_API\s+(\w+)\s*(?::\s*public\s+\w+)?\s*\{(.*?)\n\};", text, re.S):
        name, body = m.group(1), m.group(2)
        structs[name] = {prop: ctype for ctype, prop in PROP_RE.findall(body)}
    return structs


def type_ok(ctype: str, value) -> bool:
    if ctype == "FString" or ctype == "FName":
        return isinstance(value, str)
    if ctype == "bool":
        return isinstance(value, bool)
    if ctype == "int32":
        return isinstance(value, int) and not isinstance(value, bool)
    if ctype in ("float", "double"):
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if ctype == "FVector":
        return isinstance(value, dict) and all(isinstance(value.get(k), (int, float)) for k in "XYZ")
    return True  # unknown types are not checked here


# ---------------------------------------------------------------- geometry
@dataclass
class Rect:
    rid: str
    min_x: float
    max_x: float
    min_y: float
    max_y: float

    def gap_to(self, o: "Rect") -> float:
        dx = max(0.0, max(self.min_x, o.min_x) - min(self.max_x, o.max_x))
        dy = max(0.0, max(self.min_y, o.min_y) - min(self.max_y, o.max_y))
        return (dx * dx + dy * dy) ** 0.5

    def distance_to_point(self, x: float, y: float) -> float:
        dx = max(self.min_x - x, 0.0, x - self.max_x)
        dy = max(self.min_y - y, 0.0, y - self.max_y)
        return (dx * dx + dy * dy) ** 0.5


def road_rect(row: dict) -> Rect:
    c = row["CenterLocationCm"]
    half_len = row["LengthCm"] / 2
    half_w = row["WidthCm"] / 2
    if row["Orientation"] == "EastWest":
        return Rect(row["RoadId"], c["X"] - half_len, c["X"] + half_len, c["Y"] - half_w, c["Y"] + half_w)
    return Rect(row["RoadId"], c["X"] - half_w, c["X"] + half_w, c["Y"] - half_len, c["Y"] + half_len)


# ---------------------------------------------------------------- checks
def check_tables(rep: Report) -> dict[str, list[dict]]:
    structs = parse_row_structs(TYPES_HEADER)
    data: dict[str, list[dict]] = {}
    for fname, (struct, id_field) in TABLES.items():
        path = TABLE_DIR / fname
        if not path.exists():
            rep.err(f"{fname}: file missing")
            continue
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            rep.err(f"{fname}: invalid JSON ({e})")
            continue
        if not isinstance(rows, list):
            rep.err(f"{fname}: top level must be a JSON array of rows")
            continue
        data[fname] = rows
        props = structs.get(struct)
        if props is None:
            rep.err(f"{fname}: row struct {struct} not found in {TYPES_HEADER.name}")
            continue

        seen: set[str] = set()
        json_keys: set[str] = set()
        reported_fields: set[str] = set()
        for i, row in enumerate(rows):
            name = row.get("Name")
            if not isinstance(name, str) or not name:
                rep.err(f"{fname}[{i}]: missing row Name")
                continue
            if name in seen:
                rep.err(f"{fname}: duplicate row Name '{name}'")
            seen.add(name)
            if row.get(id_field) != name:
                rep.err(f"{fname}: row '{name}' has {id_field}='{row.get(id_field)}' (must equal Name)")
            for key, value in row.items():
                if key == "Name":
                    continue
                json_keys.add(key)
                if key not in props:
                    if key not in reported_fields:
                        reported_fields.add(key)
                        rep.err(f"{fname}: field '{key}' has no matching UPROPERTY in {struct} (it would be silently dropped on import)")
                elif not type_ok(props[key], value):
                    rep.err(f"{fname}: row '{name}' field '{key}' = {value!r} is not a valid {props[key]}")
                if isinstance(value, str):
                    check_text(rep, fname, name, key, value)
        for missing in sorted(set(props) - json_keys):
            rep.warn(f"{fname}: {struct}.{missing} is never set by the data (every row gets the C++ default)")
        rep.note(f"{fname}: {len(rows)} rows, {len(json_keys)} fields -> {struct}")
    return data


def check_text(rep: Report, fname: str, row: str, key: str, value: str) -> None:
    if MOJIBAKE.search(value):
        rep.err(f"{fname}: row '{row}' field '{key}' contains mojibake / replacement characters: {value!r}")
    if unicodedata.normalize("NFC", value) != value:
        rep.warn(f"{fname}: row '{row}' field '{key}' is not NFC-normalised (Dagbani letters may render or compare inconsistently)")


def check_references(rep: Report, d: dict[str, list[dict]]) -> None:
    ids = {f: {r["Name"] for r in rows if "Name" in r} for f, rows in d.items()}
    shops = ids.get("DT_TamaleShops.json", set())
    landmarks = ids.get("DT_TamaleLandmarks.json", set())

    def ref(table: str, field_name: str, target: set[str], target_name: str, allow_empty: bool = True) -> None:
        for r in d.get(table, []):
            v = r.get(field_name, "")
            if not v and allow_empty:
                continue
            if v not in target:
                rep.err(f"{table}: row '{r['Name']}' {field_name}='{v}' does not exist in {target_name}")

    ref("DT_TamaleLandmarks.json", "ShopId", shops, "DT_TamaleShops")
    ref("DT_TamaleNPCs.json", "ShopId", shops, "DT_TamaleShops")
    ref("DT_TamaleEvents.json", "LandmarkId", landmarks, "DT_TamaleLandmarks")
    ref("DT_PlayableCharacters.json", "HomeLandmarkId", landmarks, "DT_TamaleLandmarks", allow_empty=False)
    ref("DT_TamaleBuildings.json", "LandmarkId", landmarks, "DT_TamaleLandmarks")

    linked_shops = {r.get("ShopId") for r in d.get("DT_TamaleLandmarks.json", []) if r.get("ShopId")}
    linked_shops |= {r.get("ShopId") for r in d.get("DT_TamaleNPCs.json", []) if r.get("ShopId")}
    unplaced = sorted(shops - linked_shops)
    roaming = [s for s in unplaced if s.startswith("street_")]
    fixed = [s for s in unplaced if not s.startswith("street_")]
    if roaming:
        rep.note(f"{len(roaming)} roaming street-vendor shops have no fixed location (spawned by the crowd system, as in the web game): {', '.join(roaming)}")
    if fixed:
        rep.warn(f"{len(fixed)} shops have no landmark or NPC, so they have no physical location in the world yet: {', '.join(fixed)}")


def check_world(rep: Report, d: dict[str, list[dict]]) -> None:
    roads = d.get("DT_TamaleRoads.json", [])
    rects = [road_rect(r) for r in roads]

    for r in roads:
        if not (300 <= r["WidthCm"] <= 3_000):
            rep.err(f"DT_TamaleRoads: '{r['RoadId']}' WidthCm={r['WidthCm']} is outside 3-30 m (units or width/length swapped?)")
        if r["LengthCm"] < r["WidthCm"]:
            rep.err(f"DT_TamaleRoads: '{r['RoadId']}' is shorter ({r['LengthCm']}) than it is wide ({r['WidthCm']})")

    def in_world(table: str, row: dict, key: str) -> None:
        v = row.get(key)
        if isinstance(v, dict) and (abs(v["X"]) > WORLD_HALF_EXTENT_CM or abs(v["Y"]) > WORLD_HALF_EXTENT_CM):
            rep.err(f"{table}: '{row['Name']}' {key}={v} lies outside +/-{WORLD_HALF_EXTENT_CM // 100} m")

    for table, key in [("DT_TamaleBuildings.json", "CenterLocationCm"), ("DT_TamaleRoads.json", "CenterLocationCm"), ("DT_TamaleLandmarks.json", "LocationCm"),
                       ("DT_TamaleDistricts.json", "CenterLocationCm"), ("DT_TamaleNPCs.json", "HomeLocationCm"),
                       ("DT_PlayableCharacters.json", "SpawnLocationCm")]:
        for row in d.get(table, []):
            in_world(table, row, key)

    # --- connectivity (union-find over touching rectangles)
    parent = list(range(len(rects)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    adjacency: dict[str, list[str]] = {r.rid: [] for r in rects}
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            if rects[i].gap_to(rects[j]) <= ROAD_JOIN_TOLERANCE_CM:
                parent[find(i)] = find(j)
                adjacency[rects[i].rid].append(rects[j].rid)
                adjacency[rects[j].rid].append(rects[i].rid)
    groups: dict[int, list[str]] = {}
    for i, r in enumerate(rects):
        groups.setdefault(find(i), []).append(r.rid)
    comps = sorted(groups.values(), key=len, reverse=True)
    if len(comps) == 1:
        rep.note(f"Road network: all {len(rects)} roads form one connected network")
    else:
        rep.err(f"Road network is split into {len(comps)} disconnected parts; main network has {len(comps[0])} roads")
        for c in comps[1:]:
            nearest = min((a.gap_to(b), b.rid) for a in rects if a.rid in c for b in rects if b.rid in comps[0])
            rep.err(f"  isolated: {', '.join(c)} (closest main-network road: {nearest[1]}, gap {nearest[0] / 100:.1f} m)")
    for rid, nbrs in adjacency.items():
        if len(nbrs) == 1:
            rep.note(f"Road '{rid}' connects only to '{nbrs[0]}' (cul-de-sac / dead end)")

    # --- access: landmarks / spawns / NPC homes vs the road network
    def access(table: str, key: str, label: str) -> None:
        for row in d.get(table, []):
            v = row.get(key)
            if not isinstance(v, dict):
                continue
            dist, rid = min((rc.distance_to_point(v["X"], v["Y"]), rc.rid) for rc in rects)
            if dist == 0 and table == "DT_TamaleLandmarks.json":
                if row.get("LandmarkType") == "transport":
                    rep.note(f"{label} '{row['Name']}' is a transport node on '{rid}' (expected)")
                    continue
                rep.warn(f"{label} '{row['Name']}' sits on the carriageway of '{rid}' (a building placed here would block the road)")
            elif dist > LANDMARK_MAX_ROAD_DISTANCE_CM:
                rep.warn(f"{label} '{row['Name']}' is {dist / 100:.0f} m from the nearest road ('{rid}') - needs an access path")

    # --- buildings must not sit on a carriageway (axis-aligned bounds of the rotated footprint)
    import math
    for b in d.get("DT_TamaleBuildings.json", []):
        c, sz = b["CenterLocationCm"], b["SizeCm"]
        yaw = math.radians(b.get("YawDegrees", 0))
        hx = abs(math.cos(yaw)) * sz["X"] / 2 + abs(math.sin(yaw)) * sz["Y"] / 2
        hy = abs(math.sin(yaw)) * sz["X"] / 2 + abs(math.cos(yaw)) * sz["Y"] / 2
        fb = Rect(b["Name"], c["X"] - hx, c["X"] + hx, c["Y"] - hy, c["Y"] + hy)
        for rc in rects:
            ox = min(fb.max_x, rc.max_x) - max(fb.min_x, rc.min_x)
            oy = min(fb.max_y, rc.max_y) - max(fb.min_y, rc.min_y)
            if ox > 10 and oy > 10:
                rep.warn(f"Building '{b['Name']}' overlaps road '{rc.rid}' by {ox / 100:.1f} x {oy / 100:.1f} m")
        if sz["X"] <= 0 or sz["Y"] <= 0 or sz["Z"] <= 0:
            rep.err(f"DT_TamaleBuildings: '{b['Name']}' has a non-positive size {sz}")

    # --- spawn points must not be inside a building (pawn would be stuck in a wall)
    footprints = []
    for bld in d.get("DT_TamaleBuildings.json", []):
        c, sz = bld["CenterLocationCm"], bld["SizeCm"]
        yaw = math.radians(bld.get("YawDegrees", 0))
        footprints.append((bld["Name"], c["X"], c["Y"], sz["X"] / 2, sz["Y"] / 2, yaw))

    def inside_building(x: float, y: float) -> str | None:
        for name, cx, cy, hx, hy, yaw in footprints:
            # rotate the point into the building's local frame
            dx, dy = x - cx, y - cy
            lx = dx * math.cos(-yaw) - dy * math.sin(-yaw)
            ly = dx * math.sin(-yaw) + dy * math.cos(-yaw)
            if abs(lx) < hx + 35 and abs(ly) < hy + 35:  # + capsule radius
                return name
        return None

    for table, key, label in [("DT_PlayableCharacters.json", "SpawnLocationCm", "Character spawn"),
                              ("DT_TamaleNPCs.json", "HomeLocationCm", "NPC home")]:
        for row in d.get(table, []):
            v = row.get(key)
            hit = inside_building(v["X"], v["Y"]) if isinstance(v, dict) else None
            if hit:
                rep.err(f"{label} '{row['Name']}' at ({v['X']}, {v['Y']}) is inside building '{hit}' - the pawn would spawn stuck")

    access("DT_TamaleLandmarks.json", "LocationCm", "Landmark")
    access("DT_PlayableCharacters.json", "SpawnLocationCm", "Character spawn")
    access("DT_TamaleNPCs.json", "HomeLocationCm", "NPC home")

    # --- music licensing
    for t in d.get("DT_MusicTracks.json", []):
        if t.get("LicenseStatus") not in PLAYABLE_LICENSES and t.get("AudioAssetPath"):
            rep.err(f"DT_MusicTracks: '{t['Name']}' has an audio asset but LicenseStatus='{t.get('LicenseStatus')}'")
    statuses: dict[str, int] = {}
    for t in d.get("DT_MusicTracks.json", []):
        statuses[t.get("LicenseStatus", "?")] = statuses.get(t.get("LicenseStatus", "?"), 0) + 1
    if statuses:
        rep.note("Music licence status: " + ", ".join(f"{k}={v}" for k, v in sorted(statuses.items())))

    letters = sum(ch in DAGBANI_LETTERS for rows in d.values() for r in rows for v in r.values() if isinstance(v, str) for ch in v)
    rep.note(f"Unicode: {letters} Dagbani-specific letters (ɛ ɔ ɣ ŋ ...) preserved across all tables")


def render(rep: Report) -> str:
    out = ["# TAMALE 3D - DataTable Validation Report", "",
           "Generated by `ue5/tools/validate_ue5_data.py`. Re-run after every export.", "",
           f"**Errors: {len(rep.errors)} · Warnings: {len(rep.warnings)}**", ""]
    for title, items in (("Errors", rep.errors), ("Warnings", rep.warnings), ("Info", rep.info)):
        out.append(f"## {title}")
        out.extend(f"- {m}" for m in items) if items else out.append("- none")
        out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write the Markdown report into ue5/Documentation")
    args = ap.parse_args()
    rep = Report()
    data = check_tables(rep)
    check_references(rep, data)
    check_world(rep, data)
    text = render(rep)
    print(text)
    if args.write:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(text, encoding="utf-8")
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main())
