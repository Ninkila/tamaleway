import { findRoadRoute } from "../data/tamaleRoadGraph";
import {
  NpcInteractionState,
  NpcProfile,
  NpcRuntimeSnapshot,
  NpcScheduleSlot,
} from "../types/game";
import { animateCharacterRigWalk, CharacterRig } from "./models";

interface Waypoint {
  x: number;
  z: number;
}

interface ScheduledNpcEntity {
  profile: NpcProfile;
  rig: CharacterRig;
  x: number;
  z: number;
  rotY: number;
  currentSlot: NpcScheduleSlot;
  routeQueue: Waypoint[];
  isTravelingToSlot: boolean;
  patrolIdx: number;
  waitTimer: number;
  walkPhase: number;
  isMoving: boolean;
  stuckTimer: number;
  detourSign: 1 | -1;
}

export function computeCorridorWaypoints(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number
): Waypoint[] {
  return findRoadRoute(fromX, fromZ, toX, toZ, {
    sidewalkOffset: 7.4,
    directThreshold: 20,
  });
}

export function isMinuteInSlot(minute: number, slot: NpcScheduleSlot): boolean {
  const m = ((minute % 1440) + 1440) % 1440;
  if (slot.startMinute < slot.endMinute) {
    return m >= slot.startMinute && m < slot.endMinute;
  }
  // Wraps across midnight (e.g. 19:00 -> 05:30)
  return m >= slot.startMinute || m < slot.endMinute;
}

export function getSlotForMinutes(profile: NpcProfile, minutes: number): NpcScheduleSlot {
  for (const slot of profile.schedule) {
    if (isMinuteInSlot(minutes, slot)) {
      return slot;
    }
  }
  return profile.schedule[0];
}

function getSlotProgress(minutes: number, slot: NpcScheduleSlot): number {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (slot.startMinute < slot.endMinute) {
    const span = Math.max(1, slot.endMinute - slot.startMinute);
    return Math.max(0, Math.min(1, (m - slot.startMinute) / span));
  }
  const span = Math.max(1, 1440 - slot.startMinute + slot.endMinute);
  const elapsed = m >= slot.startMinute ? m - slot.startMinute : 1440 - slot.startMinute + m;
  return Math.max(0, Math.min(1, elapsed / span));
}

function getPreviousSlot(profile: NpcProfile, slot: NpcScheduleSlot): NpcScheduleSlot {
  const idx = profile.schedule.findIndex((s) => s.id === slot.id);
  if (idx <= 0) {
    return profile.schedule[profile.schedule.length - 1];
  }
  return profile.schedule[idx - 1];
}

function interpolateAlongPath(start: Waypoint, waypoints: Waypoint[], t: number): {
  x: number;
  z: number;
  remainingQueue: Waypoint[];
  rotY: number;
} {
  const full = [start, ...waypoints];
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < full.length - 1; i++) {
    const d = Math.hypot(full[i + 1].x - full[i].x, full[i + 1].z - full[i].z);
    segLengths.push(d);
    total += d;
  }
  if (total < 0.01) {
    return { x: start.x, z: start.z, remainingQueue: [], rotY: 0 };
  }

  let targetDist = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segLengths.length; i++) {
    const len = segLengths[i];
    if (targetDist <= len || i === segLengths.length - 1) {
      const ratio = len > 0.001 ? targetDist / len : 0;
      const a = full[i];
      const b = full[i + 1];
      const x = a.x + (b.x - a.x) * ratio;
      const z = a.z + (b.z - a.z) * ratio;
      const rotY = Math.atan2(b.x - a.x, b.z - a.z);
      return {
        x,
        z,
        remainingQueue: full.slice(i + 1),
        rotY,
      };
    }
    targetDist -= len;
  }

  const last = full[full.length - 1];
  return { x: last.x, z: last.z, remainingQueue: [], rotY: 0 };
}

export type ProbeObstacleFn = (
  x: number,
  z: number,
  dirX: number,
  dirZ: number,
  lookahead: number,
  radius: number
) => { blocked: boolean; steerX: number; steerZ: number };

export class NpcScheduleController {
  private entities: ScheduledNpcEntity[] = [];
  private resolveCollision?: (x: number, z: number, radius: number) => { x: number; z: number };
  private probeObstacle?: ProbeObstacleFn;

  constructor(
    resolveCollision?: (x: number, z: number, radius: number) => { x: number; z: number },
    probeObstacle?: ProbeObstacleFn
  ) {
    this.resolveCollision = resolveCollision;
    this.probeObstacle = probeObstacle;
  }

  public registerNpc(profile: NpcProfile, rig: CharacterRig) {
    const initialSlot = profile.schedule[0];
    this.entities.push({
      profile,
      rig,
      x: profile.homeX,
      z: profile.homeZ,
      rotY: 0,
      currentSlot: initialSlot,
      routeQueue: [],
      isTravelingToSlot: false,
      patrolIdx: 0,
      waitTimer: 1.5 + Math.random() * 2,
      walkPhase: Math.random() * Math.PI * 2,
      isMoving: false,
      stuckTimer: 0,
      detourSign: this.entities.length % 2 === 0 ? 1 : -1,
    });
  }

  public initializeAtTime(gameMinutes: number) {
    this.syncAllToTime(gameMinutes);
  }

  public onTimeJump(gameMinutes: number) {
    this.syncAllToTime(gameMinutes);
  }

  private syncAllToTime(gameMinutes: number) {
    for (const ent of this.entities) {
      const slot = getSlotForMinutes(ent.profile, gameMinutes);
      ent.currentSlot = slot;
      ent.patrolIdx = 0;
      ent.waitTimer = 1.5 + Math.random() * 2.5;

      if (slot.interactionState === "commuting") {
        const prevSlot = getPreviousSlot(ent.profile, slot);
        const startPt = { x: prevSlot.targetX, z: prevSlot.targetZ };
        const fullRoute = computeCorridorWaypoints(startPt.x, startPt.z, slot.targetX, slot.targetZ);
        const progress = Math.min(0.88, Math.max(0.15, getSlotProgress(gameMinutes, slot)));
        const interp = interpolateAlongPath(startPt, fullRoute, progress);
        ent.x = interp.x;
        ent.z = interp.z;
        ent.rotY = interp.rotY;
        ent.routeQueue = interp.remainingQueue;
        ent.isTravelingToSlot = ent.routeQueue.length > 0;
        ent.isMoving = ent.isTravelingToSlot;
      } else {
        const anchor = slot.patrolPoints[0] ?? { x: slot.targetX, z: slot.targetZ };
        ent.x = anchor.x;
        ent.z = anchor.z;
        ent.routeQueue = [];
        ent.isTravelingToSlot = false;
        ent.isMoving = false;
      }

      ent.rig.root.position.set(ent.x, 0, ent.z);
      ent.rig.root.rotation.y = ent.rotY;
      this.resetLimbs(ent.rig);
    }
  }

  private resetLimbs(rig: CharacterRig) {
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftShinPivot.rotation.x = 0;
    rig.rightShinPivot.rotation.x = 0;
    rig.leftArmPivot.rotation.x = 0;
    rig.rightArmPivot.rotation.x = 0;
    rig.leftForearmPivot.rotation.x = -0.18;
    rig.rightForearmPivot.rotation.x = -0.18;
  }

  public update(dt: number, gameMinutes: number, playerPos: { x: number; z: number }) {
    for (const ent of this.entities) {
      const desiredSlot = getSlotForMinutes(ent.profile, gameMinutes);
      if (desiredSlot.id !== ent.currentSlot.id) {
        ent.currentSlot = desiredSlot;
        ent.patrolIdx = 0;
        ent.waitTimer = 1.5 + Math.random() * 2;
        const waypoints = computeCorridorWaypoints(
          ent.x,
          ent.z,
          desiredSlot.targetX,
          desiredSlot.targetZ
        );
        const distToDest = Math.hypot(desiredSlot.targetX - ent.x, desiredSlot.targetZ - ent.z);
        ent.routeQueue = waypoints;
        ent.isTravelingToSlot = distToDest > 2.5;
      }

      const playerDist = Math.hypot(playerPos.x - ent.x, playerPos.z - ent.z);
      if (playerDist < 3.4) {
        ent.rotY = Math.atan2(playerPos.x - ent.x, playerPos.z - ent.z);
        ent.isMoving = false;
        ent.rig.root.rotation.y = ent.rotY;
        this.resetLimbs(ent.rig);
        continue;
      }

      if (ent.isTravelingToSlot && ent.routeQueue.length > 0) {
        const nextWp = ent.routeQueue[0];
        const dx = nextWp.x - ent.x;
        const dz = nextWp.z - ent.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.75) {
          ent.routeQueue.shift();
          if (ent.routeQueue.length === 0) {
            ent.isTravelingToSlot = false;
            ent.isMoving = false;
            ent.waitTimer = 1.5 + Math.random() * 2;
            this.resetLimbs(ent.rig);
          }
        } else {
          const commuteSpeed = 3.5;
          const step = Math.min(dist, commuteSpeed * dt);
          const nextPos = this.stepWithAvoidance(ent, dx / dist, dz / dist, step, dt);
          ent.x = nextPos.x;
          ent.z = nextPos.z;
          ent.rotY = Math.atan2(nextPos.moveX, nextPos.moveZ);
          ent.isMoving = true;
          this.animateWalk(ent, dt, 8.5);
        }
      } else {
        // Local patrol / activity within destination zone
        const points =
          ent.currentSlot.patrolPoints.length > 0
            ? ent.currentSlot.patrolPoints
            : [{ x: ent.currentSlot.targetX, z: ent.currentSlot.targetZ }];
        const target = points[ent.patrolIdx % points.length];
        const dx = target.x - ent.x;
        const dz = target.z - ent.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.45) {
          ent.waitTimer -= dt;
          ent.isMoving = false;
          ent.stuckTimer = 0;
          this.resetLimbs(ent.rig);
          if (ent.waitTimer <= 0) {
            ent.patrolIdx = (ent.patrolIdx + 1) % points.length;
            const isCalm =
              ent.currentSlot.interactionState === "resting" ||
              ent.currentSlot.interactionState === "praying";
            ent.waitTimer = isCalm ? 6 + Math.random() * 4 : 2.5 + Math.random() * 3.5;
          }
        } else {
          const patrolSpeed = ent.currentSlot.interactionState === "resting" ? 1.1 : 1.55;
          const step = Math.min(dist, patrolSpeed * dt);
          const nextPos = this.stepWithAvoidance(ent, dx / dist, dz / dist, step, dt);
          ent.x = nextPos.x;
          ent.z = nextPos.z;
          ent.rotY = Math.atan2(nextPos.moveX, nextPos.moveZ);
          ent.isMoving = true;
          this.animateWalk(ent, dt, 6.0);
        }
      }

      ent.rig.root.position.set(ent.x, 0, ent.z);
      ent.rig.root.rotation.y = ent.rotY;
    }
  }

  private stepWithAvoidance(
    ent: ScheduledNpcEntity,
    dirX: number,
    dirZ: number,
    step: number,
    dt: number
  ): { x: number; z: number; moveX: number; moveZ: number } {
    let moveX = dirX;
    let moveZ = dirZ;

    if (this.probeObstacle) {
      const probe = this.probeObstacle(ent.x, ent.z, dirX, dirZ, 1.55, 0.42);
      if (probe.blocked) {
        moveX = dirX * 0.25 + probe.steerX * 0.75;
        moveZ = dirZ * 0.25 + probe.steerZ * 0.75;
        const mLen = Math.hypot(moveX, moveZ) || 1;
        moveX /= mLen;
        moveZ /= mLen;
      }
    }

    if (ent.stuckTimer > 0.65) {
      // Temporary lateral sidestep along tangent to escape tight obstacle corners
      const perpX = -dirZ * ent.detourSign;
      const perpZ = dirX * ent.detourSign;
      moveX = moveX * 0.25 + perpX * 0.75;
      moveZ = moveZ * 0.25 + perpZ * 0.75;
      const mLen = Math.hypot(moveX, moveZ) || 1;
      moveX /= mLen;
      moveZ /= mLen;
    }

    let nx = ent.x + moveX * step;
    let nz = ent.z + moveZ * step;
    if (this.resolveCollision) {
      const resolved = this.resolveCollision(nx, nz, 0.42);
      nx = resolved.x;
      nz = resolved.z;
    }

    const actualMoved = Math.hypot(nx - ent.x, nz - ent.z);
    if (step > 0.005 && actualMoved < step * 0.22) {
      ent.stuckTimer += dt;
      if (ent.stuckTimer > 2.2) {
        ent.detourSign = ent.detourSign === 1 ? -1 : 1;
        ent.stuckTimer = 0.7;
      }
    } else {
      ent.stuckTimer = Math.max(0, ent.stuckTimer - dt * 1.5);
    }

    return { x: nx, z: nz, moveX, moveZ };
  }

  private animateWalk(ent: ScheduledNpcEntity, dt: number, rate: number) {
    ent.walkPhase += dt * rate;
    animateCharacterRigWalk(ent.rig, ent.walkPhase, 0.44);
  }

  public getSnapshot(npcId: string): NpcRuntimeSnapshot | undefined {
    const ent = this.entities.find((e) => e.profile.id === npcId);
    return ent ? this.toSnapshot(ent) : undefined;
  }

  public getSnapshots(): NpcRuntimeSnapshot[] {
    return this.entities.map((e) => this.toSnapshot(e));
  }

  private toSnapshot(ent: ScheduledNpcEntity): NpcRuntimeSnapshot {
    const activeState: NpcInteractionState = ent.isTravelingToSlot
      ? "commuting"
      : ent.currentSlot.interactionState;
    const activeLabel = ent.isTravelingToSlot
      ? ent.currentSlot.interactionState === "commuting"
        ? ent.currentSlot.activityLabel
        : `Walking to ${ent.currentSlot.destinationLabel}`
      : ent.currentSlot.activityLabel;

    return {
      npcId: ent.profile.id,
      x: ent.x,
      z: ent.z,
      state: activeState,
      activityLabel: activeLabel,
      destinationLabel: ent.currentSlot.destinationLabel,
      district: ent.currentSlot.district,
      shopOpen: ent.isTravelingToSlot ? false : ent.currentSlot.shopOpen,
      canTalk: ent.currentSlot.canTalk,
      isMoving: ent.isMoving,
    };
  }
}
