> **Superseded (2026-11-23):** current status lives in `ue5/Documentation/MIGRATION_MASTER_TRACKER.md`; build & test steps in `ue5/Documentation/BUILD_AND_TEST.md`. Kept for history.

# TAMALE 3D — Unreal Engine 5 Migration Audit & Classification Inventory

## 0. Environment & Target Engine Verification (Audit Finding)
- **Container / Current Workspace Environment**: Linux (`4.19.0-gvisor x86_64`), Node.js/Vite/TypeScript web runtime.
- **Installed Unreal Engine Status**: **Not installed in this Linux container** (`UnrealEditor`, `UnrealBuildTool`, `dotnet`, and Windows MSVC toolchains are absent).
- **Recommended Target Engine Version**: **Unreal Engine 5.4.4 LTS** (Windows 11, Visual Studio 2022 v17.8+).
  - *Why 5.4.4 LTS over 5.5+*: Stable Enhanced Input, Chaos Vehicles, StateTree, and World Partition; significantly better baseline Shader Model 5 / DX11 fallback and Virtual Shadow Map scalability on **Intel Core i7 8th Gen + 16 GB RAM** laptops compared to bleeding-edge 5.5 defaults.
- **Existing Web Codebase Preservation**: Preserved 100% untouched under `/src/` and `/public/` per development rule #18 ("Do not destroy or discard the old project until the new project is sufficiently developed and backed up").

---

## 1. Existing Web Codebase Quantitative Inventory (Observed)
Audited across `src/data/`, `src/game/`, `src/utils/`, `src/types/`, and `src/components/`:
- **Roads**: `19` road segments (`10` East-West, `9` North-South) in `src/data/tamaleWorldData.ts` & `src/data/tamaleRoadGraph.ts`
- **Landmarks**: `44` landmarks (real institutions + clearly marked representative residential/commercial locations)
- **Districts / Communities**: `17` zones in `src/data/tamaleExpansionData.ts`
- **Playable Characters**: `6` isolated characters (`yakubu_pragya`, `sulemana_moto`, `mariama_trader`, `karim_student`, `fuseini_artisan`, `adiza_chef`) in `src/data/playableCharacters.ts`
- **Named NPCs**: `9` detailed NPCs in `src/data/tamaleWorldData.ts` + dynamic crowd/hawker generators in `src/game/TamaleEngine.ts` & `src/game/NpcScheduleController.ts`
- **Shops & Businesses**: `39` shops (`SHOP_METADATA` & `SHOP_INVENTORIES`)
- **Building Interiors**: `33` enterable room specs in `src/data/tamaleInteriors.ts` (including `player_home` with `19` stations and `changli_provisions_mart`)
- **Daily Life & Home System**: `8` Ghanaian recipes, `10` ingredients, `6` home upgrades, `8` outfit styles in `src/data/tamaleHomeData.ts`
- **Dispatch & Services**: `10` service request archetypes in `src/data/tamaleJobsAndServices.ts`
- **Cultural & Language Data**: `25` verified Dagbani orthography entries in `src/data/dagbaniDatabase.ts`, `15` Tamale cultural events in `src/data/tamaleExpansionData.ts`
- **Audio & Music**: `24` catalogued tracks (clearly licensed/procedural tags) + `7` radio stations in `src/data/tamaleMusicAndRadio.ts`

---

## 2. System-by-System Classification Matrix

Classification key:
- **Rebuild in Unreal Engine**: Core gameplay/architecture rewritten natively in C++ + Blueprints.
- **Reuse as design reference**: Architectural/UX/mechanical spec used to guide UE5 design; web code discarded in UE5.
- **Reuse data after conversion**: Structured datasets exported via `/ue5/tools/export_ue5_datatables.ts` into `UE5 Content/DataTables/*.json` (`FTableRowBase`).
- **Replace with a better Unreal implementation**: Three.js manual implementations replaced by native UE5 subsystems (PhysX/Chaos, NavMesh, Lumen/SkyAtmosphere, UMG, MetaSounds).
- **Defer to a future phase**: Explicitly scheduled after Phase 1 Milestone stabilization (Phases 2–10).

| Existing Module / File | Lines | Category | UE5 Migration Classification | Target UE5 Equivalent & Phase |
|---|---:|---|---|---|
| `src/game/TamaleEngine.ts` | 6,638 | Rendering, Player, World Loop | **Rebuild in Unreal Engine** | Split into `ATamaleGameMode`, `ATamalePlayerCharacter`, `ATamalePlayerController`, `UTamaleTimeOfDaySubsystem`, World Partition Level (**Phase 1–2**) |
| `src/game/models.ts` | 4,660 | Procedural Three.js Meshes | **Replace with a better Unreal implementation** | Unreal Static Meshes, Skeletal Meshes (MetaHuman / legal Mannequin variants), Chaos Vehicle meshes, Blueprint prop prefabs (**Phase 1, 3, 5, 6**) |
| `src/game/textures.ts` | 389 | Canvas Procedural Textures | **Replace with a better Unreal implementation** | PBR Material Instances (`M_LateriteSoil`, `M_AsphaltTamale`, `M_CompoundPlaster`, `M_ZincRoof`) with roughness/normal maps (**Phase 3**) |
| `src/game/collisionSystem.ts` | 920 | 2D AABB / Circle Math | **Replace with a better Unreal implementation** | Unreal Chaos Physics collisions, Capsule components, Blocking Volumes, NavMesh bounds (**Phase 1–2**) |
| `src/game/worldValidation.ts` | 320 | Road/Overlap Sanity Checks | **Reuse as design reference** | Editor Utility Widget / Python DataValidation checks verifying spline junctions & overlap-free placements (**Phase 2 & 10**) |
| `src/data/tamaleWorldData.ts` | 4,407 | Roads, Landmarks, NPCs, Shops | **Reuse data after conversion** | Exported to `DT_TamaleRoads.json`, `DT_TamaleLandmarks.json`, `DT_TamaleNPCs.json`, `DT_TamaleShops.json` (`1m -> 100cm`) (**Phase 1–2**) |
| `src/data/tamaleRoadGraph.ts` | 494 | Road Graph & A* Routing | **Replace with a better Unreal implementation** | `ATamaleRoadSplineActor` + UE ZoneGraph / NavMesh + custom road-graph GPS subsystem (**Phase 2 & 9**) |
| `src/data/tamaleWorldLayout.ts` | 359 | Building Footprints & Props | **Reuse data after conversion** | Level placement blueprint/JSON importer inside World Partition cells (**Phase 2–3**) |
| `src/data/tamaleExpansionData.ts` | 637 | 17 Communities, 15 Events | **Reuse data after conversion** | `DT_TamaleDistricts.json` & `DT_TamaleEvents.json` (**Phase 2 & 8**) |
| `src/data/tamaleGeoRegistry.ts` | 92 | OSM Coordinate Provenance | **Reuse data after conversion** | Embedded attribution metadata on Landmark DataTable (**Phase 2**) |
| `src/data/playableCharacters.ts` | 487 | 6 Playable Characters | **Reuse data after conversion** + **Rebuild in Unreal Engine** | `DT_PlayableCharacters.json` + `UTamaleGameInstance` isolated `FTamaleCharacterSaveState` map (**Phase 1 & 5**) |
| `src/data/tamaleHomeData.ts` | 535 | Recipes, Ingredients, Upgrades, Needs | **Reuse data after conversion** + **Rebuild in Unreal Engine** | `DT_HomeRecipes.json`, `DT_HomeIngredients.json`, `DT_HomeUpgrades.json`, `UTamaleNeedsComponent` (**Phase 1 & 4**) |
| `src/game/homeModelBuilder.ts` & `homeInteriorBuilder.ts` | 667 | Changli Compound Exterior/Interior | **Rebuild in Unreal Engine** | `ATamaleHomeCompoundActor` + `ATamaleHomeStationActor` modular compound & rooms (**Phase 1 & 4**) |
| `src/data/tamaleInteriors.ts` & `src/game/interiorBuilder.ts` | 1,439 | 33 Enterable Building Specs | **Reuse as design reference** | Physical walk-in UE interiors via Level Instances / Streaming Volumes (**Phase 4 & 7**) |
| `src/game/NpcScheduleController.ts` | 400 | Time-based NPC Schedules | **Rebuild in Unreal Engine** | `ATamaleNpcCharacter` + AI Behavior Tree / StateTree + Distance LOD Throttling (**Phase 1 & 5**) |
| `src/game/trafficSystem.ts` | 444 | Traffic & Signals | **Rebuild in Unreal Engine** + **Defer to a future phase** | Chaos Vehicles + MassTraffic / Lane Splines + Functional 3-Phase Signal Actor (**Phase 6 & 8**) |
| `src/game/lawEnforcementSystem.ts` | 648 | MTTD Patrol, Speed/Red-light Stops | **Rebuild in Unreal Engine** + **Defer to a future phase** | Observable violation triggers + Patrol AI (`APolicePatrolController`) (**Phase 8**) |
| `src/data/tamaleJobsAndServices.ts` | 1,233 | 18 Job Categories, 10 Services | **Reuse data after conversion** + **Defer to a future phase** | Job & Dispatch subsystems + Physical cargo attachment sockets (**Phase 7**) |
| `src/data/tamaleEconomy.ts` | 72 | Bank, MoMo, Savings, Pricing | **Rebuild in Unreal Engine** + **Defer to a future phase** | `UTamaleEconomySubsystem` with Cash/Bank/MoMo/Savings (**Phase 7**) |
| `src/utils/saveMigration.ts` | 264 | Versioned Multi-Char Save Schema | **Rebuild in Unreal Engine** | `UTamaleSaveGame` (`USaveGame`) with `SaveVersion` & per-character isolated struct map (**Phase 1**) |
| `src/data/dagbaniDatabase.ts` & `dagbaniVoices.ts` | 477 | Dagbani Orthography & Voice Slots | **Reuse data after conversion** | `DT_DagbaniTerms.json` + UMG Dialogue / SoundCue native recording slots (**Phase 1 & 5**) |
| `src/data/tamaleMusicAndRadio.ts` & `musicPlayer.ts` | 1,641 | 24 Tracks, 7 FM Stations, Licensing | **Reuse data after conversion** + **Replace with a better Unreal implementation** | `DT_MusicTracks.json` + Unreal MetaSounds / SoundMix Radio Subsystem preserving strict copyright disclosures (**Phase 8–9**) |
| `src/game/audio.ts` | 1,062 | WebAudio Procedural SFX/Ambience | **Replace with a better Unreal implementation** | MetaSounds + Audio Volumes + 3D spatialized Sound Attenuation (**Phase 3 & 8**) |
| `src/game/contextualHints.ts` | 284 | Contextual Prompts & Onboarding | **Rebuild in Unreal Engine** | `UTamaleInteractionComponent` + `UTamaleHudWidget` single contextual prompt banner (**Phase 1**) |
| `src/utils/deviceProfile.ts` | 303 | Desktop/Tablet/Mobile Input & UI | **Replace with a better Unreal implementation** | UE5 Enhanced Input (`UInputMappingContext` swapping KB/M, Gamepad, Touch) + CommonUI / DPI Scale (**Phase 1 & 9**) |
| `src/components/*` (`26` TSX Modals/HUD) | ~12,000+ | React HUD, Map, Phone, Modals | **Rebuild in Unreal Engine** | Modular UMG `UUserWidget` hierarchy (`WBP_TamaleHud` in Phase 1; Map/Phone/Shop/Jobs widgets in Phases 4, 7, 9) |
| `src/App.tsx` | 3,759 | Monolithic Web State Coordinator | **Replace with a better Unreal implementation** | Distributed UE5 Subsystems (`GameInstance`, `TimeOfDaySubsystem`, `NeedsComponent`, `InteractionComponent`) — strictly avoiding monolithic Blueprints/classes |

---

## 3. Honest Implementation Status Ledger (Current Turn)

- **Implemented & Verified (Existing Web Game — Preserved)**:
  - Full playable Three.js/React city simulator remains intact and builds cleanly (`vite build`, `tsc --noEmit`, port `3000`).
- **Implemented & Verified (Data Export Pipeline)**:
  - `/ue5/tools/export_ue5_datatables.ts` converts existing TAMALE 3D TypeScript data into `12` UE5-compatible JSON DataTables inside `/ue5/Tamale3D/Content/DataTables/`.
- **Implemented as Uncompiled Source Scaffold (UE5 C++ + `.uproject` + `.ini`)**:
  - Complete UE 5.4 `.uproject`, `.Target.cs`, `Tamale3D.Build.cs`, `Default*.ini` configs, and modular C++ Phase 1 architecture under `/ue5/Tamale3D/Source/Tamale3D/` (`Core`, `Data`, `Interaction`, `Player`, `World`, `AI`, `UI`).
  - **UNVERIFIED AGAINST UNREAL ENGINE COMPILER**: Because Unreal Engine 5 and Windows MSVC are not present in this Linux cloud container, UE5 `.cpp`/`.h` compilation (UHT + UBT), `.uasset`/`.umap` Blueprint wiring, Animation Blueprints, Chaos physics, and PIE (Play-In-Editor) runtime testing **have NOT been executed yet** and must be run on your Windows 11 workstation following `/ue5/PHASE1_SETUP_AND_TEST_CHECKLIST.md`.
- **Deferred to Future Phases (Phases 2–10)**:
  - Full 19-road World Partition city generation, Chaos Vehicles (Pragya, Moto, Taxi, Truck), AI Traffic + functional 3-phase traffic lights, Police patrol enforcement, Cargo freight loading, Nightclubs/Music Radio UI, Map/GPS UI, and Low/Med/High GPU profiling on Intel Core i7 8th Gen hardware.
