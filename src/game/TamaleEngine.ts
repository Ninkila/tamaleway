import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  getDistrictAt,
  TAMALE_LANDMARKS,
  TAMALE_NPCS,
  TAMALE_ROADS,
  TAMALE_WORLD_BOUNDS,
} from "../data/tamaleWorldData";
import { CROWD_DAGBANI_VOICE_STYLES } from "../data/dagbaniVoices";
import {
  ActiveCityEventMode,
  CameraMode,
  NearbyChatter,
  NearbyInteractable,
  NpcRuntimeSnapshot,
  PlayerCustomization,
  WeatherType,
} from "../types/game";
import { TamaleAudioEngine } from "./audio";
import { NpcScheduleController } from "./NpcScheduleController";
import {
  CharacterRig,
  createAirportGroup,
  createBicycleMesh,
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
  createPragyaMesh,
  createPrivateCarMesh,
  createRoadsideBenchMesh,
  createRoadsideStallMesh,
  createSccaRedClayGroup,
  createSchoolGroup,
  createShopBuilding,
  createSpeechBubbleSprite,
  createStadiumGroup,
  createTamaleHouseVariant,
  createTamaleInterchangeGroup,
  createTaxiMesh,
  createTeachingHospitalGroup,
  createTreeMesh,
  createUtilityPoleWithLamp,
  TamaleHouseVariant,
} from "./models";
import { createProceduralTextures, ProceduralTextureSet } from "./textures";

// Pre-allocated math helpers (Zero GC in loop)
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

const EW_ROAD_COORDS = [-158, -92, -48, 0, 66, 128];
const NS_ROAD_COORDS = [-162, -102, -66, 0, 66, 128, 186];

function getLaneShift(roadCoord: number): number {
  return roadCoord === 0 ? 4.9 : 2.25;
}

interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
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
  role: "walker" | "vendor" | "seated" | "student" | "child";
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

export interface EngineCallbacks {
  onHudUpdate: (data: {
    district: string;
    speedKmh: number;
    isDriving: boolean;
    drivingLabel: string | null;
    nearby: NearbyInteractable | null;
    nearbyChatter: NearbyChatter | null;
    playerPos: { x: number; z: number; rotY: number };
    discoveredLandmarkId: string | null;
    npcStates: NpcRuntimeSnapshot[];
  }) => void;
  onInteract: (item: NearbyInteractable) => void;
  onWebGLContextChange?: (lost: boolean) => void;
}

export class TamaleEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private audio: TamaleAudioEngine;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: ProceduralTextureSet;
  private isSoftwareGl = false;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private lampBulbMats: THREE.MeshStandardMaterial[] = [];
  private stadiumFloodlightMats: THREE.MeshStandardMaterial[] = [];
  private emberMats: THREE.MeshStandardMaterial[] = [];
  private windSwayTrees: Array<{ group: THREE.Group; phase: number }> = [];
  private activeCityEvent: ActiveCityEventMode = "ordinary_day";
  private eventGroups = new Map<ActiveCityEventMode, THREE.Group>();

  private playerRig!: CharacterRig;
  private playerPos = new THREE.Vector3(14, 0, 14);
  private playerVelY = 0;
  private playerRotY = -Math.PI * 0.78;
  private isGrounded = true;
  private walkPhase = 0;

  private camYaw = 0.72;
  private camPitch = 0.28;
  private camDist = 9.5;
  private cameraMode: CameraMode = "third-person";

  private keys: Record<string, boolean> = {};
  private isPointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private colliders: BoxCollider[] = [];
  private npcController!: NpcScheduleController;
  private crowdAgents: CrowdAgent[] = [];
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

  private activeErrandLandmarkId: string | null = null;
  private deliveryBeacon!: THREE.Mesh;

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
  }

  private addWireSpan(x1: number, z1: number, x2: number, z2: number, y = 5.75) {
    const wireMat = new THREE.LineBasicMaterial({ color: "#1c1917", transparent: true, opacity: 0.75 });
    for (const offset of [-0.45, 0, 0.45]) {
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x1 + offset, y, z1),
        new THREE.Vector3(midX + offset, y - 0.55, midZ),
        new THREE.Vector3(x2 + offset, y, z2)
      );
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(8));
      this.scene.add(new THREE.Line(geo, wireMat));
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
    this.scene.add(ground);

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
      this.scene.add(roadMesh);

      // Concrete roadside open storm drains along East-West avenues
      if (r.orientation === "ew") {
        for (const side of [-1, 1]) {
          const zEdge = r.z + side * (r.depth / 2 + 0.45);
          const curb = new THREE.Mesh(new THREE.BoxGeometry(r.width, 0.14, 0.7), drainConcreteMat);
          curb.position.set(r.x, 0.07, zEdge);
          curb.receiveShadow = true;
          this.scene.add(curb);

          const channel = new THREE.Mesh(new THREE.BoxGeometry(r.width, 0.05, 0.28), drainTrenchMat);
          channel.position.set(r.x, 0.13, zEdge);
          this.scene.add(channel);
        }
      } else {
        for (const side of [-1, 1]) {
          const xEdge = r.x + side * (r.width / 2 + 0.4);
          const curb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, r.depth), drainConcreteMat);
          curb.position.set(xEdge, 0.06, r.z);
          curb.receiveShadow = true;
          this.scene.add(curb);
        }
      }
    }

    // 3. Tamale (Naa Gbewaa) Interchange at (0, 0, 0)
    const { group: interchangeGroup, bridgeLampBulbs } = createTamaleInterchangeGroup(this.textures);
    interchangeGroup.position.set(0, 0, 0);
    this.scene.add(interchangeGroup);
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
    this.scene.add(market);
    this.addCollider(-59, -29, -42, -18);

    // 5. Tamale Central Mosque (34, 0, 46) along Gukpegu Rd SSE
    const mosque = createCentralMosqueGroup(this.textures);
    mosque.position.set(34, 0, 46);
    this.scene.add(mosque);
    this.addCollider(21.5, 46.5, 34.5, 57.5);

    // 6. Jubilee Park & Tamale High Street 4-Story Office Precinct (86, 0, 22)
    const jubileeOffice = createJubileeAndOfficeGroup(this.textures);
    jubileeOffice.position.set(86, 0, 22);
    this.scene.add(jubileeOffice);
    this.addCollider(77.5, 94.5, 13.5, 24); // Main office footprint
    this.addCollider(83.5, 88.5, 41.5, 46.5); // Jubilee Park monument

    // 7. Dagbon Smock & Drumming Guild (-84, 0, 20)
    const cultural = createCulturalCentreGroup(this.textures);
    cultural.position.set(-84, 0, 20);
    this.scene.add(cultural);
    this.addCollider(-93, -75, 12, 28);

    // 8. Dakpema Chief's Palace & Regional Chiefs Hall (-34, 0, -70)
    const palace = createDakpemaPalaceGroup(this.textures);
    palace.position.set(-34, 0, -70);
    this.scene.add(palace);
    this.addCollider(-45.5, -22.5, -79, -66.5);

    // 9. Tamale Teaching Hospital (96, 0, 102)
    const hospital = createTeachingHospitalGroup(this.textures);
    hospital.position.set(96, 0, 102);
    this.scene.add(hospital);
    this.addCollider(82.5, 109.5, 91.5, 107);

    // 10. Aliu Mahama Sports Stadium (-134, 0, -124)
    const stadium = createStadiumGroup(this.textures);
    stadium.group.position.set(-134, 0, -124);
    this.scene.add(stadium.group);
    this.stadiumFloodlightMats.push(...stadium.floodlightMats);
    this.addCollider(-155.5, -112.5, -145.5, -102.5);

    // 11. Tamale International Airport (0, 0, -196)
    const airport = createAirportGroup(this.textures);
    airport.position.set(0, 0, -196);
    this.scene.add(airport);
    this.addCollider(-14, 14, -202.5, -191);

    // 12. SCCA Tamale & Red Clay Studio Precinct (208, 0, 42)
    const scca = createSccaRedClayGroup(this.textures);
    scca.position.set(208, 0, 42);
    scca.rotation.y = -Math.PI / 2;
    this.scene.add(scca);
    this.addCollider(201, 215, 31.5, 52.5);

    // 13. Kukuo Market & Earthen Pottery Centre (158, 0, 34)
    const kukuo = createKukuoPotteryGroup(this.textures);
    kukuo.position.set(158, 0, 34);
    this.scene.add(kukuo);
    this.addCollider(148.5, 167.5, 26.5, 33);

    // 14. Gunayili Cattle & Timber Market Yard (158, 0, -68)
    const livestock = createLivestockTimberGroup(this.textures);
    livestock.position.set(158, 0, -68);
    this.scene.add(livestock);
    this.addCollider(148.5, 170, -73.5, -62.5);

    // 15. Aboabo Market (-132, 0, 28) & Lamashegu Market Hub (-84, 0, 100) & Kakpagyili Market (32, 0, 158)
    const aboaboMarket = createCentralMarketGroup(this.textures);
    aboaboMarket.position.set(-132, 0, 28);
    aboaboMarket.scale.set(0.9, 1, 0.9);
    this.scene.add(aboaboMarket);
    this.addCollider(-144.5, -119.5, 17.5, 38.5);

    const lamasheguMarket = createCentralMarketGroup(this.textures);
    lamasheguMarket.position.set(-84, 0, 100);
    lamasheguMarket.scale.set(0.84, 1, 0.88);
    this.scene.add(lamasheguMarket);
    this.addCollider(-95.5, -72.5, 89.5, 110.5);

    const kakpagyiliMarket = createCentralMarketGroup(this.textures);
    kakpagyiliMarket.position.set(32, 0, 158);
    kakpagyiliMarket.scale.set(0.82, 1, 0.82);
    this.scene.add(kakpagyiliMarket);
    this.addCollider(20.5, 43.5, 148, 168);

    // 16. Tishigu Community School (34, 0, -70) & Dungu Academic Quarter (-134, 0, 158)
    const school = createSchoolGroup(this.textures);
    school.position.set(34, 0, -70);
    this.scene.add(school);
    this.addCollider(24.5, 43.5, -77, -68);

    const dunguCampus = createSchoolGroup(this.textures);
    dunguCampus.position.set(-134, 0, 158);
    this.scene.add(dunguCampus);
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
      this.scene.add(comp);
      this.addCollider(cx - 8, cx + 8, cz - 7.5, cz + 6);
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
      this.scene.add(mesh);
      this.addCollider(h.x - h.halfW, h.x + h.halfW, h.z - h.halfD, h.z + h.halfD);
    }

    // 19. Realistically Signposted Tamale Commercial Shops Across Districts
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
    }> = [
      { x: -18, z: -13, rotY: 0, w: 8.5, h: 3.9, d: 6.2, wall: "#fef3c7", awning: "#047857", name: "NORTHERN STAR PHARMACY", sub: "GBEWAA HIGH ST · TAMALE" },
      { x: 20, z: -13, rotY: 0, w: 8.5, h: 3.8, d: 6.0, wall: "#e0f2fe", awning: "#b45309", name: "TAMALE MOBILE MONEY", sub: "PROVISIONS & COLD DRINKS" },
      { x: 34, z: -13, rotY: 0, w: 8.5, h: 3.7, d: 6.0, wall: "#ffedd5", awning: "#1d4ed8", name: "DAA WAAKYE & TZ SPOT", sub: "HOT SAƔIM · FRESH KOM" },
      { x: 48, z: -13, rotY: 0, w: 8.2, h: 4.0, d: 6.2, wall: "#e2e8f0", awning: "#991b1b", name: "DAGBON HARDWARE", sub: "TOOLS & ZINC ROOFING" },
      { x: 24, z: 14, rotY: Math.PI, w: 8.5, h: 3.8, d: 6.0, wall: "#fae8ff", awning: "#0f766e", name: "ALHASSAN FABRICS", sub: "SMOCKS & WAX PRINTS" },
      { x: 40, z: 14, rotY: Math.PI, w: 8.5, h: 3.8, d: 6.0, wall: "#ecfccb", awning: "#ca8a04", name: "SHEA CO-OP DEPOT", sub: "PURE KPAKPILI & YAM" },
      { x: -20, z: 14, rotY: Math.PI, w: 8.2, h: 3.7, d: 6.0, wall: "#f1f5f9", awning: "#1e40af", name: "SAVANNAH TELECOM", sub: "AIRTIME & REPAIRS" },
      { x: -36, z: 14, rotY: Math.PI, w: 8.2, h: 3.8, d: 6.0, wall: "#fde68a", awning: "#15803d", name: "TISHIGU BAKERY", sub: "BREAD & ROASTED YAM" },
      { x: 84, z: -14, rotY: 0, w: 9.5, h: 4.1, d: 6.5, wall: "#f8fafc", awning: "#0369a1", name: "TAMALE ENTERPRISE BANK", sub: "HIGH STREET BRANCH" },
      { x: -18, z: -62, rotY: 0, w: 8.6, h: 3.7, d: 6.4, wall: "#e7e5e4", awning: "#b45309", name: "KALPOHIN BOOKSHOP", sub: "STATIONERY & PRINTS" },
      { x: -120, z: 14, rotY: Math.PI, w: 8.4, h: 3.7, d: 6.0, wall: "#fef3c7", awning: "#b45309", name: "ABOABO CHICHINGA GRILL", sub: "SPICED KEBAB & WAAKYE" },
      { x: -84, z: 142, rotY: 0, w: 8.8, h: 3.8, d: 6.2, wall: "#e2e8f0", awning: "#dc2626", name: "LAMASHEGU SPARE PARTS", sub: "BAJAJ PRAGYA & MOTO" },
      { x: 146, z: 14, rotY: Math.PI, w: 8.2, h: 3.7, d: 6.0, wall: "#ffedd5", awning: "#9a3412", name: "KUKUO PROVISIONS", sub: "SHEA BUTTER & GRAINS" },
      { x: 20, z: -144, rotY: 0, w: 8.6, h: 3.8, d: 6.0, wall: "#f1f5f9", awning: "#0369a1", name: "KANVILLI HIGHWAY MART", sub: "AIRPORT RD FUEL & DRINKS" },
    ];

    for (const s of shopSpecs) {
      const shop = createShopBuilding(s.w, s.h, s.d, s.wall, s.awning, s.name, s.sub, this.textures);
      shop.position.set(s.x, 0, s.z);
      shop.rotation.y = s.rotY;
      this.scene.add(shop);
      this.addCollider(s.x - s.w / 2 - 0.3, s.x + s.w / 2 + 0.3, s.z - s.d / 2 - 0.3, s.z + s.d / 2 + 0.3);
    }

    // 20. ECG Utility Poles with Streetlamps + Overhead Power Cables
    const ewPoleXs = [-148, -120, -92, -74, -52, -32, -16, 16, 36, 56, 76, 96, 144, 170];
    let prevEwPole: { x: number; z: number } | null = null;
    for (const lx of ewPoleXs) {
      const pz = -8.2;
      const { group, bulbMat } = createUtilityPoleWithLamp();
      group.position.set(lx, 0, pz);
      this.scene.add(group);
      this.lampBulbMats.push(bulbMat);
      this.addCollider(lx - 0.35, lx + 0.35, pz - 0.35, pz + 0.35);

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
      this.scene.add(group);
      this.lampBulbMats.push(bulbMat);
      this.addCollider(px - 0.35, px + 0.35, lz - 0.35, lz + 0.35);

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
      this.scene.add(tree);
      this.windSwayTrees.push({ group: tree, phase: tx * 0.13 + tz * 0.17 });
      this.addCollider(tx - 0.9, tx + 0.9, tz - 0.9, tz + 0.9);
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
      this.scene.add(laneMesh);
    }

    // 21c. Roadside Kiosks, Mobile-Money Booths, Charcoal Food Stalls, & Shade Benches
    const stallPlacements: Array<{
      kind: "kiosk" | "food_vendor" | "mobile_money";
      x: number;
      z: number;
      rotY: number;
      color: string;
    }> = [
      { kind: "food_vendor", x: -36, z: -15.5, rotY: 0, color: "#dc2626" },
      { kind: "food_vendor", x: 34, z: -10.8, rotY: 0, color: "#eab308" },
      { kind: "food_vendor", x: -120, z: 11.2, rotY: Math.PI, color: "#ea580c" },
      { kind: "food_vendor", x: -84, z: 109.5, rotY: 0, color: "#b45309" },
      { kind: "mobile_money", x: 12, z: -10.2, rotY: 0, color: "#facc15" },
      { kind: "mobile_money", x: -24, z: 10.6, rotY: Math.PI, color: "#ef4444" },
      { kind: "mobile_money", x: -72, z: 10.4, rotY: Math.PI, color: "#0284c7" },
      { kind: "kiosk", x: -56, z: 11.5, rotY: Math.PI, color: "#0284c7" },
      { kind: "kiosk", x: 56, z: -11.5, rotY: 0, color: "#0f766e" },
      { kind: "kiosk", x: -140, z: -12, rotY: 0, color: "#d97706" },
      { kind: "kiosk", x: 138, z: 12, rotY: Math.PI, color: "#15803d" },
      { kind: "kiosk", x: 38, z: 146, rotY: 0, color: "#0369a1" },
    ];
    for (const sp of stallPlacements) {
      const built = createRoadsideStallMesh(sp.kind, sp.color, this.textures);
      built.group.position.set(sp.x, 0, sp.z);
      built.group.rotation.y = sp.rotY;
      this.scene.add(built.group);
      if (built.emberMat) {
        this.emberMats.push(built.emberMat);
      }
      this.addCollider(sp.x - 1.25, sp.x + 1.25, sp.z - 1.0, sp.z + 1.0);
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
    ];
    for (const [bx, bz, brot] of benchPlacements) {
      const bench = createRoadsideBenchMesh(this.textures);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = brot;
      this.scene.add(bench);
    }

    // 21d. Parked Street Motorcycles Outside Shops, Markets & Compounds
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
    ];
    for (const [mx, mz, mrot, col] of parkedMotos) {
      const moto = createMotorcycleMesh(col, this.textures);
      moto.group.position.set(mx, 0, mz);
      moto.group.rotation.y = mrot;
      this.scene.add(moto.group);
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
    this.scene.add(tuftMesh);

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
    this.scene.add(perimMesh);

    // 23. Delivery Errand Beacon
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
    this.scene.add(this.deliveryBeacon);
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
    this.scene.add(dambaGroup);
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
    this.scene.add(bugumGroup);
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
    this.scene.add(eidGroup);
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
    this.scene.add(ramadanGroup);
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
    this.scene.add(marketGroup);
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
    this.scene.add(matchGroup);
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

  private addCollider(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.colliders.push({ minX, maxX, minZ, maxZ });
  }

  private buildPlayer(cust: PlayerCustomization) {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
    }
    this.playerRig = createCharacterRig(
      {
        outfit: cust.outfit,
        headwear: cust.headwear,
        primaryColor: cust.primaryColor,
        accentColor: cust.accentColor,
        skinTone: cust.skinTone,
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
    this.npcController = new NpcScheduleController((x, z, r) => this.resolveCollisions(x, z, r));
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
      this.scene.add(rig.root);
      this.npcController.registerNpc(profile, rig);
    }
    this.npcController.initializeAtTime(this.gameMinutes);
  }

  private buildLandmarkLabels() {
    this.scene.add(this.labelGroup);

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
      { title: "Tamale Enterprise Bank", sub: "High Street · Commercial", x: 84, z: -14, y: 6.4, color: "#0ea5e9" },
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
    const crowdSpecs: Array<{
      name: string;
      district: string;
      outfit: "batakari" | "kaba" | "casual" | "polo";
      headwear: "kufi" | "headwrap" | "braids" | "none";
      primary: string;
      accent: string;
      skin: string;
      voice: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
      role?: "walker" | "vendor" | "seated" | "student" | "child";
      waypoints: Array<{ x: number; z: number }>;
    }> = [
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
        name: "Waakye Vendor",
        district: "Gbewaa High Street",
        outfit: "kaba",
        headwear: "headwrap",
        primary: "#b45309",
        accent: "#fef3c7",
        skin: "#6b3f23",
        voice: "Kore",
        role: "vendor",
        waypoints: [{ x: 34, z: -11.5 }, { x: 34.4, z: -11.5 }],
      },
      {
        name: "Chichinga Seller",
        district: "Aboabo Market",
        outfit: "casual",
        headwear: "kufi",
        primary: "#dc2626",
        accent: "#fde68a",
        skin: "#5c341b",
        voice: "Puck",
        role: "vendor",
        waypoints: [{ x: -120, z: 12.1 }, { x: -120.4, z: 12.1 }],
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
      // Students walking to & from Tishigu School and Dungu
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
        waypoints: [{ x: -120, z: 146 }, { x: -138, z: 146 }, { x: -148, z: 136 }],
      },
      // Children playing near compounds & community yards
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
    ];

    for (let i = 0; i < crowdSpecs.length; i++) {
      const spec = crowdSpecs[i] as (typeof crowdSpecs)[number] & {
        role?: "walker" | "vendor" | "seated" | "student" | "child";
      };
      const role = spec.role ?? "walker";
      const rig = createCharacterRig(
        {
          outfit: spec.outfit,
          headwear: spec.headwear,
          primaryColor: spec.primary,
          accentColor: spec.accent,
          skinTone: spec.skin,
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
      }
      this.scene.add(rig.root);

      this.crowdAgents.push({
        rig,
        speakerName: spec.name,
        district: spec.district,
        voiceName: spec.voice,
        role,
        waypoints: spec.waypoints,
        wpIndex: 1 % spec.waypoints.length,
        x: start.x,
        z: start.z,
        rotY: rig.root.rotation.y,
        walkPhase: i * 1.1,
        speed: role === "child" ? 2.45 : role === "student" ? 1.85 : 1.5 + (i % 4) * 0.25,
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
      this.scene.add(built.group);

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
      this.scene.add(group);

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

      if (e.code === "KeyE" && !this.paused && this.nearbyInteractable) {
        this.handlePrimaryInteract();
      } else if (e.code === "KeyE" && !this.paused && this.drivingVehicle) {
        this.exitVehicle();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      this.audio.init();
      this.isPointerDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isPointerDragging || this.paused) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.camYaw -= dx * 0.0055;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0045, 0.08, 1.15);
    };

    const onPointerUp = () => {
      this.isPointerDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.005, 5, 24);
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
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("webglcontextlost", onContextLost);
      dom.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }

  private cleanupListeners: () => void = () => {};

  private handlePrimaryInteract() {
    if (this.drivingVehicle) {
      this.exitVehicle();
      return;
    }
    if (!this.nearbyInteractable) return;

    if (this.nearbyInteractable.kind === "vehicle") {
      const veh = this.drivables.find((v) => v.id === this.nearbyInteractable!.id);
      if (veh) {
        this.drivingVehicle = veh;
        this.playerRig.root.visible = false;
        this.audio.playChime("interact");
      }
      return;
    }

    this.audio.playChime("interact");
    this.callbacks.onInteract(this.nearbyInteractable);
  }

  public triggerNearbyInteraction() {
    this.handlePrimaryInteract();
  }

  public exitVehicle() {
    if (!this.drivingVehicle) return;
    this.playerPos.set(
      this.drivingVehicle.x + Math.cos(this.drivingVehicle.rotY) * 1.8,
      0,
      this.drivingVehicle.z - Math.sin(this.drivingVehicle.rotY) * 1.8
    );
    this.drivingVehicle.speed = 0;
    this.drivingVehicle = null;
    this.playerRig.root.visible = true;
    this.playerRig.root.position.copy(this.playerPos);
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.keys = {};
      this.audio.stopVoiceClip();
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (mode === "wide") {
      this.camDist = 15.5;
      this.camPitch = 0.42;
    } else if (mode === "overhead") {
      this.camDist = 22;
      this.camPitch = 1.05;
    } else {
      this.camDist = 9.5;
      this.camPitch = 0.28;
    }
  }

  public setWeather(w: WeatherType) {
    this.weather = w;
    this.dustPoints.visible = w === "harmattan";
    this.rainLines.visible = w === "rain";
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

  public teleportTo(x: number, z: number, rotY = 0) {
    if (this.drivingVehicle) {
      this.exitVehicle();
    }
    this.playerPos.set(x, 0, z);
    this.playerRotY = rotY;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = rotY;
  }

  private resolveCollisions(nx: number, nz: number, radius: number): { x: number; z: number } {
    let rx = THREE.MathUtils.clamp(nx, TAMALE_WORLD_BOUNDS.minX, TAMALE_WORLD_BOUNDS.maxX);
    let rz = THREE.MathUtils.clamp(nz, TAMALE_WORLD_BOUNDS.minZ, TAMALE_WORLD_BOUNDS.maxZ);

    for (const c of this.colliders) {
      const closestX = THREE.MathUtils.clamp(rx, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(rz, c.minZ, c.maxZ);
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = radius - dist;
        rx += (dx / dist) * overlap;
        rz += (dz / dist) * overlap;
      }
    }
    return { x: rx, z: rz };
  }

  private updatePlayerAndVehicle(dt: number) {
    if (this.paused) return;

    if (this.drivingVehicle) {
      const veh = this.drivingVehicle;
      const throttle =
        (this.keys["KeyW"] || this.keys["ArrowUp"] ? 1 : 0) -
        (this.keys["KeyS"] || this.keys["ArrowDown"] ? 1 : 0);
      const steer =
        (this.keys["KeyA"] || this.keys["ArrowLeft"] ? 1 : 0) -
        (this.keys["KeyD"] || this.keys["ArrowRight"] ? 1 : 0);

      const maxSpeed = veh.kind === "motorcycle" ? 21 : 16;
      const accel = throttle > 0 ? 18 : throttle < 0 ? -15 : 0;

      if (accel !== 0) {
        veh.speed = THREE.MathUtils.clamp(veh.speed + accel * dt, -6, maxSpeed);
      } else {
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, 3.2, dt);
      }

      if (Math.abs(veh.speed) > 0.35) {
        const dirSign = veh.speed >= 0 ? 1 : -1;
        veh.rotY += steer * dirSign * 2.1 * dt;
      }

      const nextX = veh.x + Math.sin(veh.rotY) * veh.speed * dt;
      const nextZ = veh.z + Math.cos(veh.rotY) * veh.speed * dt;
      const resolved = this.resolveCollisions(nextX, nextZ, 1.15);
      veh.x = resolved.x;
      veh.z = resolved.z;

      veh.group.position.set(veh.x, 0, veh.z);
      veh.group.rotation.y = veh.rotY;

      for (const w of veh.wheels) {
        w.rotation.x += veh.speed * dt * 2.4;
      }

      this.playerPos.set(veh.x, 0, veh.z);
      this.playerRotY = veh.rotY;
      this.camYaw = THREE.MathUtils.damp(this.camYaw, veh.rotY + Math.PI, 2.2, dt);
      return;
    }

    const forwardInput =
      (this.keys["KeyW"] || this.keys["ArrowUp"] ? 1 : 0) -
      (this.keys["KeyS"] || this.keys["ArrowDown"] ? 1 : 0);
    const strafeInput =
      (this.keys["KeyD"] || this.keys["ArrowRight"] ? 1 : 0) -
      (this.keys["KeyA"] || this.keys["ArrowLeft"] ? 1 : 0);

    const isMoving = forwardInput !== 0 || strafeInput !== 0;
    const isRunning = Boolean(this.keys["ShiftLeft"] || this.keys["ShiftRight"]);
    const moveSpeed = isRunning ? 10.5 : 5.6;

    if (isMoving) {
      const forwardX = -Math.sin(this.camYaw);
      const forwardZ = -Math.cos(this.camYaw);
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);

      let dirX = forwardX * forwardInput + rightX * strafeInput;
      let dirZ = forwardZ * forwardInput + rightZ * strafeInput;
      const len = Math.hypot(dirX, dirZ) || 1;
      dirX /= len;
      dirZ /= len;

      const nextX = this.playerPos.x + dirX * moveSpeed * dt;
      const nextZ = this.playerPos.z + dirZ * moveSpeed * dt;
      const resolved = this.resolveCollisions(nextX, nextZ, 0.55);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;

      const targetYaw = Math.atan2(dirX, dirZ);
      let angleDiff = targetYaw - this.playerRotY;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.playerRotY += angleDiff * Math.min(1, dt * 12);

      this.walkPhase += dt * (isRunning ? 14 : 9);
      if (this.isGrounded) {
        this.audio.playFootstep(isRunning);
      }
    } else {
      this.walkPhase = THREE.MathUtils.damp(this.walkPhase, 0, 6, dt);
    }

    if (this.keys["Space"] && this.isGrounded) {
      this.playerVelY = 7.4;
      this.isGrounded = false;
    }
    this.playerVelY -= 20 * dt;
    this.playerPos.y += this.playerVelY * dt;
    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
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
    this.playerRig.shadowPlane.position.y = -this.playerPos.y + 0.02;
    this.playerRig.shadowPlane.material.opacity = THREE.MathUtils.clamp(
      0.55 - this.playerPos.y * 0.14,
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
        activeNow = hour >= 6.0 && hour <= 21.5;
      } else if (lateNight) {
        activeNow = idx % 3 === 0;
      }

      agent.rig.root.visible = activeNow;
      if (!activeNow) {
        if (agent.speechSprite) this.disposeSpeechSprite(agent);
        continue;
      }

      const distToPlayer = Math.hypot(agent.x - this.playerPos.x, agent.z - this.playerPos.z);
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

      // Seated residents & stationary food vendors animate in place naturally
      if (agent.role === "seated") {
        agent.rig.headGroup.rotation.y = Math.sin(elapsed * 0.7 + agent.walkPhase) * 0.25;
        agent.rig.rightArmPivot.rotation.x = -0.3 + Math.sin(elapsed * 1.4 + agent.walkPhase) * 0.08;
        continue;
      }
      if (agent.role === "vendor") {
        agent.rig.rightArmPivot.rotation.x = -0.45 + Math.sin(elapsed * 2.4 + agent.walkPhase) * 0.22;
        agent.rig.leftArmPivot.rotation.x = -0.3 + Math.cos(elapsed * 1.9 + agent.walkPhase) * 0.14;
        agent.rig.headGroup.rotation.y = Math.sin(elapsed * 0.9 + agent.walkPhase) * 0.3;
        continue;
      }

      // Movement along local market / street patrol loop
      if (agent.pauseTimer > 0) {
        agent.pauseTimer -= dt;
        agent.rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(agent.rig.leftLegPivot.rotation.x, 0, 8, dt);
        agent.rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(agent.rig.rightLegPivot.rotation.x, 0, 8, dt);
        agent.rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(agent.rig.leftArmPivot.rotation.x, 0, 8, dt);
        agent.rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(agent.rig.rightArmPivot.rotation.x, 0, 8, dt);
        continue;
      }

      const target = agent.waypoints[agent.wpIndex];
      const dx = target.x - agent.x;
      const dz = target.z - agent.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.7) {
        agent.wpIndex = (agent.wpIndex + 1) % agent.waypoints.length;
        agent.pauseTimer = agent.role === "child" ? 0.4 + Math.random() * 1.0 : 1.1 + Math.random() * 2.2;
        continue;
      }

      const step = Math.min(dist, agent.speed * dt);
      const nx = agent.x + (dx / dist) * step;
      const nz = agent.z + (dz / dist) * step;
      const resolved = this.resolveCollisions(nx, nz, 0.42);
      agent.x = resolved.x;
      agent.z = resolved.z;

      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - agent.rotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      agent.rotY += diff * Math.min(1, dt * 8);

      agent.walkPhase += dt * (agent.role === "child" ? 10.5 : 7.5);
      const swing = Math.sin(agent.walkPhase) * (agent.role === "child" ? 0.56 : 0.44);
      agent.rig.root.position.set(agent.x, 0, agent.z);
      agent.rig.root.rotation.y = agent.rotY;
      agent.rig.leftLegPivot.rotation.x = swing;
      agent.rig.rightLegPivot.rotation.x = -swing;
      agent.rig.leftArmPivot.rotation.x = -swing * 0.8;
      agent.rig.rightArmPivot.rotation.x = swing * 0.8;
    }

    // Compute market + crowd audio intensity (0..1)
    let marketProximity = 0;
    for (const [mx, mz] of [
      [-44, -30], // Central Market
      [-132, 28], // Aboabo Market
      [-84, 100], // Lamashegu Market
      [158, 34], // Kukuo Market
      [32, 158], // Kakpagyili Market
    ]) {
      const md = Math.hypot(this.playerPos.x - mx, this.playerPos.z - mz);
      if (md < 42) {
        marketProximity = Math.max(marketProximity, 1 - md / 42);
      }
    }
    const walkerFactor = Math.min(1, nearbyWalkers / 7);
    const rawIntensity = Math.min(1, Math.max(marketProximity * 0.88, walkerFactor * 0.72));
    this.crowdIntensity = lateNight ? rawIntensity * 0.25 : rawIntensity;

    // Periodically trigger real spoken Dagbani market voice clip via /api/npc/tts
    if (
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
    for (const item of this.landmarkLabels) {
      const dist = Math.hypot(item.x - this.camera.position.x, item.z - this.camera.position.z);
      if (dist > 195) {
        item.sprite.visible = false;
        continue;
      }
      item.sprite.visible = true;
      const s = THREE.MathUtils.clamp(dist * 0.11, 7.2, 18.5);
      item.sprite.scale.set(s, s * 0.25, 1);
      const mat = item.sprite.material as THREE.SpriteMaterial;
      mat.opacity = dist > 150 ? THREE.MathUtils.clamp(1 - (dist - 150) / 45, 0.1, 1) : 1;
    }
  }

  private updateNpcsAndTraffic(dt: number, elapsed: number) {
    this.npcController.update(dt, this.gameMinutes, this.playerPos);
    this.updateCrowdPedestrians(dt, elapsed);

    const hour = this.gameMinutes / 60;
    const isLateNight = hour >= 22 || hour < 5;
    const isPeakHours = (hour >= 7 && hour <= 10.5) || (hour >= 15.5 && hour <= 18.5);
    const trafficPaceFactor = isPeakHours ? 1.0 : isLateNight ? 1.12 : 0.94;

    for (let i = 0; i < this.traffic.length; i++) {
      const tv = this.traffic[i];
      const active = !isLateNight || tv.nightActive;
      tv.group.visible = active;
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

      // Check for vehicles ahead in same lane (for realistic braking or moto overtaking!)
      let blockedByVehicleAhead = false;
      let targetSpeed = tv.baseSpeed * trafficPaceFactor;
      for (let j = 0; j < this.traffic.length; j++) {
        if (i === j || !this.traffic[j].group.visible) continue;
        const other = this.traffic[j];
        if (other.axis !== tv.axis || other.dir !== tv.dir || other.roadCoord !== tv.roadCoord) continue;
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

      // Check intersection turning onto crossroad
      const crossList = tv.axis === "x" ? NS_ROAD_COORDS : EW_ROAD_COORDS;
      const mainCoord = tv.axis === "x" ? tv.x : tv.z;
      let turnedThisFrame = false;
      for (const cross of crossList) {
        if (Math.abs(mainCoord - cross) < 0.75 && tv.lastCrossCoord !== cross) {
          tv.lastCrossCoord = cross;
          // 28% chance to turn cleanly onto intersecting avenue if comfortably inside city bounds
          if (Math.random() < 0.28 && Math.abs(tv.x) < 165 && Math.abs(tv.z) < 155) {
            const newDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
            tv.axis = tv.axis === "x" ? "z" : "x";
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

      // Wrap smoothly at road boundaries
      const bound = tv.axis === "x" ? 198 : 172;
      if (tv.axis === "x") {
        if (tv.x > bound) tv.x = -bound;
        if (tv.x < -bound) tv.x = bound;
      } else {
        if (tv.z > bound) tv.z = -bound;
        if (tv.z < -bound) tv.z = bound;
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

      tv.group.position.set(tv.x, 0, tv.z);
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

    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunY = Math.sin(sunAngle) * 76;
    const sunX = Math.cos(sunAngle) * 76;
    this.sunLight.position.set(this.playerPos.x + sunX, Math.max(8, sunY), this.playerPos.z + 32);
    this.sunLight.target.position.set(this.playerPos.x, 0, this.playerPos.z);

    const skyColor = new THREE.Color();
    if (this.weather === "harmattan") {
      skyColor.set(isNight ? "#1a1822" : "#dcc09a");
      this.sunLight.intensity = isNight ? 0.28 : 1.15;
      (this.scene.fog as THREE.FogExp2).density = 0.0125;
    } else if (this.weather === "rain") {
      skyColor.set(isNight ? "#101622" : "#7b8c9e");
      this.sunLight.intensity = isNight ? 0.25 : 0.78;
      (this.scene.fog as THREE.FogExp2).density = 0.011;
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
    this.hemiLight.intensity = isNight ? 0.35 : this.weather === "rain" ? 0.6 : 0.78;

    const lampEmissive = isNight || isDuskOrDawn ? 2.2 : 0.12;
    for (const mat of this.lampBulbMats) {
      mat.emissiveIntensity = lampEmissive;
    }
    for (const d of this.drivables) {
      d.headlightMat.emissiveIntensity = isNight || isDuskOrDawn ? 1.8 : 0.25;
    }
    for (const t of this.traffic) {
      t.headlightMat.emissiveIntensity = isNight || isDuskOrDawn ? 1.85 : 0.22;
    }
    const emberIntensity = isNight || isDuskOrDawn ? 1.7 + Math.sin(elapsed * 5) * 0.25 : 0.55;
    for (const em of this.emberMats) {
      em.emissiveIntensity = emberIntensity;
    }

    // Subtle savannah breeze sway on Tamale neem/shea/baobab canopies
    const windStrength = this.weather === "harmattan" ? 0.032 : 0.014;
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
    } else if (this.weather === "rain") {
      this.rainLines.position.set(this.playerPos.x, 0, this.playerPos.z);
      const posAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i += 2) {
        let y1 = posAttr.getY(i) - dt * 24;
        if (y1 < 0) y1 = 19;
        posAttr.setY(i, y1);
        posAttr.setY(i + 1, y1 - 0.9);
      }
      posAttr.needsUpdate = true;
    }

    if (this.deliveryBeacon.visible) {
      this.deliveryBeacon.rotation.y = elapsed * 0.8;
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
    const targetY = this.playerPos.y + 1.45;
    _camTarget.set(this.playerPos.x, targetY, this.playerPos.z);

    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist;

    _desiredCamPos.set(
      this.playerPos.x + Math.sin(this.camYaw) * horizDist,
      targetY + vertDist,
      this.playerPos.z + Math.cos(this.camYaw) * horizDist
    );

    if (_desiredCamPos.y < 1.0) _desiredCamPos.y = 1.0;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 8, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 8, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 8, dt);

    this.camera.lookAt(_camTarget);
  }

  private scanNearbyAndSyncHud(elapsed: number) {
    if (elapsed - this.lastHudSync < 0.14) return;
    this.lastHudSync = elapsed;

    const npcSnapshots = this.npcController.getSnapshots();
    let closest: NearbyInteractable | null = null;
    let bestDist = 4.4;

    if (!this.drivingVehicle) {
      if (this.activeErrandLandmarkId) {
        const targetLm = TAMALE_LANDMARKS.find((l) => l.id === this.activeErrandLandmarkId);
        if (targetLm) {
          const d = Math.hypot(this.playerPos.x - targetLm.x, this.playerPos.z - targetLm.z);
          if (d < 10.5) {
            closest = {
              kind: "delivery",
              id: targetLm.id,
              label: `Complete Errand at ${targetLm.name}`,
              sublabel: "Deliver package & earn GH₵",
            };
            bestDist = 0;
          }
        }
      }

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
            label: `Speak with ${profile.name}`,
            sublabel: `${snap.activityLabel} · ${snap.destinationLabel}`,
          };
        }
      }

      for (const veh of this.drivables) {
        const d = Math.hypot(this.playerPos.x - veh.x, this.playerPos.z - veh.z);
        if (d < bestDist) {
          bestDist = d;
          closest = {
            kind: "vehicle",
            id: veh.id,
            label: `Drive ${veh.label}`,
            sublabel: "Press E to ride · WASD to steer",
          };
        }
      }

      if (!closest) {
        for (const lm of TAMALE_LANDMARKS) {
          if (!lm.enterable) continue;
          const d = Math.hypot(this.playerPos.x - lm.x, this.playerPos.z - lm.z);
          if (d < Math.max(15.5, lm.radius + 4)) {
            closest = {
              kind: "building",
              id: lm.id,
              label: `Enter ${lm.name}`,
              sublabel: lm.dagbaniLabel,
            };
            break;
          }
        }
      }
    }

    this.nearbyInteractable = closest;

    let discoveredLandmarkId: string | null = null;
    for (const lm of TAMALE_LANDMARKS) {
      const d = Math.hypot(this.playerPos.x - lm.x, this.playerPos.z - lm.z);
      if (d < lm.radius) {
        discoveredLandmarkId = lm.id;
        break;
      }
    }

    const speedKmh = this.drivingVehicle ? Math.round(Math.abs(this.drivingVehicle.speed) * 3.2) : 0;

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

    this.callbacks.onHudUpdate({
      district: getDistrictAt(this.playerPos.x, this.playerPos.z),
      speedKmh,
      isDriving: Boolean(this.drivingVehicle),
      drivingLabel: this.drivingVehicle ? this.drivingVehicle.label : null,
      nearby: closest,
      nearbyChatter,
      playerPos: { x: this.playerPos.x, z: this.playerPos.z, rotY: this.playerRotY },
      discoveredLandmarkId,
      npcStates: npcSnapshots,
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
