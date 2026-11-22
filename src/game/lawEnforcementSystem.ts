import * as THREE from "three";
import { PoliceStopNotice, PoliceViolationKind } from "../types/game";
import { COLLIDER_MASK_SOLID, SpatialCollisionWorld } from "./collisionSystem";
import {
  CharacterRig,
  createCharacterRig,
  createPoliceCarMesh,
  createPrivateCarMesh,
  createTaxiMesh,
} from "./models";
import { ProceduralTextureSet } from "./textures";
import { TamaleTrafficSignalSystem } from "./trafficSystem";

export interface PoliceOfficerEntity {
  id: string;
  name: string;
  district: string;
  x: number;
  z: number;
  rotY: number;
  rig?: CharacterRig;
}

export interface PoliceCruiserEntity {
  id: string;
  callsign: string;
  x: number;
  z: number;
  rotY: number;
  speed: number;
  waypoints: Array<{ x: number; z: number }>;
  wpIndex: number;
  pursuing: boolean;
  group?: THREE.Group;
  lightbarRedMat?: THREE.MeshStandardMaterial;
  lightbarBlueMat?: THREE.MeshStandardMaterial;
  wheels?: THREE.Mesh[];
}

export interface RoadIncidentEntity {
  id: string;
  title: string;
  district: string;
  x: number;
  z: number;
  rotY: number;
  description: string;
  rewardCedis: number;
  cleared: boolean;
  group?: THREE.Group;
  hazardMats: THREE.MeshStandardMaterial[];
}

export interface LawEnforcementCallbacks {
  onStopTriggered?: (notice: PoliceStopNotice) => void;
  onWarningToast?: (msg: string) => void;
  onPoliceChirp?: () => void;
}

export class TamaleLawEnforcementSystem {
  public readonly group = new THREE.Group();
  public readonly officers: PoliceOfficerEntity[] = [];
  public readonly cruisers: PoliceCruiserEntity[] = [];
  public readonly incidents: RoadIncidentEntity[] = [];

  private callbacks: LawEnforcementCallbacks;
  private simTime = 0;
  private flashPhase = 0;
  private speedingCooldown = 0;
  private recklessCooldown = 0;
  private activePursuitTimer = 0;
  private pendingViolation: {
    kind: PoliceViolationKind;
    detail: string;
    fineCedis: number;
    district: string;
  } | null = null;
  private activeStopNotice: PoliceStopNotice | null = null;
  private offensesCount = 0;
  private impoundedVehicleId: string | null = null;
  private warningsIssued = 0;

  constructor(
    scene?: THREE.Scene,
    textures?: ProceduralTextureSet,
    callbacks: LawEnforcementCallbacks = {}
  ) {
    this.callbacks = callbacks;
    this.initEntities(scene, textures);
    if (scene) {
      scene.add(this.group);
    }
  }

  private initEntities(scene?: THREE.Scene, textures?: ProceduralTextureSet) {
    const officerSeeds: Array<Omit<PoliceOfficerEntity, "rig">> = [
      {
        id: "off_hq_gate",
        name: "Sgt. Yakubu Ibrahim (MTTD)",
        district: "Tamale Divisional Police HQ",
        x: 47.4,
        z: -27.5,
        rotY: -Math.PI * 0.45,
      },
      {
        id: "off_central_market",
        name: "Insp. AminaFuseini (Traffic Unit)",
        district: "Central Market West Junction",
        x: -58.5,
        z: -7.2,
        rotY: Math.PI * 0.15,
      },
      {
        id: "off_interchange",
        name: "Cpl. Alhassan Mahama (MTTD)",
        district: "Naa Gbewaa Interchange",
        x: -11.5,
        z: -11.5,
        rotY: Math.PI * 0.25,
      },
      {
        id: "off_lamashegu",
        name: "Const. Salifu Moro (Lamashegu Post)",
        district: "Lamashegu Salaga Rd",
        x: -72.0,
        z: 120.5,
        rotY: Math.PI * 0.1,
      },
    ];

    for (const seed of officerSeeds) {
      let rig: CharacterRig | undefined;
      if (scene && textures) {
        rig = createCharacterRig(
          {
            outfit: "polo",
            headwear: "none",
            primaryColor: "#1e3a8a",
            accentColor: "#eab308",
            skinTone: "#5b321b",
            policeUniform: true,
          },
          textures
        );
        rig.root.position.set(seed.x, 0, seed.z);
        rig.root.rotation.y = seed.rotY;
        this.group.add(rig.root);
      }
      this.officers.push({ ...seed, rig });
    }

    const cruiserRoutes: Array<{
      id: string;
      callsign: string;
      speed: number;
      waypoints: Array<{ x: number; z: number }>;
    }> = [
      {
        id: "patrol_central",
        callsign: "MTTD-01 Central",
        speed: 9.2,
        waypoints: [
          { x: -66, z: 0 },
          { x: 66, z: 0 },
          { x: 66, z: 66 },
          { x: -66, z: 66 },
        ],
      },
      {
        id: "patrol_north_hq",
        callsign: "MTTD-02 HQ Loop",
        speed: 8.8,
        waypoints: [
          { x: 66, z: -48 },
          { x: 66, z: 0 },
          { x: 0, z: 0 },
          { x: 0, z: -48 },
        ],
      },
      {
        id: "patrol_lamashegu",
        callsign: "MTTD-03 South Corridor",
        speed: 9.6,
        waypoints: [
          { x: -102, z: 0 },
          { x: -102, z: 128 },
          { x: 66, z: 128 },
          { x: 66, z: 66 },
          { x: -66, z: 66 },
          { x: -66, z: 0 },
        ],
      },
    ];

    for (const cr of cruiserRoutes) {
      const start = cr.waypoints[0];
      const next = cr.waypoints[1];
      const rotY = Math.atan2(next.x - start.x, next.z - start.z);
      let group: THREE.Group | undefined;
      let lightbarRedMat: THREE.MeshStandardMaterial | undefined;
      let lightbarBlueMat: THREE.MeshStandardMaterial | undefined;
      let wheels: THREE.Mesh[] | undefined;

      if (scene && textures) {
        const mesh = createPoliceCarMesh(textures);
        group = mesh.group;
        lightbarRedMat = mesh.lightbarRedMat;
        lightbarBlueMat = mesh.lightbarBlueMat;
        wheels = mesh.wheels;
        group.position.set(start.x, 0, start.z);
        group.rotation.y = rotY;
        this.group.add(group);
      }

      this.cruisers.push({
        id: cr.id,
        callsign: cr.callsign,
        x: start.x,
        z: start.z,
        rotY,
        speed: cr.speed,
        waypoints: cr.waypoints,
        wpIndex: 1,
        pursuing: false,
        group,
        lightbarRedMat,
        lightbarBlueMat,
        wheels,
      });
    }

    const incidentDefs: Array<Omit<RoadIncidentEntity, "cleared" | "group" | "hazardMats">> = [
      {
        id: "inc_vittin_breakdown",
        title: "Stalled Saloon on Vittin Ring Road",
        district: "Vittin Eastern Ring",
        x: 186,
        z: 46,
        rotY: Math.PI * 0.08,
        description: "A commuter saloon blew a radiator hose on Vittin Ring. Assist driver with hazard check (+GH₵ 55).",
        rewardCedis: 55,
      },
      {
        id: "inc_sagnarigu_cargo",
        title: "Overheated Van near Sagnarigu Arterial",
        district: "Sagnarigu North",
        x: -128,
        z: -92,
        rotY: Math.PI * 0.45,
        description: "Delivery car parked with warning cones along Sagnarigu Arterial. Help inspect & clear lane (+GH₵ 60).",
        rewardCedis: 60,
      },
      {
        id: "inc_salaga_taxi",
        title: "Taxi Tyre Breakdown on Salaga Road",
        district: "Lamashegu – Hospital Rd",
        x: 92,
        z: 128,
        rotY: -Math.PI * 0.44,
        description: "Dropped-in Tamale taxi with hazard lights flashing east of Teaching Hospital (+GH₵ 50).",
        rewardCedis: 50,
      },
    ];

    for (const inc of incidentDefs) {
      const hazardMats: THREE.MeshStandardMaterial[] = [];
      let incGroup: THREE.Group | undefined;

      if (scene && textures) {
        incGroup = new THREE.Group();
        incGroup.position.set(inc.x, 0, inc.z);
        incGroup.rotation.y = inc.rotY;

        const car =
          inc.id === "inc_salaga_taxi"
            ? createTaxiMesh(textures)
            : createPrivateCarMesh(inc.id === "inc_vittin_breakdown" ? "#7f1d1d" : "#475569", textures);
        incGroup.add(car.group);
        hazardMats.push(car.brakeLightMat);

        // Two safety cones placed safely around the breakdown
        const coneMat = new THREE.MeshStandardMaterial({ color: "#ea580c", roughness: 0.65 });
        const stripeMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.5 });
        const coneGeo = new THREE.ConeGeometry(0.22, 0.56, 10);
        const stripeGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.14, 10);
        for (const [cx, cz] of [
          [-1.2, -2.9],
          [1.2, 2.9],
        ]) {
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.set(cx, 0.28, cz);
          const stripe = new THREE.Mesh(stripeGeo, stripeMat);
          stripe.position.set(cx, 0.3, cz);
          incGroup.add(cone, stripe);
        }

        this.group.add(incGroup);
      }

      this.incidents.push({
        ...inc,
        cleared: false,
        group: incGroup,
        hazardMats,
      });
    }
  }

  public setStateFromSave(state: {
    offensesCount?: number;
    impoundedVehicleId?: string | null;
  }) {
    this.offensesCount = state.offensesCount ?? 0;
    this.impoundedVehicleId = state.impoundedVehicleId ?? null;
  }

  public getOffensesCount(): number {
    return this.offensesCount;
  }

  public getImpoundedVehicleId(): string | null {
    return this.impoundedVehicleId;
  }

  public isPursuing(): boolean {
    return this.pendingViolation !== null;
  }

  public getActiveStopNotice(): PoliceStopNotice | null {
    return this.activeStopNotice;
  }

  public reportRedLightViolation(districtLabel: string) {
    this.queueViolation(
      "red_light",
      `Crossed active RED traffic signal at ${districtLabel}.`,
      50,
      districtLabel
    );
  }

  public reportSevereCollision(speedKmh: number, districtLabel: string) {
    if (this.recklessCooldown > 0 || speedKmh < 32) return;
    this.recklessCooldown = 14;
    this.queueViolation(
      "reckless_collision",
      `High-impact collision (${Math.round(speedKmh)} km/h) reported near ${districtLabel}.`,
      75,
      districtLabel
    );
  }

  public evaluateSpeeding(
    x: number,
    z: number,
    entityY: number,
    speedKmh: number,
    isDriving: boolean,
    districtLabel: string
  ) {
    if (!isDriving || entityY > 1.5 || this.speedingCooldown > 0 || this.pendingViolation || this.activeStopNotice) {
      return;
    }
    // Speed limit in central & market corridors is 72 km/h when near police presence
    const inCentralZone = Math.abs(x) < 120 && Math.abs(z) < 140;
    if (!inCentralZone || speedKmh <= 72) return;

    let policeNearby = false;
    for (const off of this.officers) {
      if (Math.hypot(off.x - x, off.z - z) < 42) {
        policeNearby = true;
        break;
      }
    }
    if (!policeNearby) {
      for (const cr of this.cruisers) {
        if (Math.hypot(cr.x - x, cr.z - z) < 48) {
          policeNearby = true;
          break;
        }
      }
    }
    if (!policeNearby) return;

    this.speedingCooldown = 16;
    this.queueViolation(
      "speeding",
      `MTTD radar clocked ${Math.round(speedKmh)} km/h in 65 km/h Tamale central corridor.`,
      60,
      districtLabel
    );
  }

  private queueViolation(
    kind: PoliceViolationKind,
    detail: string,
    fineCedis: number,
    district: string
  ) {
    if (this.activeStopNotice || this.pendingViolation) return;
    this.pendingViolation = { kind, detail, fineCedis, district };
    this.activePursuitTimer = 2.4;
    this.callbacks.onPoliceChirp?.();
    this.callbacks.onWarningToast?.(`Ghana Police MTTD Alert: Pull over! (${kind.replace("_", " ")})`);
  }

  public triggerImmediateStopForTest(
    kind: PoliceViolationKind,
    detail: string,
    fineCedis: number
  ): PoliceStopNotice {
    this.pendingViolation = { kind, detail, fineCedis, district: "Central Tamale" };
    this.activePursuitTimer = 0;
    return this.finalizeStop();
  }

  private finalizeStop(): PoliceStopNotice {
    const pv = this.pendingViolation!;
    this.pendingViolation = null;
    const canWarn = this.offensesCount === 0 && this.warningsIssued === 0;
    const escalatedFine = pv.fineCedis + Math.min(80, this.offensesCount * 20);
    const notice: PoliceStopNotice = {
      id: `stop_${Date.now()}`,
      violationKind: pv.kind,
      officerName: this.officers[1]?.name ?? "MTTD Officer",
      title:
        pv.kind === "red_light"
          ? "Red Signal Infraction"
          : pv.kind === "speeding"
          ? "Excessive Corridor Speed"
          : "Reckless Road Collision",
      detail: pv.detail,
      fineCedis: escalatedFine,
      warningEligible: canWarn,
      impoundRisk: this.offensesCount >= 2,
      offenseCountAfter: this.offensesCount + 1,
    };
    this.activeStopNotice = notice;
    this.callbacks.onStopTriggered?.(notice);
    return notice;
  }

  public resolveStop(
    action: "pay_cash" | "pay_momo" | "accept_warning" | "impound",
    currentVehicleId: string | null
  ): {
    cleared: boolean;
    finePaid: number;
    impoundedVehicleId: string | null;
    offensesCount: number;
  } {
    const notice = this.activeStopNotice;
    if (!notice) {
      return {
        cleared: true,
        finePaid: 0,
        impoundedVehicleId: this.impoundedVehicleId,
        offensesCount: this.offensesCount,
      };
    }

    let finePaid = 0;
    if (action === "accept_warning" && notice.warningEligible) {
      this.warningsIssued += 1;
    } else if (action === "impound") {
      this.offensesCount += 1;
      this.impoundedVehicleId = currentVehicleId ?? "pragya_central";
    } else {
      finePaid = notice.fineCedis;
      this.offensesCount += 1;
    }

    this.activeStopNotice = null;
    return {
      cleared: true,
      finePaid,
      impoundedVehicleId: this.impoundedVehicleId,
      offensesCount: this.offensesCount,
    };
  }

  public releaseImpoundedVehicle(): { releasedId: string | null; feeCedis: number } {
    if (!this.impoundedVehicleId) {
      return { releasedId: null, feeCedis: 0 };
    }
    const releasedId = this.impoundedVehicleId;
    this.impoundedVehicleId = null;
    return { releasedId, feeCedis: 65 };
  }

  public assistRoadIncident(incidentId: string): RoadIncidentEntity | null {
    const inc = this.incidents.find((i) => i.id === incidentId && !i.cleared);
    if (!inc) return null;
    inc.cleared = true;
    if (inc.group) {
      inc.group.visible = false;
    }
    return inc;
  }

  public findNearestInteractable(
    x: number,
    z: number,
    maxRadius = 4.5
  ):
    | { kind: "police_officer"; id: string; label: string; dist: number; x: number; z: number }
    | { kind: "accident_scene"; id: string; label: string; dist: number; x: number; z: number }
    | null {
    let bestOfficer: {
      kind: "police_officer";
      id: string;
      label: string;
      dist: number;
      x: number;
      z: number;
    } | null = null;
    let bestDist = maxRadius;

    for (const inc of this.incidents) {
      if (inc.cleared) continue;
      const d = Math.hypot(x - inc.x, z - inc.z);
      if (d < bestDist + 1.2) {
        return {
          kind: "accident_scene",
          id: inc.id,
          label: inc.title,
          dist: d,
          x: inc.x,
          z: inc.z,
        };
      }
    }

    for (const off of this.officers) {
      const d = Math.hypot(x - off.x, z - off.z);
      if (d < bestDist) {
        bestDist = d;
        bestOfficer = {
          kind: "police_officer",
          id: off.id,
          label: off.name,
          dist: d,
          x: off.x,
          z: off.z,
        };
      }
    }
    return bestOfficer;
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    trafficSignals?: TamaleTrafficSignalSystem,
    collisionWorld?: SpatialCollisionWorld
  ) {
    this.simTime += dt;
    this.flashPhase += dt * 7.5;
    if (this.speedingCooldown > 0) this.speedingCooldown = Math.max(0, this.speedingCooldown - dt);
    if (this.recklessCooldown > 0) this.recklessCooldown = Math.max(0, this.recklessCooldown - dt);

    // Handle active pullover countdown
    if (this.pendingViolation && !this.activeStopNotice) {
      this.activePursuitTimer -= dt;
      if (this.activePursuitTimer <= 0) {
        this.finalizeStop();
      }
    }

    // Flash police lightbars & hazard indicators
    const redOn = Math.sin(this.flashPhase) > 0;
    const hazardBlink = Math.sin(this.simTime * 5.2) > 0 ? 1.55 : 0.12;

    for (const inc of this.incidents) {
      if (inc.cleared) continue;
      for (const hm of inc.hazardMats) {
        hm.emissiveIntensity = hazardBlink;
      }
    }

    // Face officers subtly toward player when close
    for (const off of this.officers) {
      if (!off.rig) continue;
      const dist = Math.hypot(playerX - off.x, playerZ - off.z);
      if (dist < 10) {
        off.rotY = Math.atan2(playerX - off.x, playerZ - off.z);
      }
      off.rig.root.rotation.y = off.rotY;
    }

    // Move patrolling police cruisers smoothly
    for (const cr of this.cruisers) {
      const target = cr.waypoints[cr.wpIndex];
      const dx = target.x - cr.x;
      const dz = target.z - cr.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.2) {
        cr.wpIndex = (cr.wpIndex + 1) % cr.waypoints.length;
        continue;
      }

      const dirX = dx / dist;
      const dirZ = dz / dist;
      const movingEW = Math.abs(dirX) >= Math.abs(dirZ);
      const axis = movingEW ? "x" : "z";
      const roadCoord = movingEW ? cr.z : cr.x;
      const posAlong = movingEW ? cr.x : cr.z;
      const sign = movingEW ? (dirX >= 0 ? 1 : -1) : dirZ >= 0 ? 1 : -1;

      const blockedBySignal =
        !this.pendingViolation &&
        trafficSignals?.shouldTrafficStop(axis, roadCoord, posAlong, sign as 1 | -1);

      // Pause cleanly if player is directly ahead
      const distToPlayer = Math.hypot(playerX - cr.x, playerZ - cr.z);
      const playerAhead =
        distToPlayer < 6.0 &&
        (playerX - cr.x) * dirX + (playerZ - cr.z) * dirZ > 0.5 * distToPlayer;

      const curSpeed = blockedBySignal || playerAhead ? 0 : this.pendingViolation ? cr.speed * 1.28 : cr.speed;
      if (curSpeed > 0.05) {
        const nx = cr.x + dirX * curSpeed * dt;
        const nz = cr.z + dirZ * curSpeed * dt;
        const resolved = collisionWorld
          ? collisionWorld.resolveCircle2D(nx, nz, 1.35, COLLIDER_MASK_SOLID, undefined, undefined, 0)
          : { x: nx, z: nz };
        cr.x = resolved.x;
        cr.z = resolved.z;
        cr.rotY = Math.atan2(dirX, dirZ);
        if (cr.wheels) {
          for (const w of cr.wheels) w.rotation.x += curSpeed * dt * 1.4;
        }
      }

      if (cr.group) {
        cr.group.position.set(cr.x, 0, cr.z);
        cr.group.rotation.y = cr.rotY;
      }
      if (cr.lightbarRedMat && cr.lightbarBlueMat) {
        const patrolBoost = this.pendingViolation ? 2.4 : 0.95;
        cr.lightbarRedMat.emissiveIntensity = redOn ? patrolBoost : 0.1;
        cr.lightbarBlueMat.emissiveIntensity = redOn ? 0.1 : patrolBoost;
      }
    }
  }
}
