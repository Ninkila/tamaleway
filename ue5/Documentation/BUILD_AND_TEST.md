# TAMALE 3D UE5: Build & Test on Windows

These are the steps that need **you at the PC**. The code has not been compiled yet, so expect to go round the compile → fix loop at least once. Send me the first errors and I'll fix them.

## 1. Prerequisites (one time)

- Unreal Engine **5.4.4** (Epic Games Launcher → Unreal Engine → Library).
- Visual Studio 2022 with the **Game development with C++** workload. It must include the MSVC v143 toolset and a Windows 10/11 SDK.
- Python 3.9+ (only for the validator) and Node 22.18+ (only to re-export data).

## 2. Compile

From a **Developer PowerShell for VS 2022** (adjust both paths):

```powershell
$UE   = "C:\Program Files\Epic Games\UE_5.4"
$Proj = "C:\path\to\tamaleway\ue5\Tamale3D\Tamale3D.uproject"

& "$UE\Engine\Build\BatchFiles\Build.bat" Tamale3DEditor Win64 Development -Project="$Proj" -WaitMutex 2>&1 | Tee-Object build.log
```

- Success ends with `Result: Succeeded`.
- On failure, send me `build.log`, or just the first 30 lines containing `error`. UHT errors (lines starting with the header path) come before MSVC errors and should be fixed first.
- Alternative: right-click `Tamale3D.uproject` → *Generate Visual Studio project files*, open `Tamale3D.sln`, then build **Development Editor | Win64**.

## 3. Run

1. Double-click `Tamale3D.uproject`. If it asks to rebuild modules, say **Yes**.
2. The editor opens the empty engine `Entry` map. That's intentional: the city is generated when you press Play.
3. Open **Window → Output Log** and set the filter to `LogTamale3D`.
4. Press **Play** (Alt+P). Use **P** to pause. In Play-In-Editor, Esc *stops* the session.

You don't need to import DataTables, create input assets, build a level or place a NavMesh volume. The C++ creates all of these at runtime.

## 4. Tests

Record ✔/✘ for each. A ✘ with a screenshot and the Output Log lines is the most useful thing you can send back.

| # | Do this | Expected |
|---|---|---|
| T1 | Press Play | The log shows `Tamale data registry: 13/13 tables loaded ... road networks=1 \| issues=0` and `City bootstrap: built 19 roads, 80 buildings ...`. The bottom-right footer reads `data 13/13 tables, 0 issues \| road networks: 1`. The top-left shows the day, clock, period and weather. |
| T2 | WASD and mouse | The character walks relative to the camera. The mouse orbits the camera, and moving the mouse up looks up. |
| T3 | Mouse wheel | The camera zooms in and out (1.9–6.2 m). |
| T4 | Shift / Space / Ctrl | Shift runs (faster; Hunger and Hygiene fall faster). Space jumps. Ctrl toggles crouch (slower). |
| T5 | Walk around; compare with the web map | 19 dark roads connect into one network with street-name plates. Blockout buildings carry labels; `*` marks representative (fictional) places. The district name in the HUD changes as you move. |
| T6 | Press 1, then walk to **Home – Changli Compound** (green on the map; character 1 spawns at the Interchange, ~70 m north, so follow the minimap south). Enter the gate and look at the bed, shower, stove, sink, fridge, sofa, laundry tub and clothesline. Press E on each. | A prompt appears for each, e.g. `Sleep Until Morning (E)`, with Dagbani subtitles on the stove/fridge. Each E changes the matching need bars. Sleeping jumps the clock to 07:00 (next day) and restores Energy. Cooking adds a dirty dish (shown in the I panel); the kitchen sink clears it. |
| T7 | Press M, then M again | The full city map opens, showing you (blue), home (green) and landmarks (gold). It closes. The minimap (top-right) follows you with north up. |
| T8 | Note character 1's needs and position. Press 2, then press 1 | Pressing 2 shows `Now playing Sulemana...`; you teleport to his spawn with his own needs and money. Pressing 1 returns you to **exactly** where you left character 1, with the same need values. |
| T9 | P | Pauses the game with a controls overlay; P resumes. |
| T10 | F5, move away, F9 | `Game saved`, then `Game loaded` and you're back at the saved spot. Restart Play, press F9, and the save still loads. |
| T11 | Watch the sky for ~5 minutes (or sleep) | The sun rises in the east and is high around 12:00. Nights are dark. After an overnight sleep the weather can change: Harmattan adds visible dusty haze. |
| T12 | NPCs: walk to Mama Fati near the Central Market and press E | `Greet Mama Fati - Market Trader...` appears with her verified Dagbani greeting from the data, and Social rises. |
| T13 | `stat fps` in the console (backtick key) | Record the FPS at Medium and Low scalability (Settings → Engine Scalability). The target for this blockout is 60 FPS on your laptop. |

## 5. Data tools (no Unreal needed)

```powershell
cd C:\path\to\tamaleway
npx tsx ue5/tools/export_ue5_datatables.ts          # regenerate Content/DataTables from src/data
python ue5/tools/validate_ue5_data.py --write       # must end with "Errors: 0"
```

## 6. Later: make it a real level

Once T1–T12 pass, keep the generated city as a starting level:

1. Create **File → New Level → Empty Open World** (or Empty Level) and save it as `/Game/Maps/L_Tamale_Changli_Milestone1`.
2. Point `EditorStartupMap` and `GameDefaultMap` in `Config/DefaultEngine.ini` at it.
3. Drag a `TamaleCityBootstrapActor` into it to keep the greybox. Untick **Auto Build** once you've hand-placed real roads and buildings.
