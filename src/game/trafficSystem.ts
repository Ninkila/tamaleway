import * as THREE from "three";

export type SignalCyclePhase =
  | "EW_GREEN"
  | "EW_AMBER"
  | "ALL_RED_1"
  | "NS_GREEN"
  | "NS_AMBER"
  | "ALL_RED_2";

export type LightAspect = "green" | "amber" | "red";

export interface SignalIntersectionDef {
  id: string;
  label: string;
  x: number;
  z: number;
  offsetSec: number;
}

export interface SignalIntersectionRuntime extends SignalIntersectionDef {
  phase: SignalCyclePhase;
  ewAspect: LightAspect;
  nsAspect: LightAspect;
  phaseRemainingSec: number;
}

export interface NearbySignalSnapshot {
  id: string;
  label: string;
  ewAspect: LightAspect;
  nsAspect: LightAspect;
  remainingSec: number;
  dist: number;
}

export interface RedLightViolationEvent {
  intersectionId: string;
  label: string;
  x: number;
  z: number;
}

export const TAMALE_SIGNALIZED_INTERSECTIONS: SignalIntersectionDef[] = [
  {
    id: "sig_market_west",
    label: "Central Market West Junction",
    x: -66,
    z: 0,
    offsetSec: 0,
  },
  {
    id: "sig_jubilee",
    label: "Jubilee Civic Junction",
    x: 66,
    z: 0,
    offsetSec: 11.5,
  },
  {
    id: "sig_aboabo",
    label: "Aboabo – High St Junction",
    x: -102,
    z: 0,
    offsetSec: 22.0,
  },
  {
    id: "sig_mosque_south",
    label: "Central Mosque South Crossway",
    x: 0,
    z: 66,
    offsetSec: 7.0,
  },
  {
    id: "sig_dakpema_north",
    label: "Dakpema – Gukpegu Junction",
    x: 0,
    z: -48,
    offsetSec: 17.5,
  },
  {
    id: "sig_lamashegu_salaga",
    label: "Lamashegu Salaga Rd Signal",
    x: -66,
    z: 128,
    offsetSec: 14.0,
  },
];

const DUR_EW_GREEN = 14.0;
const DUR_EW_AMBER = 3.0;
const DUR_ALL_RED_1 = 1.5;
const DUR_NS_GREEN = 14.0;
const DUR_NS_AMBER = 3.0;
const DUR_ALL_RED_2 = 1.5;
const CYCLE_DURATION =
  DUR_EW_GREEN + DUR_EW_AMBER + DUR_ALL_RED_1 + DUR_NS_GREEN + DUR_NS_AMBER + DUR_ALL_RED_2;

export function evaluateCyclePhase(t: number): {
  phase: SignalCyclePhase;
  ewAspect: LightAspect;
  nsAspect: LightAspect;
  remaining: number;
} {
  const m = ((t % CYCLE_DURATION) + CYCLE_DURATION) % CYCLE_DURATION;
  let cursor = DUR_EW_GREEN;
  if (m < cursor) {
    return { phase: "EW_GREEN", ewAspect: "green", nsAspect: "red", remaining: cursor - m };
  }
  cursor += DUR_EW_AMBER;
  if (m < cursor) {
    return { phase: "EW_AMBER", ewAspect: "amber", nsAspect: "red", remaining: cursor - m };
  }
  cursor += DUR_ALL_RED_1;
  if (m < cursor) {
    return { phase: "ALL_RED_1", ewAspect: "red", nsAspect: "red", remaining: cursor - m };
  }
  cursor += DUR_NS_GREEN;
  if (m < cursor) {
    return { phase: "NS_GREEN", ewAspect: "red", nsAspect: "green", remaining: cursor - m };
  }
  cursor += DUR_NS_AMBER;
  if (m < cursor) {
    return { phase: "NS_AMBER", ewAspect: "red", nsAspect: "amber", remaining: cursor - m };
  }
  return { phase: "ALL_RED_2", ewAspect: "red", nsAspect: "red", remaining: CYCLE_DURATION - m };
}

interface SignalBulbMaterials {
  ewRed: THREE.MeshStandardMaterial[];
  ewAmber: THREE.MeshStandardMaterial[];
  ewGreen: THREE.MeshStandardMaterial[];
  nsRed: THREE.MeshStandardMaterial[];
  nsAmber: THREE.MeshStandardMaterial[];
  nsGreen: THREE.MeshStandardMaterial[];
}

export class TamaleTrafficSignalSystem {
  public readonly group = new THREE.Group();
  private readonly nodes: SignalIntersectionRuntime[];
  private readonly bulbMats: SignalBulbMaterials[] = [];
  private readonly violationCooldowns = new Map<string, number>();
  private simTimeSec = 0;

  constructor(scene?: THREE.Scene) {
    this.nodes = TAMALE_SIGNALIZED_INTERSECTIONS.map((def) => {
      const init = evaluateCyclePhase(def.offsetSec);
      return {
        ...def,
        phase: init.phase,
        ewAspect: init.ewAspect,
        nsAspect: init.nsAspect,
        phaseRemainingSec: init.remaining,
      };
    });

    if (scene) {
      this.buildVisuals();
      scene.add(this.group);
    }
    this.syncBulbEmissives();
  }

  private buildVisuals() {
    const poleMat = new THREE.MeshStandardMaterial({
      color: "#334155",
      roughness: 0.45,
      metalness: 0.72,
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: "#0f172a",
      roughness: 0.55,
      metalness: 0.35,
    });
    const stopLineMat = new THREE.MeshBasicMaterial({
      color: "#f8fafc",
      transparent: true,
      opacity: 0.78,
    });
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.14, 6.2, 8);
    const armGeo = new THREE.BoxGeometry(3.6, 0.14, 0.14);
    const boxGeo = new THREE.BoxGeometry(0.38, 1.05, 0.32);
    const bulbGeo = new THREE.SphereGeometry(0.105, 8, 8);
    const stopLineGeoEW = new THREE.PlaneGeometry(0.45, 5.2);
    const stopLineGeoNS = new THREE.PlaneGeometry(5.2, 0.45);

    for (const node of this.nodes) {
      const mats: SignalBulbMaterials = {
        ewRed: [],
        ewAmber: [],
        ewGreen: [],
        nsRed: [],
        nsAmber: [],
        nsGreen: [],
      };

      const ixGroup = new THREE.Group();
      ixGroup.position.set(node.x, 0, node.z);

      // White road stop lines for both approaches on each axis
      const stopOffsets: Array<{ x: number; z: number; ew: boolean }> = [
        { x: -8.2, z: 2.8, ew: true },
        { x: 8.2, z: -2.8, ew: true },
        { x: -2.8, z: -8.2, ew: false },
        { x: 2.8, z: 8.2, ew: false },
      ];
      for (const sl of stopOffsets) {
        const line = new THREE.Mesh(sl.ew ? stopLineGeoEW : stopLineGeoNS, stopLineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(sl.x, 0.045, sl.z);
        ixGroup.add(line);
      }

      const makeSignalHead = (axis: "ew" | "ns", rotY: number): THREE.Group => {
        const head = new THREE.Group();
        head.rotation.y = rotY;
        const box = new THREE.Mesh(boxGeo, housingMat);
        head.add(box);

        const rMat = new THREE.MeshStandardMaterial({
          color: "#7f1d1d",
          emissive: "#ef4444",
          emissiveIntensity: 0.08,
          roughness: 0.25,
        });
        const aMat = new THREE.MeshStandardMaterial({
          color: "#78350f",
          emissive: "#f59e0b",
          emissiveIntensity: 0.08,
          roughness: 0.25,
        });
        const gMat = new THREE.MeshStandardMaterial({
          color: "#14532d",
          emissive: "#22c55e",
          emissiveIntensity: 0.08,
          roughness: 0.25,
        });

        if (axis === "ew") {
          mats.ewRed.push(rMat);
          mats.ewAmber.push(aMat);
          mats.ewGreen.push(gMat);
        } else {
          mats.nsRed.push(rMat);
          mats.nsAmber.push(aMat);
          mats.nsGreen.push(gMat);
        }

        const rBulb = new THREE.Mesh(bulbGeo, rMat);
        rBulb.position.set(0, 0.3, 0.14);
        const aBulb = new THREE.Mesh(bulbGeo, aMat);
        aBulb.position.set(0, 0, 0.14);
        const gBulb = new THREE.Mesh(bulbGeo, gMat);
        gBulb.position.set(0, -0.3, 0.14);
        head.add(rBulb, aBulb, gBulb);
        return head;
      };

      // Two diagonal corner masts per 4-way intersection with cantilevered arms over road
      const corners: Array<{ px: number; pz: number; armX: number; armZ: number; rotY: number }> = [
        { px: 7.4, pz: -7.4, armX: -1.75, armZ: 0, rotY: 0 },
        { px: -7.4, pz: 7.4, armX: 1.75, armZ: 0, rotY: Math.PI },
      ];
      for (const c of corners) {
        const mast = new THREE.Group();
        mast.position.set(c.px, 0, c.pz);

        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3.1;
        pole.castShadow = true;
        mast.add(pole);

        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(c.armX, 5.75, 0);
        mast.add(arm);

        // Dual heads visible to approaching EW and NS traffic
        const ewHeadPosX = c.armX * 1.45;
        const ewHeadA = makeSignalHead("ew", Math.PI / 2);
        ewHeadA.position.set(ewHeadPosX, 5.2, 0.2);
        const ewHeadB = makeSignalHead("ew", -Math.PI / 2);
        ewHeadB.position.set(ewHeadPosX, 5.2, -0.2);

        const nsHeadA = makeSignalHead("ns", c.rotY);
        nsHeadA.position.set(c.armX * 0.72, 5.2, 0.2);
        const nsHeadB = makeSignalHead("ns", c.rotY + Math.PI);
        nsHeadB.position.set(c.armX * 0.72, 5.2, -0.2);

        mast.add(ewHeadA, ewHeadB, nsHeadA, nsHeadB);
        ixGroup.add(mast);
      }

      this.group.add(ixGroup);
      this.bulbMats.push(mats);
    }
  }

  private syncBulbEmissives() {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const mats = this.bulbMats[i];
      if (!mats) continue;

      const ewR = node.ewAspect === "red" ? 1.75 : 0.06;
      const ewA = node.ewAspect === "amber" ? 1.85 : 0.06;
      const ewG = node.ewAspect === "green" ? 1.75 : 0.06;
      for (const m of mats.ewRed) m.emissiveIntensity = ewR;
      for (const m of mats.ewAmber) m.emissiveIntensity = ewA;
      for (const m of mats.ewGreen) m.emissiveIntensity = ewG;

      const nsR = node.nsAspect === "red" ? 1.75 : 0.06;
      const nsA = node.nsAspect === "amber" ? 1.85 : 0.06;
      const nsG = node.nsAspect === "green" ? 1.75 : 0.06;
      for (const m of mats.nsRed) m.emissiveIntensity = nsR;
      for (const m of mats.nsAmber) m.emissiveIntensity = nsA;
      for (const m of mats.nsGreen) m.emissiveIntensity = nsG;
    }
  }

  public update(dt: number) {
    this.simTimeSec += dt;
    let changed = false;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const next = evaluateCyclePhase(this.simTimeSec + n.offsetSec);
      if (next.phase !== n.phase) {
        n.phase = next.phase;
        n.ewAspect = next.ewAspect;
        n.nsAspect = next.nsAspect;
        changed = true;
      }
      n.phaseRemainingSec = next.remaining;
    }
    if (changed) {
      this.syncBulbEmissives();
    }
  }

  public getIntersections(): readonly SignalIntersectionRuntime[] {
    return this.nodes;
  }

  public getIntersectionById(id: string): SignalIntersectionRuntime | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  public getNearbySignalState(x: number, z: number, maxRange = 24): NearbySignalSnapshot | null {
    let best: NearbySignalSnapshot | null = null;
    let bestDist = maxRange;
    for (const n of this.nodes) {
      const d = Math.hypot(x - n.x, z - n.z);
      if (d < bestDist) {
        bestDist = d;
        best = {
          id: n.id,
          label: n.label,
          ewAspect: n.ewAspect,
          nsAspect: n.nsAspect,
          remainingSec: Math.ceil(n.phaseRemainingSec),
          dist: d,
        };
      }
    }
    return best;
  }

  /**
   * Used by ambient AI traffic & patrolling police cruisers to obey stop lines cleanly.
   */
  public shouldTrafficStop(
    axis: "x" | "z",
    roadCoord: number,
    posAlongAxis: number,
    dir: 1 | -1
  ): boolean {
    for (const n of this.nodes) {
      const aligned =
        axis === "x" ? Math.abs(n.z - roadCoord) < 1.2 : Math.abs(n.x - roadCoord) < 1.2;
      if (!aligned) continue;

      const aspect = axis === "x" ? n.ewAspect : n.nsAspect;
      if (aspect === "green") continue;

      const jCoord = axis === "x" ? n.x : n.z;
      const stopLine = jCoord - dir * 8.2;
      const distBeforeLine = (stopLine - posAlongAxis) * dir;
      if (distBeforeLine >= -0.4 && distBeforeLine <= 11.5) {
        if (aspect === "red" || distBeforeLine > 2.8) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Detects when the player drives across a junction's stop line against a RED light on ground level.
   */
  public checkPlayerRedLightViolation(
    prevX: number,
    prevZ: number,
    nextX: number,
    nextZ: number,
    speedKmh: number,
    entityY = 0
  ): RedLightViolationEvent | null {
    if (entityY > 1.5 || speedKmh < 14) return null;
    const dx = nextX - prevX;
    const dz = nextZ - prevZ;
    const moveLen = Math.hypot(dx, dz);
    if (moveLen < 0.04) return null;

    const movingEW = Math.abs(dx) >= Math.abs(dz);
    const dir = movingEW ? (dx > 0 ? 1 : -1) : dz > 0 ? 1 : -1;

    for (const n of this.nodes) {
      if (movingEW) {
        if (Math.abs(nextZ - n.z) > 6.5) continue;
        if (n.ewAspect !== "red") continue;
        const stopLineX = n.x - dir * 7.8;
        const prevSigned = (prevX - stopLineX) * dir;
        const nextSigned = (nextX - stopLineX) * dir;
        if (prevSigned <= 0 && nextSigned > 0) {
          const lastAt = this.violationCooldowns.get(n.id) ?? -999;
          if (this.simTimeSec - lastAt < 18) return null;
          this.violationCooldowns.set(n.id, this.simTimeSec);
          return { intersectionId: n.id, label: n.label, x: n.x, z: n.z };
        }
      } else {
        if (Math.abs(nextX - n.x) > 6.5) continue;
        if (n.nsAspect !== "red") continue;
        const stopLineZ = n.z - dir * 7.8;
        const prevSigned = (prevZ - stopLineZ) * dir;
        const nextSigned = (nextZ - stopLineZ) * dir;
        if (prevSigned <= 0 && nextSigned > 0) {
          const lastAt = this.violationCooldowns.get(n.id) ?? -999;
          if (this.simTimeSec - lastAt < 18) return null;
          this.violationCooldowns.set(n.id, this.simTimeSec);
          return { intersectionId: n.id, label: n.label, x: n.x, z: n.z };
        }
      }
    }
    return null;
  }
}
