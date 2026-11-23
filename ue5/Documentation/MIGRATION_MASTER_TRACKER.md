# TAMALE 3D — UE 5.4.4 Migration Master Tracker

Last updated: 2026-11-23 · Branch: `ue5/batch1-audit` · Supersedes the status sections of `ue5/MIGRATION_AUDIT.md`.

## How to read the statuses

Each system is tracked through six evidence levels. **A level is only ticked when it was actually observed** — not when code exists.

| Level | Means | Who can tick it |
|---|---|---|
| **Source** | C++/config/data written | done in the repo |
| **Compiled** | UHT + MSVC build of `Tamale3DEditor` succeeded | needs Unreal 5.4.4 on Windows |
| **Runtime** | Ran in PIE without errors in the Output Log | needs the editor |
| **Gameplay** | The behaviour in "How to test" was performed and matched | needs the editor |
| **Visual** | Looked at on screen (screenshot) | needs the editor |
| **Verified** | All of the above, re-tested after the last change | needs the editor |

Category labels used below: AUDITED · READY TO MIGRATE · MIGRATING · IMPLEMENTED · COMPILED · TESTED · VERIFIED · PARTIAL · DEFERRED · BLOCKED.

> **Current honest position:** nothing in the UE5 project has been compiled or run yet. This work was done in a Linux cloud workspace with no Unreal Engine, and access to the Windows PC's project folders was not granted in this session. The highest status any UE5 system can have today is **IMPLEMENTED**. The data pipeline is the exception: it was executed and tested here (exporter + validator), so it is **TESTED (offline)**.

---

## 1. Audit findings (verified against the actual files)

Problems found in the earlier migration work and the web data, all fixed on this branch unless stated:

| # | Finding | Evidence | Fix |
|---|---|---|---|
| A1 | **Every east–west road was exported with width and length swapped** (e.g. Gbewaa High St: 450 m wide, 14 m long). 33 validator errors. | `src/data/tamaleWorldData.ts` uses `width`/`depth` as world-X/Z box sizes; the exporter copied them as carriageway width/length. | Exporter maps by orientation; adds `StartLocationCm`/`EndLocationCm`. Validator: 0 errors. |
| A2 | **Broken reference in the web game**: `fuseini_artisan.homeLandmarkId = "lamashegu_market"`, but the landmark is `lamashegu_market_hub`. | `src/data/playableCharacters.ts:255` vs `tamaleWorldData.ts:338` | Corrected in the exporter's `LANDMARK_ID_FIXES` (web source left untouched — fix it there when convenient). |
| A3 | `src/data/tamaleWorldLayout.ts` (building footprints) was classed "Reuse data after conversion" but **was never exported**. | No DT existed. | New `DT_TamaleBuildings.json` (80 rows: 17 landmark boxes, 6 cylinders, houses, shop rows) + `FTamaleBuildingRow`. |
| A4 | **Sun was inverted**: pitch formula put the sun overhead at midnight and under the ground at noon. | `TamaleTimeOfDaySubsystem.cpp` `GetSunPitchDegrees` | New curve (sunrise east 06:00, zenith 12:00, sunset west 18:00), checked numerically. |
| A5 | Sun rotation would silently fail on a normal level: the default sun is **Stationary**, `SetActorRotation` needs Movable. | `RotateWorldSunLight` | Sun made Movable once and cached (was also iterating all actors every tick). |
| A6 | **Character switching lost the outgoing character's live state** (needs/position since the last home-station use). Saving had the same gap. | `UTamaleGameInstance::SwitchPlayableCharacter`, `SaveCurrentGame` | Both now flush the live pawn first; the pawn listens to `OnActiveCharacterSwitched` and reloads + teleports. |
| A7 | **Nothing was playable after a successful compile**: every Enhanced Input action, the IMC and the HUD class were empty editor slots, and `GameDefaultMap` pointed at a map that does not exist. | `TamalePlayerController.h`, `DefaultEngine.ini`, no `Content/Maps` | Runtime default input (full PC layout), native canvas HUD, runtime city builder, startup map = `/Engine/Maps/Entry`. |
| A8 | Default rendering settings were expensive for the target laptop (Virtual Shadow Maps + TSR globally on). | `DefaultEngine.ini` | VSM off, TAA, no dynamic GI by default; Epic scalability still enables Lumen/VSM. |
| A9 | Characters were seeded from hard-coded C++ values (same spawn for all six), not from `DT_PlayableCharacters`. | `InitializeAllSixPlayableCharacters` | Seeded from the data (spawn, money, energy, district); hard-coded list kept only as fallback. |
| A10 | 10 shops have no fixed location. | validator | Expected: they are roaming `street_*` hawkers spawned by the web crowd system. Tracked under Batch 6/7. |

Counts confirmed from the exported data: 19 roads (one connected network), 44 landmarks, 17 districts, 6 playable characters, 9 named NPCs, 39 shops, 8 recipes, 10 ingredients, 6 home upgrades, 25 Dagbani terms, 15 events, 24 music tracks (10 awaiting authorisation, 14 procedural previews — none playable as commercial audio), 80 building footprints.

---

## 2. System inventory

Columns: **What it does** (web) · **Web source** · **UE5 implementation** · **Data reuse** · **Status** · **How it will be tested**.
Evidence ticks: S = source, C = compiled, R = runtime, G = gameplay, V = visual.

### Batch 1 — Foundation

| System | What the web version does | Web source | UE5 implementation | Data | Status | S C R G V | How to test (in PIE) |
|---|---|---|---|---|---|---|---|
| Project config & build | Vite/TS build | `package.json`, `vite.config.ts` | `Tamale3D.uproject`, `*.Target.cs`, `Tamale3D.Build.cs` (+Json, JsonUtilities), `.gitignore` for UE output | — | IMPLEMENTED | ✔ · · · · | Build `Tamale3DEditor Win64 Development` → 0 errors |
| Third-person player | Walk/run/jump, collision, camera follow | `TamaleEngine.ts`, `collisionSystem.ts` | `ATamalePlayerCharacter` (CharacterMovement, SpringArm, capsule 34×90), placeholder body coloured per character | spawn from `DT_PlayableCharacters` | IMPLEMENTED | ✔ · · · · | T2–T4 in `BUILD_AND_TEST.md` |
| Input | Keyboard/touch controls | `MobileTouchControls.tsx`, `deviceProfile.ts` | `ATamalePlayerController`: Enhanced Input, runtime default IMC for WASD, mouse, Shift, Space, Ctrl, E, F, M, I, H, Esc/P, 1–6, F5, F9 (+ gamepad sticks); designer assets override | — | IMPLEMENTED | ✔ · · · · | T2–T9 |
| Camera zoom/orbit | Orbit + zoom | `TamaleEngine.ts` | SpringArm with collision probe, wheel zoom 190–620 cm | — | IMPLEMENTED | ✔ · · · · | T3 |
| Interaction framework | Proximity prompts, E to act | `contextualHints.ts`, `App.tsx` | `ITamaleInteractableInterface` + `UTamaleInteractionComponent` (view sweep, 12.5 Hz) | — | IMPLEMENTED | ✔ · · · · | T6 |
| HUD | React HUD, needs, money, clock, prompts | `GameHud.tsx`, `MiniMapHud.tsx` | `ATamaleHUD` (canvas, no assets): clock/day/weather, character + wallet, district, 8 need bars, prompt + Dagbani subtitle, minimap, toasts, data-health footer. `UTamaleHudWidget` (UMG) still supported and hides the canvas panels | registry | IMPLEMENTED | ✔ · · · · | T1, T6, T7 |
| Pause | Pause modal | `InteriorAndPauseModals.tsx` | `TogglePauseMenu` (`SetPause`) + overlay with controls | — | IMPLEMENTED | ✔ · · · · | T9 |
| Save / load | Versioned multi-character localStorage save | `utils/saveMigration.ts` | `UTamaleSaveGame` schema v2 (global day), `UTamaleGameInstance` Save/Load, F5/F9 | — | IMPLEMENTED | ✔ · · · · | T10 |
| Six isolated characters | Separate money, needs, home, progress | `playableCharacters.ts` | `TMap<FName, FTamaleCharacterSaveState>`; flush-before-switch; pawn reload + teleport on switch | `DT_PlayableCharacters` | IMPLEMENTED (money/needs/home/location isolated; inventory, skills, jobs, relationships, vehicles not yet in the struct) | ✔ · · · · | T8 |

### Batch 2 — Data & world

| System | What the web version does | Web source | UE5 implementation | Data | Status | S C R G V | How to test |
|---|---|---|---|---|---|---|---|
| Data export | — | `ue5/tools/export_ue5_datatables.ts` | Fixed roads (A1), reference fix (A2), new buildings table (A3); 13 tables | all | **TESTED (offline)** — ran here, output re-validated | ✔ n/a ✔ n/a n/a | `npx tsx ue5/tools/export_ue5_datatables.ts` |
| Data validation tool | `worldValidation.ts` | `src/game/worldValidation.ts` | `ue5/tools/validate_ue5_data.py`: struct field match (parses the C++ header), IDs, refs, units, Unicode/NFC, road connectivity, landmark access, building-on-road, spawn-inside-building, music licence. Report: `DATA_VALIDATION_REPORT.md` | all | **TESTED (offline)** — 0 errors / 0 warnings; planted faults detected | ✔ n/a ✔ n/a n/a | `python ue5/tools/validate_ue5_data.py` |
| Runtime data registry | Data imported as TS modules | `src/data/*` | `UTamaleDataRegistrySubsystem`: loads all 13 JSON tables at startup (no editor import needed), validates IDs/refs/road connectivity, logs to `LogTamale3D`; staged into packaged builds | all | IMPLEMENTED | ✔ · · · · | T1 (footer + log line) |
| Coordinates & units | metres, Y-up, +Z south | — | ×100 → cm; Three (x, z) → UE (X, Y); UE is left-handed so X=east, Y=south, Z=up with no mirroring; yaw = −rotY | — | **TESTED (offline)** | — | validator bounds + T5 (map matches web map) |
| Ground / terrain | Flat laterite plane | `TamaleEngine.ts` | Greybox ground sized to data bounds + 60 m | roads/buildings | IMPLEMENTED (flat; elevation/drainage DEFERRED) | ✔ · · · · | T1 |
| Roads | 19 box roads, road graph | `tamaleWorldData.ts`, `tamaleRoadGraph.ts` | `ATamaleCityBootstrapActor` builds all 19 carriageways + name plates; `ATamaleRoadSplineActor` kept for hand-authored spline roads | `DT_TamaleRoads` | PARTIAL — geometry + connectivity check; no sidewalks/markings/junction meshes/lanes yet | ✔ · · · · | T5 |
| Buildings & landmarks | Procedural buildings at footprints | `tamaleWorldLayout.ts`, `models.ts` | 80 footprints as blockout with roof slabs + labels; 44 landmarks (posts where no footprint); `*` marks representative (fictional) places | `DT_TamaleBuildings`, `DT_TamaleLandmarks` | PARTIAL — blockout only, no art | ✔ · · · · | T5 |
| Districts | 17 communities | `tamaleExpansionData.ts` | `FindDistrictNameAt` → HUD | `DT_TamaleDistricts` | IMPLEMENTED | ✔ · · · · | T5 |
| Mini-map & city map | Mini-map + map modal | `MiniMapHud.tsx`, `MapModal.tsx` | North-up minimap + full map (M) drawn from the data | registry | IMPLEMENTED (GPS DEFERRED to Batch 9) | ✔ · · · · | T7 |

### Batch 3 — Player life (started)

| System | Web source | UE5 implementation | Status | How to test |
|---|---|---|---|---|
| Changli home compound | `homeModelBuilder.ts`, `homeInteriorBuilder.ts`, `tamaleWorldLayout.ts` (`player_home` 15×12 m) | Built at the real footprint: perimeter wall, south gate onto Residential Estate Ave, 4 rooms with doors (bedroom, living, kitchen, bathroom), zinc roof, courtyard, clothesline, polytank | IMPLEMENTED (greybox) | T6 |
| Home stations | `tamaleInteriors.ts` (19 stations) | 11 `ATamaleHomeStationActor`s placed in rooms: bed, wardrobe, sofa, stove, kitchen sink, fridge, shower, washbasin, sweep, laundry tub, clothesline | IMPLEMENTED (wardrobe has no effect yet; 8 web stations not yet mapped) | T6 |
| Needs | `tamaleHomeData.ts` | `UTamaleNeedsComponent` (decay, weather & sprint effects, 8 needs incl. home cleanliness) | IMPLEMENTED | T6 |
| Sleep advances time | `App.tsx` | `SleepUntilHour` + recovery; weather rotates overnight | IMPLEMENTED | T6 |
| Cooking with recipes/ingredients | `HomeStationModal.tsx` | Stove uses a fixed meal; recipes/ingredients not yet consumed | PARTIAL | — |

### Day/night & weather (pulled forward because the sun bug blocked Batch 1 visuals)

| System | UE5 implementation | Status | How to test |
|---|---|---|---|
| Clock, periods, day count | `UTamaleTimeOfDaySubsystem` (18 real min = 24 h) | IMPLEMENTED | T1 |
| Sun & sky | Corrected sun path; spawns DirectionalLight (atmosphere sun), SkyAtmosphere, real-time SkyLight, height fog if the level has no sun | IMPLEMENTED | T11 |
| Weather affecting the world | Fog density/colour + sun strength per weather (Harmattan haze, rain dimming); thirst/hygiene decay react to heat/Harmattan | PARTIAL — no rain particles/wet surfaces/audio | T11 |

### Batch 4 — NPCs

| System | Web source | UE5 implementation | Status |
|---|---|---|---|
| Named NPCs | `tamaleWorldData.ts` (9), `NpcScheduleController.ts` | 9 `ATamaleNpcCharacter`s spawned at their data homes; verified Dagbani morning/evening greetings from data; social need +12 on greeting; distance tick throttling | PARTIAL — 2-point patrol only, no schedules |
| Navigation | — | Runtime navmesh around the player (NavigationInvoker), straight-line fallback | IMPLEMENTED |
| Crowds, schedules, StateTree | `TamaleEngine.ts`, `NpcScheduleController.ts` | — | READY TO MIGRATE |

### Not started (ordered by the batch plan)

| Batch | Systems | Web source | Status |
|---|---|---|---|
| 4 | Character models & animation (licensed skeletal meshes, AnimBP) | `models.ts` | READY TO MIGRATE (architecture hides placeholders automatically when a mesh is set) |
| 5 | Vehicles (Pragya, motorbike, taxi, pickup, trucks — Chaos Vehicles), traffic, signals | `trafficSystem.ts`, `tamaleWorldLayout.ts` (10 drivable spawns) | READY TO MIGRATE — F/H keys already bound, show a "Batch 5" notice |
| 6 | Markets, businesses, interiors (33 rooms), street vendors | `tamaleInteriors.ts`, `interiorBuilder.ts` | READY TO MIGRATE |
| 7 | Jobs (18 categories), delivery/cargo, banking/MoMo, shopping, inventory | `tamaleJobsAndServices.ts`, `tamaleEconomy.ts` | READY TO MIGRATE — inventory panel says so honestly |
| 8 | Police & enforcement, nightlife/clubs, events (15), music/radio | `lawEnforcementSystem.ts`, `tamaleMusicAndRadio.ts`, `musicPlayer.ts` | READY TO MIGRATE — music blocked on licences for 10 tracks |
| 9 | Smartphone, GPS routing, UMG redesign, performance profiling, packaging | `TamalePhoneModal.tsx`, `tamaleRoadGraph.ts` | READY TO MIGRATE |
| — | AI NPC conversation (Gemini) | `server.ts` `/api/npc/*` | DEFERRED — needs a server-side proxy decision; never put the API key in the game |

---

## 3. Files created / modified on this branch

**Created:** `Public|Private/Data/TamaleDataRegistrySubsystem.*`, `Public|Private/World/TamaleCityBootstrapActor.*`, `Public|Private/UI/TamaleHUD.*`, `Content/DataTables/DT_TamaleBuildings.json`, `ue5/tools/validate_ue5_data.py`, `ue5/Documentation/*`, `ue5/Tamale3D/.gitignore`.

**Modified:** `TamaleWorldTypes.h` (road endpoints + footprint helpers, `FTamaleBuildingRow`), `TamaleGameInstance.*`, `TamaleSaveGame.h`, `TamaleGameMode.*`, `TamaleTimeOfDaySubsystem.*`, `TamalePlayerCharacter.*`, `TamalePlayerController.*`, `TamaleNpcCharacter.*`, `TamaleHudWidget.cpp`, `Tamale3D.Build.cs`, `DefaultEngine.ini`, `DefaultGame.ini`, `export_ue5_datatables.ts`, `DT_TamaleRoads.json`, `DT_PlayableCharacters.json`.

**Untouched:** the whole web game (`src/`, `server.ts`, `public/`, `assets/`).

---

## 4. Next priority

1. **Compile on the Windows PC** (`BUILD_AND_TEST.md` §2) and report the first errors — the code was checked structurally but never seen by UHT/MSVC.
2. Run tests T1–T11, tick the evidence columns above, attach screenshots.
3. Then Batch 2 completion: sidewalks + junction pieces from the road table, and saving the generated city as a real level (World Partition) so art can replace blockout piece by piece.
