> **Superseded (2026-11-23):** current status lives in `ue5/Documentation/MIGRATION_MASTER_TRACKER.md`; build & test steps in `ue5/Documentation/BUILD_AND_TEST.md`. Kept for history.

# TAMALE 3D — UE5 Phase 1 Milestone Setup & Physical Test Checklist

## 1. Prerequisites on Target Windows 11 Machine
Target hardware profile: **Intel Core i7 8th Generation, 16 GB RAM, Windows 11**.

1. Install **Unreal Engine 5.4.4** via Epic Games Launcher (include Engine Source/Debug Symbols only if disk allows; exclude Android/iOS/Console platforms initially to save RAM/disk).
2. Install **Visual Studio 2022 Community** with workloads:
   - *Desktop development with C++*
   - *Game development with C++*
   - *Windows 10/11 SDK*
3. Copy the `/ue5/Tamale3D/` folder from this repository to your local Windows SSD (e.g. `D:\Projects\Tamale3D\`). Keep `/src/` intact as your reference prototype.

---

## 2. Generate Project Files & Compile C++ Foundation
1. Right-click `Tamale3D.uproject` -> **Show more options** -> **Generate Visual Studio project files**.
2. Open `Tamale3D.sln` in Visual Studio 2022.
3. Set build configuration to **Development Editor | Win64** and build (`Ctrl+Shift+B`).
4. Verify zero UHT / MSVC compiler errors in `Tamale3D`:
   - `UTamaleGameInstance`, `ATamaleGameMode`, `UTamaleSaveGame`, `UTamaleTimeOfDaySubsystem`
   - `ATamalePlayerCharacter`, `ATamalePlayerController`, `UTamaleNeedsComponent`, `UTamaleInteractionComponent`
   - `ATamaleRoadSplineActor`, `ATamaleHomeCompoundActor`, `ATamaleHomeStationActor`, `ATamaleNpcCharacter`, `UTamaleHudWidget`
5. Launch the editor via `Tamale3D.uproject` (or Visual Studio `F5`).

---

## 3. Import Converted DataTables (Already Generated in `Content/DataTables/`)
Inside Unreal Editor Content Browser (`Content/Data/`):
1. Drag each JSON file from `Content/DataTables/` into Unreal Engine and select the matching `FTableRowBase` struct:
   - `DT_TamaleRoads.json` -> `TamaleRoadRow`
   - `DT_TamaleLandmarks.json` -> `TamaleLandmarkRow`
   - `DT_TamaleDistricts.json` -> `TamaleDistrictRow`
   - `DT_PlayableCharacters.json` -> `TamalePlayableCharacterRow`
   - `DT_TamaleNPCs.json` -> `TamaleNpcRow`
   - `DT_TamaleShops.json` -> `TamaleShopRow`
   - `DT_HomeRecipes.json` -> `TamaleRecipeRow`
   - `DT_HomeIngredients.json` -> `TamaleIngredientRow`
   - `DT_HomeUpgrades.json` -> `TamaleHomeUpgradeRow`
   - `DT_DagbaniTerms.json` -> `TamaleDagbaniTermRow`
   - `DT_TamaleEvents.json` -> `TamaleEventRow`
   - `DT_MusicTracks.json` -> `TamaleMusicTrackRow`

---

## 4. Phase 1 Milestone Assets & Level Assembly (`L_Tamale_Changli_Milestone1`)

### A. Input Actions (`Content/Input/`)
Create `UInputAction` assets and wire them into `IMC_TamaleOnFoot` (`UInputMappingContext`):
- `IA_Move` (Axis2D): `W/S`, `A/D`, Left Stick
- `IA_Look` (Axis2D): Mouse XY, Right Stick
- `IA_Jump` (Digital Bool): `Space`, Gamepad Face Bottom
- `IA_Sprint` (Digital Bool): `Left Shift`
- `IA_Crouch` (Digital Bool): `Left Ctrl` / `C`
- `IA_Interact` (Digital Bool): `E`
- `IA_CameraZoom` (Axis1D): Mouse Wheel Axis
- `IA_ToggleHomeMenu` / `IA_SwitchChar`: `Tab` / `F5`

Assign these assets on `BP_TamalePlayerController` (child of `ATamalePlayerController`).

### B. Playable Character Blueprint (`BP_TamalePlayerCharacter`)
1. Inherit from `ATamalePlayerCharacter`.
2. Assign legal UE5 Quinn/Manny Skeletal Mesh (from Starter Third Person Template or MetaHuman/Marketplace legal asset) and Animation Blueprint (`ABP_TamaleHuman`) driving Speed, Grounded/IsFalling, and IsCrouching blend spaces.
3. Configure `CameraBoom` defaults: TargetArmLength `340 cm`, SocketOffset `(0, 45, 55)`, ProbeSize `14`, DoCollisionTest `true` (prevents wall clipping).

### C. UI Widget (`WBP_TamaleHud`)
1. Inherit from `UTamaleHudWidget`.
2. Add named widgets matching C++ `BindWidgetOptional`:
   - `TxtDistrictName`, `TxtClockAndDay`, `TxtMoneySummary`
   - `BarEnergy`, `BarHygiene`, `BarHunger`, `BarThirst`, `BarComfort`, `BarHomeCleanliness`
   - `PromptContainer` + `TxtInteractionPrompt` + `TxtDagbaniPrompt` (hidden automatically unless player looks at an interactable!).

### D. First Neighbourhood Map (`Content/Maps/L_Tamale_Changli_Milestone1`)
1. Create a small World Partition / open test terrain (~400m x 400m centered near Changli Quarter `X=2000..6000, Y=7000..11500` in Unreal cm).
2. Add `DirectionalLight` (Movable, Dynamic Shadow Distance tuned to `12000 cm`), `SkyAtmosphere`, `SkyLight` (Real Time Capture disabled or interval-throttled for i7 8th Gen), `ExponentialHeightFog` (subtle Harmattan golden tint).
3. Place two intersecting `BP_TamaleRoadSplineActor` splines:
   - `Changli Residential Avenue` (E-W at `Y = 9600 cm`, width `750 cm` + `180 cm` sidewalks)
   - `Jakarayili Mosque Lane` (N-S at `X = 3600 cm`, width `650 cm` + `150 cm` sidewalks)
   - Enable `SnapSplinePointsToGround()` in construction script so roads sit flush with terrain without floating.
4. Place `BP_TamaleHomeCompound` (child of `ATamaleHomeCompoundActor`) at `(2000, 8100, 0)` with open south-facing compound gate connecting straight to `Changli Residential Avenue`.
   - Inside the compound exterior: compound wall, Polytank tower, clothesline stand, courtyard sweep area.
   - Inside the enterable house (separate room doorways >= 140 cm wide, capsule radius 34 cm): Living Room, Kitchen, Bathroom, Bedroom.
   - Place `BP_TamaleHomeStation` actors (`Bed`, `Shower`, `KitchenStove`, `CleaningSpot`, `LaundryTub`, `Wardrobe`).
5. Place 3–4 neighbouring Tamale compound houses and `Changli Provisions Mart` at `(5000, 8100, 0)` along the road so the street feels cohesive.
6. Add a `NavMeshBoundsVolume` covering the whole neighbourhood and place 4 `BP_TamaleNpcCharacter` residents walking/idling between houses, stalls, and sidewalks.

---

## 5. Mandatory Phase 1 Verification Gates (Must Pass in PIE Before Phase 2)
Run Play-In-Editor (PIE) on target laptop profile (`sg.* = Medium` via `DefaultScalability.ini`):

1. **Movement & Camera**: Walk, sprint, jump, crouch smoothly with zero ground-floating, sliding, or camera clipping inside walls.
2. **Road Connectivity**: Walk out of the player compound gate (`Y=8700`) directly onto `Changli Residential Avenue` (`Y=9600`) and turn onto `Jakarayili Mosque Lane` (`X=3600`) with smooth step-up over sidewalk curbs (max step height `35 cm`).
3. **Enterable Home & Collisions**: Walk through the open compound gate and house doorway into Living Room, Kitchen, Bedroom, and Bathroom without getting snagged on door frames or clipping through furniture.
4. **Contextual Interaction Prompt**: Prompt appears cleanly when facing Bed/Shower/Stove/NPC/Door and disappears immediately when turning away (no permanent text clutter).
5. **Sleep Mechanic & Time Cycle**: Interact with Bed -> select wake-up hour (`06:00` / `07:00` / `08:00`) -> clock advances, day increments when passing midnight, Sun/DirectionalLight rotates accurately to morning light, Energy & Comfort restore, and gameplay resumes cleanly inside the bedroom.
6. **Needs, Hygiene, Cleaning & Cooking**: Test Shower (+Hygiene), Kitchen Stove (+Cooked Meal / Eat / +Hunger / +DirtyDishes), Sweep (+HomeCleanliness).
7. **Character State Isolation & Save/Load**: Switch character via GameInstance / save via `UTamaleSaveGame`, reload PIE, and verify character wallet, day, needs, and home cleanliness stay isolated per character.
8. **Performance Baseline**: Verify steady `>= 30–60 FPS` on `Medium` scalability (`stat fps`, `stat unit`) with dynamic lighting and 4–6 NPCs active.
