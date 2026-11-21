import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  getDistrictAt,
  getNearestLandmarkGuidance,
  isShopOpenAtMinutes,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
  TAMALE_ROADS,
  TAMALE_WORLD_BOUNDS,
} from "../data/tamaleWorldData";
import { PLAYABLE_CHARACTERS } from "../data/playableCharacters";
import { CROWD_DAGBANI_VOICE_STYLES } from "../data/dagbaniVoices";
import {
  ActiveCityEventMode,
  ActiveTaskRuntime,
  CameraMode,
  DEFAULT_KEY_BINDINGS,
  DeviceClass,
  GraphicsQuality,
  InteriorRoomSpec,
  KeyBindings,
  NearbyChatter,
  NearbyInteractable,
  NpcRuntimeSnapshot,
  PlayerCustomization,
  ServiceRequestRuntime,
  WeatherType,
} from "../types/game";
import { getInteriorSpecForLandmark } from "../data/tamaleInteriors";
import {
  ALL_EW_ROAD_COORDS,
  ALL_NS_ROAD_COORDS,
  findRoadRoute,
  getCrossRoadsAlong,
  getRoadExtentBounds,
} from "../data/tamaleRoadGraph";
import { TamaleAudioEngine } from "./audio";
import {
  COLLIDER_MASK_ALL_WITH_VEHICLES,
  COLLIDER_MASK_SOLID,
  ColliderLayer,
  DoorwayEntranceSpec,
  DynamicVehicleObstacle,
  getTamaleGroundHeight,
  isNearDoorwayEntrance,
  resolveInteriorCircle2D,
  SpatialCollisionWorld,
  sweepInteriorCameraRay,
} from "./collisionSystem";
import { buildPhysicalInteriorScene, BuiltInteriorScene } from "./interiorBuilder";
import { NpcScheduleController } from "./NpcScheduleController";
import {
  CharacterRig,
  createAirportGroup,
  createBicycleMesh,
  createBusStopShelterMesh,
  createCargoTrikeMesh,
  createCentralMarketGroup,
  createCentralMosqueGroup,
  createCharacterRig,
  createCompoundGroup,
  createCulturalCentreGroup,
  createDakpemaPalaceGroup,
  createJubileeAndOfficeGroup,
  createKukuoPotteryGroup,
  createLandmarkLabelSprite,
  createLivestockTimberGroup,
  createMotorcycleMesh,
  createMotorcycleWithRiderMesh,
  createPolytankAndSolarAddon,
  createPragyaMesh,
  createPrivateCarMesh,
  createRoadsideBenchMesh,
  createRoadsidePlanterBinMesh,
  createRoadsideStallMesh,
  createSccaRedClayGroup,
  createSchoolGroup,
  createShopBuilding,
  createSpeechBubbleSprite,
  createSpeedHumpMesh,
  createStadiumGroup,
  createStreetDirectionSignMesh,
  createSurfacePatchAndCulvertMesh,
  createTamaleHouseVariant,
  createTamaleInterchangeGroup,
  createTaxiMesh,
  createTeachingHospitalGroup,
  createTreeMesh,
  createUtilityPoleWithLamp,
  NpcCarryProp,
  setCharacterPose,
  ShopArchitecturalStyle,
  TamaleHouseVariant,
} from "./models";
import { createProceduralTextures, ProceduralTextureSet } from "./textures";

// Pre-allocated math helpers (Zero GC in loop)
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

function getLaneShift(roadCoord: number): number {
  return roadCoord === 0 ? 4.9 : 2.25;
}

interface DrivableVehicle {
  id: string;
  kind: "pragya" | "motorcycle";
  label: string;
  group: THREE.Group;
  wheels: THREE.Mesh[];
  headlightMat: THREE.MeshStandardMaterial;
  x: number;
  z: number;
  rotY: number;
  speed: number;
}

interface TrafficVehicle {
  kind: "moto" | "pragya" | "taxi" | "car" | "cargo" | "bicycle";
  group: THREE.Group;
  chassisGroup?: THREE.Group;
  wheels?: THREE.Mesh[];
  headlightMat: THREE.MeshStandardMaterial;
  axis: "x" | "z";
  roadCoord: number;
  x: number;
  z: number;
  dir: 1 | -1;
  rotY: number;
  leanAngle: number;
  baseSpeed: number;
  currentSpeed: number;
  laneOffset: number;
  targetLaneOffset: number;
  stopTimer: number;
  stopCooldown: number;
  lastCrossCoord: number | null;
  hornCooldown: number;
  passByCooldown: number;
  nightActive: boolean;
}

interface CrowdAgent {
  rig: CharacterRig;
  speakerName: string;
  district: string;
  voiceName: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
  role: "walker" | "vendor" | "seated" | "student" | "child" | "social_group" | "commuter_wait";
  vendorShopId?: string;
  vendorMode?: "walking" | "calling" | "selling" | "restocking";
  vendorStateTimer?: number;
  homeMarketCoord?: { x: number; z: number };
  restocking?: boolean;
  focusTarget?: { x: number; z: number };
  waypoints: Array<{ x: number; z: number }>;
  wpIndex: number;
  x: number;
  z: number;
  rotY: number;
  walkPhase: number;
  speed: number;
  pauseTimer: number;
  speakCooldown: number;
  speakingTimer: number;
  activePhrase: { dagbani: string; english: string } | null;
  speechSprite: THREE.Sprite | null;
  stuckTimer?: number;
  detourSign?: 1 | -1;
}

interface SpatialSector {
  gx: number;
  gz: number;
  centerX: number;
  centerZ: number;
  group: THREE.Group;
}

const DAGBANI_CROWD_PHRASES: Record<
  "morning" | "afternoon" | "evening",
  Array<{ dagbani: string; english: string }>
> = {
  morning: [
    { dagbani: "Dasuba! Antire!", english: "Good morning! Peace!" },
    { dagbani: "Kpakpili ni nyuli be kpe!", english: "Fresh shea butter & yam here!" },
    { dagbani: "Di daa nyɛla ala?", english: "How much does it cost?" },
    { dagbani: "Boogima, n zɔri!", english: "Please reduce the price, friend!" },
    { dagbani: "Kɔɔsɛ be kpe — hot breakfast!", english: "Fresh bean cakes — hot breakfast!" },
    { dagbani: "Alaafee beni? Heading to school!", english: "All well? Heading to school!" },
    { dagbani: "Come buy fresh tomatoes here!", english: "Come buy fresh tomatoes here!" },
  ],
  afternoon: [
    { dagbani: "Wuntanga! A beela?", english: "Good afternoon! How are you?" },
    { dagbani: "Saɣim ni kom be kpe!", english: "Hot Tuo Zaafi & cool water here!" },
    { dagbani: "Batakari nɛma viɛla!", english: "Fine handwoven smocks & cloth!" },
    { dagbani: "Di daa nyɛla ala?", english: "How much does it cost?" },
    { dagbani: "Boogima! Two bags of yam!", english: "Reduce the price! Two bags of yam!" },
    { dagbani: "M'paɣiya, n zɔri!", english: "Thank you, my friend!" },
    { dagbani: "Pragya! Interchange, Aboabo!", english: "Pragya! Interchange, Aboabo!" },
  ],
  evening: [
    { dagbani: "Zaawuni! Antire!", english: "Good evening! Peace!" },
    { dagbani: "Bɛŋa ni shinkaafa — hot Waakye!", english: "Hot Tamale Waakye!" },
    { dagbani: "Nimdi — fresh chichinga!", english: "Grilled spiced beef kebab!" },
    { dagbani: "Zɔri suŋ gari laɣiri!", english: "A good friend beats money!" },
    { dagbani: "Biɛɣuni ti ni nyɛ taba!", english: "Tomorrow we meet again!" },
    { dagbani: "M'paɣiya pam!", english: "Thank you very much!" },
  ],
};

interface ActiveServiceAgent {
  request: ServiceRequestRuntime;
  pickupPos: { x: number; z: number };
  group: THREE.Group;
  wheels?: THREE.Mesh[];
  headlightMat: THREE.MeshStandardMaterial;
  x: number;
  z: number;
  rotY: number;
  speed: number;
  waypoints: Array<{ x: number; z: number }>;
  wpIdx: number;
  despawnTimer: number;
}

export interface EngineCallbacks {
  onHudUpdate: (data: {
    district: string;
    speedKmh: number;
    isDriving: boolean;
    drivingLabel: string | null;
    drivingKind: "pragya" | "motorcycle" | null;
    isRidingService: boolean;
    nearby: NearbyInteractable | null;
    nearbyVehicle: NearbyInteractable | null;
    nearbyChatter: NearbyChatter | null;
    nearestGuidance: {
      id: string;
      name: string;
      dagbaniLabel: string;
      distanceMeters: number;
      bearingLabel: string;
      isErrandTarget: boolean;
    } | null;
    playerPos: { x: number; z: number; rotY: number };
    servicePos: { x: number; z: number } | null;
    discoveredLandmarkId: string | null;
    npcStates: NpcRuntimeSnapshot[];
    isMoving: boolean;
    isRunning: boolean;
  }) => void;
  onInteract: (item: NearbyInteractable) => void;
  onServiceUpdate?: (req: ServiceRequestRuntime | null) => void;
  onInteriorChange?: (spec: InteriorRoomSpec | null) => void;
  onEnergyDrain?: (delta: number) => void;
  onWebGLContextChange?: (lost: boolean) => void;
}

export class TamaleEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private audio: TamaleAudioEngine;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private worldRoot = new THREE.Group();
  private interiorRoot = new THREE.Group();
  private camera!: THREE.PerspectiveCamera;
  private textures!: ProceduralTextureSet;
  private isSoftwareGl = false;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private lampBulbMats: THREE.MeshStandardMaterial[] = [];
  private nightlifeMats: THREE.MeshStandardMaterial[] = [];
  private nightLightPool: THREE.PointLight[] = [];
  private nightSpotCoords: Array<{ x: number; y: number; z: number; color: number }> = [];
  private stadiumFloodlightMats: THREE.MeshStandardMaterial[] = [];
  private emberMats: THREE.MeshStandardMaterial[] = [];
  private windSwayTrees: Array<{ group: THREE.Group; phase: number }> = [];
  private activeCityEvent: ActiveCityEventMode = "ordinary_day";
  private eventGroups = new Map<ActiveCityEventMode, THREE.Group>();
  private spatialSectors: SpatialSector[] = [];
  private sectorStreamRadius = 215;
  private lastSectorSync = -10;

  private activeInteriorSpec: InteriorRoomSpec | null = null;
  private activeInteriorScene: BuiltInteriorScene | null = null;
  private exteriorReturnPos = new THREE.Vector3(14, 0, 14);
  private exteriorReturnRotY = -Math.PI * 0.78;
  private exteriorCamDist = 9.5;
  private exteriorCamPitch = 0.28;
  private lightningFlashIntensity = 0;
  private nextLightningAt = 6.5;

  private playerRig!: CharacterRig;
  private playerPos = new THREE.Vector3(14, 0, 14);
  private playerVelX = 0;
  private playerVelZ = 0;
  private playerVelY = 0;
  private playerRotY = -Math.PI * 0.78;
  private isGrounded = true;
  private walkPhase = 0;
  private playerEnergyRatio = 0.9;
  private energyDrainBuffer = 0;

  private camYaw = 0.72;
  private camPitch = 0.28;
  private camYawTarget = 0.72;
  private camPitchTarget = 0.28;
  private camDist = 9.5;
  private cameraMode: CameraMode = "third-person";
  private cameraSensitivity = 1.0;

  private keys: Record<string, boolean> = {};
  private keyBindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualRun = false;
  private touchControlsActive = false;
  private playerMoving = false;
  private playerRunning = false;
  private vehicleInput = { throttle: 0, steer: 0, brake: false, handbrake: false };

  private isPointerDragging = false;
  private activeDragPointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pinchDistPrev: number | null = null;

  private collisionWorld = new SpatialCollisionWorld(TAMALE_WORLD_BOUNDS, 12);
  private doorways: DoorwayEntranceSpec[] = [];
  private dynamicVehicleBuf: DynamicVehicleObstacle[] = [];
  private npcController!: NpcScheduleController;
  private crowdAgents: CrowdAgent[] = [];
  private ambientPlayableCharacters: Array<{ id: string; rig: CharacterRig }> = [];
  private activePlayableId = "yakubu_pragya";
  private labelGroup = new THREE.Group();
  private landmarkLabels: Array<{ sprite: THREE.Sprite; x: number; z: number; baseY: number }> = [];
  private labelsVisible = true;
  private crowdIntensity = 0;
  private lastCrowdTtsTime = -10;
  private crowdTtsPending = false;
  private drivables: DrivableVehicle[] = [];
  private traffic: TrafficVehicle[] = [];
  private drivingVehicle: DrivableVehicle | null = null;
  private nearbyInteractable: NearbyInteractable | null = null;
  private nearbyVehicleInteractable: NearbyInteractable | null = null;

  private activeService: ActiveServiceAgent | null = null;
  private lastServiceSyncTime = 0;
  private serviceSyncDirty = false;
  private servicePassengerRiding = false;

  private deviceClass: DeviceClass = "desktop";
  private graphicsQuality: GraphicsQuality = "high";
  private resolutionScale = 1.0;
  private crowdUpdateRadius = 115;
  private trafficUpdateRadius = 250;
  private labelMaxDist = 195;

  private activeErrandLandmarkId: string | null = null;
  private activeGigLandmarkId: string | null = null;
  private activeTaskRuntime: ActiveTaskRuntime | null = null;
  private gigPassengerRig!: CharacterRig;
  private deliveryBeacon!: THREE.Mesh;
  private gigBeacon!: THREE.Mesh;

  private weather: WeatherType = "clear";
  private gameMinutes = 9 * 60 + 15; // 09:15 AM
  private timeScale = 1.6;
  private paused = false;

  private dustPoints!: THREE.Points;
  private rainLines!: THREE.LineSegments;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private lastHudSync = 0;
  private currentCustomization: PlayerCustomization;

  constructor(
    container: HTMLElement,
    initialCustomization: PlayerCustomization,
    audio: TamaleAudioEngine,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.currentCustomization = initialCustomization;
    this.audio = audio;
    this.callbacks = callbacks;

    this.initRenderer();
    this.initScene();
    this.buildWorld();
    this.buildLandmarkLabels();
    this.buildCityEventProps();
    this.buildPlayer(initialCustomization);
    this.buildNpcs();
    this.buildCrowdPedestrians();
    this.buildVehicles();
    this.buildWeatherParticles();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.clock.start();
    this.tick();
  }

  private detectSoftwareGl(): boolean {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initRenderer() {
    this.isSoftwareGl = this.detectSoftwareGl();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      this.container.clientWidth || window.innerWidth,
      this.container.clientHeight || window.innerHeight
    );

    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc7e2f5);
    this.scene.fog = new THREE.FogExp2(0xc7e2f5, 0.0046);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(56, w / h, 0.1, 560);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.textures = createProceduralTextures(this.renderer);

    // Warm savannah sun + cool sky / red-earth ground bounce hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0xd4ecff, 0xa8643c, 0.76);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.9);
    this.sunLight.position.set(48, 74, 38);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 220;
    const d = 76;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Pooled dynamic point lights for evening/nightlife venues & streetlamps (zero shader bloat)
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffb347, 0, 32, 1.65);
      pl.position.set(0, 4.2, 0);
      this.scene.add(pl);
      this.nightLightPool.push(pl);
    }

    this.worldRoot.name = "worldRoot";
    this.interiorRoot.name = "interiorRoot";
    this.interiorRoot.visible = false;
    this.scene.add(this.worldRoot, this.interiorRoot);

    // Initialize 4x4 Spatial Sector Streaming grid (-240..240)
    const sectorSize = 120;
    for (let gx = 0; gx < 4; gx++) {
      for (let gz = 0; gz < 4; gz++) {
        const group = new THREE.Group();
        group.name = `sector_${gx}_${gz}`;
        this.worldRoot.add(group);
        this.spatialSectors.push({
          gx,
          gz,
          centerX: -180 + gx * sectorSize,
          centerZ: -180 + gz * sectorSize,
          group,
        });
      }
    }
  }

  private getSectorFor(x: number, z: number): THREE.Object3D {
    const gx = THREE.MathUtils.clamp(Math.floor((x + 240) / 120), 0, 3);
    const gz = THREE.MathUtils.clamp(Math.floor((z + 240) / 120), 0, 3);
    const found = this.spatialSectors.find((s) => s.gx === gx && s.gz === gz);
    return found ? found.group : this.worldRoot;
  }

  private addWireSpan(x1: number, z1: number, x2: number, z2: number, y = 5.75) {
    const wireMat = new THREE.LineBasicMaterial({ color: "#1c1917", transparent: true, opacity: 0.75 });
    const sector = this.getSectorFor((x1 + x2) / 2, (z1 + z2) / 2);
    for (const offset of [-0.45, 0, 0.45]) {
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x1 + offset, y, z1),
        new THREE.Vector3(midX + offset, y - 0.55, midZ),
        new THREE.Vector3(x2 + offset, y, z2)
      );
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(8));
      sector.add(new THREE.Line(geo, wireMat));
    }
  }

  private buildWorld() {
    // 1. Red-orange Tamale laterite ground across expanded metropolitan bounds
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(780, 780),
      new THREE.MeshStandardMaterial({
        map: this.textures.lateriteGround,
        bumpMap: this.textures.lateriteBump,
        bumpScale: 0.04,
        roughness: 0.94,
        metalness: 0.0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.worldRoot.add(ground);

    // 2. Paved asphalt roads + concrete drainage channels & curbs
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.asphaltRoad,
      bumpMap: this.textures.asphaltBump,
      bumpScale: 0.025,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const drainConcreteMat = new THREE.MeshStandardMaterial({ color: "#9ca3af", roughness: 0.88 });
    const drainTrenchMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.92 });

    for (const r of TAMALE_ROADS) {
      const roadMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(r.orientation === "ns" ? r.depth : r.width, r.orientation === "ns" ? r.width : r.depth),
        roadMat
      );
      roadMesh.rotation.x = -Math.PI / 2;
      if (r.orientation === "ns") {
        roadMesh.rotation.z = Math.PI / 2;
      }
      roadMesh.position.set(r.x, 0.03, r.z);
      roadMesh.receiveShadow = true;
      this.worldRoot.add(roadMesh);

      // Concrete roadside open storm drains along East-West avenues
      if (r.orientation === "ew") {
        for (const side of [-1, 1]) {
          const zEdge = r.z + side * (r.depth / 2 + 0.45);
          const curb = new THREE.Mesh(new THREE.BoxGeometry(r.width, 0.14, 0.7), drainConcreteMat);
          curb.position.set(r.x, 0.07, zEdge);
          curb.receiveShadow = true;
          this.worldRoot.add(curb);

          const channel = new THREE.Mesh(new THREE.BoxGeometry(r.width, 0.05, 0.28), drainTrenchMat);
          channel.position.set(r.x, 0.13, zEdge);
          this.worldRoot.add(channel);
        }
      } else {
        for (const side of [-1, 1]) {
          const xEdge = r.x + side * (r.width / 2 + 0.4);
          const curb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, r.depth), drainConcreteMat);
          curb.position.set(xEdge, 0.06, r.z);
          curb.receiveShadow = true;
          this.worldRoot.add(curb);
        }
      }
    }

    // 3. Tamale (Naa Gbewaa) Interchange at (0, 0, 0)
    const { group: interchangeGroup, bridgeLampBulbs } = createTamaleInterchangeGroup(this.textures);
    interchangeGroup.position.set(0, 0, 0);
    this.worldRoot.add(interchangeGroup);
    this.lampBulbMats.push(...bridgeLampBulbs);

    // Bridge piers & central roundabout island colliders (keeping Gukpegu Rd N-S & High St frontage lanes passable!)
    for (const px of [-24, -10, 10, 24]) {
      this.addCollider(px - 0.9, px + 0.9, -2.6, 2.6);
    }
    this.addCollider(-4.1, 4.1, -4.1, 4.1); // Roundabout island
    this.addCollider(-14.5, -6.8, 9.8, 11.2); // Highway gantry sign posts

    // 4. Tamale Central Market (-44, 0, -30)
    const market = createCentralMarketGroup(this.textures);
    market.position.set(-44, 0, -30);
    this.worldRoot.add(market);
    this.addCollider(-59, -29, -42, -18.5, 4.2, ColliderLayer.BUILDING);

    // 5. Tamale Central Mosque (34, 0, 46) along Gukpegu Rd SSE — circular sanctuary + twin minarets so courtyard stays walkable
    const mosque = createCentralMosqueGroup(this.textures);
    mosque.position.set(34, 0, 46);
    this.worldRoot.add(mosque);
    this.collisionWorld.addCylinder({
      x: 34,
      z: 45,
      radius: 8.75,
      maxY: 12.5,
      layer: ColliderLayer.BUILDING,
      blocksCamera: true,
    });
    for (const mx of [34 - 10.2, 34 + 10.2]) {
      this.collisionWorld.addCylinder({
        x: mx,
        z: 50.5,
        radius: 1.65,
        maxY: 13.5,
        layer: ColliderLayer.BUILDING,
        blocksCamera: true,
      });
    }

    // 6. Jubilee Park & Tamale High Street 4-Story Office Precinct (86, 0, 22)
    const jubileeOffice = createJubileeAndOfficeGroup(this.textures);
    jubileeOffice.position.set(86, 0, 22);
    this.worldRoot.add(jubileeOffice);
    this.addCollider(77.5, 94.5, 13.5, 24, 10.5, ColliderLayer.BUILDING); // Main office footprint
    this.collisionWorld.addCylinder({
      x: 86,
      z: 44,
      radius: 2.6,
      maxY: 6.2,
      layer: ColliderLayer.PROP,
      blocksCamera: true,
    }); // Jubilee Park monument

    // 7. Dagbon Smock & Drumming Guild (-84, 0, 20)
    const cultural = createCulturalCentreGroup(this.textures);
    cultural.position.set(-84, 0, 20);
    this.worldRoot.add(cultural);
    this.addCollider(-93, -75, 12, 28, 4.5, ColliderLayer.BUILDING);

    // 8. Dakpema Chief's Palace & Regional Chiefs Hall (-34, 0, -70)
    const palace = createDakpemaPalaceGroup(this.textures);
    palace.position.set(-34, 0, -70);
    this.worldRoot.add(palace);
    this.addCollider(-45.2, -22.8, -79, -68.2, 5.4, ColliderLayer.BUILDING);
    for (const px of [-2.8, -2.3, 2.3, 2.8]) {
      this.collisionWorld.addCylinder({
        x: -34 + px,
        z: -66.2,
        radius: 0.28,
        maxY: 3.6,
        layer: ColliderLayer.WALL,
        blocksCamera: false,
      });
    }

    // 9. Tamale Teaching Hospital (96, 0, 102)
    const hospital = createTeachingHospitalGroup(this.textures);
    hospital.position.set(96, 0, 102);
    this.worldRoot.add(hospital);
    this.addCollider(82.5, 109.5, 91.5, 107, 10.5, ColliderLayer.BUILDING);

    // 10. Aliu Mahama Sports Stadium (-134, 0, -124) — circular precast concrete bowl + NE-2 gatehouse
    const stadium = createStadiumGroup(this.textures);
    stadium.group.position.set(-134, 0, -124);
    this.worldRoot.add(stadium.group);
    this.stadiumFloodlightMats.push(...stadium.floodlightMats);
    this.collisionWorld.addCylinder({
      x: -134,
      z: -124,
      radius: 21.1,
      maxY: 10.2,
      layer: ColliderLayer.BUILDING,
      blocksCamera: true,
    });
    this.addCollider(-138.4, -129.6, -102.9, -99.5, 3.2, ColliderLayer.BUILDING);

    // 11. Tamale International Airport (0, 0, -196)
    const airport = createAirportGroup(this.textures);
    airport.position.set(0, 0, -196);
    this.worldRoot.add(airport);
    this.addCollider(-14, 14, -202.5, -191, 6.2, ColliderLayer.BUILDING);

    // 12. SCCA Tamale & Red Clay Studio Precinct (208, 0, 42), rotY = -PI/2 (faces -X toward Vittin Ring)
    const scca = createSccaRedClayGroup(this.textures);
    scca.position.set(208, 0, 42);
    scca.rotation.y = -Math.PI / 2;
    this.worldRoot.add(scca);
    this.addCollider(206.7, 217.5, 31.8, 52.2, 6.8, ColliderLayer.BUILDING);
    this.collisionWorld.addCylinder({
      x: 201.2,
      z: 48.5,
      radius: 3.1,
      maxY: 2.0,
      layer: ColliderLayer.PROP,
      blocksCamera: false,
    });

    // 13. Kukuo Market & Earthen Pottery Centre (158, 0, 34)
    const kukuo = createKukuoPotteryGroup(this.textures);
    kukuo.position.set(158, 0, 34);
    this.worldRoot.add(kukuo);
    this.addCollider(148.5, 167.5, 26.5, 33);

    // 14. Gunayili Cattle & Timber Market Yard (158, 0, -68)
    const livestock = createLivestockTimberGroup(this.textures);
    livestock.position.set(158, 0, -68);
    this.worldRoot.add(livestock);
    this.addCollider(148.5, 170, -73.5, -62.5);

    // 15. Aboabo Market (-132, 0, 28) & Lamashegu Market Hub (-84, 0, 100) & Kakpagyili Market (32, 0, 158)
    const aboaboMarket = createCentralMarketGroup(this.textures);
    aboaboMarket.position.set(-132, 0, 28);
    aboaboMarket.scale.set(0.9, 1, 0.9);
    this.worldRoot.add(aboaboMarket);
    this.addCollider(-144.5, -119.5, 17.5, 38.5);

    const lamasheguMarket = createCentralMarketGroup(this.textures);
    lamasheguMarket.position.set(-84, 0, 100);
    lamasheguMarket.scale.set(0.84, 1, 0.88);
    this.worldRoot.add(lamasheguMarket);
    this.addCollider(-95.5, -72.5, 89.5, 110.5);

    const kakpagyiliMarket = createCentralMarketGroup(this.textures);
    kakpagyiliMarket.position.set(32, 0, 158);
    kakpagyiliMarket.scale.set(0.82, 1, 0.82);
    this.worldRoot.add(kakpagyiliMarket);
    this.addCollider(20.5, 43.5, 148, 168);

    // 16. Tishigu Community School (34, 0, -70) & Dungu Academic Quarter (-134, 0, 158)
    const school = createSchoolGroup(this.textures);
    school.position.set(34, 0, -70);
    this.worldRoot.add(school);
    this.addCollider(24.5, 43.5, -77, -68);

    const dunguCampus = createSchoolGroup(this.textures);
    dunguCampus.position.set(-134, 0, 158);
    this.worldRoot.add(dunguCampus);
    this.addCollider(-143.5, -124.5, 151, 160);

    // 17. Traditional Dagomba Clay-and-Thatch Compounds across Communities
    const compoundSpecs: Array<[number, number, number]> = [
      [-84, 48, 0],
      [-134, 52, 0],
      [-134, -68, Math.PI],
      [-48, -134, 0],
      [24, 184, Math.PI],
      [48, 184, Math.PI],
      [-134, 184, Math.PI],
      [204, 14, 0],
    ];
    for (const [cx, cz, rot] of compoundSpecs) {
      const comp = createCompoundGroup(this.textures);
      comp.position.set(cx, 0, cz);
      comp.rotation.y = rot;
      this.getSectorFor(cx, cz).add(comp);
      this.addCompoundColliders(cx, cz, rot);
    }

    // 18. Diverse Tamale Residential & Artisan Neighbourhood Architecture (17 Communities)
    const houseSpecs: Array<{
      x: number;
      z: number;
      rotY: number;
      variant: TamaleHouseVariant;
      primary: string;
      accent: string;
      halfW: number;
      halfD: number;
    }> = [
      // Kalpohin & Kalpohin Estates
      { x: 84, z: -120, rotY: 0, variant: "modern_gated", primary: "#d1fae5", accent: "#15803d", halfW: 5.5, halfD: 5.0 },
      { x: 108, z: -120, rotY: 0, variant: "modern_gated", primary: "#fef3c7", accent: "#b45309", halfW: 5.5, halfD: 5.0 },
      { x: 96, z: -140, rotY: Math.PI, variant: "uncompleted_build", primary: "#94a3b8", accent: "#78350f", halfW: 5.2, halfD: 4.0 },
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
      { x: 150, z: 152, rotY: 0, variant: "multi_storey_apt", primary: "#fef3c7", accent: "#0f766e", halfW: 6.2, halfD: 4.2 },
      { x: 170, z: 152, rotY: 0, variant: "uncompleted_build", primary: "#94a3b8", accent: "#78350f", halfW: 5.2, halfD: 4.0 },
      { x: 204, z: 78, rotY: -Math.PI / 2, variant: "modern_gated", primary: "#e0f2fe", accent: "#15803d", halfW: 5.5, halfD: 5.0 },
      // Dungu student hostels
      { x: -182, z: 148, rotY: Math.PI / 2, variant: "multi_storey_apt", primary: "#e0e7ff", accent: "#1e40af", halfW: 6.2, halfD: 4.2 },
    ];

    for (const h of houseSpecs) {
      const mesh = createTamaleHouseVariant(h.variant, this.textures, h.primary, h.accent);
      mesh.position.set(h.x, 0, h.z);
      mesh.rotation.y = h.rotY;
      this.getSectorFor(h.x, h.z).add(mesh);
      this.collisionWorld.addRotatedBox({
        x: h.x,
        z: h.z,
        halfWidth: h.halfW,
        halfLength: h.halfD,
        rotY: h.rotY,
        maxY: h.variant === "multi_storey_apt" ? 7.0 : 4.2,
        layer: ColliderLayer.BUILDING,
        blocksCamera: true,
      });
    }

    // 19. Realistically Signposted Tamale Commercial Shops, Restaurants, Fast Food & Supermarkets
    const shopSpecs: Array<{
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
    }> = [
      { x: -18, z: -13, rotY: 0, w: 8.5, h: 3.9, d: 6.2, wall: "#fef3c7", awning: "#047857", name: "NORTHERN STAR PHARMACY", sub: "GBEWAA HIGH ST · TAMALE" },
      { x: 20, z: -13, rotY: 0, w: 8.5, h: 3.8, d: 6.0, wall: "#e0f2fe", awning: "#b45309", name: "TAMALE MOBILE MONEY", sub: "PROVISIONS & COLD DRINKS" },
      { x: 34, z: -13, rotY: 0, w: 8.5, h: 3.7, d: 6.0, wall: "#ffedd5", awning: "#1d4ed8", name: "DAA WAAKYE & TZ SPOT", sub: "HOT SAƔIM · FRESH KOM", style: "restaurant" },
      { x: 48, z: -13, rotY: 0, w: 8.2, h: 4.0, d: 6.2, wall: "#e2e8f0", awning: "#991b1b", name: "DAGBON HARDWARE", sub: "TOOLS & ZINC ROOFING", style: "mechanic" },
      { x: 68, z: -13, rotY: 0, w: 9.2, h: 4.1, d: 6.4, wall: "#fff1f2", awning: "#dc2626", name: "SAVANNAH FRIED CHICKEN", sub: "BURGERS · JOLLOF · SHAKES", style: "fast_food" },
      { x: -54, z: -13, rotY: 0, w: 10.2, h: 4.3, d: 6.8, wall: "#f8fafc", awning: "#0284c7", name: "TAMALE CENTRAL MART", sub: "SUPERMARKET & COLD STORE", style: "supermarket" },
      { x: 24, z: 14, rotY: Math.PI, w: 8.5, h: 3.8, d: 6.0, wall: "#fae8ff", awning: "#0f766e", name: "ALHASSAN FABRICS", sub: "SMOCKS & WAX PRINTS" },
      { x: 40, z: 14, rotY: Math.PI, w: 8.5, h: 3.8, d: 6.0, wall: "#ecfccb", awning: "#ca8a04", name: "SHEA CO-OP DEPOT", sub: "PURE KPAKPILI & YAM" },
      { x: -20, z: 14, rotY: Math.PI, w: 8.2, h: 3.7, d: 6.0, wall: "#f1f5f9", awning: "#1e40af", name: "SAVANNAH TELECOM", sub: "AIRTIME & REPAIRS" },
      { x: -36, z: 14, rotY: Math.PI, w: 8.2, h: 3.8, d: 6.0, wall: "#fde68a", awning: "#15803d", name: "TISHIGU BAKERY", sub: "BREAD & ROASTED YAM", style: "cafe" },
      { x: -60, z: 14, rotY: Math.PI, w: 8.4, h: 3.8, d: 6.0, wall: "#fef9c3", awning: "#9a3412", name: "NORTHERN TAILORS ROW", sub: "BATAKARI · LEATHER SANDALS" },
      { x: 84, z: -14, rotY: 0, w: 9.5, h: 4.1, d: 6.5, wall: "#f8fafc", awning: "#0369a1", name: "TAMALE ENTERPRISE BANK", sub: "HIGH ST BRANCH & ATM", style: "bank_momo" },
      { x: 102, z: -13, rotY: 0, w: 8.6, h: 3.9, d: 6.0, wall: "#0f172a", awning: "#0284c7", name: "GBEWAA ELECTRONICS HUB", sub: "PHONES · SOLAR · REPAIRS", style: "electronics" },
      { x: 116, z: -13, rotY: 0, w: 8.2, h: 3.7, d: 6.0, wall: "#fff1f2", awning: "#ec4899", name: "TAMALE COOL SCOOP", sub: "ICE CREAM · SMOOTHIES", style: "ice_cream" },
      { x: 52, z: 14, rotY: Math.PI, w: 8.4, h: 3.8, d: 6.0, wall: "#fdf2f8", awning: "#be185d", name: "SAVANNAH BOUTIQUE", sub: "FASHION · COSMETICS · PERFUME", style: "boutique" },
      { x: -82, z: -13, rotY: 0, w: 8.4, h: 3.8, d: 6.0, wall: "#fef3c7", awning: "#7c2d12", name: "NORTHERN FOOTWEAR & BAGS", sub: "SANDALS · SNEAKERS · LEATHER", style: "boutique" },
      { x: -16, z: 42, rotY: Math.PI / 2, w: 8.6, h: 3.8, d: 6.0, wall: "#fffbeb", awning: "#ea580c", name: "GUKPEGU TILAPIA & JOLLOF", sub: "CHARCOAL FISH · BANKU · SOBOLO", style: "restaurant" },
      { x: 112, z: 138, rotY: Math.PI, w: 8.6, h: 3.8, d: 6.2, wall: "#f8fafc", awning: "#0d9488", name: "DABOKPAA HOUSEHOLD MART", sub: "PLASTICS · FLASKS · GROCERIES", style: "supermarket" },
      { x: -18, z: -62, rotY: 0, w: 8.6, h: 3.7, d: 6.4, wall: "#e7e5e4", awning: "#b45309", name: "KALPOHIN BOOKSHOP", sub: "STATIONERY & PRINTS" },
      { x: -120, z: 14, rotY: Math.PI, w: 8.4, h: 3.7, d: 6.0, wall: "#fef3c7", awning: "#b45309", name: "ABOABO CHICHINGA GRILL", sub: "SPICED KEBAB & WAAKYE", style: "restaurant" },
      { x: -116, z: 32, rotY: Math.PI / 2, w: 8.6, h: 3.8, d: 6.0, wall: "#fffbeb", awning: "#b45309", name: "HAJIA MEMUNA TZ & FUFU", sub: "SAƔIM · AYOYO · SOUP", style: "restaurant" },
      { x: -84, z: 142, rotY: 0, w: 8.8, h: 3.8, d: 6.2, wall: "#e2e8f0", awning: "#dc2626", name: "LAMASHEGU SPARE PARTS", sub: "BAJAJ PRAGYA & MOTO", style: "mechanic" },
      { x: 146, z: 14, rotY: Math.PI, w: 8.2, h: 3.7, d: 6.0, wall: "#ffedd5", awning: "#9a3412", name: "KUKUO PROVISIONS", sub: "SHEA BUTTER & GRAINS" },
      { x: 174, z: 6, rotY: Math.PI, w: 8.8, h: 3.9, d: 6.2, wall: "#fff7ed", awning: "#c2410c", name: "VITTIN PIZZA & SUYA BAR", sub: "SMASH BURGERS · GRILL", style: "fast_food" },
      { x: 20, z: -144, rotY: 0, w: 8.6, h: 3.8, d: 6.0, wall: "#f1f5f9", awning: "#0369a1", name: "KANVILLI HIGHWAY MART", sub: "AIRPORT RD FUEL & DRINKS", style: "supermarket" },
      { x: 52, z: -96, rotY: 0, w: 8.4, h: 3.8, d: 6.0, wall: "#fefce8", awning: "#16a34a", name: "KALPOHIN JUICE & PASTRY", sub: "MANGO · BAOBAB · BREAD", style: "cafe" },
      // Enterable Neighbourhood Businesses & Services
      { x: -146, z: -13, rotY: 0, w: 8.4, h: 3.7, d: 6.0, wall: "#f8fafc", awning: "#7c3aed", name: "NYOHINI FADE & BRAIDS", sub: "BARBER & SALON STUDIO", style: "salon" },
      { x: 56, z: 32, rotY: -Math.PI / 2, w: 9.2, h: 4.3, d: 6.6, wall: "#fef3c7", awning: "#0f766e", name: "JUBILEE REST GUEST HOUSE", sub: "COOL ROOMS · OPEN 24H" },
      { x: 150, z: 114, rotY: 0, w: 9.0, h: 3.9, d: 6.2, wall: "#e0f2fe", awning: "#dc2626", name: "SAVANNAH FITNESS & PRINT", sub: "GYM · PHOTOCOPY · DESIGN" },
      { x: 18, z: -32, rotY: Math.PI / 2, w: 8.4, h: 3.8, d: 6.0, wall: "#ecfccb", awning: "#15803d", name: "TISHIGU PHARMACY & BAKERY", sub: "HOT SUGAR BREAD · TONICS", style: "cafe" },
      { x: 86, z: -78, rotY: 0, w: 9.2, h: 3.9, d: 6.4, wall: "#e2e8f0", awning: "#b45309", name: "KALPOHIN HARDWARE & WELDING", sub: "CEMENT · WOOD · STEEL", style: "mechanic" },
      { x: -144, z: 144, rotY: 0, w: 8.8, h: 3.8, d: 6.2, wall: "#eff6ff", awning: "#1d4ed8", name: "DUNGU CAMPUS CAFE & BOOKS", sub: "INTERNET · PRINTS · WAAKYE", style: "cafe" },
      { x: -84, z: -144, rotY: 0, w: 8.8, h: 3.8, d: 6.2, wall: "#fff7ed", awning: "#ea580c", name: "CHOGGU EVENING SPOT", sub: "GRILLED TILAPIA · MUSIC", style: "restaurant" },
    ];

    for (const s of shopSpecs) {
      const shop = createShopBuilding(
        s.w,
        s.h,
        s.d,
        s.wall,
        s.awning,
        s.name,
        s.sub,
        this.textures,
        s.style ?? "default"
      );
      shop.position.set(s.x, 0, s.z);
      shop.rotation.y = s.rotY;
      this.getSectorFor(s.x, s.z).add(shop);
      this.collisionWorld.addRotatedBox({
        x: s.x,
        z: s.z,
        halfWidth: s.w / 2 + 0.28,
        halfLength: s.d / 2 + 0.28,
        rotY: s.rotY,
        maxY: s.h + 0.35,
        layer: ColliderLayer.BUILDING,
        blocksCamera: true,
      });
    }

    // Build exact front-doorway entrance map for all enterable landmarks
    this.registerLandmarkDoorways(shopSpecs);

    // Zebra Crosswalk Markings at major Tamale intersections
    const crosswalkMat = new THREE.MeshStandardMaterial({
      color: "#f8fafc",
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const crosswalkSpots: Array<[number, number, "ew" | "ns"]> = [
      [-12, 0, "ns"], [12, 0, "ns"], [0, -12, "ew"], [0, 12, "ew"],
      [-66, 11, "ew"], [-66, -11, "ew"], [66, 11, "ew"], [66, -11, "ew"],
      [-102, 11, "ew"], [-66, 128 - 9, "ew"],
    ];
    for (const [cx, cz, dir] of crosswalkSpots) {
      const sec = this.getSectorFor(cx, cz);
      for (let i = -3; i <= 3; i++) {
        const stripe = new THREE.Mesh(
          dir === "ns" ? new THREE.PlaneGeometry(1.5, 0.52) : new THREE.PlaneGeometry(0.52, 1.5),
          crosswalkMat
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(
          dir === "ns" ? cx : cx + i * 1.15,
          0.045,
          dir === "ns" ? cz + i * 1.15 : cz
        );
        sec.add(stripe);
      }
    }

    // 20. ECG Utility Poles with Streetlamps + Overhead Power Cables
    const ewPoleXs = [-148, -120, -92, -74, -52, -32, -16, 16, 36, 56, 76, 96, 144, 170];
    let prevEwPole: { x: number; z: number } | null = null;
    for (const lx of ewPoleXs) {
      const pz = -8.2;
      const { group, bulbMat } = createUtilityPoleWithLamp();
      group.position.set(lx, 0, pz);
      this.getSectorFor(lx, pz).add(group);
      this.lampBulbMats.push(bulbMat);
      this.collisionWorld.addCylinder({
        x: lx,
        z: pz,
        radius: 0.28,
        maxY: 6.2,
        layer: ColliderLayer.POLE,
        blocksCamera: false,
      });

      if (prevEwPole && Math.abs(lx - prevEwPole.x) < 32) {
        this.addWireSpan(prevEwPole.x, prevEwPole.z, lx, pz);
      }
      prevEwPole = { x: lx, z: pz };
    }

    const nsPoleZs = [-140, -112, -76, -58, -32, -14, 16, 36, 56, 78, 108, 144];
    let prevNsPole: { x: number; z: number } | null = null;
    for (const lz of nsPoleZs) {
      const px = -7.2;
      const { group, bulbMat } = createUtilityPoleWithLamp();
      group.position.set(px, 0, lz);
      group.rotation.y = Math.PI / 2;
      this.getSectorFor(px, lz).add(group);
      this.lampBulbMats.push(bulbMat);
      this.collisionWorld.addCylinder({
        x: px,
        z: lz,
        radius: 0.28,
        maxY: 6.2,
        layer: ColliderLayer.POLE,
        blocksCamera: false,
      });

      if (prevNsPole && Math.abs(lz - prevNsPole.z) < 34) {
        this.addWireSpan(prevNsPole.x, prevNsPole.z, px, lz);
      }
      prevNsPole = { x: px, z: lz };
    }

    // 21. Authentic Northern Ghana Trees (Baobab, Shea, Mango, Neem) Across All Districts
    const treePlacements: Array<[number, number, "baobab" | "shea" | "neem" | "mango"]> = [
      [-12, -24, "neem"], [14, -26, "shea"], [48, -28, "mango"], [-24, 28, "baobab"],
      [14, 28, "neem"], [56, 34, "shea"], [74, 42, "mango"], [98, 42, "neem"],
      [-76, -24, "baobab"], [-92, -32, "shea"], [-46, 34, "mango"], [-32, 54, "baobab"],
      [14, -64, "neem"], [54, -66, "baobab"], [-96, 28, "neem"],
      [-114, 52, "baobab"], [-150, -74, "shea"], [-50, -112, "neem"], [78, -104, "mango"],
      [144, 52, "shea"], [196, 18, "baobab"], [116, 114, "neem"], [52, 142, "mango"],
      [-114, 146, "baobab"], [-26, -172, "shea"], [26, -172, "neem"],
    ];
    for (const [tx, tz, ttype] of treePlacements) {
      const tree = createTreeMesh(ttype);
      tree.position.set(tx, 0, tz);
      const s = 0.9 + Math.random() * 0.25;
      tree.scale.setScalar(s);
      tree.rotation.y = Math.random() * Math.PI * 2;
      this.getSectorFor(tx, tz).add(tree);
      this.windSwayTrees.push({ group: tree, phase: tx * 0.13 + tz * 0.17 });
      this.collisionWorld.addCylinder({
        x: tx,
        z: tz,
        radius: 0.78,
        maxY: 6.5,
        layer: ColliderLayer.TREE,
        blocksCamera: true,
      });
    }

    // 21b. Authentic Unpaved Sandy/Laterite Neighborhood Side-Lanes
    const dustyLaneMat = new THREE.MeshStandardMaterial({
      map: this.textures.lateriteGround,
      color: "#c87a4a",
      roughness: 0.96,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const dustyLanes: Array<{ x: number; z: number; w: number; d: number }> = [
      { x: -108, z: 56, w: 68, d: 4.6 }, // Compound lane linking Cultural Quarter & Aboabo
      { x: -134, z: 74, w: 4.6, d: 42 }, // Aboabo-Lamashegu dusty link
      { x: 162, z: 14, w: 48, d: 4.5 }, // Kukuo-Vittin east side-lane
      { x: 96, z: -130, w: 62, d: 4.5 }, // Kalpohin Estates unpaved cross-lane
      { x: 36, z: 174, w: 54, d: 4.6 }, // Kakpagyili compound lane
    ];
    for (const lane of dustyLanes) {
      const laneMesh = new THREE.Mesh(new THREE.PlaneGeometry(lane.w, lane.d), dustyLaneMat);
      laneMesh.rotation.x = -Math.PI / 2;
      laneMesh.position.set(lane.x, 0.015, lane.z);
      laneMesh.receiveShadow = true;
      this.getSectorFor(lane.x, lane.z).add(laneMesh);
    }

    // 21c. Roadside Kiosks, Mobile-Money Booths, Charcoal Food Stalls, Phone Carts, Ice Cream & Household Tables
    const stallPlacements: Array<{
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
    }> = [
      { kind: "food_vendor", x: -36, z: -15.5, rotY: 0, color: "#dc2626" },
      { kind: "food_vendor", x: 34, z: -10.8, rotY: 0, color: "#eab308" },
      { kind: "food_vendor", x: -120, z: 11.2, rotY: Math.PI, color: "#ea580c" },
      { kind: "food_vendor", x: -84, z: 109.5, rotY: 0, color: "#b45309" },
      { kind: "food_vendor", x: -84, z: -140.5, rotY: 0, color: "#ea580c" },
      { kind: "food_vendor", x: -144, z: 140.5, rotY: 0, color: "#15803d" },
      { kind: "food_vendor", x: -10.8, z: 42, rotY: Math.PI / 2, color: "#ea580c" },
      { kind: "mobile_money", x: 12, z: -10.2, rotY: 0, color: "#facc15" },
      { kind: "mobile_money", x: -24, z: 10.6, rotY: Math.PI, color: "#ef4444" },
      { kind: "mobile_money", x: -72, z: 10.4, rotY: Math.PI, color: "#0284c7" },
      { kind: "mobile_money", x: 91, z: -10.2, rotY: 0, color: "#facc15" },
      { kind: "kiosk", x: -56, z: 11.5, rotY: Math.PI, color: "#0284c7" },
      { kind: "kiosk", x: 56, z: -11.5, rotY: 0, color: "#0f766e" },
      { kind: "kiosk", x: -140, z: -12, rotY: 0, color: "#d97706" },
      { kind: "kiosk", x: 138, z: 12, rotY: Math.PI, color: "#15803d" },
      { kind: "kiosk", x: 38, z: 146, rotY: 0, color: "#0369a1" },
      { kind: "accessories_cart", x: -12, z: 9.8, rotY: Math.PI, color: "#facc15" },
      { kind: "accessories_cart", x: -50, z: -10.4, rotY: 0, color: "#0284c7" },
      { kind: "accessories_cart", x: 106, z: -9.8, rotY: 0, color: "#0284c7" },
      { kind: "cloth_table", x: -42, z: -16.2, rotY: 0, color: "#be123c" },
      { kind: "cloth_table", x: -124, z: 15.8, rotY: Math.PI, color: "#1d4ed8" },
      { kind: "cloth_table", x: 48, z: 10.2, rotY: Math.PI, color: "#be185d" },
      { kind: "corn_grill", x: 16, z: -10.2, rotY: 0, color: "#ea580c" },
      { kind: "corn_grill", x: -78, z: 108, rotY: 0, color: "#f59e0b" },
      { kind: "corn_grill", x: 90, z: 100, rotY: Math.PI, color: "#dc2626" },
      { kind: "corn_grill", x: -128, z: -100, rotY: 0, color: "#ea580c" },
      { kind: "ice_cream_cart", x: 112, z: -9.5, rotY: 0, color: "#ec4899" },
      { kind: "ice_cream_cart", x: 32, z: -56, rotY: 0, color: "#0284c7" },
      { kind: "ice_cream_cart", x: -136, z: 140, rotY: 0, color: "#f59e0b" },
      { kind: "household_table", x: -48, z: -41, rotY: Math.PI, color: "#0d9488" },
      { kind: "household_table", x: 112, z: 134, rotY: Math.PI, color: "#0284c7" },
    ];
    for (const sp of stallPlacements) {
      const built = createRoadsideStallMesh(sp.kind, sp.color, this.textures);
      built.group.position.set(sp.x, 0, sp.z);
      built.group.rotation.y = sp.rotY;
      this.getSectorFor(sp.x, sp.z).add(built.group);
      if (built.emberMat) {
        this.emberMats.push(built.emberMat);
      }
      this.collisionWorld.addRotatedBox({
        x: sp.x,
        z: sp.z,
        halfWidth: 1.18,
        halfLength: 0.92,
        rotY: sp.rotY,
        maxY: 2.35,
        layer: ColliderLayer.PROP,
        blocksCamera: false,
      });
    }

    // 21c-1. Tamale Street Direction Signs, Speed Humps & Planters/Waste Bins
    const directionSignSpecs: Array<{
      x: number;
      z: number;
      rotY: number;
      title: string;
      sub: string;
      bg?: string;
    }> = [
      { x: 11, z: -10.5, rotY: -Math.PI / 4, title: "<- CENTRAL MARKET", sub: "AIRPORT N10 ->", bg: "#065f46" },
      { x: -11, z: 10.5, rotY: (3 * Math.PI) / 4, title: "<- ABOABO / STADIUM", sub: "MOSQUE / SALAGA ->", bg: "#065f46" },
      { x: -60, z: -10.2, rotY: 0, title: "CENTRAL MARKET", sub: "DAKPEMA PALACE ^", bg: "#047857" },
      { x: 72, z: 10.2, rotY: Math.PI, title: "JUBILEE PARK", sub: "TEACHING HOSPITAL ->", bg: "#0369a1" },
      { x: -96, z: 118, rotY: Math.PI / 2, title: "LAMASHEGU HUB", sub: "<- DUNGU | SALAGA ->", bg: "#065f46" },
      { x: 120, z: 120, rotY: -Math.PI / 2, title: "TEACHING HOSPITAL", sub: "DABOKPAA / VITTIN ->", bg: "#0f766e" },
    ];
    for (const ds of directionSignSpecs) {
      const sign = createStreetDirectionSignMesh(ds.title, ds.sub, ds.bg);
      sign.position.set(ds.x, 0, ds.z);
      sign.rotation.y = ds.rotY;
      this.getSectorFor(ds.x, ds.z).add(sign);
      this.collisionWorld.addCylinder({
        x: ds.x,
        z: ds.z,
        radius: 0.22,
        maxY: 2.8,
        layer: ColliderLayer.POLE,
        blocksCamera: false,
      });
    }

    const speedHumpSpecs: Array<{ x: number; z: number; rotY: number; w?: number }> = [
      { x: -24, z: 0, rotY: Math.PI / 2, w: 12 },
      { x: 30, z: -48, rotY: Math.PI / 2, w: 8.5 },
      { x: -115, z: 0, rotY: Math.PI / 2, w: 12 },
      { x: -84, z: 128, rotY: Math.PI / 2, w: 9.2 },
      { x: 86, z: 128, rotY: Math.PI / 2, w: 9.2 },
      { x: 0, z: 24, rotY: 0, w: 10.5 },
    ];
    for (const sh of speedHumpSpecs) {
      const hump = createSpeedHumpMesh(sh.w ?? 9.0);
      hump.position.set(sh.x, 0, sh.z);
      hump.rotation.y = sh.rotY;
      this.getSectorFor(sh.x, sh.z).add(hump);
    }

    const planterBinSpecs: Array<[number, number, boolean]> = [
      [-15, -9.6, true], [15, 9.6, true], [44, -9.8, false], [74, 9.8, true],
      [88, 12, true], [104, -9.8, false], [-44, 9.6, false], [-78, -9.8, true],
      [92, 114, true], [-134, -104, false],
    ];
    for (const [px, pz, hasPlant] of planterBinSpecs) {
      const prop = createRoadsidePlanterBinMesh(hasPlant);
      prop.position.set(px, 0, pz);
      this.getSectorFor(px, pz).add(prop);
      this.collisionWorld.addCylinder({
        x: px,
        z: pz,
        radius: hasPlant ? 0.52 : 0.34,
        maxY: 1.05,
        layer: ColliderLayer.PROP,
        blocksCamera: false,
      });
    }

    const benchPlacements: Array<[number, number, number]> = [
      [-14, -10.2, 0],
      [28, 10.8, Math.PI],
      [-40, 10.8, Math.PI],
      [-80, 40, 0],
      [-126, 44, 0],
      [42, -110, Math.PI],
      [92, -110, Math.PI],
      [148, 22, 0],
      [24, 174, 0],
      [84, 36, 0],
      [-84, -138, 0],
      [115, -9.8, 0],
      [-11.2, 46, Math.PI / 2],
    ];
    for (const [bx, bz, brot] of benchPlacements) {
      const bench = createRoadsideBenchMesh(this.textures);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = brot;
      this.getSectorFor(bx, bz).add(bench);
      this.collisionWorld.addRotatedBox({
        x: bx,
        z: bz,
        halfWidth: 1.05,
        halfLength: 0.4,
        rotY: brot,
        maxY: 0.95,
        layer: ColliderLayer.PROP,
        blocksCamera: false,
      });
    }

    // 21c-2. Nightlife String Bulbs & Dynamic Light Anchor Spots Across Tamale Night Hubs
    const nightStringSpots: Array<{ x: number; z: number; color: number }> = [
      { x: 34, z: -9.2, color: 0xffa73b },    // Daa Waakye & Night Lounge
      { x: 38, z: -9.2, color: 0xffb347 },
      { x: 20, z: -9.2, color: 0xfde047 },    // Gbewaa Mobile Money & Pharmacy frontage
      { x: -120, z: 9.8, color: 0xfb923c },   // Aboabo Chichinga Grill
      { x: -84, z: 111, color: 0xffa73b },    // Lamashegu evening chop bar
      { x: 86, z: 36, color: 0xfacc15 },      // Jubilee evening plaza
      { x: -84, z: -139, color: 0xfb923c },   // Choggu Evening Spot & Grill
      { x: -144, z: 139, color: 0x38bdf8 },   // Dungu Student Hub Café
      { x: 52, z: 32, color: 0xfde047 },      // Jubilee Rest Guest House entrance
      { x: 116, z: -9.2, color: 0xf472b6 },   // Tamale Cool Scoop Ice Cream Bar
      { x: -10.5, z: 42, color: 0xfb923c },   // Gukpegu Grilled Tilapia Spot
      { x: 52, z: 9.8, color: 0xf472b6 },     // Savannah Glamour Boutique
    ];
    for (const spot of nightStringSpots) {
      const bulbMat = new THREE.MeshStandardMaterial({
        color: "#fef08a",
        emissive: "#f59e0b",
        emissiveIntensity: 0.15,
        roughness: 0.35,
      });
      this.nightlifeMats.push(bulbMat);
      this.nightSpotCoords.push({ x: spot.x, y: 3.5, z: spot.z, color: spot.color });
      const sector = this.getSectorFor(spot.x, spot.z);
      for (const ox of [-1.2, 0, 1.2]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), bulbMat);
        bulb.position.set(spot.x + ox, 3.15, spot.z);
        sector.add(bulb);
      }
    }

    // 21d. Parked Street Motorcycles Outside Shops, Markets, Ranks & Compounds
    const parkedMotos: Array<[number, number, number, string]> = [
      [-23, -10.5, 0.4, "#dc2626"],
      [-45, -13.5, -0.3, "#1d4ed8"],
      [23, 10.5, Math.PI - 0.3, "#15803d"],
      [43, -10.2, 0.25, "#18181b"],
      [-76, 15, 1.2, "#b45309"],
      [-122, 10.6, -0.4, "#dc2626"],
      [-92, 134, 0.6, "#0284c7"],
      [82, -10.8, -0.2, "#1e3a8a"],
      [144, 10.4, Math.PI + 0.2, "#ca8a04"],
      [28, -114, 0.3, "#dc2626"],
      // Expanded neighbourhood motorcycle ranks (Nyohini, Stadium, Airport, Dungu, Choggu, Kukuo, Hospital)
      [-142, -10.2, -0.2, "#7c3aed"],
      [-128, -101, 0.35, "#dc2626"],
      [12, -184, 0.1, "#0284c7"],
      [-140, 141, -0.5, "#1d4ed8"],
      [-78, -141, 0.4, "#ea580c"],
      [154, 24, 0.2, "#15803d"],
      [82, 104, -0.3, "#1e293b"],
      [54, 28, Math.PI / 2, "#b45309"],
    ];
    for (const [mx, mz, mrot, col] of parkedMotos) {
      const moto = createMotorcycleMesh(col, this.textures);
      moto.group.position.set(mx, 0, mz);
      moto.group.rotation.y = mrot;
      this.getSectorFor(mx, mz).add(moto.group);
      this.collisionWorld.addRotatedBox({
        x: mx,
        z: mz,
        halfWidth: 0.46,
        halfLength: 0.98,
        rotY: mrot,
        maxY: 1.25,
        layer: ColliderLayer.PROP,
        blocksCamera: false,
      });
    }

    // 22. InstancedMesh Savannah Grass Tufts & Horizon Perimeter Groves
    const tuftGeo = new THREE.ConeGeometry(0.42, 0.72, 5);
    tuftGeo.translate(0, 0.36, 0);
    const tuftMat = new THREE.MeshStandardMaterial({ color: "#7d8c38", roughness: 0.92 });
    const tuftCount = 340;
    const tuftMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
    let idx = 0;
    for (let i = 0; i < tuftCount; i++) {
      const angle = (i / tuftCount) * Math.PI * 2 * 9;
      const radius = 20 + (i / tuftCount) * 205;
      const gx = Math.cos(angle) * radius;
      const gz = Math.sin(angle) * radius;
      const onRoad =
        Math.abs(gx) < 9 ||
        Math.abs(gz) < 9 ||
        Math.abs(gx - 66) < 7 ||
        Math.abs(gx + 66) < 7 ||
        Math.abs(gx + 102) < 7 ||
        Math.abs(gx + 162) < 7 ||
        Math.abs(gx - 128) < 7 ||
        Math.abs(gx - 186) < 7 ||
        Math.abs(gz + 48) < 7 ||
        Math.abs(gz + 92) < 7 ||
        Math.abs(gz + 158) < 7 ||
        Math.abs(gz - 66) < 7 ||
        Math.abs(gz - 128) < 7;
      _dummyObj.position.set(gx, onRoad ? -6 : 0, gz);
      const scale = 0.72 + (i % 5) * 0.14;
      _dummyObj.scale.set(scale, scale, scale);
      _dummyObj.rotation.y = i * 0.7;
      _dummyObj.updateMatrix();
      tuftMesh.setMatrixAt(idx, _dummyObj.matrix);
      tuftMesh.setColorAt(idx, new THREE.Color(i % 2 === 0 ? "#84923a" : "#9c8f43"));
      idx++;
    }
    tuftMesh.instanceMatrix.needsUpdate = true;
    if (tuftMesh.instanceColor) tuftMesh.instanceColor.needsUpdate = true;
    tuftMesh.computeBoundingSphere();
    this.worldRoot.add(tuftMesh);

    const perimGeo = new THREE.DodecahedronGeometry(3.8, 1);
    const perimMat = new THREE.MeshStandardMaterial({ color: "#4b6b2d", roughness: 0.9 });
    const perimCount = 96;
    const perimMesh = new THREE.InstancedMesh(perimGeo, perimMat, perimCount);
    for (let i = 0; i < perimCount; i++) {
      const ang = (i / perimCount) * Math.PI * 2;
      const dist = 240 + (i % 4) * 16;
      _dummyObj.position.set(Math.cos(ang) * dist, 2.4, Math.sin(ang) * dist);
      const sc = 0.85 + (i % 3) * 0.25;
      _dummyObj.scale.set(sc * 1.2, sc * 0.9, sc * 1.2);
      _dummyObj.updateMatrix();
      perimMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    perimMesh.instanceMatrix.needsUpdate = true;
    perimMesh.computeBoundingSphere();
    this.worldRoot.add(perimMesh);

    // 22b. Tamale Transport Ranks / Bus Shelters, Road Surface Patches, Drainage Culverts & Solar/Water Polytanks
    const busStops: Array<[number, number, number, string, string]> = [
      [14, -9.8, 0, "INTERCHANGE EAST", "#0284c7"],
      [-28, -9.8, 0, "CENTRAL MARKET", "#eab308"],
      [-114, 9.8, Math.PI, "ABOABO RANK", "#15803d"],
      [-76, 118, Math.PI / 2, "LAMASHEGU HUB", "#0284c7"],
      [78, 118, -Math.PI / 2, "HOSPITAL GATE", "#dc2626"],
      [-128, 146, 0, "UDS DUNGU STOP", "#1d4ed8"],
    ];
    for (const [bx, bz, brot, lbl, col] of busStops) {
      const shelter = createBusStopShelterMesh(lbl, col);
      shelter.position.set(bx, 0, bz);
      shelter.rotation.y = brot;
      this.getSectorFor(bx, bz).add(shelter);
      // Physical bench & shelter posts at back of shelter (-0.38m in shelter local Z)
      const sinR = Math.sin(brot);
      const cosR = Math.cos(brot);
      this.collisionWorld.addRotatedBox({
        x: bx - 0.38 * sinR,
        z: bz - 0.38 * cosR,
        halfWidth: 1.88,
        halfLength: 0.45,
        rotY: brot,
        maxY: 2.55,
        layer: ColliderLayer.PROP,
        blocksCamera: true,
      });
    }

    const patchCulvertSpecs: Array<[number, number, number, "asphalt_patch" | "concrete_culvert"]> = [
      [-55, 0, 0.2, "asphalt_patch"],
      [42, 0, -0.1, "asphalt_patch"],
      [0, 62, Math.PI / 2, "asphalt_patch"],
      [-66, -34, Math.PI / 2, "asphalt_patch"],
      [-102, 48, 0, "concrete_culvert"],
      [66, -78, 0, "concrete_culvert"],
      [128, 18, Math.PI / 2, "concrete_culvert"],
      [-134, 128, 0, "concrete_culvert"],
    ];
    for (const [px, pz, prot, kind] of patchCulvertSpecs) {
      const mesh = createSurfacePatchAndCulvertMesh(kind);
      mesh.position.set(px, 0, pz);
      mesh.rotation.y = prot;
      this.getSectorFor(px, pz).add(mesh);
    }

    const solarPolytankSpots: Array<[number, number, number, boolean]> = [
      [84, 4.1, -14, true],
      [102, 3.9, -13, true],
      [-54, 4.3, -13, true],
      [56, 4.3, 32, false],
      [84, 3.8, -120, true],
      [24, 5.4, -120, false],
    ];
    for (const [rx, ry, rz, withSolar] of solarPolytankSpots) {
      const addon = createPolytankAndSolarAddon(withSolar);
      addon.position.set(rx, ry, rz);
      this.getSectorFor(rx, rz).add(addon);
    }

    // 23. Delivery Errand & City Gig Beacons
    this.deliveryBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#f59e0b",
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.deliveryBeacon.visible = false;
    this.worldRoot.add(this.deliveryBeacon);

    this.gigBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 15, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.gigBeacon.visible = false;
    this.worldRoot.add(this.gigBeacon);

    // Waiting 3D gig passenger actor (visible when active transport_passenger task awaits pickup)
    this.gigPassengerRig = createCharacterRig(
      {
        outfit: "casual",
        headwear: "kufi",
        primaryColor: "#eab308",
        accentColor: "#0f172a",
        skinTone: "#62381f",
      },
      this.textures
    );
    this.gigPassengerRig.root.visible = false;
    this.worldRoot.add(this.gigPassengerRig.root);
  }

  private buildCityEventProps() {
    const poleMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.5, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.78, side: THREE.DoubleSide });
    const emeraldCanopyMat = new THREE.MeshStandardMaterial({ color: "#047857", roughness: 0.78, side: THREE.DoubleSide });
    const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.9 });
    const torchGlowMat = new THREE.MeshStandardMaterial({
      color: "#fef08a",
      emissive: "#f97316",
      emissiveIntensity: 2.4,
      roughness: 0.3,
    });

    // 1. Damba Festival: ceremonial canopies & batakari drummers at Dakpema Palace (-34, -56) & Jubilee Park (86, 44)
    const dambaGroup = new THREE.Group();
    dambaGroup.visible = false;
    for (const [cx, cz, mat] of [
      [-34, -56, canopyMat] as const,
      [-43, -58, emeraldCanopyMat] as const,
      [79, 44, canopyMat] as const,
      [93, 44, emeraldCanopyMat] as const,
    ]) {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.1, 4), mat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(cx, 3.1, cz);
      dambaGroup.add(roof);
      for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6), poleMat);
        leg.position.set(cx + ox, 1.35, cz + oz);
        dambaGroup.add(leg);
      }
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 10), woodMat);
      drum.position.set(cx, 0.45, cz);
      dambaGroup.add(drum);
      const dancer = createCharacterRig(
        { outfit: "batakari", headwear: "kufi", primaryColor: "#1e3a5f", accentColor: "#f59e0b", skinTone: "#62381f" },
        this.textures
      );
      dancer.root.position.set(cx + 0.9, 0, cz + 0.8);
      dambaGroup.add(dancer.root);
    }
    this.worldRoot.add(dambaGroup);
    this.eventGroups.set("damba_festival", dambaGroup);

    // 2. Bugum Chugu: respectful evening torchlight clusters at Dakpema Palace & Cultural Quarter
    const bugumGroup = new THREE.Group();
    bugumGroup.visible = false;
    for (const [bx, bz] of [
      [-38, -56], [-30, -56], [-34, -53], [-78, 32], [-86, 32], [86, 36],
    ]) {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.1, 8), woodMat);
      stand.position.set(bx, 0.55, bz);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), torchGlowMat);
      flame.position.set(bx, 1.25, bz);
      bugumGroup.add(stand, flame);
    }
    this.worldRoot.add(bugumGroup);
    this.eventGroups.set("bugum_chugu", bugumGroup);

    // 3. Eid Celebration: respectful congregation mats & festive families around Central Mosque (20, 46) & Jubilee Park (86, 44)
    const eidGroup = new THREE.Group();
    eidGroup.visible = false;
    const matCarpet = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.9 });
    for (const [mx, mz] of [[18, 46], [86, 52], [80, 52]]) {
      const prayerMat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 2.8), matCarpet);
      prayerMat.position.set(mx, 0.03, mz);
      eidGroup.add(prayerMat);
      const visitor = createCharacterRig(
        { outfit: "batakari", headwear: "kufi", primaryColor: "#f8fafc", accentColor: "#15803d", skinTone: "#5c341b" },
        this.textures
      );
      visitor.root.position.set(mx + 1.2, 0, mz + 1.8);
      eidGroup.add(visitor.root);
    }
    this.worldRoot.add(eidGroup);
    this.eventGroups.set("eid_celebration", eidGroup);

    // 4. Ramadan Evening: warm Iftar hospitality tables & glowing lamps along Gukpegu Rd & Aboabo
    const ramadanGroup = new THREE.Group();
    ramadanGroup.visible = false;
    for (const [rx, rz] of [[16, 34], [-116, 18], [16, -15]]) {
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.2), woodMat);
      table.position.set(rx, 0.39, rz);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), torchGlowMat);
      lantern.position.set(rx, 0.95, rz);
      ramadanGroup.add(table, lantern);
    }
    this.worldRoot.add(ramadanGroup);
    this.eventGroups.set("ramadan_evening", ramadanGroup);

    // 5. Market Peak: extra colorful umbrellas & cargo stalls by Central & Aboabo markets
    const marketGroup = new THREE.Group();
    marketGroup.visible = false;
    for (const [mx, mz, col] of [
      [-26, -24, "#dc2626"], [-26, -30, "#eab308"], [-116, 24, "#1d4ed8"], [78, 46, "#ea580c"],
    ] as const) {
      const umb = new THREE.Mesh(
        new THREE.ConeGeometry(1.9, 0.7, 8),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.78, side: THREE.DoubleSide })
      );
      umb.position.set(mx, 2.8, mz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 8), poleMat);
      pole.position.set(mx, 1.35, mz);
      marketGroup.add(umb, pole);
    }
    this.worldRoot.add(marketGroup);
    this.eventGroups.set("market_peak", marketGroup);

    // 6. Stadium Matchday: cheering fan group outside Aliu Mahama Stadium gate (-134, -97)
    const matchGroup = new THREE.Group();
    matchGroup.visible = false;
    for (let i = 0; i < 4; i++) {
      const fan = createCharacterRig(
        { outfit: "polo", headwear: "none", primaryColor: i % 2 === 0 ? "#dc2626" : "#eab308", accentColor: "#ffffff", skinTone: "#62381f" },
        this.textures
      );
      fan.root.position.set(-138 + i * 2.5, 0, -96.5);
      matchGroup.add(fan.root);
    }
    this.worldRoot.add(matchGroup);
    this.eventGroups.set("stadium_match", matchGroup);
  }

  public setActiveCityEvent(mode: ActiveCityEventMode) {
    this.activeCityEvent = mode;
    for (const [key, grp] of this.eventGroups.entries()) {
      grp.visible = key === mode;
    }
    const floodIntensity = mode === "stadium_match" ? 2.8 : 0.22;
    for (const mat of this.stadiumFloodlightMats) {
      mat.emissiveIntensity = floodIntensity;
    }
  }

  public getActiveCityEvent(): ActiveCityEventMode {
    return this.activeCityEvent;
  }

  private addCollider(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    maxY = 5.0,
    layer: number = ColliderLayer.BUILDING,
    blocksCamera = true
  ) {
    this.collisionWorld.addBox({ minX, maxX, minZ, maxZ, minY: 0, maxY, layer, blocksCamera });
  }

  private addCompoundColliders(cx: number, cz: number, rot: number) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const toWorld = (lx: number, lz: number) => ({
      x: cx + lx * c + lz * s,
      z: cz - lx * s + lz * c,
    });
    // Back & left perimeter earth walls (courtyard entrance stays open!)
    const backP = toWorld(0, -7.2);
    this.collisionWorld.addRotatedBox({
      x: backP.x,
      z: backP.z,
      halfWidth: 8.0,
      halfLength: 0.3,
      rotY: rot,
      maxY: 1.9,
      layer: ColliderLayer.WALL,
      blocksCamera: true,
    });
    const leftP = toWorld(-7.6, -0.2);
    this.collisionWorld.addRotatedBox({
      x: leftP.x,
      z: leftP.z,
      halfWidth: 0.3,
      halfLength: 7.0,
      rotY: rot,
      maxY: 1.9,
      layer: ColliderLayer.WALL,
      blocksCamera: true,
    });
    // Three circular clay-and-thatch huts inside the compound
    for (const [hx, hz, r] of [
      [-4.2, -3.5, 2.68],
      [1.6, -4.1, 2.48],
      [5.8, -1.6, 2.58],
    ]) {
      const hp = toWorld(hx, hz);
      this.collisionWorld.addCylinder({
        x: hp.x,
        z: hp.z,
        radius: r,
        maxY: 3.4,
        layer: ColliderLayer.BUILDING,
        blocksCamera: true,
      });
    }
    // Rectangular zinc extension room + firewood stack
    const modP = toWorld(-4.0, 3.4);
    this.collisionWorld.addRotatedBox({
      x: modP.x,
      z: modP.z,
      halfWidth: 2.75,
      halfLength: 2.15,
      rotY: rot,
      maxY: 3.0,
      layer: ColliderLayer.BUILDING,
      blocksCamera: true,
    });
    const woodP = toWorld(0.8, 2.2);
    this.collisionWorld.addCylinder({
      x: woodP.x,
      z: woodP.z,
      radius: 0.72,
      maxY: 0.65,
      layer: ColliderLayer.PROP,
      blocksCamera: false,
    });
  }

  private registerLandmarkDoorways(
    shopSpecs: Array<{ x: number; z: number; rotY: number; w: number; h: number; d: number }>
  ) {
    const manualDoors: Record<
      string,
      { doorX: number; doorZ: number; normalX: number; normalZ: number; triggerRadius: number }
    > = {
      central_market: { doorX: -44, doorZ: -18.0, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
      central_mosque: { doorX: 34, doorZ: 53.8, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
      dakpema_palace: { doorX: -34, doorZ: -66.2, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
      aboabo_market: { doorX: -132, doorZ: 38.8, normalX: 0, normalZ: 1, triggerRadius: 3.4 },
      lamashegu_market_hub: { doorX: -84, doorZ: 110.8, normalX: 0, normalZ: 1, triggerRadius: 3.4 },
      kukuo_market_pottery: { doorX: 158, doorZ: 33.4, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
      tamale_teaching_hospital: { doorX: 96, doorZ: 107.2, normalX: 0, normalZ: 1, triggerRadius: 3.4 },
      aliu_mahama_stadium: { doorX: -134, doorZ: -99.3, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
      scca_red_clay: { doorX: 206.4, doorZ: 42, normalX: -1, normalZ: 0, triggerRadius: 3.2 },
      cultural_centre: { doorX: -84, doorZ: 28.2, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
      kalpohin_compounds: { doorX: -88, doorZ: 53.7, normalX: 0, normalZ: 1, triggerRadius: 3.2 },
    };

    const matGeo = new THREE.BoxGeometry(1.75, 0.04, 0.85);
    const matMaterial = new THREE.MeshStandardMaterial({
      color: "#d97706",
      roughness: 0.72,
    });

    for (const lm of TAMALE_LANDMARKS) {
      if (!lm.enterable) continue;
      let spec = manualDoors[lm.id];
      if (!spec) {
        // Match closest shop building mesh so front doorway matches visual door + rotY
        let bestShop: (typeof shopSpecs)[number] | null = null;
        let bestDist = 4.0;
        for (const s of shopSpecs) {
          const d = Math.hypot(s.x - lm.x, s.z - lm.z);
          if (d < bestDist) {
            bestDist = d;
            bestShop = s;
          }
        }
        if (bestShop) {
          const nx = Math.sin(bestShop.rotY);
          const nz = Math.cos(bestShop.rotY);
          spec = {
            doorX: bestShop.x + nx * (bestShop.d / 2 + 0.55),
            doorZ: bestShop.z + nz * (bestShop.d / 2 + 0.55),
            normalX: nx,
            normalZ: nz,
            triggerRadius: 2.75,
          };
        } else {
          spec = { doorX: lm.x, doorZ: lm.z + 3.2, normalX: 0, normalZ: 1, triggerRadius: 3.0 };
        }
      }

      this.doorways.push({
        landmarkId: lm.id,
        name: lm.name,
        dagbaniLabel: lm.dagbaniLabel,
        doorX: spec.doorX,
        doorZ: spec.doorZ,
        normalX: spec.normalX,
        normalZ: spec.normalZ,
        triggerRadius: spec.triggerRadius,
        shopId: lm.shopId,
      });

      // Subtle physical doorway welcome mat / threshold stone on the ground
      const matMesh = new THREE.Mesh(matGeo, matMaterial);
      matMesh.position.set(
        spec.doorX + spec.normalX * 0.25,
        0.025,
        spec.doorZ + spec.normalZ * 0.25
      );
      matMesh.rotation.y = Math.atan2(spec.normalX, spec.normalZ);
      this.getSectorFor(spec.doorX, spec.doorZ).add(matMesh);
    }
  }

  private getDynamicVehicles(includeActiveService = true): DynamicVehicleObstacle[] {
    this.dynamicVehicleBuf.length = 0;
    for (const dv of this.drivables) {
      const isMoto = dv.kind === "motorcycle";
      this.dynamicVehicleBuf.push({
        id: dv.id,
        x: dv.x,
        z: dv.z,
        rotY: dv.rotY,
        halfWidth: isMoto ? 0.45 : 0.84,
        halfLength: isMoto ? 1.0 : 1.48,
        height: isMoto ? 1.25 : 1.85,
        isActive: true,
      });
    }
    for (let i = 0; i < this.traffic.length; i++) {
      const tv = this.traffic[i];
      if (!tv.group.visible) continue;
      const isTwoWheel = tv.kind === "moto" || tv.kind === "bicycle";
      const isCar = tv.kind === "car" || tv.kind === "taxi";
      this.dynamicVehicleBuf.push({
        id: `traffic_${i}`,
        x: tv.x,
        z: tv.z,
        rotY: tv.rotY,
        halfWidth: isTwoWheel ? 0.44 : isCar ? 0.96 : 0.82,
        halfLength: isTwoWheel ? 0.98 : isCar ? 2.1 : 1.52,
        height: isTwoWheel ? 1.35 : isCar ? 1.55 : 1.9,
        isActive: true,
      });
    }
    if (includeActiveService && this.activeService) {
      const srv = this.activeService;
      const isTaxi = srv.request.kind === "taxi_ride";
      const isMoto =
        srv.request.kind === "moto_ride" ||
        srv.request.kind === "food_delivery" ||
        srv.request.kind === "parcel_delivery" ||
        srv.request.kind === "roadside_repair" ||
        srv.request.kind === "personal_errand";
      this.dynamicVehicleBuf.push({
        id: `service_${srv.request.id}`,
        x: srv.x,
        z: srv.z,
        rotY: srv.rotY,
        halfWidth: isMoto ? 0.44 : isTaxi ? 0.96 : 0.82,
        halfLength: isMoto ? 1.0 : isTaxi ? 2.1 : 1.5,
        height: isMoto ? 1.35 : isTaxi ? 1.55 : 1.9,
        isActive: !this.servicePassengerRiding,
      });
    }
    return this.dynamicVehicleBuf;
  }

  private buildPlayer(cust: PlayerCustomization) {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
    }
    this.playerRig = createCharacterRig(
      {
        outfit: cust.outfit,
        headwear: cust.headwear,
        hairstyle: cust.hairstyle,
        primaryColor: cust.primaryColor,
        accentColor: cust.accentColor,
        skinTone: cust.skinTone,
        ownShadowMaterial: true,
      },
      this.textures
    );
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerRotY;
    this.scene.add(this.playerRig.root);
  }

  public updatePlayerCustomization(cust: PlayerCustomization) {
    this.currentCustomization = cust;
    this.buildPlayer(cust);
  }

  private buildNpcs() {
    this.npcController = new NpcScheduleController(
      (x, z, r) => this.resolveCollisions(x, z, r),
      (x, z, dx, dz, lookahead, r) =>
        this.collisionWorld.probeAhead(
          x,
          z,
          dx,
          dz,
          lookahead,
          r,
          COLLIDER_MASK_ALL_WITH_VEHICLES,
          this.getDynamicVehicles()
        )
    );
    for (const profile of TAMALE_NPCS) {
      const rig = createCharacterRig(
        {
          outfit: profile.id === "alhassan_weaver" ? "batakari" : profile.id === "mama_fati" ? "kaba" : "casual",
          headwear: profile.headwear,
          primaryColor: profile.outfitColor,
          accentColor: profile.accentColor,
          skinTone: profile.skinTone,
        },
        this.textures
      );
      this.worldRoot.add(rig.root);
      this.npcController.registerNpc(profile, rig);
    }
    this.npcController.initializeAtTime(this.gameMinutes);

    // Inactive playable Tamale residents remain alive at their work stations when not controlled
    for (const pc of PLAYABLE_CHARACTERS) {
      const rig = createCharacterRig(
        {
          outfit: pc.customization.outfit,
          headwear: pc.customization.headwear,
          hairstyle: pc.customization.hairstyle,
          primaryColor: pc.customization.primaryColor,
          accentColor: pc.customization.accentColor,
          skinTone: pc.customization.skinTone,
        },
        this.textures
      );
      rig.root.position.set(pc.spawnPos.x, 0, pc.spawnPos.z);
      rig.root.rotation.y = pc.spawnPos.rotY;
      rig.root.visible = pc.id !== this.activePlayableId;
      this.worldRoot.add(rig.root);
      this.ambientPlayableCharacters.push({ id: pc.id, rig });
    }
  }

  private buildLandmarkLabels() {
    this.worldRoot.add(this.labelGroup);

    const accentForType = (type: string): string => {
      switch (type) {
        case "market":
          return "#f59e0b";
        case "mosque":
          return "#10b981";
        case "hospital":
          return "#ef4444";
        case "stadium":
          return "#3b82f6";
        case "airport":
          return "#38bdf8";
        case "palace":
          return "#eab308";
        case "school":
          return "#14b8a6";
        case "art_centre":
        case "cultural":
          return "#f97316";
        default:
          return "#fbbf24";
      }
    };

    const heightForLandmark = (id: string): number => {
      switch (id) {
        case "central_mosque":
          return 16.6;
        case "aliu_mahama_stadium":
          return 15.5;
        case "tamale_airport":
          return 15.0;
        case "tamale_teaching_hospital":
          return 14.2;
        case "jubilee_park":
          return 13.0;
        case "tamale_interchange":
          return 10.6;
        case "scca_red_clay":
          return 9.2;
        case "dakpema_palace":
          return 8.2;
        default:
          return 7.4;
      }
    };

    for (const lm of TAMALE_LANDMARKS) {
      const sprite = createLandmarkLabelSprite(
        lm.name,
        lm.dagbaniLabel,
        accentForType(lm.type)
      );
      const baseY = heightForLandmark(lm.id);
      sprite.position.set(lm.x, baseY, lm.z);
      this.labelGroup.add(sprite);
      this.landmarkLabels.push({ sprite, x: lm.x, z: lm.z, baseY });
    }

    // Additional key commercial & civic buildings along Gbewaa High St
    const extraBuildings: Array<{ title: string; sub: string; x: number; z: number; y: number; color: string }> = [
      { title: "Northern Star Pharmacy", sub: "Gbewaa High St", x: -18, z: -13, y: 6.0, color: "#10b981" },
      { title: "Daa Waakye & TZ Spot", sub: "Saɣim & Bɛŋa", x: 34, z: -13, y: 5.9, color: "#f59e0b" },
      { title: "Alhassan Fabrics & Prints", sub: "Batakari & Nɛma", x: 24, z: 14, y: 6.0, color: "#0f766e" },
    ];
    for (const b of extraBuildings) {
      const sprite = createLandmarkLabelSprite(b.title, b.sub, b.color);
      sprite.position.set(b.x, b.y, b.z);
      this.labelGroup.add(sprite);
      this.landmarkLabels.push({ sprite, x: b.x, z: b.z, baseY: b.y });
    }
  }

  public setShowLabels(show: boolean) {
    this.labelsVisible = show;
    this.labelGroup.visible = show;
  }

  private buildCrowdPedestrians() {
    type CrowdSpec = {
      name: string;
      district: string;
      outfit: "batakari" | "kaba" | "casual" | "polo";
      headwear: "kufi" | "headwrap" | "braids" | "none";
      primary: string;
      accent: string;
      skin: string;
      voice: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
      role?: "walker" | "vendor" | "seated" | "student" | "child" | "social_group" | "commuter_wait";
      vendorShopId?: string;
      carryProp?: NpcCarryProp;
      homeMarketCoord?: { x: number; z: number };
      focusTarget?: { x: number; z: number };
      waypoints: Array<{ x: number; z: number }>;
    };

    const crowdSpecs: CrowdSpec[] = [
      // Tamale Central Market bustling crowd (front apron, east/west alleys, north lockups)
      {
        name: "Central Market Shopper",
        district: "Tamale Central Market",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#b45309",
        accent: "#fde047",
        skin: "#62381f",
        voice: "Kore",
        carryProp: "basket",
        waypoints: [{ x: -58, z: -15.5 }, { x: -42, z: -15.5 }, { x: -30, z: -16 }],
      },
      {
        name: "Shea Trader",
        district: "Tamale Central Market",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#047857",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Zephyr",
        carryProp: "headpan",
        waypoints: [{ x: -27.5, z: -17 }, { x: -27, z: -30 }, { x: -28, z: -43 }],
      },
      {
        name: "Smock Buyer",
        district: "Tamale Central Market",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#1e3a5f",
        accent: "#f59e0b",
        skin: "#5c341b",
        voice: "Charon",
        waypoints: [{ x: -34, z: -14.5 }, { x: -50, z: -14.5 }, { x: -61, z: -16 }],
      },
      {
        name: "Produce Carrier",
        district: "Tamale Central Market",
        outfit: "casual",
        headwear: "none",
        primary: "#dc2626",
        accent: "#1e293b",
        skin: "#6d4024",
        voice: "Puck",
        carryProp: "parcel_box",
        waypoints: [{ x: -61.5, z: -20 }, { x: -61.5, z: -38 }, { x: -52, z: -43.5 }],
      },
      {
        name: "Yam Stall Customer",
        district: "Tamale Central Market",
        outfit: "kaba",
        headwear: "braids",
        primary: "#be123c",
        accent: "#fde68a",
        skin: "#704225",
        voice: "Kore",
        carryProp: "basket",
        waypoints: [{ x: -46, z: -16 }, { x: -35, z: -16.2 }, { x: -27, z: -20 }],
      },
      {
        name: "Spice Vendor",
        district: "Tamale Central Market",
        outfit: "polo",
        headwear: "kufi",
        primary: "#ca8a04",
        accent: "#ffffff",
        skin: "#5c341b",
        voice: "Fenrir",
        carryProp: "apron",
        waypoints: [{ x: -27.5, z: -36 }, { x: -40, z: -43.5 }, { x: -56, z: -43.5 }],
      },
      {
        name: "Market Elder",
        district: "Tamale Central Market",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#f8fafc",
        accent: "#15803d",
        skin: "#59321a",
        voice: "Charon",
        waypoints: [{ x: -30, z: -14 }, { x: -22, z: -18 }, { x: -27, z: -26 }],
      },
      {
        name: "Fabric Shopper",
        district: "Tamale Central Market",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#1d4ed8",
        accent: "#facc15",
        skin: "#6b3f23",
        voice: "Zephyr",
        carryProp: "parcel_box",
        waypoints: [{ x: -54, z: -16 }, { x: -61, z: -28 }, { x: -50, z: -16 }],
      },
      // Gbewaa High Street & Interchange walkways
      {
        name: "High Street Commuter",
        district: "Gbewaa High Street",
        outfit: "polo",
        headwear: "none",
        primary: "#0284c7",
        accent: "#e2e8f0",
        skin: "#62381f",
        voice: "Puck",
        carryProp: "backpack",
        waypoints: [{ x: -34, z: -9.5 }, { x: -14, z: -9.5 }, { x: 14, z: -9.5 }],
      },
      {
        name: "High Street Shopper",
        district: "Gbewaa High Street",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#ea580c",
        accent: "#fef08a",
        skin: "#6b3f23",
        voice: "Kore",
        carryProp: "parcel_box",
        waypoints: [{ x: 16, z: 9.8 }, { x: 38, z: 9.8 }, { x: 54, z: 9.8 }],
      },
      {
        name: "Interchange Pedestrian",
        district: "Naa Gbewaa Interchange",
        outfit: "casual",
        headwear: "none",
        primary: "#15803d",
        accent: "#1e293b",
        skin: "#5c341b",
        voice: "Fenrir",
        waypoints: [{ x: -16, z: 10 }, { x: -36, z: 10 }, { x: -22, z: 10.5 }],
      },
      {
        name: "Tailor Apprentice",
        district: "Gbewaa High Street",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#0f766e",
        accent: "#fbbf24",
        skin: "#62381f",
        voice: "Charon",
        waypoints: [{ x: 22, z: -9.8 }, { x: 48, z: -9.8 }, { x: 34, z: -9.8 }],
      },
      // Aboabo Market pedestrians
      {
        name: "Aboabo Grain Buyer",
        district: "Aboabo Market",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#d97706",
        accent: "#fffbeb",
        skin: "#6b3f23",
        voice: "Kore",
        carryProp: "headpan",
        waypoints: [{ x: -144, z: 15.5 }, { x: -124, z: 15.5 }, { x: -116, z: 24 }],
      },
      {
        name: "Aboabo Cloth Seller",
        district: "Aboabo Market",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#7c2d12",
        accent: "#fde047",
        skin: "#5c341b",
        voice: "Puck",
        waypoints: [{ x: -116.5, z: 34 }, { x: -132, z: 40.5 }, { x: -145, z: 38 }],
      },
      {
        name: "Aboabo Grill Customer",
        district: "Aboabo Market",
        outfit: "polo",
        headwear: "none",
        primary: "#0369a1",
        accent: "#f8fafc",
        skin: "#62381f",
        voice: "Fenrir",
        waypoints: [{ x: -116, z: 16 }, { x: -128, z: 15.5 }, { x: -142, z: 15.5 }],
      },
      // Lamashegu Market pedestrians
      {
        name: "Lamashegu Trader",
        district: "Lamashegu Market",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#991b1b",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Zephyr",
        carryProp: "basket",
        waypoints: [{ x: -95, z: 113 }, { x: -75, z: 113 }, { x: -70, z: 102 }],
      },
      {
        name: "Lamashegu Rider",
        district: "Lamashegu Market",
        outfit: "casual",
        headwear: "none",
        primary: "#1e40af",
        accent: "#facc15",
        skin: "#5c341b",
        voice: "Puck",
        waypoints: [{ x: -70, z: 92 }, { x: -84, z: 87.5 }, { x: -97, z: 94 }],
      },
      // Kukuo Market & Pottery pedestrians
      {
        name: "Kukuo Pot Buyer",
        district: "Kukuo Market",
        outfit: "kaba",
        headwear: "braids",
        primary: "#b45309",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Kore",
        carryProp: "headpan",
        waypoints: [{ x: 147, z: 38 }, { x: 162, z: 38 }, { x: 169, z: 34 }],
      },
      {
        name: "Kukuo Artisan",
        district: "Kukuo Market",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#3f6212",
        accent: "#fde68a",
        skin: "#5c341b",
        voice: "Charon",
        carryProp: "apron",
        waypoints: [{ x: 146, z: 24 }, { x: 158, z: 24 }, { x: 168, z: 28 }],
      },
      // Central Mosque Forecourt & Jubilee Park pedestrians
      {
        name: "Mosque Worshipper",
        district: "Central Mosque Forecourt",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#f8fafc",
        accent: "#15803d",
        skin: "#5c341b",
        voice: "Charon",
        waypoints: [{ x: 17, z: 36 }, { x: 17, z: 54 }, { x: 20, z: 46 }],
      },
      {
        name: "Gukpegu Stroller",
        district: "Gukpegu Road",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0f766e",
        accent: "#fde68a",
        skin: "#6b3f23",
        voice: "Zephyr",
        waypoints: [{ x: 16, z: 26 }, { x: 16, z: 48 }, { x: 19, z: 34 }],
      },
      {
        name: "Jubilee Park Visitor",
        district: "Jubilee Park",
        outfit: "polo",
        headwear: "none",
        primary: "#1e3a5f",
        accent: "#ffffff",
        skin: "#62381f",
        voice: "Puck",
        waypoints: [{ x: 78, z: 34 }, { x: 94, z: 34 }, { x: 86, z: 28 }],
      },
      {
        name: "Civic Office Clerk",
        district: "High Street East",
        outfit: "casual",
        headwear: "braids",
        primary: "#7c2d12",
        accent: "#e2e8f0",
        skin: "#704225",
        voice: "Kore",
        carryProp: "backpack",
        waypoints: [{ x: 76, z: 9.5 }, { x: 96, z: 9.5 }, { x: 86, z: 12 }],
      },
      // Road-crossing pedestrians & roadside stall vendors
      {
        name: "Gbewaa Street Crosser",
        district: "Gbewaa High Street",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0284c7",
        accent: "#fef08a",
        skin: "#6b3f23",
        voice: "Zephyr",
        waypoints: [{ x: -24, z: -8.5 }, { x: -24, z: 8.5 }],
      },
      {
        name: "Market Lane Crosser",
        district: "Tamale Central Market",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#3f6212",
        accent: "#fde047",
        skin: "#5c341b",
        voice: "Charon",
        waypoints: [{ x: -42, z: -8.5 }, { x: -42, z: 8.5 }],
      },
      {
        name: "Waakye & Kɔɔsɛ Vendor",
        district: "Gbewaa High Street",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#b45309",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_koose_seller",
        carryProp: "apron",
        waypoints: [{ x: 34, z: -11.5 }, { x: 34.4, z: -11.5 }],
      },
      {
        name: "Chichinga Grill Seller",
        district: "Aboabo Market",
        outfit: "casual",
        headwear: "kufi",
        primary: "#dc2626",
        accent: "#fde68a",
        skin: "#5c341b",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "nightlife_grill_lounge",
        carryProp: "apron",
        waypoints: [{ x: -120, z: 12.1 }, { x: -120.4, z: 12.1 }],
      },
      {
        name: "Kom Pure Water Hawker",
        district: "Naa Gbewaa Interchange",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0284c7",
        accent: "#ffffff",
        skin: "#6b3f23",
        voice: "Zephyr",
        role: "vendor",
        vendorShopId: "street_water_hawker",
        carryProp: "water_pack",
        homeMarketCoord: { x: -44, z: -20 },
        waypoints: [{ x: 10, z: -10.2 }, { x: -8, z: -10.2 }],
      },
      {
        name: "Roasted Yam & Simli Hawker",
        district: "Central Market Lane",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#15803d",
        accent: "#fde047",
        skin: "#62381f",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_groundnut_fruit",
        carryProp: "headpan",
        homeMarketCoord: { x: -44, z: -26 },
        waypoints: [{ x: -30, z: -12.5 }, { x: -46, z: -12.5 }],
      },
      {
        name: "Dungu Kɔɔsɛ Morning Woman",
        district: "Dungu Campus Gate",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#ca8a04",
        accent: "#fffbeb",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_koose_seller",
        carryProp: "apron",
        waypoints: [{ x: -140, z: 141.5 }, { x: -140.4, z: 141.5 }],
      },
      {
        name: "Lamashegu Cold Water Seller",
        district: "Lamashegu Junction",
        outfit: "casual",
        headwear: "none",
        primary: "#0369a1",
        accent: "#facc15",
        skin: "#5c341b",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "street_water_hawker",
        carryProp: "water_pack",
        homeMarketCoord: { x: -84, z: 104 },
        waypoints: [{ x: -84, z: 111.5 }, { x: -78, z: 111.5 }],
      },
      // Seated residents & elders on benches outside shops and compounds
      {
        name: "High Street Elder",
        district: "Gbewaa High Street",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#f8fafc",
        accent: "#15803d",
        skin: "#5c341b",
        voice: "Charon",
        role: "seated",
        waypoints: [{ x: -14, z: -10.2 }, { x: -14, z: -9.2 }],
      },
      {
        name: "Shopkeeper Resting",
        district: "Gbewaa High Street",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0f766e",
        accent: "#fef08a",
        skin: "#6b3f23",
        voice: "Kore",
        role: "seated",
        waypoints: [{ x: 28, z: 10.8 }, { x: 28, z: 9.8 }],
      },
      {
        name: "Compound Grandfather",
        district: "Cultural Quarter",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#1e3a5f",
        accent: "#f59e0b",
        skin: "#5c341b",
        voice: "Charon",
        role: "seated",
        waypoints: [{ x: -80, z: 40 }, { x: -80, z: 41 }],
      },
      {
        name: "Kalpohin Resident",
        district: "Kalpohin Residential",
        outfit: "polo",
        headwear: "none",
        primary: "#0369a1",
        accent: "#ffffff",
        skin: "#62381f",
        voice: "Fenrir",
        role: "seated",
        waypoints: [{ x: 42, z: -110 }, { x: 42, z: -111 }],
      },
      // Students & Youth
      {
        name: "Tishigu Student",
        district: "Tishigu School Precinct",
        outfit: "polo",
        headwear: "none",
        primary: "#f59e0b",
        accent: "#78350f",
        skin: "#62381f",
        voice: "Puck",
        role: "student",
        carryProp: "backpack",
        waypoints: [{ x: 18, z: -55 }, { x: 34, z: -58 }, { x: 44, z: -55 }],
      },
      {
        name: "Kalpohin Student",
        district: "Tishigu School Precinct",
        outfit: "polo",
        headwear: "braids",
        primary: "#f59e0b",
        accent: "#78350f",
        skin: "#6b3f23",
        voice: "Zephyr",
        role: "student",
        carryProp: "backpack",
        waypoints: [{ x: 46, z: -60 }, { x: 30, z: -58 }, { x: 22, z: -62 }],
      },
      {
        name: "Dungu Campus Student",
        district: "Dungu Quarter",
        outfit: "casual",
        headwear: "none",
        primary: "#1d4ed8",
        accent: "#e2e8f0",
        skin: "#62381f",
        voice: "Puck",
        role: "student",
        carryProp: "backpack",
        waypoints: [{ x: -120, z: 146 }, { x: -138, z: 146 }, { x: -148, z: 136 }],
      },
      {
        name: "Compound Child",
        district: "Aboabo Residential",
        outfit: "polo",
        headwear: "none",
        primary: "#ef4444",
        accent: "#fde047",
        skin: "#6b3f23",
        voice: "Zephyr",
        role: "child",
        waypoints: [{ x: -128, z: 58 }, { x: -120, z: 58 }, { x: -124, z: 62 }],
      },
      {
        name: "Kakpagyili Youth",
        district: "Kakpagyili Compounds",
        outfit: "casual",
        headwear: "none",
        primary: "#10b981",
        accent: "#ffffff",
        skin: "#62381f",
        voice: "Puck",
        role: "child",
        waypoints: [{ x: 24, z: 174 }, { x: 38, z: 174 }, { x: 32, z: 178 }],
      },
      {
        name: "Gumani Youth",
        district: "Kalpohin & Gumani",
        outfit: "polo",
        headwear: "none",
        primary: "#3b82f6",
        accent: "#facc15",
        skin: "#62381f",
        voice: "Puck",
        role: "child",
        waypoints: [{ x: 86, z: -130 }, { x: 102, z: -130 }, { x: 94, z: -126 }],
      },
      // Mobile Hawkers & Stall Vendors
      {
        name: "Roasted Corn & Kelewele Seller",
        district: "Gbewaa High St East",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#ea580c",
        accent: "#facc15",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_roasted_corn_plantain",
        carryProp: "apron",
        waypoints: [{ x: 16, z: -11.0 }, { x: 16.4, z: -11.0 }],
      },
      {
        name: "Phone Accessories Push-Cart",
        district: "Interchange Junction",
        outfit: "polo",
        headwear: "none",
        primary: "#0284c7",
        accent: "#fde047",
        skin: "#5c341b",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "street_phone_accessories",
        waypoints: [{ x: -12, z: 10.6 }, { x: -18, z: 10.6 }],
      },
      {
        name: "Phone Accessories Central Market",
        district: "Tamale Central Market",
        outfit: "casual",
        headwear: "none",
        primary: "#1e40af",
        accent: "#ffffff",
        skin: "#62381f",
        voice: "Fenrir",
        role: "vendor",
        vendorShopId: "street_phone_accessories",
        waypoints: [{ x: -50, z: -11.2 }, { x: -46, z: -11.2 }],
      },
      {
        name: "Tabletop Footwear & Cloth Trader",
        district: "Central Market South",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#be123c",
        accent: "#fef08a",
        skin: "#5c341b",
        voice: "Charon",
        role: "vendor",
        vendorShopId: "street_shoes_cloth",
        waypoints: [{ x: -42, z: -16.8 }, { x: -42.4, z: -16.8 }],
      },
      {
        name: "Aboabo Cloth & Sandals Vendor",
        district: "Aboabo Market",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#1d4ed8",
        accent: "#fde047",
        skin: "#62381f",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "street_shoes_cloth",
        waypoints: [{ x: -124, z: 16.4 }, { x: -124.4, z: 16.4 }],
      },
      {
        name: "Fresh Fruit & Mango Tray Woman",
        district: "Central Mart & Pharmacy",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#15803d",
        accent: "#fb923c",
        skin: "#6b3f23",
        voice: "Zephyr",
        role: "vendor",
        vendorShopId: "street_fruit_juice",
        carryProp: "headpan",
        homeMarketCoord: { x: -44, z: -22 },
        waypoints: [{ x: -54, z: -9.5 }, { x: -24, z: -9.5 }],
      },
      {
        name: "Bicycle Sugar Bread Seller",
        district: "Tishigu & Kalpohin Streets",
        outfit: "polo",
        headwear: "kufi",
        primary: "#ca8a04",
        accent: "#ffffff",
        skin: "#5c341b",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "street_bicycle_bread",
        carryProp: "parcel_box",
        waypoints: [{ x: 14, z: -32 }, { x: 42, z: -32 }, { x: 42, z: -56 }],
      },
      {
        name: "Savannah Fried Chicken Diner",
        district: "High Street East",
        outfit: "polo",
        headwear: "none",
        primary: "#dc2626",
        accent: "#fef08a",
        skin: "#62381f",
        voice: "Puck",
        waypoints: [{ x: 64, z: -9.8 }, { x: 74, z: -9.8 }, { x: 68, z: -10.5 }],
      },
      {
        name: "Central Mart Grocery Shopper",
        district: "High Street West",
        outfit: "kaba",
        headwear: "braids",
        primary: "#0284c7",
        accent: "#ffffff",
        skin: "#6b3f23",
        voice: "Kore",
        carryProp: "parcel_box",
        waypoints: [{ x: -58, z: -9.5 }, { x: -50, z: -9.5 }, { x: -46, z: -10.5 }],
      },
      {
        name: "Stadium Matchday Fan",
        district: "Sagnarigu · Stadium",
        outfit: "polo",
        headwear: "none",
        primary: "#dc2626",
        accent: "#ffffff",
        skin: "#62381f",
        voice: "Fenrir",
        waypoints: [{ x: -138, z: -98 }, { x: -124, z: -98 }, { x: -134, z: -101 }],
      },
      {
        name: "Stadium Coach",
        district: "Sagnarigu · Stadium",
        outfit: "polo",
        headwear: "none",
        primary: "#0f766e",
        accent: "#facc15",
        skin: "#5c341b",
        voice: "Charon",
        waypoints: [{ x: -128, z: -102 }, { x: -128.6, z: -102 }],
      },
      {
        name: "Teaching Hospital Nurse",
        district: "Changli · Hospital",
        outfit: "casual",
        headwear: "braids",
        primary: "#f8fafc",
        accent: "#0284c7",
        skin: "#6b3f23",
        voice: "Kore",
        carryProp: "apron",
        waypoints: [{ x: 86, z: 120 }, { x: 102, z: 120 }, { x: 96, z: 112 }],
      },
      {
        name: "Hospital Water & Sobolo Hawker",
        district: "Changli · Hospital",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#1e3a5f",
        accent: "#e2e8f0",
        skin: "#5c341b",
        voice: "Charon",
        role: "vendor",
        vendorShopId: "street_water_hawker",
        carryProp: "water_pack",
        homeMarketCoord: { x: 108, z: 130 },
        waypoints: [{ x: 88, z: 122 }, { x: 106, z: 122 }],
      },
      {
        name: "Vittin Burger Customer",
        district: "Vittin East Ring",
        outfit: "polo",
        headwear: "none",
        primary: "#c2410c",
        accent: "#fef3c7",
        skin: "#62381f",
        voice: "Puck",
        waypoints: [{ x: 170, z: 10 }, { x: 178, z: 10 }, { x: 174, z: 12 }],
      },
      {
        name: "Dungu Medical Student",
        district: "Dungu Campus",
        outfit: "polo",
        headwear: "headwrap",
        primary: "#1d4ed8",
        accent: "#f8fafc",
        skin: "#6b3f23",
        voice: "Zephyr",
        role: "student",
        carryProp: "backpack",
        waypoints: [{ x: -152, z: 136 }, { x: -132, z: 136 }, { x: -144, z: 140 }],
      },
      {
        name: "Nyohini Salon Client",
        district: "Nyohini West",
        outfit: "casual",
        headwear: "none",
        primary: "#7c3aed",
        accent: "#fde047",
        skin: "#62381f",
        voice: "Fenrir",
        waypoints: [{ x: -150, z: -9.5 }, { x: -140, z: -9.5 }],
      },
      {
        name: "Airport Road Traveler",
        district: "Kanvilli N10",
        outfit: "casual",
        headwear: "none",
        primary: "#0369a1",
        accent: "#e2e8f0",
        skin: "#62381f",
        voice: "Puck",
        carryProp: "backpack",
        waypoints: [{ x: -10, z: -184 }, { x: 12, z: -184 }, { x: 0, z: -186 }],
      },
      {
        name: "Aboabo Roasted Corn Seller",
        district: "Aboabo Market",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#b45309",
        accent: "#fde047",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_roasted_corn_plantain",
        carryProp: "apron",
        waypoints: [{ x: -132, z: 15 }, { x: -132.4, z: 15 }],
      },
      {
        name: "Interchange Waiting Commuter",
        district: "Naa Gbewaa Interchange",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0f766e",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Zephyr",
        role: "commuter_wait",
        focusTarget: { x: 16, z: 0 },
        waypoints: [{ x: 16, z: 10.6 }, { x: 16.5, z: 10.6 }],
      },
      {
        name: "Kalpohin Pastry Buyer",
        district: "Kalpohin Estates",
        outfit: "polo",
        headwear: "none",
        primary: "#16a34a",
        accent: "#fef08a",
        skin: "#5c341b",
        voice: "Puck",
        waypoints: [{ x: 46, z: -92 }, { x: 58, z: -92 }],
      },
      // --- NEW EXPANDED POPULATION: NEW STORE CUSTOMERS, CONVERSING GROUPS, HAWKERS & WAITERS ---
      {
        name: "Ice Cream Parlour Seller",
        district: "High Street East",
        outfit: "polo",
        headwear: "none",
        primary: "#ec4899",
        accent: "#ffffff",
        skin: "#62381f",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "street_ice_cream_cart",
        carryProp: "apron",
        waypoints: [{ x: 112.5, z: -9.8 }, { x: 115, z: -9.8 }],
      },
      {
        name: "Tishigu Ice Cream Pushcart",
        district: "Tishigu School Gate",
        outfit: "polo",
        headwear: "kufi",
        primary: "#0284c7",
        accent: "#fef08a",
        skin: "#5c341b",
        voice: "Puck",
        role: "vendor",
        vendorShopId: "street_ice_cream_cart",
        waypoints: [{ x: 26, z: -56 }, { x: 42, z: -56 }, { x: 34, z: -48 }],
      },
      {
        name: "Dabokpaa Household Hawker",
        district: "Dabokpaa Mini-Mart",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0d9488",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_household_hawker",
        carryProp: "headpan",
        homeMarketCoord: { x: 112, z: 132 },
        waypoints: [{ x: 108, z: 132 }, { x: 120, z: 132 }],
      },
      {
        name: "Enterprise Bank Customer",
        district: "High Street East",
        outfit: "casual",
        headwear: "none",
        primary: "#1e3a5f",
        accent: "#e2e8f0",
        skin: "#5c341b",
        voice: "Charon",
        carryProp: "backpack",
        waypoints: [{ x: 78, z: -10.5 }, { x: 86, z: -10.5 }, { x: 82, z: -9.5 }],
      },
      {
        name: "Electronics & Solar Shopper",
        district: "High Street East",
        outfit: "polo",
        headwear: "none",
        primary: "#0369a1",
        accent: "#fde047",
        skin: "#62381f",
        voice: "Fenrir",
        carryProp: "parcel_box",
        waypoints: [{ x: 96, z: -10.2 }, { x: 106, z: -10.2 }],
      },
      {
        name: "Savannah Boutique Browser",
        district: "Central High St South",
        outfit: "kaba",
        headwear: "braids",
        primary: "#be185d",
        accent: "#fef08a",
        skin: "#6b3f23",
        voice: "Zephyr",
        carryProp: "parcel_box",
        waypoints: [{ x: 45, z: 10.2 }, { x: 56, z: 10.2 }],
      },
      {
        name: "Footwear Shop Customer",
        district: "West High Street",
        outfit: "casual",
        headwear: "none",
        primary: "#7c2d12",
        accent: "#facc15",
        skin: "#62381f",
        voice: "Puck",
        waypoints: [{ x: -88, z: -10.2 }, { x: -77, z: -10.2 }],
      },
      {
        name: "Gukpegu Tilapia Diner",
        district: "Gukpegu Road",
        outfit: "batakari",
        headwear: "kufi",
        primary: "#ea580c",
        accent: "#fffbeb",
        skin: "#5c341b",
        voice: "Charon",
        waypoints: [{ x: -11, z: 37 }, { x: -11, z: 47 }],
      },
      {
        name: "Central Market Plasticware Seller",
        district: "Central Market North",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#0284c7",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        vendorShopId: "street_household_hawker",
        carryProp: "headpan",
        waypoints: [{ x: -48, z: -41.5 }, { x: -48.5, z: -41.5 }],
      },
      {
        name: "Cool Scoop Gelato Fan",
        district: "High Street East",
        outfit: "polo",
        headwear: "braids",
        primary: "#ec4899",
        accent: "#fef08a",
        skin: "#704225",
        voice: "Zephyr",
        waypoints: [{ x: 112, z: -10.2 }, { x: 120, z: -10.2 }],
      },
    ];

    // 1b. Deterministic Social Conversation Groups (2-3 people facing a common focal spot)
    const socialClusters: Array<{
      district: string;
      cx: number;
      cz: number;
      members: Array<{ name: string; outfit: CrowdSpec["outfit"]; headwear: CrowdSpec["headwear"]; primary: string }>;
    }> = [
      {
        district: "Tamale Central Market",
        cx: -35,
        cz: -13.2,
        members: [
          { name: "Shea Bargainer", outfit: "kaba", headwear: "headwrap", primary: "#b45309" },
          { name: "Yam Wholesaler", outfit: "batakari", headwear: "kufi", primary: "#1e3a5f" },
          { name: "Market Neighbour", outfit: "kaba", headwear: "braids", primary: "#047857" },
        ],
      },
      {
        district: "Central Mosque Courtyard",
        cx: 18,
        cz: 42,
        members: [
          { name: "Mallam Imoro", outfit: "batakari", headwear: "kufi", primary: "#f8fafc" },
          { name: "Gukpegu Elder", outfit: "batakari", headwear: "kufi", primary: "#0f766e" },
        ],
      },
      {
        district: "Jubilee Civic Plaza",
        cx: 85,
        cz: 26,
        members: [
          { name: "Youth Organizer", outfit: "polo", headwear: "none", primary: "#0369a1" },
          { name: "Jubilee Friend", outfit: "casual", headwear: "braids", primary: "#be185d" },
          { name: "Civic Volunteer", outfit: "polo", headwear: "none", primary: "#15803d" },
        ],
      },
      {
        district: "Dungu Academic Quarter",
        cx: -138,
        cz: 138,
        members: [
          { name: "UDS Study Group A", outfit: "polo", headwear: "none", primary: "#1d4ed8" },
          { name: "UDS Study Group B", outfit: "casual", headwear: "headwrap", primary: "#7c3aed" },
          { name: "UDS Study Group C", outfit: "polo", headwear: "none", primary: "#047857" },
        ],
      },
      {
        district: "Aboabo Market Yard",
        cx: -120,
        cz: 24,
        members: [
          { name: "Aboabo Tailor", outfit: "batakari", headwear: "kufi", primary: "#9a3412" },
          { name: "Cloth Buyer", outfit: "kaba", headwear: "headwrap", primary: "#1d4ed8" },
        ],
      },
      {
        district: "Lamashegu Mechanic Row",
        cx: -82,
        cz: 114,
        members: [
          { name: "Pragya Driver", outfit: "polo", headwear: "none", primary: "#eab308" },
          { name: "Welder Apprentice", outfit: "casual", headwear: "none", primary: "#334155" },
        ],
      },
      {
        district: "Dakpema Palace Forecourt",
        cx: -34,
        cz: -56,
        members: [
          { name: "Palace Drummer", outfit: "batakari", headwear: "kufi", primary: "#7f2b2b" },
          { name: "Council Elder", outfit: "batakari", headwear: "kufi", primary: "#f8fafc" },
        ],
      },
      {
        district: "Daa Waakye Evening Spot",
        cx: 35,
        cz: -9.8,
        members: [
          { name: "Evening Diner A", outfit: "casual", headwear: "none", primary: "#ea580c" },
          { name: "Evening Diner B", outfit: "kaba", headwear: "braids", primary: "#ca8a04" },
        ],
      },
    ];

    const skinPalette = ["#59321a", "#62381f", "#6b3f23", "#704225", "#7c4a2a", "#4a2a18"];
    const voiceCycle: Array<CrowdSpec["voice"]> = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];

    for (let c = 0; c < socialClusters.length; c++) {
      const cl = socialClusters[c];
      for (let m = 0; m < cl.members.length; m++) {
        const mem = cl.members[m];
        const ang = (m / cl.members.length) * Math.PI * 2 + c * 0.4;
        const mx = cl.cx + Math.cos(ang) * 1.15;
        const mz = cl.cz + Math.sin(ang) * 1.15;
        crowdSpecs.push({
          name: mem.name,
          district: cl.district,
          outfit: mem.outfit,
          headwear: mem.headwear,
          primary: mem.primary,
          accent: "#fde047",
          skin: skinPalette[(c + m) % skinPalette.length],
          voice: voiceCycle[(c + m) % voiceCycle.length],
          role: "social_group",
          focusTarget: { x: cl.cx, z: cl.cz },
          waypoints: [{ x: mx, z: mz }, { x: mx + 0.1, z: mz + 0.1 }],
        });
      }
    }

    // 1c. Transport Rank Commuters Waiting for Pragya / Taxi / Moto
    const transportWaitSpots: Array<{
      district: string;
      x: number;
      z: number;
      lookX: number;
      lookZ: number;
    }> = [
      { district: "Interchange West Rank", x: -12, z: -9.8, lookX: -12, lookZ: 0 },
      { district: "Central Market Taxi Rank", x: -38, z: -10.0, lookX: -38, lookZ: 0 },
      { district: "Aboabo Pragya Stop", x: -112, z: 9.8, lookX: -102, lookZ: 9.8 },
      { district: "Lamashegu Salaga Rank", x: -80, z: 121.5, lookX: -80, lookZ: 128 },
      { district: "Teaching Hospital Gate Stop", x: 92, z: 121.5, lookX: 92, lookZ: 128 },
      { district: "Airport Road N10 Stop", x: 9.5, z: -165, lookX: 0, lookZ: -165 },
      { district: "Dungu Hostel Pragya Stop", x: -128, z: 134.5, lookX: -128, lookZ: 128 },
      { district: "Stadium Bus & Pragya Stop", x: -112, z: -98.5, lookX: -112, lookZ: -92 },
    ];
    for (let i = 0; i < transportWaitSpots.length; i++) {
      const tw = transportWaitSpots[i];
      crowdSpecs.push({
        name: "Commuter Waiting",
        district: tw.district,
        outfit: i % 2 === 0 ? "kaba" : "polo",
        headwear: i % 2 === 0 ? "headwrap" : "none",
        primary: ["#0284c7", "#b45309", "#15803d", "#dc2626"][i % 4],
        accent: "#fef08a",
        skin: skinPalette[i % skinPalette.length],
        voice: voiceCycle[i % voiceCycle.length],
        role: "commuter_wait",
        carryProp: i % 3 === 0 ? "backpack" : "parcel_box",
        focusTarget: { x: tw.lookX, z: tw.lookZ },
        waypoints: [{ x: tw.x, z: tw.z }, { x: tw.x + 0.15, z: tw.z }],
      });
    }

    // 1d. Distributed District Walkers, Market Bargainers & Street Hawkers across all Tamale Quarters
    const districtCorridors: Array<{
      district: string;
      pts: Array<{ x: number; z: number }>;
      count: number;
      vendorRatio?: number;
    }> = [
      {
        district: "Tamale Central Market",
        pts: [{ x: -58, z: -17 }, { x: -42, z: -17 }, { x: -27, z: -26 }, { x: -56, z: -42 }],
        count: 10,
        vendorRatio: 0.35,
      },
      {
        district: "Gbewaa High Street Central",
        pts: [{ x: -70, z: -9.8 }, { x: -15, z: -9.8 }, { x: 25, z: -9.8 }, { x: 118, z: -9.8 }],
        count: 10,
        vendorRatio: 0.3,
      },
      {
        district: "Gbewaa High Street South",
        pts: [{ x: -60, z: 9.8 }, { x: 18, z: 9.8 }, { x: 56, z: 9.8 }, { x: 96, z: 9.8 }],
        count: 7,
        vendorRatio: 0.25,
      },
      {
        district: "Gukpegu Mosque & Tilapia Row",
        pts: [{ x: -9.5, z: 18 }, { x: -9.5, z: 58 }, { x: 16, z: 54 }, { x: 16, z: 22 }],
        count: 6,
      },
      {
        district: "Aboabo Market & Compounds",
        pts: [{ x: -148, z: 15 }, { x: -116, z: 15 }, { x: -116, z: 40 }, { x: -146, z: 40 }],
        count: 7,
        vendorRatio: 0.3,
      },
      {
        district: "Lamashegu & Salaga Corridor",
        pts: [{ x: -96, z: 120 }, { x: -68, z: 120 }, { x: -68, z: 92 }, { x: -96, z: 94 }],
        count: 5,
      },
      {
        district: "Nyohini & West Ring",
        pts: [{ x: -154, z: -9.8 }, { x: -112, z: -9.8 }, { x: -154, z: 36 }, { x: -112, z: 36 }],
        count: 5,
      },
      {
        district: "Tishigu & Kalpohin Estates",
        pts: [{ x: 12, z: -56 }, { x: 58, z: -56 }, { x: 58, z: -98 }, { x: 12, z: -98 }],
        count: 6,
      },
      {
        district: "Kukuo & Vittin Corridor",
        pts: [{ x: 138, z: 12 }, { x: 174, z: 12 }, { x: 174, z: 40 }, { x: 138, z: 40 }],
        count: 5,
      },
      {
        district: "Teaching Hospital & Dabokpaa",
        pts: [{ x: 82, z: 120 }, { x: 122, z: 120 }, { x: 122, z: 138 }, { x: 88, z: 138 }],
        count: 6,
      },
      {
        district: "Dungu Campus & Kakpagyili",
        pts: [{ x: -150, z: 136 }, { x: -116, z: 136 }, { x: 24, z: 164 }, { x: 42, z: 164 }],
        count: 6,
      },
      {
        district: "Sagnarigu, Stadium & Choggu",
        pts: [{ x: -146, z: -99 }, { x: -112, z: -99 }, { x: -92, z: -146 }, { x: -72, z: -146 }],
        count: 6,
      },
    ];

    const outfitPool: Array<CrowdSpec["outfit"]> = ["kaba", "batakari", "polo", "casual"];
    const colorPool = [
      "#b45309",
      "#0284c7",
      "#047857",
      "#dc2626",
      "#1e3a5f",
      "#7c2d12",
      "#be185d",
      "#15803d",
      "#ca8a04",
      "#1d4ed8",
    ];
    const carryPool: NpcCarryProp[] = [
      "none",
      "headpan",
      "basket",
      "parcel_box",
      "backpack",
      "water_pack",
      "none",
    ];
    const hawkerShops = [
      "street_water_hawker",
      "street_groundnut_fruit",
      "street_fruit_juice",
      "street_household_hawker",
      "street_ice_cream_cart",
    ];

    let dcSeed = 0;
    for (const corr of districtCorridors) {
      for (let k = 0; k < corr.count; k++) {
        dcSeed++;
        const outfit = outfitPool[(dcSeed + k) % outfitPool.length];
        const headwear: CrowdSpec["headwear"] =
          outfit === "kaba"
            ? dcSeed % 2 === 0
              ? "headwrap"
              : "braids"
            : outfit === "batakari"
            ? "kufi"
            : dcSeed % 4 === 0
            ? "kufi"
            : "none";
        const isVendor = (corr.vendorRatio ?? 0) > 0 && k / corr.count < (corr.vendorRatio ?? 0);
        const startIdx = k % corr.pts.length;
        const rotatedPts = corr.pts.map((_, pi) => {
          const p = corr.pts[(startIdx + pi) % corr.pts.length];
          return { x: p.x + ((dcSeed % 3) - 1) * 0.9, z: p.z + (((dcSeed + pi) % 3) - 1) * 0.9 };
        });

        crowdSpecs.push({
          name: isVendor ? `${corr.district} Hawker` : `${corr.district} Resident`,
          district: corr.district,
          outfit,
          headwear,
          primary: colorPool[dcSeed % colorPool.length],
          accent: dcSeed % 2 === 0 ? "#fde047" : "#f8fafc",
          skin: skinPalette[dcSeed % skinPalette.length],
          voice: voiceCycle[dcSeed % voiceCycle.length],
          role: isVendor ? "vendor" : "walker",
          vendorShopId: isVendor ? hawkerShops[dcSeed % hawkerShops.length] : undefined,
          carryProp: isVendor ? (dcSeed % 2 === 0 ? "water_pack" : "headpan") : carryPool[dcSeed % carryPool.length],
          homeMarketCoord: isVendor ? { x: -44, z: -24 } : undefined,
          waypoints: rotatedPts,
        });
      }
    }

    for (let i = 0; i < crowdSpecs.length; i++) {
      const spec = crowdSpecs[i];
      const role = spec.role ?? "walker";
      const rig = createCharacterRig(
        {
          outfit: spec.outfit,
          headwear: spec.headwear,
          primaryColor: spec.primary,
          accentColor: spec.accent,
          skinTone: spec.skin,
          carryProp: spec.carryProp,
        },
        this.textures
      );
      if (role === "child") {
        rig.root.scale.setScalar(0.75);
      } else if (role === "student") {
        rig.root.scale.setScalar(0.89);
      }
      const start = spec.waypoints[0];
      rig.root.position.set(start.x, 0, start.z);
      if (role === "seated") {
        const look = spec.waypoints[1] ?? start;
        rig.root.rotation.y = Math.atan2(look.x - start.x, look.z - start.z);
        rig.bodyGroup.position.y = -0.34;
        rig.leftLegPivot.rotation.x = -Math.PI * 0.45;
        rig.rightLegPivot.rotation.x = -Math.PI * 0.45;
        rig.leftArmPivot.rotation.x = -0.3;
        rig.rightArmPivot.rotation.x = -0.3;
      } else if (spec.focusTarget) {
        rig.root.rotation.y = Math.atan2(spec.focusTarget.x - start.x, spec.focusTarget.z - start.z);
      }
      this.worldRoot.add(rig.root);

      const isMovingVendor =
        role === "vendor" &&
        spec.waypoints.length >= 2 &&
        Math.hypot(spec.waypoints[0].x - spec.waypoints[1].x, spec.waypoints[0].z - spec.waypoints[1].z) >= 1.5;

      this.crowdAgents.push({
        rig,
        speakerName: spec.name,
        district: spec.district,
        voiceName: spec.voice,
        role,
        vendorShopId: spec.vendorShopId,
        vendorMode: isMovingVendor ? "walking" : undefined,
        vendorStateTimer: isMovingVendor ? 4 + (i % 5) * 1.4 : undefined,
        homeMarketCoord: spec.homeMarketCoord,
        restocking: false,
        focusTarget: spec.focusTarget,
        waypoints: spec.waypoints,
        wpIndex: 1 % spec.waypoints.length,
        x: start.x,
        z: start.z,
        rotY: rig.root.rotation.y,
        walkPhase: i * 1.1,
        speed: role === "child" ? 2.45 : role === "student" ? 1.85 : role === "vendor" ? 1.32 : 1.5 + (i % 4) * 0.24,
        pauseTimer: (i % 3) * 0.8,
        speakCooldown: 1.5 + (i % 5) * 1.6,
        speakingTimer: 0,
        activePhrase: null,
        speechSprite: null,
      });
    }
  }

  private buildVehicles() {
    // Drivable parked Pragyas (matching yellow_yellow_tamale.jpg blue & yellow Bajaj REs) & Motorcycle
    const drivableConfigs: Array<{
      id: string;
      kind: "pragya" | "motorcycle";
      label: string;
      x: number;
      z: number;
      rotY: number;
      color: string;
      canopy: string;
    }> = [
      {
        id: "pragya_interchange",
        kind: "pragya",
        label: "Blue Bajaj Pragya (Interchange Rank)",
        x: 11,
        z: 9.2,
        rotY: -Math.PI * 0.5,
        color: "#0284c7",
        canopy: "#6b4f3a",
      },
      {
        id: "pragya_market",
        kind: "pragya",
        label: "Yellow Central Market Pragya",
        x: -26,
        z: -10,
        rotY: Math.PI * 0.5,
        color: "#eab308",
        canopy: "#14532d",
      },
      {
        id: "moto_mosque",
        kind: "motorcycle",
        label: "Tamale Street Motorcycle",
        x: 11,
        z: 38,
        rotY: 0,
        color: "#dc2626",
        canopy: "#111827",
      },
      {
        id: "pragya_aboabo",
        kind: "pragya",
        label: "Blue Aboabo Market Pragya",
        x: -110,
        z: 10,
        rotY: Math.PI,
        color: "#0284c7",
        canopy: "#78350f",
      },
      {
        id: "pragya_lamashegu",
        kind: "pragya",
        label: "Yellow Lamashegu Junction Pragya",
        x: -94,
        z: 120,
        rotY: Math.PI * 0.5,
        color: "#eab308",
        canopy: "#1e3a5f",
      },
      {
        id: "moto_hospital",
        kind: "motorcycle",
        label: "Teaching Hospital Commuter Moto",
        x: 72,
        z: 120,
        rotY: -Math.PI * 0.5,
        color: "#15803d",
        canopy: "#111827",
      },
    ];

    for (const cfg of drivableConfigs) {
      const built =
        cfg.kind === "pragya"
          ? createPragyaMesh(cfg.color, cfg.canopy, this.textures)
          : createMotorcycleMesh(cfg.color, this.textures);
      built.group.position.set(cfg.x, 0, cfg.z);
      built.group.rotation.y = cfg.rotY;
      this.worldRoot.add(built.group);

      this.drivables.push({
        id: cfg.id,
        kind: cfg.kind,
        label: cfg.label,
        group: built.group,
        wheels: built.wheels,
        headlightMat: built.headlightMat,
        x: cfg.x,
        z: cfg.z,
        rotY: cfg.rotY,
        speed: 0,
      });
    }

    // Realistic Moving Tamale Street Traffic (30 dynamic vehicles across road network)
    const trafficSpecs: Array<{
      kind: "moto" | "pragya" | "taxi" | "car" | "cargo" | "bicycle";
      axis: "x" | "z";
      roadCoord: number;
      pos: number;
      dir: 1 | -1;
      speed: number;
      color?: string;
      style?: "commuter" | "sport" | "delivery";
      hasPassenger?: boolean;
      hasGoods?: boolean;
      riderOutfit?: string;
      passengerOutfit?: string;
    }> = [
      // Motorcycles (solo riders, rider+passenger, delivery bikes, varied speeds)
      { kind: "moto", axis: "x", roadCoord: 0, pos: 48, dir: -1, speed: 12.2, color: "#dc2626", style: "commuter", hasPassenger: true, riderOutfit: "#1d4ed8", passengerOutfit: "#f59e0b" },
      { kind: "moto", axis: "x", roadCoord: 0, pos: -52, dir: 1, speed: 13.4, color: "#1d4ed8", style: "sport", riderOutfit: "#0f172a" },
      { kind: "moto", axis: "x", roadCoord: -48, pos: -42, dir: 1, speed: 10.6, color: "#15803d", style: "delivery", hasGoods: true, riderOutfit: "#ea580c" },
      { kind: "moto", axis: "x", roadCoord: -48, pos: 28, dir: -1, speed: 11.4, color: "#18181b", style: "commuter", hasGoods: true, riderOutfit: "#0284c7" },
      { kind: "moto", axis: "x", roadCoord: 66, pos: -35, dir: 1, speed: 12.6, color: "#b91c1c", style: "commuter", hasPassenger: true, riderOutfit: "#f8fafc", passengerOutfit: "#047857" },
      { kind: "moto", axis: "x", roadCoord: 128, pos: 40, dir: -1, speed: 12.0, color: "#0369a1", style: "delivery", hasGoods: true, riderOutfit: "#ca8a04" },
      { kind: "moto", axis: "z", roadCoord: 0, pos: -60, dir: 1, speed: 12.8, color: "#dc2626", style: "sport", riderOutfit: "#991b1b" },
      { kind: "moto", axis: "z", roadCoord: -66, pos: -22, dir: 1, speed: 11.2, color: "#334155", style: "commuter", hasPassenger: true, riderOutfit: "#1e3a5f", passengerOutfit: "#b45309" },
      { kind: "moto", axis: "z", roadCoord: -102, pos: 35, dir: -1, speed: 11.8, color: "#ea580c", style: "delivery", hasGoods: true, riderOutfit: "#0369a1" },
      { kind: "moto", axis: "z", roadCoord: 66, pos: -45, dir: 1, speed: 12.4, color: "#16a34a", style: "commuter", riderOutfit: "#1e293b" },
      { kind: "moto", axis: "z", roadCoord: 128, pos: 15, dir: -1, speed: 11.9, color: "#2563eb", style: "commuter", hasPassenger: true, riderOutfit: "#334155", passengerOutfit: "#dc2626" },
      { kind: "moto", axis: "x", roadCoord: -92, pos: -80, dir: 1, speed: 13.0, color: "#7c2d12", style: "commuter", riderOutfit: "#0f766e" },

      // Pragyas (Blue & Yellow Bajaj RE tricycles)
      { kind: "pragya", axis: "x", roadCoord: 0, pos: -18, dir: 1, speed: 8.2, color: "#0284c7" },
      { kind: "pragya", axis: "x", roadCoord: 0, pos: 85, dir: -1, speed: 8.6, color: "#eab308" },
      { kind: "pragya", axis: "x", roadCoord: -48, pos: -72, dir: 1, speed: 7.5, color: "#0284c7" },
      { kind: "pragya", axis: "x", roadCoord: 66, pos: 32, dir: -1, speed: 8.4, color: "#eab308" },
      { kind: "pragya", axis: "z", roadCoord: -66, pos: -75, dir: 1, speed: 7.8, color: "#0284c7" },
      { kind: "pragya", axis: "z", roadCoord: 0, pos: 54, dir: -1, speed: 8.5, color: "#eab308" },
      { kind: "pragya", axis: "x", roadCoord: 128, pos: -65, dir: 1, speed: 8.1, color: "#0284c7" },

      // Ghana Yellow-Fender Taxis & Private Saloon Cars
      { kind: "taxi", axis: "x", roadCoord: 0, pos: -95, dir: 1, speed: 10.4 },
      { kind: "taxi", axis: "x", roadCoord: -92, pos: 60, dir: -1, speed: 10.8 },
      { kind: "taxi", axis: "x", roadCoord: 128, pos: 95, dir: -1, speed: 10.2 },
      { kind: "taxi", axis: "z", roadCoord: 128, pos: -60, dir: 1, speed: 10.5 },
      { kind: "car", axis: "x", roadCoord: 0, pos: 112, dir: -1, speed: 11.4, color: "#cbd5e1" },
      { kind: "car", axis: "z", roadCoord: 0, pos: -115, dir: 1, speed: 11.6, color: "#7f1d1d" },
      { kind: "car", axis: "x", roadCoord: -158, pos: -40, dir: 1, speed: 11.2, color: "#1e3a8a" },

      // Motor King Cargo Trikes & Commuter Bicycles
      { kind: "cargo", axis: "x", roadCoord: 128, pos: -110, dir: 1, speed: 7.2 },
      { kind: "cargo", axis: "z", roadCoord: 66, pos: 48, dir: -1, speed: 6.9 },
      { kind: "bicycle", axis: "x", roadCoord: -48, pos: -14, dir: 1, speed: 4.8, color: "#15803d", riderOutfit: "#f59e0b" },
      { kind: "bicycle", axis: "z", roadCoord: -102, pos: -12, dir: -1, speed: 4.6, color: "#dc2626", riderOutfit: "#0284c7" },
      // Expanded Outer Metro, Secondary Connectors & Night Traffic (~62 vehicles across Tamale)
      { kind: "pragya", axis: "z", roadCoord: -162, pos: -60, dir: 1, speed: 8.3, color: "#eab308" },
      { kind: "pragya", axis: "z", roadCoord: 186, pos: 25, dir: -1, speed: 8.0, color: "#0284c7" },
      { kind: "moto", axis: "z", roadCoord: 0, pos: -140, dir: 1, speed: 13.8, color: "#dc2626", style: "sport", riderOutfit: "#0f172a" },
      { kind: "moto", axis: "z", roadCoord: 0, pos: -175, dir: -1, speed: 12.9, color: "#15803d", style: "delivery", hasGoods: true, riderOutfit: "#ca8a04" },
      { kind: "taxi", axis: "x", roadCoord: -158, pos: 50, dir: -1, speed: 11.0 },
      { kind: "car", axis: "z", roadCoord: 128, pos: 60, dir: -1, speed: 11.4, color: "#334155" },
      { kind: "car", axis: "x", roadCoord: 66, pos: 110, dir: 1, speed: 10.8, color: "#0f766e" },
      { kind: "moto", axis: "x", roadCoord: 128, pos: -140, dir: 1, speed: 12.3, color: "#0284c7", style: "commuter", hasPassenger: true, riderOutfit: "#1e3a5f", passengerOutfit: "#facc15" },
      { kind: "pragya", axis: "x", roadCoord: -92, pos: -120, dir: 1, speed: 8.2, color: "#0284c7" },
      { kind: "bicycle", axis: "x", roadCoord: 0, pos: 64, dir: -1, speed: 4.9, color: "#ca8a04", riderOutfit: "#16a34a" },
      { kind: "cargo", axis: "x", roadCoord: -92, pos: 120, dir: -1, speed: 7.4 },
      { kind: "taxi", axis: "z", roadCoord: -102, pos: 90, dir: 1, speed: 10.6 },
      { kind: "moto", axis: "x", roadCoord: 0, pos: 145, dir: -1, speed: 13.1, color: "#991b1b", style: "commuter", riderOutfit: "#f8fafc" },
      { kind: "car", axis: "x", roadCoord: 0, pos: -145, dir: 1, speed: 11.5, color: "#eab308" },
      // Secondary Neighbourhood Streets & Extra High-Density Metro Fleet
      { kind: "moto", axis: "x", roadCoord: 42, pos: -132, dir: 1, speed: 10.8, color: "#dc2626", style: "delivery", hasGoods: true, riderOutfit: "#0f766e" },
      { kind: "pragya", axis: "x", roadCoord: 172, pos: -40, dir: 1, speed: 7.9, color: "#0284c7" },
      { kind: "moto", axis: "x", roadCoord: 172, pos: 18, dir: -1, speed: 11.6, color: "#1d4ed8", style: "commuter", hasPassenger: true, riderOutfit: "#1e293b", passengerOutfit: "#ec4899" },
      { kind: "pragya", axis: "x", roadCoord: 148, pos: 115, dir: 1, speed: 7.8, color: "#eab308" },
      { kind: "moto", axis: "z", roadCoord: 96, pos: -125, dir: 1, speed: 10.5, color: "#ea580c", style: "delivery", hasGoods: true, riderOutfit: "#0369a1" },
      { kind: "taxi", axis: "x", roadCoord: 0, pos: 26, dir: 1, speed: 10.4 },
      { kind: "pragya", axis: "x", roadCoord: 0, pos: -78, dir: -1, speed: 8.5, color: "#0284c7" },
      { kind: "pragya", axis: "z", roadCoord: 66, pos: -22, dir: -1, speed: 8.2, color: "#eab308" },
      { kind: "moto", axis: "z", roadCoord: -66, pos: 64, dir: -1, speed: 12.1, color: "#15803d", style: "commuter", hasPassenger: true, riderOutfit: "#f8fafc", passengerOutfit: "#b45309" },
      { kind: "taxi", axis: "z", roadCoord: 0, pos: 92, dir: 1, speed: 10.7 },
      { kind: "cargo", axis: "x", roadCoord: -48, pos: 54, dir: -1, speed: 7.0 },
      { kind: "car", axis: "z", roadCoord: 186, pos: -35, dir: 1, speed: 11.2, color: "#0284c7" },
      { kind: "bicycle", axis: "x", roadCoord: 66, pos: -48, dir: 1, speed: 4.8, color: "#1d4ed8", riderOutfit: "#eab308" },
      { kind: "moto", axis: "x", roadCoord: -158, pos: 92, dir: -1, speed: 12.4, color: "#dc2626", style: "sport", riderOutfit: "#0f172a" },
      { kind: "pragya", axis: "z", roadCoord: -102, pos: -72, dir: 1, speed: 8.3, color: "#eab308" },
      { kind: "car", axis: "x", roadCoord: 128, pos: 145, dir: -1, speed: 11.0, color: "#1e3a5f" },
      { kind: "taxi", axis: "x", roadCoord: 66, pos: -90, dir: 1, speed: 10.3 },
      { kind: "moto", axis: "z", roadCoord: -162, pos: 88, dir: -1, speed: 12.0, color: "#b91c1c", style: "commuter", riderOutfit: "#ca8a04" },
    ];

    for (let i = 0; i < trafficSpecs.length; i++) {
      const ts = trafficSpecs[i];
      let group: THREE.Group;
      let chassisGroup: THREE.Group | undefined;
      let wheels: THREE.Mesh[] | undefined;
      let headlightMat: THREE.MeshStandardMaterial;

      if (ts.kind === "moto") {
        const res = createMotorcycleWithRiderMesh(
          {
            tankColor: ts.color,
            style: ts.style,
            hasPassenger: ts.hasPassenger,
            hasGoods: ts.hasGoods,
            riderOutfitColor: ts.riderOutfit,
            passengerOutfitColor: ts.passengerOutfit,
          },
          this.textures
        );
        group = res.group;
        chassisGroup = res.chassisGroup;
        wheels = res.wheels;
        headlightMat = res.headlightMat;
      } else if (ts.kind === "pragya") {
        const res = createPragyaMesh(ts.color ?? "#0284c7", "#6b4f3a", this.textures);
        group = res.group;
        wheels = res.wheels;
        headlightMat = res.headlightMat;
      } else if (ts.kind === "taxi") {
        const res = createTaxiMesh(this.textures);
        group = res.group;
        headlightMat = res.headlightMat;
      } else if (ts.kind === "car") {
        const res = createPrivateCarMesh(ts.color ?? "#cbd5e1", this.textures);
        group = res.group;
        wheels = res.wheels;
        headlightMat = res.headlightMat;
      } else if (ts.kind === "bicycle") {
        const res = createBicycleMesh(ts.color ?? "#15803d", ts.riderOutfit ?? "#f59e0b", this.textures);
        group = res.group;
        chassisGroup = res.chassisGroup;
        wheels = res.wheels;
        headlightMat = res.headlightMat;
      } else {
        const res = createCargoTrikeMesh(this.textures);
        group = res.group;
        headlightMat = res.headlightMat;
      }

      const shift = getLaneShift(ts.roadCoord);
      const x = ts.axis === "x" ? ts.pos : ts.roadCoord - ts.dir * shift;
      const z = ts.axis === "x" ? ts.roadCoord + ts.dir * shift : ts.pos;
      const rotY =
        ts.axis === "x"
          ? ts.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : ts.dir > 0
          ? 0
          : Math.PI;

      group.position.set(x, 0, z);
      group.rotation.y = rotY;
      this.worldRoot.add(group);

      this.traffic.push({
        kind: ts.kind,
        group,
        chassisGroup,
        wheels,
        headlightMat,
        axis: ts.axis,
        roadCoord: ts.roadCoord,
        x,
        z,
        dir: ts.dir,
        rotY,
        leanAngle: 0,
        baseSpeed: ts.speed,
        currentSpeed: ts.speed,
        laneOffset: 0,
        targetLaneOffset: 0,
        stopTimer: 0,
        stopCooldown: 8 + (i % 7) * 3,
        lastCrossCoord: null,
        hornCooldown: 1.5 + (i % 4),
        passByCooldown: 1.5,
        nightActive: i % 3 === 0,
      });
    }
  }

  private buildWeatherParticles() {
    const dustCount = 260;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 60;
      dustPos[i * 3 + 1] = Math.random() * 14 + 0.4;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    this.dustPoints = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: "#e6b88a", size: 0.16, transparent: true, opacity: 0.65 })
    );
    this.dustPoints.visible = false;
    this.scene.add(this.dustPoints);

    const rainCount = 320;
    const rainPos = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 48;
      const ry = Math.random() * 20;
      const rz = (Math.random() - 0.5) * 48;
      rainPos[i * 6] = rx;
      rainPos[i * 6 + 1] = ry;
      rainPos[i * 6 + 2] = rz;
      rainPos[i * 6 + 3] = rx;
      rainPos[i * 6 + 4] = ry - 0.9;
      rainPos[i * 6 + 5] = rz;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    this.rainLines = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({ color: "#cbd5e1", transparent: true, opacity: 0.55 })
    );
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      this.keys[e.code] = true;

      if (this.paused) return;

      if (e.code === this.keyBindings.interact) {
        if (this.nearbyInteractable) {
          this.handlePrimaryInteract();
        }
      } else if (e.code === this.keyBindings.vehicleToggle) {
        this.handleVehicleToggle();
      } else if (e.code === this.keyBindings.horn && this.drivingVehicle) {
        this.triggerHorn();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      this.audio.init();
      // When touch controls are active, MobileTouchControls manages touch camera swipes + pinch zoom
      if (this.touchControlsActive && e.pointerType === "touch") return;
      if (this.activeDragPointerId !== null) return;
      this.isPointerDragging = true;
      this.activeDragPointerId = e.pointerId;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isPointerDragging || e.pointerId !== this.activeDragPointerId || this.paused) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.rotateCamera(dx, dy);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === this.activeDragPointerId) {
        this.isPointerDragging = false;
        this.activeDragPointerId = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && !this.paused) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (this.pinchDistPrev !== null) {
          this.adjustZoom((this.pinchDistPrev - dist) * 0.045);
        }
        this.pinchDistPrev = dist;
      }
    };

    const onTouchEnd = () => {
      this.pinchDistPrev = null;
    };

    const onWheel = (e: WheelEvent) => {
      this.adjustZoom(e.deltaY * 0.005);
    };

    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      this.callbacks.onWebGLContextChange?.(true);
    };
    const onContextRestored = () => {
      this.callbacks.onWebGLContextChange?.(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    dom.addEventListener("touchmove", onTouchMove, { passive: true });
    dom.addEventListener("touchend", onTouchEnd, { passive: true });
    dom.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", onResize);
    dom.addEventListener("webglcontextlost", onContextLost);
    dom.addEventListener("webglcontextrestored", onContextRestored);

    this.cleanupListeners = () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      dom.removeEventListener("touchmove", onTouchMove);
      dom.removeEventListener("touchend", onTouchEnd);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("webglcontextlost", onContextLost);
      dom.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }

  private cleanupListeners: () => void = () => {};

  private isActionPressed(action: keyof KeyBindings): boolean {
    const bound = this.keyBindings[action];
    if (this.keys[bound]) return true;
    // Ergonomic secondary defaults when default WASD / Shift keys are active
    if (action === "forward" && bound === "KeyW" && this.keys["ArrowUp"]) return true;
    if (action === "backward" && bound === "KeyS" && this.keys["ArrowDown"]) return true;
    if (action === "left" && bound === "KeyA" && this.keys["ArrowLeft"]) return true;
    if (action === "right" && bound === "KeyD" && this.keys["ArrowRight"]) return true;
    if (action === "run" && bound === "ShiftLeft" && this.keys["ShiftRight"]) return true;
    return false;
  }

  public setKeyBindings(bindings: KeyBindings) {
    this.keyBindings = { ...bindings };
  }

  public setTouchControlsActive(active: boolean) {
    this.touchControlsActive = active;
    if (!active) {
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.virtualRun = false;
    } else if (this.activeDragPointerId !== null) {
      this.isPointerDragging = false;
      this.activeDragPointerId = null;
    }
  }

  public setCameraSensitivity(sens: number) {
    this.cameraSensitivity = THREE.MathUtils.clamp(sens, 0.35, 2.5);
  }

  public rotateCamera(dx: number, dy: number) {
    const mult = this.cameraSensitivity;
    this.camYawTarget -= dx * 0.0055 * mult;
    this.camPitchTarget = THREE.MathUtils.clamp(
      this.camPitchTarget + dy * 0.0045 * mult,
      0.08,
      1.15
    );
  }

  public adjustZoom(delta: number) {
    if (this.activeInteriorSpec) {
      this.camDist = THREE.MathUtils.clamp(this.camDist + delta, 2.8, 7.2);
    } else {
      this.camDist = THREE.MathUtils.clamp(this.camDist + delta, 5, 24);
    }
  }

  public setVirtualMove(x: number, y: number) {
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveY = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setVirtualRun(active: boolean) {
    this.virtualRun = active;
  }

  public triggerJump() {
    if (this.paused || this.drivingVehicle || this.servicePassengerRiding) return;
    if (this.isGrounded) {
      this.playerVelY = 7.4;
      this.isGrounded = false;
      this.energyDrainBuffer += 0.35;
    }
  }

  public setVehicleControls(ctrl: {
    throttle?: number;
    steer?: number;
    brake?: boolean;
    handbrake?: boolean;
  }) {
    if (ctrl.throttle !== undefined) this.vehicleInput.throttle = THREE.MathUtils.clamp(ctrl.throttle, -1, 1);
    if (ctrl.steer !== undefined) this.vehicleInput.steer = THREE.MathUtils.clamp(ctrl.steer, -1, 1);
    if (ctrl.brake !== undefined) this.vehicleInput.brake = ctrl.brake;
    if (ctrl.handbrake !== undefined) this.vehicleInput.handbrake = ctrl.handbrake;
  }

  public triggerHorn() {
    if (!this.drivingVehicle || this.paused) return;
    this.audio.init();
    this.audio.playTrafficHorn(
      this.drivingVehicle.kind === "motorcycle" ? "moto" : "pragya",
      this.drivingVehicle.x,
      this.drivingVehicle.z
    );
  }

  public setDevicePerformanceProfile(
    deviceClass: DeviceClass,
    quality: GraphicsQuality,
    resolutionScale: number
  ) {
    this.deviceClass = deviceClass;
    this.applyGraphicsSettings(quality, resolutionScale);
  }

  public applyGraphicsSettings(quality: GraphicsQuality, resolutionScale: number) {
    this.graphicsQuality = quality;
    this.resolutionScale = THREE.MathUtils.clamp(resolutionScale, 0.5, 1.0);

    const isMobile = this.deviceClass === "mobile";
    const isTablet = this.deviceClass === "tablet";
    const devicePrCap = isMobile ? 1.25 : isTablet ? 1.5 : 2.0;
    const qualityPrCap = quality === "low" ? 1.0 : quality === "medium" ? 1.5 : 2.0;
    const maxPr = Math.min(devicePrCap, qualityPrCap);
    const basePr = this.isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, maxPr);
    this.renderer.setPixelRatio(Math.max(0.55, basePr * this.resolutionScale));

    const enableShadows = !this.isSoftwareGl && quality !== "low";
    this.renderer.shadowMap.enabled = enableShadows;
    this.sunLight.castShadow = enableShadows;

    const targetShadowSize = isMobile ? 512 : isTablet || quality === "medium" ? 1024 : 2048;
    if (enableShadows && this.sunLight.shadow.mapSize.width !== targetShadowSize) {
      this.sunLight.shadow.mapSize.width = targetShadowSize;
      this.sunLight.shadow.mapSize.height = targetShadowSize;
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }

    if (quality === "low" || isMobile) {
      this.camera.far = quality === "low" ? 220 : 280;
      this.crowdUpdateRadius = quality === "low" ? 44 : 62;
      this.trafficUpdateRadius = quality === "low" ? 95 : 135;
      this.labelMaxDist = quality === "low" ? 105 : 130;
      this.sectorStreamRadius = quality === "low" ? 120 : 155;
    } else if (quality === "medium" || isTablet) {
      this.camera.far = 360;
      this.crowdUpdateRadius = isTablet ? 78 : 86;
      this.trafficUpdateRadius = isTablet ? 165 : 175;
      this.labelMaxDist = 155;
      this.sectorStreamRadius = 175;
    } else {
      this.camera.far = 560;
      this.crowdUpdateRadius = 120;
      this.trafficUpdateRadius = 260;
      this.labelMaxDist = 195;
      this.sectorStreamRadius = 225;
    }
    this.lastSectorSync = -10;
    this.camera.updateProjectionMatrix();
  }

  private handlePrimaryInteract() {
    if (!this.nearbyInteractable) return;
    if (
      this.drivingVehicle &&
      this.nearbyInteractable.kind !== "delivery" &&
      this.nearbyInteractable.kind !== "job_action"
    ) {
      return;
    }

    this.audio.playChime("interact");
    this.callbacks.onInteract(this.nearbyInteractable);
  }

  public handleVehicleToggle() {
    if (this.servicePassengerRiding) {
      this.dismountServiceRide();
      return;
    }
    if (this.drivingVehicle) {
      this.exitVehicle();
      return;
    }
    if (!this.nearbyVehicleInteractable) return;
    const veh = this.drivables.find((v) => v.id === this.nearbyVehicleInteractable!.id);
    if (veh) {
      this.drivingVehicle = veh;
      this.playerRig.root.visible = true;
      setCharacterPose(this.playerRig, veh.kind);
      this.vehicleInput = { throttle: 0, steer: 0, brake: false, handbrake: false };
      this.audio.playChime("interact");
    }
  }

  public triggerNearbyInteraction() {
    this.handlePrimaryInteract();
  }

  public exitVehicle() {
    if (!this.drivingVehicle) return;
    const veh = this.drivingVehicle;
    const offsets: Array<[number, number]> = [
      [Math.cos(veh.rotY) * 1.85, -Math.sin(veh.rotY) * 1.85],
      [-Math.cos(veh.rotY) * 1.85, Math.sin(veh.rotY) * 1.85],
      [-Math.sin(veh.rotY) * 2.1, -Math.cos(veh.rotY) * 2.1],
      [Math.sin(veh.rotY) * 2.1, Math.cos(veh.rotY) * 2.1],
    ];
    let safePos = this.resolveCollisions(veh.x + offsets[0][0], veh.z + offsets[0][1], 0.48);
    for (const [ox, oz] of offsets) {
      const candidateX = veh.x + ox;
      const candidateZ = veh.z + oz;
      const check = this.collisionWorld.resolveCircle2D(
        candidateX,
        candidateZ,
        0.48,
        COLLIDER_MASK_SOLID
      );
      if (!check.collided) {
        safePos = this.resolveCollisions(candidateX, candidateZ, 0.48);
        break;
      }
    }
    this.playerPos.set(safePos.x, getTamaleGroundHeight(safePos.x, safePos.z, 0), safePos.z);
    this.playerVelX = 0;
    this.playerVelZ = 0;
    this.drivingVehicle.group.rotation.z = 0;
    this.drivingVehicle.speed = 0;
    this.drivingVehicle = null;
    this.vehicleInput = { throttle: 0, steer: 0, brake: false, handbrake: false };
    setCharacterPose(this.playerRig, "foot");
    this.playerRig.root.visible = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerRotY;
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.keys = {};
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.vehicleInput = { throttle: 0, steer: 0, brake: false, handbrake: false };
      this.audio.stopVoiceClip();
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (mode === "wide") {
      this.camDist = 15.5;
      this.camPitch = 0.42;
      this.camPitchTarget = 0.42;
    } else if (mode === "overhead") {
      this.camDist = 22;
      this.camPitch = 1.05;
      this.camPitchTarget = 1.05;
    } else {
      this.camDist = 9.5;
      this.camPitch = 0.28;
      this.camPitchTarget = 0.28;
    }
  }

  public setWeather(w: WeatherType) {
    this.weather = w;
    const outdoors = !this.activeInteriorSpec;
    this.dustPoints.visible = outdoors && w === "harmattan";
    this.rainLines.visible = outdoors && (w === "light_rain" || w === "rain" || w === "thunderstorm");
  }

  public isIndoors(): boolean {
    return this.activeInteriorSpec !== null;
  }

  public getActiveInterior(): InteriorRoomSpec | null {
    return this.activeInteriorSpec;
  }

  public enterInterior(landmarkId: string): boolean {
    const spec = getInteriorSpecForLandmark(landmarkId);
    if (!spec) return false;
    if (this.activeInteriorSpec) {
      if (this.activeInteriorSpec.landmarkId === spec.landmarkId) return true;
      this.exitInterior();
    }
    if (this.servicePassengerRiding) {
      this.dismountServiceRide();
    }
    if (this.drivingVehicle) {
      this.exitVehicle();
    }

    this.exteriorReturnPos.copy(this.playerPos);
    this.exteriorReturnRotY = this.playerRotY;
    this.exteriorCamDist = this.camDist;
    this.exteriorCamPitch = this.camPitch;
    this.playerVelX = 0;
    this.playerVelZ = 0;

    const built = buildPhysicalInteriorScene(spec, this.textures);
    this.activeInteriorSpec = spec;
    this.activeInteriorScene = built;

    this.worldRoot.visible = false;
    this.interiorRoot.add(built.group);
    this.interiorRoot.visible = true;
    this.dustPoints.visible = false;
    this.rainLines.visible = false;

    this.playerPos.set(spec.spawnX, 0, spec.spawnZ);
    this.playerVelY = 0;
    this.isGrounded = true;
    this.playerRotY = Math.PI;
    setCharacterPose(this.playerRig, "foot");
    this.playerRig.root.visible = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.set(0, this.playerRotY, 0);

    this.camDist = Math.min(5.2, Math.max(3.2, spec.depth * 0.4));
    this.camPitch = 0.24;
    this.camPitchTarget = 0.24;
    this.camYaw = 0;
    this.camYawTarget = 0;
    this.camera.position.set(
      this.playerPos.x,
      Math.min(spec.height - 0.5, 2.6),
      Math.min(spec.depth / 2 - 0.5, this.playerPos.z + this.camDist)
    );

    this.audio.playChime("interact");
    this.callbacks.onInteriorChange?.(spec);
    this.lastHudSync = 0;
    return true;
  }

  public exitInterior() {
    if (!this.activeInteriorSpec) return;
    const exitedLandmarkId = this.activeInteriorSpec.landmarkId;
    if (this.activeInteriorScene) {
      this.interiorRoot.remove(this.activeInteriorScene.group);
      this.activeInteriorScene.dispose();
      this.activeInteriorScene = null;
    }
    this.activeInteriorSpec = null;
    this.interiorRoot.visible = false;
    this.worldRoot.visible = true;

    const dw = this.doorways.find((d) => d.landmarkId === exitedLandmarkId);
    const desiredReturnX = dw ? dw.doorX + dw.normalX * 1.15 : this.exteriorReturnPos.x;
    const desiredReturnZ = dw ? dw.doorZ + dw.normalZ * 1.15 : this.exteriorReturnPos.z;
    const safeExit = this.resolveCollisions(desiredReturnX, desiredReturnZ, 0.48);

    this.playerPos.set(safeExit.x, getTamaleGroundHeight(safeExit.x, safeExit.z, 0), safeExit.z);
    this.playerVelX = 0;
    this.playerVelZ = 0;
    this.playerVelY = 0;
    this.isGrounded = true;
    this.playerRotY = dw ? Math.atan2(dw.normalX, dw.normalZ) : this.exteriorReturnRotY;
    setCharacterPose(this.playerRig, "foot");
    this.playerRig.root.visible = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.set(0, this.playerRotY, 0);

    this.camDist = this.exteriorCamDist;
    this.camPitch = this.exteriorCamPitch;
    this.camPitchTarget = this.exteriorCamPitch;
    this.setWeather(this.weather);
    this.lastSectorSync = -10;

    this.audio.playChime("interact");
    this.callbacks.onInteriorChange?.(null);
    this.lastHudSync = 0;
  }

  public setGameMinutes(mins: number) {
    const next = ((mins % 1440) + 1440) % 1440;
    const rawDiff = Math.abs(next - this.gameMinutes);
    const circularDiff = Math.min(rawDiff, 1440 - rawDiff);
    this.gameMinutes = next;
    if (circularDiff > 20) {
      this.npcController?.onTimeJump(this.gameMinutes);
    }
    this.lastHudSync = 0;
  }

  public getGameMinutes(): number {
    return this.gameMinutes;
  }

  public setActiveErrandLandmark(landmarkId: string | null) {
    this.activeErrandLandmarkId = landmarkId;
    if (!landmarkId) {
      this.deliveryBeacon.visible = false;
      return;
    }
    const lm = TAMALE_LANDMARKS.find((l) => l.id === landmarkId);
    if (lm) {
      this.deliveryBeacon.position.set(lm.x, 7, lm.z);
      this.deliveryBeacon.visible = true;
    }
  }

  public setActiveGigLandmark(landmarkId: string | null) {
    this.activeGigLandmarkId = landmarkId;
    if (!landmarkId) {
      this.gigBeacon.visible = false;
      return;
    }
    const lm = TAMALE_LANDMARKS.find((l) => l.id === landmarkId);
    if (lm) {
      this.gigBeacon.position.set(lm.x, 7.5, lm.z);
      this.gigBeacon.visible = true;
    }
  }

  public setActivePlayableCharacter(characterId: string) {
    this.activePlayableId = characterId;
    for (const entry of this.ambientPlayableCharacters) {
      entry.rig.root.visible = entry.id !== characterId;
    }
  }

  public setPlayerEnergyRatio(ratio: number) {
    this.playerEnergyRatio = THREE.MathUtils.clamp(ratio, 0, 1);
  }

  public setActiveTaskState(task: ActiveTaskRuntime | null) {
    this.activeTaskRuntime = task;
    if (!task) {
      this.setActiveGigLandmark(null);
      if (this.gigPassengerRig) {
        this.gigPassengerRig.root.visible = false;
      }
      return;
    }
    const targetLandmarkId =
      task.stage === "go_to_pickup" && task.job.pickupLandmarkId
        ? task.job.pickupLandmarkId
        : task.job.targetLandmarkId;
    this.setActiveGigLandmark(targetLandmarkId);

    if (this.gigPassengerRig) {
      if (
        task.job.executionMode === "transport_passenger" &&
        task.stage === "go_to_pickup" &&
        task.job.pickupLandmarkId
      ) {
        const lm = TAMALE_LANDMARKS.find((l) => l.id === task.job.pickupLandmarkId);
        if (lm) {
          this.gigPassengerRig.root.position.set(lm.x + 2.4, 0, lm.z + 2.4);
          this.gigPassengerRig.root.rotation.y = Math.atan2(
            this.playerPos.x - lm.x,
            this.playerPos.z - lm.z
          );
          setCharacterPose(this.gigPassengerRig, "foot");
          this.gigPassengerRig.root.visible = true;
        }
      } else if (task.job.executionMode !== "transport_passenger") {
        this.gigPassengerRig.root.visible = false;
      }
    }
  }

  public captureViewportSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/jpeg", 0.86);
  }

  private nearestCoord(val: number, coords: number[]): number {
    let best = coords[0];
    let bestD = Math.abs(val - best);
    for (const c of coords) {
      const d = Math.abs(val - c);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }

  private plotRoadRoute(
    sx: number,
    sz: number,
    tx: number,
    tz: number
  ): Array<{ x: number; z: number }> {
    return findRoadRoute(sx, sz, tx, tz, {
      sidewalkOffset: 0,
      directThreshold: 24,
    });
  }

  private removeActiveServiceMesh() {
    if (!this.activeService) return;
    this.worldRoot.remove(this.activeService.group);
    this.activeService = null;
  }

  public dispatchServiceRequest(
    req: ServiceRequestRuntime,
    pickupPos: { x: number; z: number } = { x: this.playerPos.x + 2, z: this.playerPos.z + 2 }
  ) {
    if (this.servicePassengerRiding) {
      this.dismountServiceRide();
    }
    this.removeActiveServiceMesh();

    // Pick a realistic nearby on-road spawn point clamped cleanly within the street bounds
    const ew = this.nearestCoord(pickupPos.z, ALL_EW_ROAD_COORDS);
    const roadBounds = getRoadExtentBounds("x", ew);
    const ns = this.nearestCoord(pickupPos.x, ALL_NS_ROAD_COORDS);
    const spawnOffsetX = pickupPos.x >= 0 ? -90 : 90;
    const spawnX = THREE.MathUtils.clamp(ns + spawnOffsetX, roadBounds.min + 8, roadBounds.max - 8);
    const spawnZ = ew + getLaneShift(ew);

    let built: {
      group: THREE.Group;
      wheels?: THREE.Mesh[];
      headlightMat: THREE.MeshStandardMaterial;
    };
    if (
      req.kind === "moto_ride" ||
      req.kind === "food_delivery" ||
      req.kind === "parcel_delivery" ||
      req.kind === "roadside_repair" ||
      req.kind === "personal_errand"
    ) {
      const tankColor =
        req.kind === "food_delivery"
          ? "#ea580c"
          : req.kind === "parcel_delivery"
          ? "#0284c7"
          : req.kind === "roadside_repair"
          ? "#15803d"
          : req.kind === "personal_errand"
          ? "#0f766e"
          : "#dc2626";
      built = createMotorcycleWithRiderMesh(
        {
          tankColor,
          style: req.kind === "moto_ride" ? "commuter" : "delivery",
          hasGoods: req.kind !== "moto_ride",
          riderOutfitColor: req.kind === "food_delivery" ? "#f97316" : "#0f172a",
        },
        this.textures
      );
    } else if (req.kind === "pragya_ride" || req.kind === "grocery_delivery") {
      built = createPragyaMesh(
        req.kind === "grocery_delivery" ? "#16a34a" : "#0284c7",
        "#6b4f3a",
        this.textures
      );
    } else if (req.kind === "cargo_moving" || req.kind === "business_supply_delivery") {
      built = createCargoTrikeMesh(this.textures);
    } else {
      built = createTaxiMesh(this.textures);
    }

    // Add high-visibility gold ring marker so player spots their dispatched vehicle easily
    const markerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 8, 18),
      new THREE.MeshBasicMaterial({ color: "#fbbf24" })
    );
    markerRing.rotation.x = Math.PI / 2;
    markerRing.position.y = 2.65;
    built.group.add(markerRing);

    built.group.position.set(spawnX, 0, spawnZ);
    this.worldRoot.add(built.group);

    const waypoints = this.plotRoadRoute(spawnX, spawnZ, pickupPos.x, pickupPos.z);
    const speed =
      req.kind === "moto_ride" ||
      req.kind === "food_delivery" ||
      req.kind === "parcel_delivery" ||
      req.kind === "roadside_repair" ||
      req.kind === "personal_errand"
        ? 16.5
        : req.kind === "taxi_ride"
        ? 14.5
        : 12.2;

    const dispatched: ServiceRequestRuntime = {
      ...req,
      status: "en_route_to_player",
      providerX: spawnX,
      providerZ: spawnZ,
      etaSeconds: Math.max(
        4,
        Math.round(Math.hypot(pickupPos.x - spawnX, pickupPos.z - spawnZ) / speed)
      ),
      statusNote: `${req.providerName} is navigating Tamale roads toward you.`,
    };

    this.activeService = {
      request: dispatched,
      pickupPos,
      group: built.group,
      wheels: built.wheels,
      headlightMat: built.headlightMat,
      x: spawnX,
      z: spawnZ,
      rotY: 0,
      speed,
      waypoints,
      wpIdx: 0,
      despawnTimer: 0,
    };

    this.audio.playChime("interact");
    this.callbacks.onServiceUpdate?.(dispatched);
  }

  public boardServiceVehicle() {
    if (!this.activeService) return;
    const srv = this.activeService;
    if (
      srv.request.kind !== "moto_ride" &&
      srv.request.kind !== "pragya_ride" &&
      srv.request.kind !== "taxi_ride" &&
      srv.request.kind !== "cargo_moving"
    ) {
      return;
    }
    if (srv.request.destinationX === undefined || srv.request.destinationZ === undefined) {
      return;
    }
    if (this.drivingVehicle) {
      this.exitVehicle();
    }

    this.servicePassengerRiding = true;
    const destX = srv.request.destinationX;
    const destZ = srv.request.destinationZ;
    srv.waypoints = this.plotRoadRoute(srv.x, srv.z, destX, destZ);
    srv.wpIdx = 0;

    if (srv.request.kind === "taxi_ride") {
      this.playerRig.root.visible = false;
    } else if (srv.request.kind === "moto_ride") {
      this.playerRig.root.visible = true;
      setCharacterPose(this.playerRig, "motorcycle");
    } else {
      this.playerRig.root.visible = true;
      setCharacterPose(this.playerRig, "pragya");
    }

    const dist = Math.hypot(destX - srv.x, destZ - srv.z);
    srv.request = {
      ...srv.request,
      status: "in_transit_to_dest",
      etaSeconds: Math.max(4, Math.round(dist / srv.speed)),
      statusNote: `Riding toward ${srv.request.destinationName ?? "destination"}.`,
    };
    this.audio.playChime("interact");
    this.callbacks.onServiceUpdate?.(srv.request);
  }

  public collectServiceDelivery() {
    if (!this.activeService) return;
    const srv = this.activeService;
    const completedReq: ServiceRequestRuntime = {
      ...srv.request,
      status: "completed",
      etaSeconds: 0,
      statusNote: "Completed!",
    };
    srv.request = completedReq;
    srv.despawnTimer = 3.2;
    this.audio.playChime("success");
    this.callbacks.onServiceUpdate?.(completedReq);
  }

  private dismountServiceRide() {
    if (!this.servicePassengerRiding) return;
    this.servicePassengerRiding = false;
    setCharacterPose(this.playerRig, "foot");
    this.playerRig.root.visible = true;
    if (this.activeService) {
      this.playerPos.set(
        this.activeService.x + Math.cos(this.activeService.rotY) * 1.9,
        0,
        this.activeService.z - Math.sin(this.activeService.rotY) * 1.9
      );
      this.playerRig.root.position.copy(this.playerPos);
      this.activeService.despawnTimer = 3.5;
      this.activeService.request = {
        ...this.activeService.request,
        status: "cancelled",
      };
    }
    this.callbacks.onServiceUpdate?.(null);
  }

  public cancelActiveService() {
    if (this.servicePassengerRiding) {
      this.dismountServiceRide();
    }
    this.removeActiveServiceMesh();
    this.callbacks.onServiceUpdate?.(null);
  }

  public teleportTo(x: number, z: number, rotY = 0) {
    if (this.activeInteriorSpec) {
      this.exitInterior();
    }
    if (this.servicePassengerRiding) {
      this.dismountServiceRide();
    }
    if (this.drivingVehicle) {
      this.exitVehicle();
    }
    this.playerPos.set(x, 0, z);
    this.playerRotY = rotY;
    setCharacterPose(this.playerRig, "foot");
    this.playerRig.root.visible = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = rotY;
  }

  private resolveCollisions(nx: number, nz: number, radius: number): { x: number; z: number } {
    const res = this.collisionWorld.resolveCircle2D(
      nx,
      nz,
      radius,
      COLLIDER_MASK_ALL_WITH_VEHICLES,
      this.getDynamicVehicles()
    );
    return { x: res.x, z: res.z };
  }

  private resolvePlayerMovementCollisions(
    nx: number,
    nz: number,
    radius: number
  ): { x: number; z: number } {
    if (this.activeInteriorSpec && this.activeInteriorScene) {
      const res = resolveInteriorCircle2D(
        nx,
        nz,
        radius,
        this.activeInteriorSpec.width,
        this.activeInteriorSpec.depth,
        this.activeInteriorScene.colliders
      );
      return { x: res.x, z: res.z };
    }
    const res = this.collisionWorld.sweepMove2D(
      this.playerPos.x,
      this.playerPos.z,
      nx,
      nz,
      radius,
      COLLIDER_MASK_ALL_WITH_VEHICLES,
      this.getDynamicVehicles()
    );
    return { x: res.x, z: res.z };
  }

  private updatePlayerAndVehicle(dt: number) {
    if (this.paused) return;

    if (this.servicePassengerRiding && this.activeService) {
      const srv = this.activeService;
      const isMoto = srv.request.kind === "moto_ride";
      const isTaxi = srv.request.kind === "taxi_ride";
      const localZ = isMoto ? -0.45 : isTaxi ? 0 : -0.78;
      const localY = isMoto ? 0.24 : 0.16;
      const worldX = srv.x + Math.sin(srv.rotY) * localZ;
      const worldZ = srv.z + Math.cos(srv.rotY) * localZ;
      this.playerPos.set(worldX, localY, worldZ);
      this.playerRotY = srv.rotY;
      this.playerRig.root.position.set(worldX, localY, worldZ);
      this.playerRig.root.rotation.y = srv.rotY;
      if (!this.isPointerDragging) {
        this.camYawTarget = THREE.MathUtils.damp(this.camYawTarget, srv.rotY + Math.PI, 2.2, dt);
      }
      this.playerMoving = true;
      this.playerRunning = false;
      return;
    }

    if (this.drivingVehicle) {
      const veh = this.drivingVehicle;
      const isMoto = veh.kind === "motorcycle";

      const keyThrottle =
        (this.isActionPressed("forward") ? 1 : 0) - (this.isActionPressed("backward") ? 1 : 0);
      const keySteer =
        (this.isActionPressed("left") ? 1 : 0) - (this.isActionPressed("right") ? 1 : 0);

      const throttle =
        keyThrottle !== 0
          ? keyThrottle
          : this.vehicleInput.brake
          ? veh.speed > 0.6
            ? -1
            : -0.7
          : this.vehicleInput.throttle;
      const steer = keySteer !== 0 ? keySteer : this.vehicleInput.steer;
      const handbrake = this.isActionPressed("jump") || this.vehicleInput.handbrake;

      const wetTraction =
        this.weather === "rain" || this.weather === "thunderstorm"
          ? 0.88
          : this.weather === "light_rain"
          ? 0.94
          : 1.0;
      const maxSpeed = (isMoto ? 24.5 : 16.5) * wetTraction;
      const reverseMax = isMoto ? -4.5 : -6.8;
      const accelRate = (isMoto ? 25 : 16.5) * wetTraction;
      const brakeRate = (isMoto ? 24 : 18) * wetTraction;
      const turnRate = (isMoto ? 2.75 : 1.95) * wetTraction;

      if (handbrake) {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, isMoto ? 7.5 : 5.5, dt);
      } else if (throttle > 0) {
        veh.speed = THREE.MathUtils.clamp(veh.speed + throttle * accelRate * dt, reverseMax, maxSpeed);
      } else if (throttle < 0) {
        const decel = veh.speed > 0 ? brakeRate : accelRate * 0.72;
        veh.speed = THREE.MathUtils.clamp(veh.speed + throttle * decel * dt, reverseMax, maxSpeed);
      } else {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, isMoto ? 2.8 : 3.6, dt);
      }

      if (Math.abs(veh.speed) > 0.3) {
        const dirSign = veh.speed >= 0 ? 1 : -1;
        const speedRatio = Math.min(1, Math.abs(veh.speed) / (isMoto ? 6 : 4.5));
        veh.rotY += steer * dirSign * turnRate * (0.55 + 0.45 * speedRatio) * dt;
      }

      // Motorcycle leans into curves; Pragya has subtle suspension body roll
      const targetLean = isMoto
        ? -steer * Math.min(1, Math.abs(veh.speed) / 8) * 0.28
        : steer * Math.min(1, Math.abs(veh.speed) / 10) * 0.075;
      veh.group.rotation.z = THREE.MathUtils.damp(veh.group.rotation.z, targetLean, 8, dt);

      const nextX = veh.x + Math.sin(veh.rotY) * veh.speed * dt;
      const nextZ = veh.z + Math.cos(veh.rotY) * veh.speed * dt;
      const dynVehicles = this.getDynamicVehicles();
      const resolved = this.collisionWorld.sweepMove2D(
        veh.x,
        veh.z,
        nextX,
        nextZ,
        isMoto ? 0.82 : 1.15,
        COLLIDER_MASK_ALL_WITH_VEHICLES,
        dynVehicles,
        veh.id
      );
      veh.x = resolved.x;
      veh.z = resolved.z;
      if (resolved.collided && Math.abs(veh.speed) > 1.8) {
        veh.speed *= 0.48;
      }

      // Trigger realistic horn reaction if bumping close to active traffic
      for (const tv of this.traffic) {
        if (!tv.group.visible) continue;
        const dist = Math.hypot(veh.x - tv.x, veh.z - tv.z);
        if (dist < (isMoto ? 2.2 : 2.7)) {
          if (tv.hornCooldown <= 0) {
            tv.hornCooldown = 3.0;
            this.audio.playTrafficHorn(
              tv.kind === "bicycle" ? "moto" : tv.kind === "cargo" ? "pragya" : tv.kind,
              tv.x,
              tv.z
            );
          }
        }
      }

      const vehGroundY = getTamaleGroundHeight(veh.x, veh.z, 0);
      veh.group.position.set(veh.x, vehGroundY, veh.z);
      veh.group.rotation.y = veh.rotY;

      for (const w of veh.wheels) {
        w.rotation.x += veh.speed * dt * 2.4;
      }

      // Keep visible driver seated cleanly on Pragya saddle / Motorcycle seat
      const driverLocalZ = isMoto ? -0.1 : 0.08;
      const driverLocalY = vehGroundY + (isMoto ? 0.22 : 0.16);
      const driverX = veh.x + Math.sin(veh.rotY) * driverLocalZ;
      const driverZ = veh.z + Math.cos(veh.rotY) * driverLocalZ;
      this.playerRig.root.visible = true;
      this.playerRig.root.position.set(driverX, driverLocalY, driverZ);
      this.playerRig.root.rotation.y = veh.rotY;
      this.playerRig.root.rotation.z = veh.group.rotation.z;

      // If transporting a live passenger on a transport_passenger gig, seat them behind the driver
      if (
        this.gigPassengerRig &&
        this.activeTaskRuntime?.job.executionMode === "transport_passenger" &&
        this.activeTaskRuntime.stage === "go_to_destination"
      ) {
        const paxLocalZ = isMoto ? -0.52 : -0.78;
        const paxLocalY = vehGroundY + (isMoto ? 0.24 : 0.16);
        this.gigPassengerRig.root.visible = true;
        setCharacterPose(this.gigPassengerRig, isMoto ? "motorcycle" : "pragya");
        this.gigPassengerRig.root.position.set(
          veh.x + Math.sin(veh.rotY) * paxLocalZ,
          paxLocalY,
          veh.z + Math.cos(veh.rotY) * paxLocalZ
        );
        this.gigPassengerRig.root.rotation.y = veh.rotY;
        this.gigPassengerRig.root.rotation.z = veh.group.rotation.z;
      }

      this.playerPos.set(veh.x, vehGroundY, veh.z);
      this.playerRotY = veh.rotY;
      this.playerMoving = Math.abs(veh.speed) > 0.3;
      this.playerRunning = false;
      if (!this.isPointerDragging) {
        this.camYawTarget = THREE.MathUtils.damp(this.camYawTarget, veh.rotY + Math.PI, 2.2, dt);
      }
      return;
    }

    this.playerRig.root.rotation.z = 0;

    const keyFwd =
      (this.isActionPressed("forward") ? 1 : 0) - (this.isActionPressed("backward") ? 1 : 0);
    const keyStrafe =
      (this.isActionPressed("right") ? 1 : 0) - (this.isActionPressed("left") ? 1 : 0);

    const forwardInput = keyFwd !== 0 ? keyFwd : this.virtualMoveY;
    const strafeInput = keyStrafe !== 0 ? keyStrafe : this.virtualMoveX;

    const inputMag = Math.min(1, Math.hypot(forwardInput, strafeInput));
    const isInputActive = inputMag > 0.08;
    const lowEnergyScale = this.playerEnergyRatio < 0.15 ? 0.72 : 1.0;
    const isRunning =
      (this.isActionPressed("run") || this.virtualRun || inputMag > 0.86) &&
      this.playerEnergyRatio > 0.08;
    const targetSpeed = isInputActive
      ? (isRunning ? 10.5 : 5.6) *
        lowEnergyScale *
        (keyFwd !== 0 || keyStrafe !== 0 ? 1 : Math.max(0.45, inputMag))
      : 0;

    let targetVelX = 0;
    let targetVelZ = 0;
    if (isInputActive) {
      const forwardX = -Math.sin(this.camYaw);
      const forwardZ = -Math.cos(this.camYaw);
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);

      let dirX = forwardX * forwardInput + rightX * strafeInput;
      let dirZ = forwardZ * forwardInput + rightZ * strafeInput;
      const len = Math.hypot(dirX, dirZ) || 1;
      dirX /= len;
      dirZ /= len;
      targetVelX = dirX * targetSpeed;
      targetVelZ = dirZ * targetSpeed;
    }

    const velDamp = isInputActive ? (this.isGrounded ? 18 : 8) : 14;
    this.playerVelX = THREE.MathUtils.damp(this.playerVelX, targetVelX, velDamp, dt);
    this.playerVelZ = THREE.MathUtils.damp(this.playerVelZ, targetVelZ, velDamp, dt);

    const currentSpeed = Math.hypot(this.playerVelX, this.playerVelZ);
    const isMoving = currentSpeed > 0.22;
    this.playerMoving = isMoving;
    this.playerRunning = isMoving && isRunning;

    if (isMoving) {
      const nextX = this.playerPos.x + this.playerVelX * dt;
      const nextZ = this.playerPos.z + this.playerVelZ * dt;
      const resolved = this.resolvePlayerMovementCollisions(nextX, nextZ, 0.48);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;

      if (isInputActive) {
        const targetYaw = Math.atan2(targetVelX, targetVelZ);
        let angleDiff = targetYaw - this.playerRotY;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.playerRotY += angleDiff * Math.min(1, dt * 13);
      }

      const speedRatio = Math.min(1.25, currentSpeed / 5.6);
      this.walkPhase += dt * (isRunning ? 13.5 : 8.8) * Math.max(0.5, speedRatio);
      this.energyDrainBuffer += dt * (isRunning ? 0.18 : 0.045);
      if (this.isGrounded) {
        this.audio.playFootstep(isRunning);
      }
    } else {
      this.walkPhase = THREE.MathUtils.damp(this.walkPhase, 0, 8, dt);
    }

    if (this.energyDrainBuffer >= 0.45) {
      const amt = Math.round(this.energyDrainBuffer * 10) / 10;
      this.energyDrainBuffer = 0;
      this.callbacks.onEnergyDrain?.(amt);
    }

    if (this.isActionPressed("jump") && this.isGrounded) {
      this.playerVelY = 7.4;
      this.isGrounded = false;
      this.energyDrainBuffer += 0.35;
    }
    this.playerVelY -= 20 * dt;
    this.playerPos.y += this.playerVelY * dt;
    const groundY = this.activeInteriorSpec
      ? 0
      : getTamaleGroundHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    if (this.playerPos.y <= groundY) {
      this.playerPos.y = groundY;
      this.playerVelY = 0;
      this.isGrounded = true;
    }

    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerRotY;

    const swing = isMoving ? Math.sin(this.walkPhase) * (isRunning ? 0.78 : 0.48) : 0;
    this.playerRig.leftLegPivot.rotation.x = swing;
    this.playerRig.rightLegPivot.rotation.x = -swing;
    this.playerRig.leftArmPivot.rotation.x = -swing * 0.85;
    this.playerRig.rightArmPivot.rotation.x = swing * 0.85;
    this.playerRig.bodyGroup.position.y = isMoving
      ? Math.abs(Math.sin(this.walkPhase)) * 0.05
      : Math.sin(performance.now() * 0.0025) * 0.015;
    this.playerRig.shadowPlane.position.y = -(this.playerPos.y - groundY) + 0.02;
    this.playerRig.shadowPlane.material.opacity = THREE.MathUtils.clamp(
      0.55 - (this.playerPos.y - groundY) * 0.14,
      0.15,
      0.55
    );
  }

  private getCrowdPhraseForTime(): { dagbani: string; english: string } {
    const h = this.gameMinutes / 60;
    const bucket = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : "evening";
    const list = DAGBANI_CROWD_PHRASES[bucket];
    return list[Math.floor(Math.random() * list.length)];
  }

  private disposeSpeechSprite(agent: CrowdAgent) {
    if (!agent.speechSprite) return;
    agent.rig.root.remove(agent.speechSprite);
    const mat = agent.speechSprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.dispose();
    agent.speechSprite = null;
  }

  private updateCrowdPedestrians(dt: number, elapsed: number) {
    const hour = this.gameMinutes / 60;
    const lateNight = hour >= 22 || hour < 5;
    let nearbyWalkers = 0;
    let closestSpeaking: CrowdAgent | null = null;
    let closestSpeakingDist = 20;

    for (let idx = 0; idx < this.crowdAgents.length; idx++) {
      const agent = this.crowdAgents[idx];
      let activeNow = true;
      if (agent.role === "student") {
        activeNow = hour >= 6.5 && hour <= 17.2;
      } else if (agent.role === "child") {
        activeNow = hour >= 7.0 && hour <= 20.5;
      } else if (agent.role === "vendor") {
        if (agent.vendorShopId) {
          activeNow = isShopOpenAtMinutes(agent.vendorShopId, this.gameMinutes).isOpen;
        } else {
          activeNow = hour >= 6.5 && hour <= 20.5;
        }
      } else if (lateNight) {
        activeNow = idx % 3 === 0;
      }

      if (this.graphicsQuality === "low" && idx % 2 === 1) {
        activeNow = false;
      }

      const refPos = this.activeInteriorSpec ? this.exteriorReturnPos : this.playerPos;
      const distToPlayer = Math.hypot(agent.x - refPos.x, agent.z - refPos.z);
      if (distToPlayer > this.crowdUpdateRadius) {
        agent.rig.root.visible = false;
        if (agent.speechSprite) this.disposeSpeechSprite(agent);
        continue;
      }

      agent.rig.root.visible = activeNow;
      if (!activeNow) {
        if (agent.speechSprite) this.disposeSpeechSprite(agent);
        continue;
      }

      if (distToPlayer < 25) {
        nearbyWalkers++;
      }

      // Speech bubble lifecycle (only spawn speech sprites within 52m of player for crispness & perf)
      if (agent.speakingTimer > 0) {
        agent.speakingTimer -= dt;
        if (agent.speakingTimer <= 0 || distToPlayer > 56) {
          agent.activePhrase = null;
          this.disposeSpeechSprite(agent);
          agent.speakCooldown = 5.5 + Math.random() * 8;
        } else if (distToPlayer < closestSpeakingDist) {
          closestSpeakingDist = distToPlayer;
          closestSpeaking = agent;
        }
      } else {
        agent.speakCooldown -= dt;
        if (agent.speakCooldown <= 0 && distToPlayer < 48) {
          const phrase = this.getCrowdPhraseForTime();
          agent.activePhrase = phrase;
          agent.speakingTimer = 4.2;
          this.disposeSpeechSprite(agent);
          const bubble = createSpeechBubbleSprite(phrase.dagbani, phrase.english);
          bubble.position.set(0, 2.32, 0);
          agent.rig.root.add(bubble);
          agent.speechSprite = bubble;
        } else if (agent.speakCooldown <= 0) {
          agent.speakCooldown = 4 + Math.random() * 5;
        }
      }

      // Seated residents, conversing social groups, commuter rank waiters, & stationary stalls
      const animateDetail = distToPlayer <= 52;

      if (agent.role === "seated") {
        if (animateDetail) {
          agent.rig.headGroup.rotation.y = Math.sin(elapsed * 0.7 + agent.walkPhase) * 0.25;
          agent.rig.rightArmPivot.rotation.x = -0.3 + Math.sin(elapsed * 1.4 + agent.walkPhase) * 0.08;
        }
        continue;
      }

      if (agent.role === "social_group") {
        if (animateDetail) {
          agent.rig.headGroup.rotation.y = Math.sin(elapsed * 1.15 + agent.walkPhase) * 0.24;
          agent.rig.rightArmPivot.rotation.x = -0.35 + Math.sin(elapsed * 2.1 + agent.walkPhase) * 0.22;
          agent.rig.leftArmPivot.rotation.x = -0.18 + Math.cos(elapsed * 1.6 + agent.walkPhase) * 0.12;
        }
        continue;
      }

      if (agent.role === "commuter_wait") {
        if (animateDetail) {
          agent.rig.headGroup.rotation.y = Math.sin(elapsed * 0.8 + agent.walkPhase) * 0.4;
          // Periodic hand wave hailing approaching Pragya/taxi
          const wave = Math.max(0, Math.sin(elapsed * 1.6 + agent.walkPhase));
          agent.rig.rightArmPivot.rotation.x = -0.15 - wave * 0.75;
        }
        continue;
      }

      const isStationaryVendor =
        agent.role === "vendor" &&
        agent.waypoints.length >= 2 &&
        Math.hypot(
          agent.waypoints[0].x - agent.waypoints[1].x,
          agent.waypoints[0].z - agent.waypoints[1].z
        ) < 1.5;
      if (isStationaryVendor) {
        if (animateDetail) {
          agent.rig.rightArmPivot.rotation.x = -0.45 + Math.sin(elapsed * 2.4 + agent.walkPhase) * 0.22;
          agent.rig.leftArmPivot.rotation.x = -0.3 + Math.cos(elapsed * 1.9 + agent.walkPhase) * 0.14;
          agent.rig.headGroup.rotation.y = Math.sin(elapsed * 0.9 + agent.walkPhase) * 0.3;
        }
        continue;
      }

      // Mobile street hawker multi-state street commerce: walking -> calling -> selling -> restocking
      if (agent.role === "vendor" && agent.vendorMode) {
        agent.vendorStateTimer = (agent.vendorStateTimer ?? 4) - dt;
        if (agent.vendorMode === "calling" || agent.vendorMode === "selling") {
          if (animateDetail) {
            agent.rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(agent.rig.leftLegPivot.rotation.x, 0, 8, dt);
            agent.rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(agent.rig.rightLegPivot.rotation.x, 0, 8, dt);
            agent.rig.rightArmPivot.rotation.x =
              agent.vendorMode === "selling"
                ? -0.65 + Math.sin(elapsed * 3.0 + agent.walkPhase) * 0.2
                : -0.35 + Math.sin(elapsed * 2.2 + agent.walkPhase) * 0.15;
            agent.rig.headGroup.rotation.y = Math.sin(elapsed * 1.3 + agent.walkPhase) * 0.32;
          }
          if ((agent.vendorStateTimer ?? 0) <= 0) {
            if (agent.vendorMode === "calling") {
              agent.vendorMode = "selling";
              agent.vendorStateTimer = 3.0 + Math.random() * 2.5;
            } else {
              agent.vendorMode = "walking";
              agent.vendorStateTimer = 5.5 + Math.random() * 4.5;
              if (agent.homeMarketCoord && Math.random() < 0.2) {
                agent.restocking = true;
              }
            }
          }
          continue;
        } else if ((agent.vendorStateTimer ?? 0) <= 0) {
          agent.vendorMode = "calling";
          agent.vendorStateTimer = 2.4 + Math.random() * 2.0;
          continue;
        }
      }

      // Movement along local market / street patrol loop (or market restock trip)
      if (agent.pauseTimer > 0) {
        agent.pauseTimer -= dt;
        if (animateDetail) {
          agent.rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(agent.rig.leftLegPivot.rotation.x, 0, 8, dt);
          agent.rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(agent.rig.rightLegPivot.rotation.x, 0, 8, dt);
          agent.rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(agent.rig.leftArmPivot.rotation.x, 0, 8, dt);
          agent.rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(agent.rig.rightArmPivot.rotation.x, 0, 8, dt);
        }
        continue;
      }

      const target =
        agent.restocking && agent.homeMarketCoord
          ? agent.homeMarketCoord
          : agent.waypoints[agent.wpIndex];
      const dx = target.x - agent.x;
      const dz = target.z - agent.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.8) {
        if (agent.restocking) {
          agent.restocking = false;
          agent.pauseTimer = 3.2;
        } else {
          agent.wpIndex = (agent.wpIndex + 1) % agent.waypoints.length;
          agent.pauseTimer = agent.role === "child" ? 0.4 + Math.random() * 1.0 : 1.0 + Math.random() * 2.0;
        }
        continue;
      }

      const step = Math.min(dist, agent.speed * dt);
      let moveX = dx / dist;
      let moveZ = dz / dist;

      // Steer crowd walkers naturally around stalls, benches, trees, parked motos & dynamic vehicles
      const dynVehicles = this.getDynamicVehicles(false);
      const probe = this.collisionWorld.probeAhead(
        agent.x,
        agent.z,
        moveX,
        moveZ,
        1.45,
        0.42,
        COLLIDER_MASK_ALL_WITH_VEHICLES,
        dynVehicles
      );
      if (probe.blocked) {
        moveX = moveX * 0.25 + probe.steerX * 0.75;
        moveZ = moveZ * 0.25 + probe.steerZ * 0.75;
        const mLen = Math.hypot(moveX, moveZ) || 1;
        moveX /= mLen;
        moveZ /= mLen;
      }

      // Soft personal-space courtesy yield when passing close to the player
      if (!this.activeInteriorSpec && distToPlayer < 1.35 && distToPlayer > 0.05) {
        const pushX = (agent.x - this.playerPos.x) / distToPlayer;
        const pushZ = (agent.z - this.playerPos.z) / distToPlayer;
        moveX = moveX * 0.45 + pushX * 0.55;
        moveZ = moveZ * 0.45 + pushZ * 0.55;
        const mLen = Math.hypot(moveX, moveZ) || 1;
        moveX /= mLen;
        moveZ /= mLen;
      }

      if ((agent.stuckTimer ?? 0) > 0.6) {
        const sign = agent.detourSign ?? (idx % 2 === 0 ? 1 : -1);
        const perpX = -moveZ * sign;
        const perpZ = moveX * sign;
        moveX = moveX * 0.25 + perpX * 0.75;
        moveZ = moveZ * 0.25 + perpZ * 0.75;
        const mLen = Math.hypot(moveX, moveZ) || 1;
        moveX /= mLen;
        moveZ /= mLen;
      }

      const nx = agent.x + moveX * step;
      const nz = agent.z + moveZ * step;
      const resolved = this.collisionWorld.sweepMove2D(
        agent.x,
        agent.z,
        nx,
        nz,
        0.42,
        COLLIDER_MASK_ALL_WITH_VEHICLES,
        dynVehicles
      );
      const actualMoved = Math.hypot(resolved.x - agent.x, resolved.z - agent.z);
      if (step > 0.005 && actualMoved < step * 0.22) {
        agent.stuckTimer = (agent.stuckTimer ?? 0) + dt;
        if (agent.stuckTimer > 2.2) {
          agent.detourSign = (agent.detourSign ?? (idx % 2 === 0 ? 1 : -1)) === 1 ? -1 : 1;
          agent.stuckTimer = 0.65;
        }
      } else {
        agent.stuckTimer = Math.max(0, (agent.stuckTimer ?? 0) - dt * 1.5);
      }

      agent.x = resolved.x;
      agent.z = resolved.z;

      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - agent.rotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      agent.rotY += diff * Math.min(1, dt * 8);

      agent.rig.root.position.set(agent.x, getTamaleGroundHeight(agent.x, agent.z, 0), agent.z);
      agent.rig.root.rotation.y = agent.rotY;

      if (animateDetail) {
        agent.walkPhase += dt * (agent.role === "child" ? 10.5 : 7.5);
        const swing = Math.sin(agent.walkPhase) * (agent.role === "child" ? 0.56 : 0.44);
        agent.rig.leftLegPivot.rotation.x = swing;
        agent.rig.rightLegPivot.rotation.x = -swing;
        agent.rig.leftArmPivot.rotation.x = -swing * 0.8;
        agent.rig.rightArmPivot.rotation.x = swing * 0.8;
      }
    }

    const refPos = this.activeInteriorSpec ? this.exteriorReturnPos : this.playerPos;
    // Compute market + crowd audio intensity (0..1)
    let marketProximity = 0;
    for (const [mx, mz] of [
      [-44, -30], // Central Market
      [-132, 28], // Aboabo Market
      [-84, 100], // Lamashegu Market
      [158, 34], // Kukuo Market
      [32, 158], // Kakpagyili Market
    ]) {
      const md = Math.hypot(refPos.x - mx, refPos.z - mz);
      if (md < 42) {
        marketProximity = Math.max(marketProximity, 1 - md / 42);
      }
    }
    const walkerFactor = Math.min(1, nearbyWalkers / 7);
    const rawIntensity = Math.min(1, Math.max(marketProximity * 0.88, walkerFactor * 0.72));
    this.crowdIntensity = lateNight ? rawIntensity * 0.25 : rawIntensity;

    // Periodically trigger real spoken Dagbani market voice clip via /api/npc/tts
    if (
      !this.activeInteriorSpec &&
      !this.paused &&
      this.audio.isEnabled() &&
      this.crowdIntensity > 0.35 &&
      closestSpeaking &&
      closestSpeaking.activePhrase &&
      !this.crowdTtsPending &&
      !this.audio.isVoicePlaying() &&
      elapsed - this.lastCrowdTtsTime > 11
    ) {
      this.lastCrowdTtsTime = elapsed;
      this.crowdTtsPending = true;
      const spokenLine = closestSpeaking.activePhrase.dagbani;
      const voice = closestSpeaking.voiceName;
      void fetch("/api/npc/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: spokenLine,
          voiceName: voice,
          style: CROWD_DAGBANI_VOICE_STYLES[voice],
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.audioBase64 && !this.disposed && !this.paused && this.audio.isEnabled()) {
            void this.audio.playVoiceBase64(data.audioBase64, data.mimeType || "audio/wav", 0.72);
          }
        })
        .catch(() => {
          // Silently continue with procedural market bed if offline/unconfigured
        })
        .finally(() => {
          this.crowdTtsPending = false;
        });
    }
  }

  private updateLandmarkLabels() {
    if (!this.labelsVisible) return;
    const maxDist = this.labelMaxDist;
    const fadeStart = maxDist * 0.76;
    for (const item of this.landmarkLabels) {
      const dist = Math.hypot(item.x - this.camera.position.x, item.z - this.camera.position.z);
      if (dist > maxDist) {
        item.sprite.visible = false;
        continue;
      }
      item.sprite.visible = true;
      const s = THREE.MathUtils.clamp(dist * 0.11, 7.2, 18.5);
      item.sprite.scale.set(s, s * 0.25, 1);
      const mat = item.sprite.material as THREE.SpriteMaterial;
      mat.opacity = dist > fadeStart ? THREE.MathUtils.clamp(1 - (dist - fadeStart) / (maxDist - fadeStart), 0.1, 1) : 1;
    }
  }

  private updateNpcsAndTraffic(dt: number, elapsed: number) {
    const refPos = this.activeInteriorSpec ? this.exteriorReturnPos : this.playerPos;
    this.npcController.update(dt, this.gameMinutes, refPos);
    this.updateCrowdPedestrians(dt, elapsed);

    for (let i = 0; i < this.ambientPlayableCharacters.length; i++) {
      const entry = this.ambientPlayableCharacters[i];
      if (!entry.rig.root.visible) continue;
      const ph = elapsed * 1.4 + i * 1.7;
      entry.rig.bodyGroup.position.y = Math.sin(ph) * 0.015;
      entry.rig.headGroup.rotation.y = Math.sin(ph * 0.65) * 0.16;
      entry.rig.rightArmPivot.rotation.x = -0.1 + Math.sin(ph * 0.9) * 0.06;
    }

    const hour = this.gameMinutes / 60;
    const isLateNight = hour >= 22 || hour < 5;
    const isPeakHours = (hour >= 7 && hour <= 10.5) || (hour >= 15.5 && hour <= 18.5);
    const trafficPaceFactor = isPeakHours ? 1.0 : isLateNight ? 1.12 : 0.94;

    for (let i = 0; i < this.traffic.length; i++) {
      const tv = this.traffic[i];
      const distFromPlayer = Math.hypot(tv.x - refPos.x, tv.z - refPos.z);
      const active =
        (!isLateNight || tv.nightActive) &&
        !(this.graphicsQuality === "low" && i % 2 === 1);
      tv.group.visible = active && distFromPlayer <= this.trafficUpdateRadius;
      if (!active) continue;

      tv.hornCooldown = Math.max(0, tv.hornCooldown - dt);
      tv.passByCooldown = Math.max(0, tv.passByCooldown - dt);
      tv.stopCooldown = Math.max(0, tv.stopCooldown - dt);

      // Curbside passenger pickup / dropoff pause for Pragyas, taxis & passenger bikes
      if (tv.stopTimer > 0) {
        tv.stopTimer -= dt;
        tv.currentSpeed = THREE.MathUtils.damp(tv.currentSpeed, 0, 6, dt);
        tv.targetLaneOffset = 1.05;
        if (tv.chassisGroup) {
          tv.leanAngle = THREE.MathUtils.damp(tv.leanAngle, 0, 8, dt);
          tv.chassisGroup.rotation.z = tv.leanAngle;
        }
        continue;
      } else {
        tv.targetLaneOffset = 0;
      }

      const distToPlayer = Math.hypot(tv.x - this.playerPos.x, tv.z - this.playerPos.z);

      // Trigger positional vehicle pass-by audio when passing close to player
      if (distToPlayer < 10.5 && tv.currentSpeed > 6 && tv.passByCooldown <= 0 && !this.paused) {
        tv.passByCooldown = 3.2;
        this.audio.playVehiclePassBy(tv.x, tv.z, tv.currentSpeed, tv.kind === "moto" || tv.kind === "pragya");
      }

      // Check for vehicles ahead in same lane OR cross-street vehicles + parked drivable vehicles
      let blockedByVehicleAhead = false;
      let targetSpeed = tv.baseSpeed * trafficPaceFactor;
      for (let j = 0; j < this.traffic.length; j++) {
        if (i === j || !this.traffic[j].group.visible) continue;
        const other = this.traffic[j];
        if (other.axis === tv.axis && other.dir === tv.dir && other.roadCoord === tv.roadCoord) {
          const forwardGap = tv.axis === "x" ? (other.x - tv.x) * tv.dir : (other.z - tv.z) * tv.dir;
          if (forwardGap > 0.5 && forwardGap < 9.0) {
            if (tv.kind === "moto" && other.currentSpeed < tv.baseSpeed * 0.85) {
              // Motorcycles weave smoothly into inner gap to overtake slower Pragyas/cargo trikes
              tv.targetLaneOffset = -1.45;
              targetSpeed = Math.max(targetSpeed * 0.92, other.currentSpeed + 2.2);
            } else {
              blockedByVehicleAhead = true;
              targetSpeed = Math.min(targetSpeed, Math.max(0, other.currentSpeed * 0.72));
              if (forwardGap < 5.0) targetSpeed = 0;
              if (forwardGap < 6.0 && distToPlayer < 30 && tv.hornCooldown <= 0 && !this.paused) {
                tv.hornCooldown = 5.5;
                this.audio.playTrafficHorn(
                  tv.kind === "bicycle" ? "moto" : tv.kind === "cargo" ? "pragya" : tv.kind,
                  tv.x,
                  tv.z
                );
              }
            }
          }
        } else if (other.axis !== tv.axis) {
          // Cross-traffic yield at Tamale intersections
          const forwardGap = tv.axis === "x" ? (other.x - tv.x) * tv.dir : (other.z - tv.z) * tv.dir;
          const lateralGap = tv.axis === "x" ? Math.abs(other.z - tv.z) : Math.abs(other.x - tv.x);
          if (forwardGap > 0.4 && forwardGap < 5.2 && lateralGap < 3.4) {
            blockedByVehicleAhead = true;
            targetSpeed = Math.min(targetSpeed, 0.4);
          }
        }
      }

      // Yield / brake behind parked or player-driven Pragyas & motorcycles on the roadway
      for (const dv of this.drivables) {
        const forwardGap = tv.axis === "x" ? (dv.x - tv.x) * tv.dir : (dv.z - tv.z) * tv.dir;
        const lateralGap = tv.axis === "x" ? Math.abs(dv.z - tv.z) : Math.abs(dv.x - tv.x);
        if (forwardGap > 0.4 && forwardGap < 7.5 && lateralGap < 1.85) {
          if (tv.kind === "moto" && Math.abs(dv.speed) < 2) {
            tv.targetLaneOffset = -1.4;
          } else {
            blockedByVehicleAhead = true;
            targetSpeed = Math.min(targetSpeed, forwardGap < 4.2 ? 0 : 2.5);
          }
        }
      }

      // Slow smoothly near Central Market, Aboabo, Lamashegu & Interchange
      const nearMarket =
        Math.hypot(tv.x + 44, tv.z + 30) < 32 ||
        Math.hypot(tv.x + 132, tv.z - 28) < 28 ||
        Math.hypot(tv.x + 84, tv.z - 100) < 28;
      if (nearMarket) {
        targetSpeed = Math.min(targetSpeed, tv.kind === "moto" ? 8.2 : 5.6);
      }

      // Yield for player or crossing pedestrians + friendly horn beep
      if (distToPlayer < 7.0) {
        const aheadDot =
          tv.axis === "x"
            ? (this.playerPos.x - tv.x) * tv.dir
            : (this.playerPos.z - tv.z) * tv.dir;
        if (aheadDot > -1.0 && aheadDot < 7.0) {
          targetSpeed = Math.min(targetSpeed, distToPlayer < 4.2 ? 0.5 : 2.6);
          if (tv.hornCooldown <= 0 && !this.paused && tv.kind !== "bicycle") {
            tv.hornCooldown = 4.2;
            this.audio.playTrafficHorn(
              tv.kind === "cargo" ? "pragya" : tv.kind,
              tv.x,
              tv.z
            );
          }
        }
      }

      // Curbside stop opportunity near markets / mosque / hospital
      if (
        !blockedByVehicleAhead &&
        tv.stopCooldown <= 0 &&
        (tv.kind === "pragya" || tv.kind === "taxi") &&
        (nearMarket || Math.hypot(tv.x, tv.z) < 26 || Math.hypot(tv.x - 34, tv.z - 46) < 24)
      ) {
        tv.stopTimer = 3.2 + Math.random() * 2.4;
        tv.stopCooldown = 18 + Math.random() * 14;
      }

      tv.currentSpeed = THREE.MathUtils.damp(tv.currentSpeed, targetSpeed, 4.5, dt);
      tv.laneOffset = THREE.MathUtils.damp(tv.laneOffset, tv.targetLaneOffset, 4.2, dt);

      const step = tv.currentSpeed * dt;
      if (tv.axis === "x") {
        tv.x += tv.dir * step;
      } else {
        tv.z += tv.dir * step;
      }

      // Check intersection turning onto physically connected crossroads in tamaleRoadGraph
      const crossList = getCrossRoadsAlong(tv.axis, tv.roadCoord);
      const mainCoord = tv.axis === "x" ? tv.x : tv.z;
      let turnedThisFrame = false;
      for (const cross of crossList) {
        if (Math.abs(mainCoord - cross) < 0.75 && tv.lastCrossCoord !== cross) {
          tv.lastCrossCoord = cross;
          // 28% chance to turn cleanly onto intersecting avenue if away from Interchange center
          const atCenterRoundabout = Math.abs(tv.x) < 4.5 && Math.abs(tv.z) < 4.5;
          if (!atCenterRoundabout && Math.random() < 0.28) {
            const newAxis: "x" | "z" = tv.axis === "x" ? "z" : "x";
            const nextBounds = getRoadExtentBounds(newAxis, cross);
            const curAlong = newAxis === "x" ? tv.x : tv.z;
            let newDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
            if (curAlong <= nextBounds.min + 12) newDir = 1;
            if (curAlong >= nextBounds.max - 12) newDir = -1;
            tv.axis = newAxis;
            tv.roadCoord = cross;
            tv.dir = newDir;
            tv.lastCrossCoord = null;
            turnedThisFrame = true;
          }
          break;
        }
      }
      if (!turnedThisFrame && tv.lastCrossCoord !== null && Math.abs(mainCoord - tv.lastCrossCoord) > 3.0) {
        tv.lastCrossCoord = null;
      }

      // Wrap smoothly at actual road segment boundaries
      const roadBounds = getRoadExtentBounds(tv.axis, tv.roadCoord);
      if (tv.axis === "x") {
        if (tv.x > roadBounds.max) tv.x = roadBounds.min;
        if (tv.x < roadBounds.min) tv.x = roadBounds.max;
      } else {
        if (tv.z > roadBounds.max) tv.z = roadBounds.min;
        if (tv.z < roadBounds.min) tv.z = roadBounds.max;
      }

      // Keep vehicle aligned cleanly on its right-hand lane + weave offset
      const shift = getLaneShift(tv.roadCoord) + tv.laneOffset;
      const targetLaneX = tv.axis === "x" ? tv.x : tv.roadCoord - tv.dir * shift;
      const targetLaneZ = tv.axis === "x" ? tv.roadCoord + tv.dir * shift : tv.z;
      if (tv.axis === "x") {
        tv.z = THREE.MathUtils.damp(tv.z, targetLaneZ, 6.5, dt);
      } else {
        tv.x = THREE.MathUtils.damp(tv.x, targetLaneX, 6.5, dt);
      }

      const desiredRotY =
        tv.axis === "x"
          ? tv.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : tv.dir > 0
          ? 0
          : Math.PI;
      let rotDiff = desiredRotY - tv.rotY;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      const turnDelta = rotDiff * Math.min(1, dt * 6.5);
      tv.rotY += turnDelta;

      // Dynamic lean for motorcycles & bicycles when cornering or weaving
      if (tv.chassisGroup) {
        const leanTarget = THREE.MathUtils.clamp(-turnDelta * 5.2 - (tv.targetLaneOffset - tv.laneOffset) * 0.16, -0.34, 0.34);
        tv.leanAngle = THREE.MathUtils.damp(tv.leanAngle, leanTarget, 7, dt);
        tv.chassisGroup.rotation.z = tv.leanAngle;
      }

      if (tv.wheels) {
        const spin = step * 2.7;
        for (const w of tv.wheels) {
          w.rotation.x += spin;
        }
      }

      tv.group.position.set(tv.x, getTamaleGroundHeight(tv.x, tv.z, 0), tv.z);
      tv.group.rotation.y = tv.rotY;
    }
  }

  private updateEnvironment(dt: number, elapsed: number) {
    if (!this.paused) {
      this.gameMinutes = (this.gameMinutes + dt * this.timeScale) % 1440;
    }

    const hour = this.gameMinutes / 60;
    const isNight = hour < 5.8 || hour >= 18.7;
    const isDuskOrDawn = (hour >= 5.5 && hour < 7.5) || (hour >= 17.0 && hour < 19.2);

    if (this.activeInteriorSpec && this.activeInteriorScene) {
      for (const fan of this.activeInteriorScene.animatedFans) {
        fan.rotation.y += dt * 7.2;
      }
      for (let i = 0; i < this.activeInteriorScene.stationMarkers.length; i++) {
        const marker = this.activeInteriorScene.stationMarkers[i];
        const pulse = 0.92 + Math.sin(elapsed * 3.4 + i) * 0.08;
        marker.ring.scale.set(pulse, pulse, 1);
      }
      this.sunLight.intensity = 0;
      this.hemiLight.intensity = 0.72;
      for (const light of this.nightLightPool) {
        light.intensity = 0;
      }
      const roomBg = new THREE.Color("#181410");
      (this.scene.background as THREE.Color).lerp(roomBg, Math.min(1, dt * 6));
      const fog = this.scene.fog as THREE.FogExp2;
      fog.density = 0.002;
      fog.color.copy(this.scene.background as THREE.Color);

      const extDistrict = getDistrictAt(this.exteriorReturnPos.x, this.exteriorReturnPos.z);
      const isRes = /Kalpohin|Gumani|Choggu|Compound|Vittin|Dungu|Sagnarigu|Nyohini|Kanvilli/i.test(
        extDistrict
      );
      this.audio.updateListener(
        this.exteriorReturnPos.x,
        1.5,
        this.exteriorReturnPos.z,
        this.camYaw
      );
      this.audio.updateAmbience(
        elapsed,
        this.weather,
        false,
        0,
        !isNight,
        this.crowdIntensity * 0.25,
        this.exteriorReturnPos.x,
        this.exteriorReturnPos.z,
        hour,
        isRes
      );
      return;
    }

    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunY = Math.sin(sunAngle) * 76;
    const sunX = Math.cos(sunAngle) * 76;
    this.sunLight.position.set(this.playerPos.x + sunX, Math.max(8, sunY), this.playerPos.z + 32);
    this.sunLight.target.position.set(this.playerPos.x, 0, this.playerPos.z);

    if (this.weather === "thunderstorm") {
      if (elapsed >= this.nextLightningAt) {
        this.lightningFlashIntensity = 1.0;
        this.nextLightningAt = elapsed + 7.0 + Math.random() * 7.5;
        if (!this.paused) {
          this.audio.playThunderClap();
        }
      }
    }
    this.lightningFlashIntensity = Math.max(0, this.lightningFlashIntensity - dt * 4.5);

    const skyColor = new THREE.Color();
    if (this.weather === "harmattan") {
      skyColor.set(isNight ? "#1a1822" : "#dcc09a");
      this.sunLight.intensity = isNight ? 0.28 : 1.15;
      this.sunLight.color.set("#ffdbb5");
      (this.scene.fog as THREE.FogExp2).density = 0.0125;
    } else if (this.weather === "cloudy") {
      skyColor.set(isNight ? "#111827" : isDuskOrDawn ? "#b89685" : "#9db1c4");
      this.sunLight.intensity = isNight ? 0.26 : 1.08;
      this.sunLight.color.set("#e2e8f0");
      (this.scene.fog as THREE.FogExp2).density = 0.0068;
    } else if (this.weather === "heat") {
      skyColor.set(isNight ? "#161925" : isDuskOrDawn ? "#f59e0b" : "#f5deb3");
      this.sunLight.intensity = isNight ? 0.28 : 2.15;
      this.sunLight.color.set("#ffe4a3");
      (this.scene.fog as THREE.FogExp2).density = 0.0058;
    } else if (this.weather === "light_rain") {
      skyColor.set(isNight ? "#101724" : "#8fa1b3");
      this.sunLight.intensity = isNight ? 0.26 : 0.96;
      this.sunLight.color.set("#dbeafe");
      (this.scene.fog as THREE.FogExp2).density = 0.0085;
    } else if (this.weather === "rain") {
      skyColor.set(isNight ? "#101622" : "#7b8c9e");
      this.sunLight.intensity = isNight ? 0.25 : 0.78;
      this.sunLight.color.set("#cbd5e1");
      (this.scene.fog as THREE.FogExp2).density = 0.011;
    } else if (this.weather === "thunderstorm") {
      skyColor.set(isNight ? "#080d17" : "#4b5968");
      if (this.lightningFlashIntensity > 0.05) {
        skyColor.lerp(new THREE.Color("#dbeafe"), this.lightningFlashIntensity * 0.65);
      }
      this.sunLight.intensity = (isNight ? 0.22 : 0.56) + this.lightningFlashIntensity * 2.1;
      this.sunLight.color.set("#cbd5e1");
      (this.scene.fog as THREE.FogExp2).density = 0.0145;
    } else if (isNight) {
      skyColor.set("#0f172a");
      this.sunLight.intensity = 0.28;
      this.sunLight.color.set("#93c5fd");
      (this.scene.fog as THREE.FogExp2).density = 0.007;
    } else if (isDuskOrDawn) {
      skyColor.set("#f2a66d");
      this.sunLight.intensity = 1.35;
      this.sunLight.color.set("#ffbe76");
      (this.scene.fog as THREE.FogExp2).density = 0.0065;
    } else {
      skyColor.set("#c7e2f5");
      this.sunLight.intensity = 1.92;
      this.sunLight.color.set("#fff2d6");
      (this.scene.fog as THREE.FogExp2).density = 0.0044;
    }

    (this.scene.background as THREE.Color).lerp(skyColor, Math.min(1, dt * 2.5));
    (this.scene.fog as THREE.FogExp2).color.copy(this.scene.background as THREE.Color);
    this.hemiLight.intensity = isNight
      ? 0.35
      : this.weather === "rain" || this.weather === "thunderstorm"
      ? 0.58
      : this.weather === "light_rain" || this.weather === "cloudy"
      ? 0.68
      : 0.78;

    const lampEmissive = isNight || isDuskOrDawn || this.weather === "thunderstorm" ? 2.2 : 0.12;
    for (const mat of this.lampBulbMats) {
      mat.emissiveIntensity = lampEmissive;
    }
    const nightSpotEmissive = hour >= 17.0 || hour < 5.5 ? 2.6 : 0.12;
    for (const mat of this.nightlifeMats) {
      mat.emissiveIntensity = nightSpotEmissive;
    }

    // Update pooled dynamic PointLights at nearest nightlife spots during dusk & night
    if (nightSpotEmissive > 1.0 && this.graphicsQuality !== "low") {
      const sortedSpots = [...this.nightSpotCoords]
        .map((s) => ({
          ...s,
          d: Math.hypot(s.x - this.playerPos.x, s.z - this.playerPos.z),
        }))
        .sort((a, b) => a.d - b.d);
      for (let i = 0; i < this.nightLightPool.length; i++) {
        const light = this.nightLightPool[i];
        const spot = sortedSpots[i];
        if (spot && spot.d < 90) {
          light.position.set(spot.x, spot.y, spot.z);
          light.color.setHex(spot.color);
          light.intensity = 12.5 * (0.94 + 0.06 * Math.sin(elapsed * 4.2 + i));
        } else {
          light.intensity = 0;
        }
      }
    } else {
      for (const light of this.nightLightPool) {
        light.intensity = 0;
      }
    }

    // Spatial Sector Streaming: keep active geographical tiles visible around the player
    if (elapsed - this.lastSectorSync > 0.25) {
      this.lastSectorSync = elapsed;
      const r = this.sectorStreamRadius;
      for (const sec of this.spatialSectors) {
        const dist = Math.hypot(sec.centerX - this.playerPos.x, sec.centerZ - this.playerPos.z);
        sec.group.visible = dist <= r;
      }
    }

    for (const d of this.drivables) {
      d.headlightMat.emissiveIntensity =
        isNight || isDuskOrDawn || this.weather === "rain" || this.weather === "thunderstorm" ? 1.8 : 0.25;
    }
    for (const t of this.traffic) {
      t.headlightMat.emissiveIntensity =
        isNight || isDuskOrDawn || this.weather === "rain" || this.weather === "thunderstorm" ? 1.85 : 0.22;
    }
    const emberIntensity = isNight || isDuskOrDawn ? 1.7 + Math.sin(elapsed * 5) * 0.25 : 0.55;
    for (const em of this.emberMats) {
      em.emissiveIntensity = emberIntensity;
    }

    // Subtle savannah breeze sway on Tamale neem/shea/baobab canopies
    const windStrength =
      this.weather === "thunderstorm"
        ? 0.044
        : this.weather === "harmattan" || this.weather === "rain"
        ? 0.032
        : 0.014;
    for (const tw of this.windSwayTrees) {
      tw.group.rotation.z = Math.sin(elapsed * 1.15 + tw.phase) * windStrength;
    }

    if (this.weather === "harmattan") {
      this.dustPoints.position.set(this.playerPos.x, 0, this.playerPos.z);
      const posAttr = this.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let px = posAttr.getX(i) + dt * 2.8;
        if (px > 30) px = -30;
        posAttr.setX(i, px);
      }
      posAttr.needsUpdate = true;
    } else if (
      this.weather === "light_rain" ||
      this.weather === "rain" ||
      this.weather === "thunderstorm"
    ) {
      const rainSpeed =
        this.weather === "thunderstorm" ? 31 : this.weather === "rain" ? 24 : 15;
      this.rainLines.position.set(this.playerPos.x, 0, this.playerPos.z);
      const posAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i += 2) {
        let y1 = posAttr.getY(i) - dt * rainSpeed;
        if (y1 < 0) y1 = 19;
        posAttr.setY(i, y1);
        posAttr.setY(i + 1, y1 - 0.9);
      }
      posAttr.needsUpdate = true;
    }

    if (this.deliveryBeacon.visible) {
      this.deliveryBeacon.rotation.y = elapsed * 0.8;
    }
    if (this.gigBeacon.visible) {
      this.gigBeacon.rotation.y = -elapsed * 1.05;
    }

    const districtName = getDistrictAt(this.playerPos.x, this.playerPos.z);
    const isResidential = /Kalpohin|Gumani|Choggu|Compound|Vittin|Dungu|Sagnarigu|Nyohini|Kanvilli/i.test(
      districtName
    );
    const speed = this.drivingVehicle ? Math.abs(this.drivingVehicle.speed) : 0;

    this.audio.updateListener(this.playerPos.x, this.playerPos.y, this.playerPos.z, this.camYaw);
    this.audio.updateAmbience(
      elapsed,
      this.weather,
      Boolean(this.drivingVehicle),
      speed,
      !isNight,
      this.crowdIntensity,
      this.playerPos.x,
      this.playerPos.z,
      hour,
      isResidential
    );
  }

  private updateCamera(dt: number) {
    this.camYaw = THREE.MathUtils.damp(this.camYaw, this.camYawTarget, 18, dt);
    this.camPitch = THREE.MathUtils.damp(this.camPitch, this.camPitchTarget, 18, dt);
    const targetY = this.playerPos.y + 1.45;
    _camTarget.set(this.playerPos.x, targetY, this.playerPos.z);

    if (this.activeInteriorSpec) {
      const spec = this.activeInteriorSpec;
      const indoorDist = Math.min(this.camDist, 6.4);
      const horizDist = Math.cos(this.camPitch) * indoorDist;
      const vertDist = Math.sin(this.camPitch) * indoorDist;
      const desiredX = this.playerPos.x + Math.sin(this.camYaw) * horizDist;
      const desiredY = targetY + vertDist;
      const desiredZ = this.playerPos.z + Math.cos(this.camYaw) * horizDist;

      const safeCam = sweepInteriorCameraRay(
        _camTarget.x,
        _camTarget.y,
        _camTarget.z,
        desiredX,
        desiredY,
        desiredZ,
        spec.width,
        spec.depth,
        spec.height,
        this.activeInteriorScene?.colliders ?? [],
        0.32
      );
      _desiredCamPos.set(safeCam.x, safeCam.y, safeCam.z);

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 11, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 11, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 11, dt);
      this.camera.lookAt(_camTarget);
      return;
    }

    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist;

    const fullX = this.playerPos.x + Math.sin(this.camYaw) * horizDist;
    const fullY = Math.max(1.0, targetY + vertDist);
    const fullZ = this.playerPos.z + Math.cos(this.camYaw) * horizDist;

    const safeCam = this.collisionWorld.sweepCameraRay(
      _camTarget.x,
      _camTarget.y,
      _camTarget.z,
      fullX,
      fullY,
      fullZ,
      this.getDynamicVehicles(),
      0.42
    );

    _desiredCamPos.set(safeCam.x, safeCam.y, safeCam.z);

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 9, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 9, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 9, dt);

    this.camera.lookAt(_camTarget);
  }

  private updateServiceProvider(dt: number, elapsed: number) {
    const srv = this.activeService;
    if (!srv) return;

    // Headlight brightness sync
    const hour = this.gameMinutes / 60;
    const isNightOrDusk = hour < 6.5 || hour >= 17.5;
    srv.headlightMat.emissiveIntensity = isNightOrDusk ? 2.2 : 0.35;

    // Completed or cancelled vehicles drive off cleanly & despawn
    if (srv.request.status === "completed" || srv.request.status === "cancelled") {
      srv.despawnTimer -= dt;
      srv.x += Math.sin(srv.rotY) * (srv.speed * 0.65) * dt;
      srv.z += Math.cos(srv.rotY) * (srv.speed * 0.65) * dt;
      srv.group.position.set(srv.x, 0, srv.z);
      if (srv.wheels) {
        for (const w of srv.wheels) w.rotation.x += srv.speed * 0.65 * dt * 2.5;
      }
      if (srv.despawnTimer <= 0) {
        this.removeActiveServiceMesh();
        this.callbacks.onServiceUpdate?.(null);
      }
      return;
    }

    if (srv.request.status === "arrived_waiting") {
      // Gently wait with hazards/idle near player curb
      return;
    }

    const target = srv.waypoints[srv.wpIdx];
    if (!target) return;

    const dx = target.x - srv.x;
    const dz = target.z - srv.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1.8) {
      srv.wpIdx++;
      if (srv.wpIdx >= srv.waypoints.length) {
        if (srv.request.status === "en_route_to_player") {
          srv.request = {
            ...srv.request,
            status: "arrived_waiting",
            providerX: srv.x,
            providerZ: srv.z,
            etaSeconds: 0,
            statusNote: `${srv.request.providerName} has arrived beside your street curb!`,
          };
          this.audio.playTrafficHorn(
            srv.request.kind === "moto_ride" ||
              srv.request.kind === "food_delivery" ||
              srv.request.kind === "parcel_delivery" ||
              srv.request.kind === "roadside_repair" ||
              srv.request.kind === "personal_errand"
              ? "moto"
              : "pragya",
            srv.x,
            srv.z
          );
          this.callbacks.onServiceUpdate?.(srv.request);
          return;
        }
        if (srv.request.status === "in_transit_to_dest") {
          // Arrived at passenger destination! Disembark player cleanly at curb
          this.servicePassengerRiding = false;
          setCharacterPose(this.playerRig, "foot");
          this.playerRig.root.visible = true;
          this.playerPos.set(
            srv.x + Math.cos(srv.rotY) * 2.0,
            0,
            srv.z - Math.sin(srv.rotY) * 2.0
          );
          this.playerRig.root.position.copy(this.playerPos);
          const completed: ServiceRequestRuntime = {
            ...srv.request,
            status: "completed",
            providerX: srv.x,
            providerZ: srv.z,
            etaSeconds: 0,
            statusNote: `Arrived at ${srv.request.destinationName ?? "destination"}!`,
          };
          srv.request = completed;
          srv.despawnTimer = 3.2;
          this.audio.playChime("success");
          this.callbacks.onServiceUpdate?.(completed);
          return;
        }
      }
      return;
    }

    const step = Math.min(dist, srv.speed * dt);
    srv.x += (dx / dist) * step;
    srv.z += (dz / dist) * step;

    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - srv.rotY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    srv.rotY += diff * Math.min(1, dt * 8.5);

    srv.group.position.set(srv.x, 0, srv.z);
    srv.group.rotation.y = srv.rotY;

    if (srv.wheels) {
      for (const w of srv.wheels) w.rotation.x += step * 2.6;
    }

    // Estimate remaining route distance for honest live ETA
    let remDist = dist;
    for (let i = srv.wpIdx; i < srv.waypoints.length - 1; i++) {
      remDist += Math.hypot(
        srv.waypoints[i + 1].x - srv.waypoints[i].x,
        srv.waypoints[i + 1].z - srv.waypoints[i].z
      );
    }
    const nextEta = Math.max(1, Math.round(remDist / srv.speed));
    if (elapsed - this.lastServiceSyncTime > 0.65 || this.serviceSyncDirty) {
      this.lastServiceSyncTime = elapsed;
      this.serviceSyncDirty = false;
      srv.request = {
        ...srv.request,
        providerX: srv.x,
        providerZ: srv.z,
        etaSeconds: nextEta,
      };
      this.callbacks.onServiceUpdate?.(srv.request);
    }
  }

  private scanNearbyAndSyncHud(elapsed: number) {
    if (elapsed - this.lastHudSync < 0.14) return;
    this.lastHudSync = elapsed;

    const npcSnapshots = this.npcController.getSnapshots();
    if (this.activeInteriorSpec) {
      const spec = this.activeInteriorSpec;
      let indoorClosest: NearbyInteractable | null = null;
      let bestStationDist = Infinity;
      for (const st of spec.stations) {
        const d = Math.hypot(this.playerPos.x - st.x, this.playerPos.z - st.z);
        if (d <= st.radius && d < bestStationDist) {
          bestStationDist = d;
          if (st.kind === "exit_door") {
            indoorClosest = {
              kind: "interior_exit",
              id: st.id,
              label: st.label,
              sublabel: st.dagbaniLabel,
              interactionVerb: "exit",
            };
          } else {
            indoorClosest = {
              kind: "interior_station",
              id: st.id,
              label: st.label,
              sublabel: st.dagbaniLabel,
              interactionVerb: "use_station",
              stationKind: st.kind,
              shopId: spec.shopId,
            };
          }
        }
      }
      this.nearbyInteractable = indoorClosest;
      this.nearbyVehicleInteractable = null;
      const guidanceTargetId = this.activeErrandLandmarkId || this.activeGigLandmarkId;
      this.callbacks.onHudUpdate({
        district: `Inside · ${spec.title}`,
        speedKmh: 0,
        isDriving: false,
        drivingLabel: null,
        drivingKind: null,
        isRidingService: false,
        nearby: indoorClosest,
        nearbyVehicle: null,
        nearbyChatter: null,
        nearestGuidance: getNearestLandmarkGuidance(
          this.exteriorReturnPos.x,
          this.exteriorReturnPos.z,
          guidanceTargetId
        ),
        playerPos: {
          x: this.exteriorReturnPos.x,
          z: this.exteriorReturnPos.z,
          rotY: this.playerRotY,
        },
        servicePos: this.activeService ? { x: this.activeService.x, z: this.activeService.z } : null,
        discoveredLandmarkId: spec.landmarkId,
        npcStates: npcSnapshots,
        isMoving: this.playerMoving,
        isRunning: this.playerRunning,
      });
      return;
    }

    let closest: NearbyInteractable | null = null;
    let bestDist = 4.6;
    let closestVeh: NearbyInteractable | null = null;
    let bestVehDist = 4.8;

    // 1. Live Service Provider waiting at player's curb
    if (
      this.activeService &&
      this.activeService.request.status === "arrived_waiting" &&
      !this.servicePassengerRiding
    ) {
      const srv = this.activeService;
      const d = Math.hypot(this.playerPos.x - srv.x, this.playerPos.z - srv.z);
      if (d < 6.8) {
        const isRide =
          srv.request.kind === "moto_ride" ||
          srv.request.kind === "pragya_ride" ||
          srv.request.kind === "taxi_ride" ||
          srv.request.kind === "cargo_moving";
        closest = {
          kind: "service_provider",
          id: srv.request.id,
          label: isRide
            ? `Board ${srv.request.providerName} (${srv.request.title})`
            : `Collect from ${srv.request.providerName}`,
          sublabel: isRide
            ? `Ride to ${srv.request.destinationName ?? "destination"} · GH₵ ${srv.request.estimatedCostCedis}`
            : `${srv.request.title} · GH₵ ${srv.request.estimatedCostCedis}`,
          interactionVerb: isRide ? "board_service" : "deliver",
          servicePhase: isRide ? "board_ride" : "pickup_food_or_repair",
        };
        bestDist = 0;
      }
    }

    // 2. Active City Task / Job stage check (works on foot OR driving for pickup/dropoff)
    if (!closest && this.activeTaskRuntime) {
      const task = this.activeTaskRuntime;
      const targetId =
        task.stage === "go_to_pickup" && task.job.pickupLandmarkId
          ? task.job.pickupLandmarkId
          : task.job.targetLandmarkId;
      const targetLm = TAMALE_LANDMARKS.find((l) => l.id === targetId);
      if (targetLm) {
        const d = Math.hypot(this.playerPos.x - targetLm.x, this.playerPos.z - targetLm.z);
        if (d < Math.max(12.5, targetLm.radius * 0.72)) {
          if (task.job.executionMode === "transport_passenger") {
            if (task.stage === "go_to_pickup") {
              closest = {
                kind: "job_action",
                id: task.job.id,
                label: `Pick Up Passenger at ${targetLm.name}`,
                sublabel: `Drop off at ${task.job.targetLandmarkName} · GH₵ ${task.job.rewardCedis}`,
                interactionVerb: "pickup_passenger",
                jobActionMode: "pickup_passenger",
              };
            } else {
              closest = {
                kind: "delivery",
                id: targetLm.id,
                label: `Drop Off Passenger at ${targetLm.name}`,
                sublabel: `Complete ride · Earn GH₵ ${task.job.rewardCedis}`,
                interactionVerb: "deliver",
                isGigDelivery: true,
              };
            }
          } else if (task.job.executionMode === "pickup_and_deliver") {
            if (task.stage === "go_to_pickup") {
              closest = {
                kind: "job_action",
                id: task.job.id,
                label: `Collect Dispatch at ${targetLm.name}`,
                sublabel: `Deliver to ${task.job.targetLandmarkName} · GH₵ ${task.job.rewardCedis}`,
                interactionVerb: "deliver",
                jobActionMode: "pickup_passenger",
              };
            } else {
              closest = {
                kind: "delivery",
                id: targetLm.id,
                label: `Deliver Package at ${targetLm.name}`,
                sublabel: `Complete delivery · Earn GH₵ ${task.job.rewardCedis}`,
                interactionVerb: "deliver",
                isGigDelivery: true,
              };
            }
          } else {
            const modeMap: Record<
              "work_shift" | "mechanic_dispatch" | "photo_survey" | "sports_drill" | "business_manage",
              NonNullable<NearbyInteractable["jobActionMode"]>
            > = {
              work_shift: "work_shift",
              mechanic_dispatch: "mechanic_repair",
              photo_survey: "photo_capture",
              sports_drill: "sports_drill",
              business_manage: "work_shift",
            };
            const verb: NearbyInteractable["interactionVerb"] =
              task.job.executionMode === "mechanic_dispatch" ? "repair" : "work";
            closest = {
              kind: "job_action",
              id: task.job.id,
              label: `Start ${task.job.title} at ${targetLm.name}`,
              sublabel: `Interactive activity · Earn GH₵ ${task.job.rewardCedis}`,
              interactionVerb: verb,
              jobActionMode: modeMap[task.job.executionMode],
            };
          }
          bestDist = 0;
        }
      }
    }

    // 3. Legacy Delivery Errands & Quick Gigs
    if (!closest && this.activeErrandLandmarkId) {
      const targetLm = TAMALE_LANDMARKS.find((l) => l.id === this.activeErrandLandmarkId);
      if (targetLm) {
        const d = Math.hypot(this.playerPos.x - targetLm.x, this.playerPos.z - targetLm.z);
        if (d < Math.max(11.5, targetLm.radius * 0.65)) {
          closest = {
            kind: "delivery",
            id: targetLm.id,
            label: `Complete Errand at ${targetLm.name}`,
            sublabel: "Deliver package & earn GH₵",
            interactionVerb: "deliver",
            isGigDelivery: false,
          };
          bestDist = 0;
        }
      }
    }

    if (!closest && this.activeGigLandmarkId && !this.activeTaskRuntime) {
      const gigLm = TAMALE_LANDMARKS.find((l) => l.id === this.activeGigLandmarkId);
      if (gigLm) {
        const d = Math.hypot(this.playerPos.x - gigLm.x, this.playerPos.z - gigLm.z);
        if (d < Math.max(12.5, gigLm.radius * 0.7)) {
          closest = {
            kind: "delivery",
            id: gigLm.id,
            label: `Complete Gig at ${gigLm.name}`,
            sublabel: "Drop off / complete dispatch to earn GH₵",
            interactionVerb: "deliver",
            isGigDelivery: true,
          };
          bestDist = 0;
        }
      }
    }

    if (!this.drivingVehicle && !this.servicePassengerRiding) {
      for (const snap of npcSnapshots) {
        if (!snap.canTalk) continue;
        const d = Math.hypot(this.playerPos.x - snap.x, this.playerPos.z - snap.z);
        if (d < bestDist) {
          const profile = TAMALE_NPCS.find((p) => p.id === snap.npcId);
          if (!profile) continue;
          bestDist = d;
          closest = {
            kind: "npc",
            id: profile.id,
            label: `Talk to ${profile.name}`,
            sublabel: `${snap.activityLabel} · ${snap.destinationLabel}`,
            interactionVerb: "talk",
          };
        }
      }

      // Interactive street hawkers & food sellers
      for (const agent of this.crowdAgents) {
        if (!agent.rig.root.visible || agent.role !== "vendor" || !agent.vendorShopId) continue;
        const d = Math.hypot(this.playerPos.x - agent.x, this.playerPos.z - agent.z);
        if (d < bestDist) {
          bestDist = d;
          closest = {
            kind: "vendor",
            id: agent.speakerName,
            label: `Buy from ${agent.speakerName}`,
            sublabel: `${agent.district} · Street Vendor`,
            interactionVerb: "buy",
            shopId: agent.vendorShopId,
          };
        }
      }

      for (const veh of this.drivables) {
        const d = Math.hypot(this.playerPos.x - veh.x, this.playerPos.z - veh.z);
        if (d < bestVehDist) {
          bestVehDist = d;
          closestVeh = {
            kind: "vehicle",
            id: veh.id,
            label: `Enter ${veh.label}`,
            sublabel: veh.kind === "motorcycle" ? "Motorcycle · Fast agile ride" : "Pragya · City tricycle",
            interactionVerb: "vehicle",
            vehicleKind: veh.kind,
          };
        }
      }

      if (!closest) {
        let bestDoorDist = Infinity;
        for (const dw of this.doorways) {
          if (!isNearDoorwayEntrance(this.playerPos.x, this.playerPos.z, dw)) continue;
          const d = Math.hypot(this.playerPos.x - dw.doorX, this.playerPos.z - dw.doorZ);
          if (d < bestDoorDist) {
            bestDoorDist = d;
            const openInfo = dw.shopId
              ? isShopOpenAtMinutes(dw.shopId, this.gameMinutes)
              : { isOpen: true, hoursLabel: "24h" };
            if (!openInfo.isOpen) {
              closest = {
                kind: "building",
                id: dw.landmarkId,
                label: `${dw.name} (Closed Door)`,
                sublabel: `Closed now · Opens ${openInfo.hoursLabel}`,
                interactionVerb: "enter",
                shopId: dw.shopId,
                doorClosed: true,
              };
            } else {
              closest = {
                kind: "building",
                id: dw.landmarkId,
                label: `${dw.shopId ? "Visit " : "Enter "}${dw.name}`,
                sublabel: dw.dagbaniLabel,
                interactionVerb: dw.shopId ? "shop" : "enter",
                shopId: dw.shopId,
              };
            }
          }
        }
      }
    }

    this.nearbyInteractable = closest;
    this.nearbyVehicleInteractable = closestVeh;

    let discoveredLandmarkId: string | null = null;
    for (const lm of TAMALE_LANDMARKS) {
      const d = Math.hypot(this.playerPos.x - lm.x, this.playerPos.z - lm.z);
      if (d < lm.radius) {
        discoveredLandmarkId = lm.id;
        break;
      }
    }

    const speedKmh = this.servicePassengerRiding && this.activeService
      ? Math.round(this.activeService.speed * 3.2)
      : this.drivingVehicle
      ? Math.round(Math.abs(this.drivingVehicle.speed) * 3.2)
      : 0;

    let nearbyChatter: NearbyChatter | null = null;
    let bestChatterDist = 16;
    for (const agent of this.crowdAgents) {
      if (agent.speakingTimer > 0 && agent.activePhrase) {
        const d = Math.hypot(agent.x - this.playerPos.x, agent.z - this.playerPos.z);
        if (d < bestChatterDist) {
          bestChatterDist = d;
          nearbyChatter = {
            speaker: agent.speakerName,
            dagbani: agent.activePhrase.dagbani,
            english: agent.activePhrase.english,
            district: agent.district,
          };
        }
      }
    }

    const guidanceTargetId = this.activeErrandLandmarkId || this.activeGigLandmarkId;
    this.callbacks.onHudUpdate({
      district: getDistrictAt(this.playerPos.x, this.playerPos.z),
      speedKmh,
      isDriving: Boolean(this.drivingVehicle),
      drivingLabel: this.drivingVehicle ? this.drivingVehicle.label : null,
      drivingKind: this.drivingVehicle ? this.drivingVehicle.kind : null,
      isRidingService: this.servicePassengerRiding,
      nearby: closest,
      nearbyVehicle: closestVeh,
      nearbyChatter,
      nearestGuidance: getNearestLandmarkGuidance(
        this.playerPos.x,
        this.playerPos.z,
        guidanceTargetId
      ),
      playerPos: { x: this.playerPos.x, z: this.playerPos.z, rotY: this.playerRotY },
      servicePos: this.activeService ? { x: this.activeService.x, z: this.activeService.z } : null,
      discoveredLandmarkId,
      npcStates: npcSnapshots,
      isMoving: this.playerMoving,
      isRunning: this.playerRunning,
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.elapsedTime;

    this.updateServiceProvider(dt, elapsed);
    this.updatePlayerAndVehicle(dt);
    this.updateNpcsAndTraffic(dt, elapsed);
    this.updateEnvironment(dt, elapsed);
    this.updateCamera(dt);
    this.updateLandmarkLabels();
    this.scanNearbyAndSyncHud(elapsed);

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();

    this.activeInteriorScene?.dispose();
    this.activeInteriorScene = null;
    this.activeInteriorSpec = null;

    this.removeActiveServiceMesh();
    for (const agent of this.crowdAgents) {
      this.disposeSpeechSprite(agent);
    }

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      } else if ((obj as THREE.Sprite).isSprite) {
        const spr = obj as THREE.Sprite;
        const mat = spr.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
