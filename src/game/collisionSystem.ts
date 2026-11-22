export const ColliderLayer = {
  NONE: 0,
  BUILDING: 1 << 0,
  WALL: 1 << 1,
  PROP: 1 << 2,
  TREE: 1 << 3,
  POLE: 1 << 4,
  VEGETATION: 1 << 5,
  VEHICLE: 1 << 6,
  DOOR_CLOSED: 1 << 7,
} as const;

export const COLLIDER_MASK_SOLID =
  ColliderLayer.BUILDING |
  ColliderLayer.WALL |
  ColliderLayer.PROP |
  ColliderLayer.TREE |
  ColliderLayer.POLE |
  ColliderLayer.VEGETATION |
  ColliderLayer.DOOR_CLOSED;

export const COLLIDER_MASK_ALL_WITH_VEHICLES = COLLIDER_MASK_SOLID | ColliderLayer.VEHICLE;

export interface BoxObstacle {
  id: string;
  kind: "box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  layer: number;
  blocksCamera: boolean;
}

export interface CylinderObstacle {
  id: string;
  kind: "cylinder";
  x: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
  layer: number;
  blocksCamera: boolean;
}

export interface OrientedBoxObstacle {
  id: string;
  kind: "obb";
  x: number;
  z: number;
  halfWidth: number;
  halfLength: number;
  rotY: number;
  minY: number;
  maxY: number;
  layer: number;
  blocksCamera: boolean;
}

export type StaticObstacle = BoxObstacle | CylinderObstacle | OrientedBoxObstacle;

export interface DynamicVehicleObstacle {
  id: string;
  x: number;
  z: number;
  y?: number;
  rotY: number;
  halfWidth: number;
  halfLength: number;
  height: number;
  isActive: boolean;
}

export interface DoorwayEntranceSpec {
  landmarkId: string;
  name: string;
  dagbaniLabel: string;
  doorX: number;
  doorZ: number;
  normalX: number;
  normalZ: number;
  triggerRadius: number;
  shopId?: string;
}

export interface WorldBounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface InteriorColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

export interface SpeedHumpZone {
  x: number;
  z: number;
  rotY: number;
  width: number;
}

const TAMALE_SPEED_HUMP_ZONES: SpeedHumpZone[] = [
  { x: -24, z: 0, rotY: Math.PI / 2, width: 12 },
  { x: 30, z: -48, rotY: Math.PI / 2, width: 8.5 },
  { x: -115, z: 0, rotY: Math.PI / 2, width: 12 },
  { x: -84, z: 128, rotY: Math.PI / 2, width: 9.2 },
  { x: 86, z: 128, rotY: Math.PI / 2, width: 9.2 },
  { x: 0, z: 24, rotY: 0, width: 10.5 },
];

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function resolveCircleAgainstAABB(
  rx: number,
  rz: number,
  radius: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): { x: number; z: number; hit: boolean } {
  const closestX = clamp(rx, minX, maxX);
  const closestZ = clamp(rz, minZ, maxZ);
  const dx = rx - closestX;
  const dz = rz - closestZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) {
    return { x: rx, z: rz, hit: false };
  }
  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    return {
      x: rx + (dx / dist) * overlap,
      z: rz + (dz / dist) * overlap,
      hit: true,
    };
  }
  // Circle center is inside AABB: push out along nearest edge normal
  const leftPen = rx - minX;
  const rightPen = maxX - rx;
  const topPen = rz - minZ;
  const bottomPen = maxZ - rz;
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
  if (minPen === leftPen) return { x: minX - radius, z: rz, hit: true };
  if (minPen === rightPen) return { x: maxX + radius, z: rz, hit: true };
  if (minPen === topPen) return { x: rx, z: minZ - radius, hit: true };
  return { x: rx, z: maxZ + radius, hit: true };
}

function resolveCircleAgainstCylinder(
  rx: number,
  rz: number,
  radius: number,
  cx: number,
  cz: number,
  cRadius: number
): { x: number; z: number; hit: boolean } {
  const minDist = radius + cRadius;
  const dx = rx - cx;
  const dz = rz - cz;
  const distSq = dx * dx + dz * dz;
  if (distSq >= minDist * minDist) {
    return { x: rx, z: rz, hit: false };
  }
  const dist = Math.sqrt(distSq);
  if (dist < 1e-5) {
    return { x: cx + minDist, z: cz, hit: true };
  }
  const overlap = minDist - dist;
  return {
    x: rx + (dx / dist) * overlap,
    z: rz + (dz / dist) * overlap,
    hit: true,
  };
}

/**
 * Oriented Box (OBB) resolution around local +Z forward rotated by rotY:
 * Three.js rotation.y maps local (lx, lz) -> world:
 *   wx = ox + lx * cos(rotY) + lz * sin(rotY)
 *   wz = oz - lx * sin(rotY) + lz * cos(rotY)
 */
function resolveCircleAgainstOBB(
  rx: number,
  rz: number,
  radius: number,
  ox: number,
  oz: number,
  rotY: number,
  halfWidth: number,
  halfLength: number
): { x: number; z: number; hit: boolean } {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const dx = rx - ox;
  const dz = rz - oz;
  // Inverse rotation to vehicle local frame
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;

  const res = resolveCircleAgainstAABB(
    lx,
    lz,
    radius,
    -halfWidth,
    halfWidth,
    -halfLength,
    halfLength
  );
  if (!res.hit) {
    return { x: rx, z: rz, hit: false };
  }
  // Forward rotation back to world space
  return {
    x: ox + res.x * c + res.z * s,
    z: oz - res.x * s + res.z * c,
    hit: true,
  };
}

function pointInsideOBB(
  px: number,
  pz: number,
  ox: number,
  oz: number,
  rotY: number,
  halfWidth: number,
  halfLength: number,
  margin: number
): boolean {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const dx = px - ox;
  const dz = pz - oz;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return (
    Math.abs(lx) <= halfWidth + margin &&
    Math.abs(lz) <= halfLength + margin
  );
}

export class SpatialCollisionWorld {
  private bounds: WorldBounds2D;
  private cellSize: number;
  private obstacles: StaticObstacle[] = [];
  private grid = new Map<string, StaticObstacle[]>();
  private nextId = 1;

  constructor(bounds: WorldBounds2D, cellSize = 12) {
    this.bounds = bounds;
    this.cellSize = cellSize;
  }

  public clear() {
    this.obstacles = [];
    this.grid.clear();
    this.nextId = 1;
  }

  public getObstacleCount(): number {
    return this.obstacles.length;
  }

  public getObstacles(): readonly StaticObstacle[] {
    return this.obstacles;
  }

  private insertIntoGrid(obs: StaticObstacle, minX: number, maxX: number, minZ: number, maxZ: number) {
    const gx0 = Math.floor(minX / this.cellSize);
    const gx1 = Math.floor(maxX / this.cellSize);
    const gz0 = Math.floor(minZ / this.cellSize);
    const gz1 = Math.floor(maxZ / this.cellSize);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const key = `${gx},${gz}`;
        let bucket = this.grid.get(key);
        if (!bucket) {
          bucket = [];
          this.grid.set(key, bucket);
        }
        bucket.push(obs);
      }
    }
  }

  public addBox(opts: {
    id?: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY?: number;
    maxY?: number;
    layer?: number;
    blocksCamera?: boolean;
  }): BoxObstacle {
    const minX = Math.min(opts.minX, opts.maxX);
    const maxX = Math.max(opts.minX, opts.maxX);
    const minZ = Math.min(opts.minZ, opts.maxZ);
    const maxZ = Math.max(opts.minZ, opts.maxZ);
    const obs: BoxObstacle = {
      id: opts.id ?? `box_${this.nextId++}`,
      kind: "box",
      minX,
      maxX,
      minZ,
      maxZ,
      minY: opts.minY ?? 0,
      maxY: opts.maxY ?? 4.5,
      layer: opts.layer ?? ColliderLayer.BUILDING,
      blocksCamera: opts.blocksCamera ?? true,
    };
    this.obstacles.push(obs);
    this.insertIntoGrid(obs, minX, maxX, minZ, maxZ);
    return obs;
  }

  public addRotatedBox(opts: {
    id?: string;
    x: number;
    z: number;
    halfWidth: number;
    halfLength: number;
    rotY: number;
    minY?: number;
    maxY?: number;
    layer?: number;
    blocksCamera?: boolean;
  }): StaticObstacle {
    const s = Math.abs(Math.sin(opts.rotY));
    const c = Math.abs(Math.cos(opts.rotY));
    // Axis-aligned fast-path for cardinal rotations (0, ±pi/2, pi)
    if (s < 0.02 || c < 0.02) {
      const hx = s > 0.7 ? opts.halfLength : opts.halfWidth;
      const hz = s > 0.7 ? opts.halfWidth : opts.halfLength;
      return this.addBox({
        id: opts.id,
        minX: opts.x - hx,
        maxX: opts.x + hx,
        minZ: opts.z - hz,
        maxZ: opts.z + hz,
        minY: opts.minY,
        maxY: opts.maxY,
        layer: opts.layer,
        blocksCamera: opts.blocksCamera,
      });
    }
    const obs: OrientedBoxObstacle = {
      id: opts.id ?? `obb_${this.nextId++}`,
      kind: "obb",
      x: opts.x,
      z: opts.z,
      halfWidth: opts.halfWidth,
      halfLength: opts.halfLength,
      rotY: opts.rotY,
      minY: opts.minY ?? 0,
      maxY: opts.maxY ?? 2.5,
      layer: opts.layer ?? ColliderLayer.PROP,
      blocksCamera: opts.blocksCamera ?? true,
    };
    const extent = opts.halfWidth * c + opts.halfLength * s + 0.25;
    const extentZ = opts.halfWidth * s + opts.halfLength * c + 0.25;
    this.obstacles.push(obs);
    this.insertIntoGrid(obs, opts.x - extent, opts.x + extent, opts.z - extentZ, opts.z + extentZ);
    return obs;
  }

  public addCylinder(opts: {
    id?: string;
    x: number;
    z: number;
    radius: number;
    minY?: number;
    maxY?: number;
    layer?: number;
    blocksCamera?: boolean;
  }): CylinderObstacle {
    const obs: CylinderObstacle = {
      id: opts.id ?? `cyl_${this.nextId++}`,
      kind: "cylinder",
      x: opts.x,
      z: opts.z,
      radius: opts.radius,
      minY: opts.minY ?? 0,
      maxY: opts.maxY ?? 4.5,
      layer: opts.layer ?? ColliderLayer.TREE,
      blocksCamera: opts.blocksCamera ?? true,
    };
    this.obstacles.push(obs);
    this.insertIntoGrid(
      obs,
      opts.x - opts.radius,
      opts.x + opts.radius,
      opts.z - opts.radius,
      opts.z + opts.radius
    );
    return obs;
  }

  private queryNearbyUnique(minX: number, maxX: number, minZ: number, maxZ: number): StaticObstacle[] {
    const gx0 = Math.floor(minX / this.cellSize);
    const gx1 = Math.floor(maxX / this.cellSize);
    const gz0 = Math.floor(minZ / this.cellSize);
    const gz1 = Math.floor(maxZ / this.cellSize);
    const seen = new Set<StaticObstacle>();
    const results: StaticObstacle[] = [];
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const bucket = this.grid.get(`${gx},${gz}`);
        if (!bucket) continue;
        for (const obs of bucket) {
          if (!seen.has(obs)) {
            seen.add(obs);
            results.push(obs);
          }
        }
      }
    }
    return results;
  }

  public resolveCircle2D(
    x: number,
    z: number,
    radius: number,
    layerMask: number = COLLIDER_MASK_ALL_WITH_VEHICLES,
    dynamicVehicles?: readonly DynamicVehicleObstacle[],
    ignoreVehicleId?: string,
    entityY?: number
  ): { x: number; z: number; collided: boolean } {
    let rx = clamp(x, this.bounds.minX, this.bounds.maxX);
    let rz = clamp(z, this.bounds.minZ, this.bounds.maxZ);
    let collided = rx !== x || rz !== z;

    const candidates = this.queryNearbyUnique(
      rx - radius - 1.5,
      rx + radius + 1.5,
      rz - radius - 1.5,
      rz + radius + 1.5
    );

    const checkVehicles = (layerMask & ColliderLayer.VEHICLE) !== 0 && dynamicVehicles && dynamicVehicles.length > 0;

    // 3 iterative passes smoothly handle corners & multiple adjacent obstacles
    for (let pass = 0; pass < 3; pass++) {
      let passHit = false;
      for (const obs of candidates) {
        if ((obs.layer & layerMask) === 0) continue;
        if (entityY !== undefined && (entityY + 1.65 < obs.minY || entityY > obs.maxY + 0.18)) {
          continue;
        }
        if (obs.kind === "box") {
          const res = resolveCircleAgainstAABB(rx, rz, radius, obs.minX, obs.maxX, obs.minZ, obs.maxZ);
          if (res.hit) {
            rx = res.x;
            rz = res.z;
            collided = true;
            passHit = true;
          }
        } else if (obs.kind === "cylinder") {
          const res = resolveCircleAgainstCylinder(rx, rz, radius, obs.x, obs.z, obs.radius);
          if (res.hit) {
            rx = res.x;
            rz = res.z;
            collided = true;
            passHit = true;
          }
        } else {
          const res = resolveCircleAgainstOBB(
            rx,
            rz,
            radius,
            obs.x,
            obs.z,
            obs.rotY,
            obs.halfWidth,
            obs.halfLength
          );
          if (res.hit) {
            rx = res.x;
            rz = res.z;
            collided = true;
            passHit = true;
          }
        }
      }

      if (checkVehicles) {
        for (const v of dynamicVehicles!) {
          if (!v.isActive || v.id === ignoreVehicleId) continue;
          const vy = v.y ?? 0;
          if (entityY !== undefined && (entityY + 1.65 < vy || entityY > vy + v.height + 0.18)) {
            continue;
          }
          const res = resolveCircleAgainstOBB(
            rx,
            rz,
            radius,
            v.x,
            v.z,
            v.rotY,
            v.halfWidth,
            v.halfLength
          );
          if (res.hit) {
            rx = res.x;
            rz = res.z;
            collided = true;
            passHit = true;
          }
        }
      }

      rx = clamp(rx, this.bounds.minX, this.bounds.maxX);
      rz = clamp(rz, this.bounds.minZ, this.bounds.maxZ);
      if (!passHit) break;
    }

    return { x: rx, z: rz, collided };
  }

  /**
   * Anti-tunneling sub-stepped 2D circle sweep. Ensures fast sprinting or vehicle motion
   * cannot skip across thin walls, fences, poles, or market stalls in a single frame.
   */
  public sweepMove2D(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    radius: number,
    layerMask: number = COLLIDER_MASK_ALL_WITH_VEHICLES,
    dynamicVehicles?: readonly DynamicVehicleObstacle[],
    ignoreVehicleId?: string,
    entityY?: number
  ): { x: number; z: number; collided: boolean } {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = Math.hypot(dx, dz);
    const maxStep = 0.34;
    const steps = Math.max(1, Math.min(18, Math.ceil(dist / maxStep)));

    let curX = fromX;
    let curZ = fromZ;
    let anyCollision = false;

    for (let s = 1; s <= steps; s++) {
      const targetX = curX + dx / steps;
      const targetZ = curZ + dz / steps;
      const res = this.resolveCircle2D(
        targetX,
        targetZ,
        radius,
        layerMask,
        dynamicVehicles,
        ignoreVehicleId,
        entityY
      );
      if (res.collided) anyCollision = true;
      curX = res.x;
      curZ = res.z;
    }

    return { x: curX, z: curZ, collided: anyCollision };
  }

  /**
   * 3-whisker feeler probe (center, +32°, -32°) for NPC and crowd obstacle steering.
   */
  public probeAhead(
    x: number,
    z: number,
    dirX: number,
    dirZ: number,
    lookahead = 1.65,
    radius = 0.42,
    layerMask: number = COLLIDER_MASK_ALL_WITH_VEHICLES,
    dynamicVehicles?: readonly DynamicVehicleObstacle[]
  ): { blocked: boolean; steerX: number; steerZ: number } {
    const len = Math.hypot(dirX, dirZ) || 1;
    const ux = dirX / len;
    const uz = dirZ / len;

    const testPoint = (px: number, pz: number, r: number): boolean => {
      const res = this.resolveCircle2D(px, pz, r, layerMask, dynamicVehicles);
      return res.collided || Math.hypot(res.x - px, res.z - pz) > 0.04;
    };

    const centerBlocked =
      testPoint(x + ux * (lookahead * 0.55), z + uz * (lookahead * 0.55), radius) ||
      testPoint(x + ux * lookahead, z + uz * lookahead, radius);

    if (!centerBlocked) {
      return { blocked: false, steerX: ux, steerZ: uz };
    }

    const angle = (32 * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Left (+32 deg) and Right (-32 deg)
    const lx = ux * cosA - uz * sinA;
    const lz = ux * sinA + uz * cosA;
    const rx = ux * cosA + uz * sinA;
    const rz = -ux * sinA + uz * cosA;

    const leftBlocked = testPoint(x + lx * lookahead, z + lz * lookahead, radius);
    const rightBlocked = testPoint(x + rx * lookahead, z + rz * lookahead, radius);

    if (!leftBlocked && rightBlocked) {
      return { blocked: true, steerX: lx, steerZ: lz };
    }
    if (!rightBlocked && leftBlocked) {
      return { blocked: true, steerX: rx, steerZ: rz };
    }
    if (!leftBlocked && !rightBlocked) {
      // Both angles clear; prefer left tangent deterministically
      return { blocked: true, steerX: lx, steerZ: lz };
    }

    // Both narrow whiskers blocked: try steep 68° tangent sidestep
    const perpX = -uz;
    const perpZ = ux;
    const perpLeftBlocked = testPoint(x + perpX * (lookahead * 0.8), z + perpZ * (lookahead * 0.8), radius);
    return perpLeftBlocked
      ? { blocked: true, steerX: -perpX, steerZ: -perpZ }
      : { blocked: true, steerX: perpX, steerZ: perpZ };
  }

  /**
   * Sweeps camera ray from player focus target to desired camera eye position against
   * buildings, compound walls, trees, and dynamic vehicles so the camera never clips inside geometry.
   */
  public sweepCameraRay(
    targetX: number,
    targetY: number,
    targetZ: number,
    desiredX: number,
    desiredY: number,
    desiredZ: number,
    dynamicVehicles?: readonly DynamicVehicleObstacle[],
    margin = 0.42
  ): { x: number; y: number; z: number; hit: boolean } {
    const dist = Math.hypot(desiredX - targetX, desiredY - targetY, desiredZ - targetZ);
    const steps = Math.max(8, Math.min(24, Math.ceil(dist / 0.55)));

    const minX = Math.min(targetX, desiredX) - 1.5;
    const maxX = Math.max(targetX, desiredX) + 1.5;
    const minZ = Math.min(targetZ, desiredZ) - 1.5;
    const maxZ = Math.max(targetZ, desiredZ) + 1.5;
    const candidates = this.queryNearbyUnique(minX, maxX, minZ, maxZ);

    let safeT = 1.0;
    let hit = false;

    for (let s = 2; s <= steps; s++) {
      const t = s / steps;
      const sx = lerp(targetX, desiredX, t);
      const sy = lerp(targetY, desiredY, t);
      const sz = lerp(targetZ, desiredZ, t);

      let stepHit = false;
      for (const obs of candidates) {
        if (!obs.blocksCamera) continue;
        if (sy < obs.minY - margin || sy > obs.maxY + margin) continue;
        if (obs.kind === "box") {
          if (
            sx > obs.minX - margin &&
            sx < obs.maxX + margin &&
            sz > obs.minZ - margin &&
            sz < obs.maxZ + margin
          ) {
            stepHit = true;
            break;
          }
        } else if (obs.kind === "cylinder") {
          const r = obs.radius + margin;
          if ((sx - obs.x) * (sx - obs.x) + (sz - obs.z) * (sz - obs.z) < r * r) {
            stepHit = true;
            break;
          }
        } else {
          if (pointInsideOBB(sx, sz, obs.x, obs.z, obs.rotY, obs.halfWidth, obs.halfLength, margin)) {
            stepHit = true;
            break;
          }
        }
      }

      if (!stepHit && dynamicVehicles) {
        for (const v of dynamicVehicles) {
          if (!v.isActive) continue;
          if (sy > v.height + margin) continue;
          if (pointInsideOBB(sx, sz, v.x, v.z, v.rotY, v.halfWidth, v.halfLength, margin)) {
            stepHit = true;
            break;
          }
        }
      }

      if (stepHit) {
        safeT = Math.max(0.2, (s - 1) / steps);
        hit = true;
        break;
      }
    }

    return {
      x: lerp(targetX, desiredX, safeT),
      y: Math.max(0.95, lerp(targetY, desiredY, safeT)),
      z: lerp(targetZ, desiredZ, safeT),
      hit,
    };
  }
}

export function resolveInteriorCircle2D(
  x: number,
  z: number,
  radius: number,
  roomWidth: number,
  roomDepth: number,
  colliders: readonly InteriorColliderBox[]
): { x: number; z: number; collided: boolean } {
  const halfW = roomWidth / 2 - radius - 0.22;
  const halfD = roomDepth / 2 - radius - 0.22;
  let rx = clamp(x, -halfW, halfW);
  let rz = clamp(z, -halfD, halfD);
  let collided = rx !== x || rz !== z;

  for (let pass = 0; pass < 3; pass++) {
    let passHit = false;
    for (const c of colliders) {
      const res = resolveCircleAgainstAABB(rx, rz, radius, c.minX, c.maxX, c.minZ, c.maxZ);
      if (res.hit) {
        rx = res.x;
        rz = res.z;
        collided = true;
        passHit = true;
      }
    }
    rx = clamp(rx, -halfW, halfW);
    rz = clamp(rz, -halfD, halfD);
    if (!passHit) break;
  }

  return { x: rx, z: rz, collided };
}

export function sweepInteriorCameraRay(
  targetX: number,
  targetY: number,
  targetZ: number,
  desiredX: number,
  desiredY: number,
  desiredZ: number,
  roomWidth: number,
  roomDepth: number,
  roomHeight: number,
  colliders: readonly InteriorColliderBox[],
  margin = 0.32
): { x: number; y: number; z: number; hit: boolean } {
  const halfW = roomWidth / 2 - 0.38;
  const halfD = roomDepth / 2 - 0.38;
  const cx = clamp(desiredX, -halfW, halfW);
  const cy = clamp(desiredY, 0.9, roomHeight - 0.36);
  const cz = clamp(desiredZ, -halfD, halfD);

  const steps = 10;
  let safeT = 1.0;
  let hit = false;

  for (let s = 2; s <= steps; s++) {
    const t = s / steps;
    const sx = lerp(targetX, cx, t);
    const sy = lerp(targetY, cy, t);
    const sz = lerp(targetZ, cz, t);

    let stepHit = false;
    for (const c of colliders) {
      const topY = c.maxY ?? 1.15;
      // Only tall cabinets/shelves/pillars obstruct camera line-of-sight
      if (topY < 1.35) continue;
      if (sy > topY + margin) continue;
      if (
        sx > c.minX - margin &&
        sx < c.maxX + margin &&
        sz > c.minZ - margin &&
        sz < c.maxZ + margin
      ) {
        stepHit = true;
        break;
      }
    }
    if (stepHit) {
      safeT = Math.max(0.28, (s - 1) / steps);
      hit = true;
      break;
    }
  }

  return {
    x: clamp(lerp(targetX, cx, safeT), -halfW, halfW),
    y: clamp(lerp(targetY, cy, safeT), 0.9, roomHeight - 0.36),
    z: clamp(lerp(targetZ, cz, safeT), -halfD, halfD),
    hit,
  };
}

/**
 * Computes physical ground elevation at (x, z) including road asphalt crown,
 * Naa Gbewaa Interchange approach ramps + elevated viaduct, and Tamale speed humps —
 * while keeping pedestrians and vehicles passing UNDER the interchange at y = 0.
 */
export function getTamaleGroundHeight(x: number, z: number, currentY = 0): number {
  let y = 0;

  const absX = Math.abs(x);
  const absZ = Math.abs(z);
  const onDeckCorridor = absZ <= 4.85 && absX <= 60.8;
  const atRampMouth = absZ <= 4.65 && absX >= 53.5 && absX <= 60.8;

  // Climb cleanly onto interchange from either ground ramp mouth OR continue seamlessly if already elevated
  if (onDeckCorridor && (currentY > 1.35 || atRampMouth)) {
    if (absX <= 33) {
      return 6.29;
    }
    const rampT = clamp((60.8 - absX) / 27.8, 0, 1);
    return rampT * 6.29;
  }

  // Smooth cosine bump over physical yellow-and-black Tamale speed humps
  for (const sh of TAMALE_SPEED_HUMP_ZONES) {
    const c = Math.cos(sh.rotY);
    const s = Math.sin(sh.rotY);
    const dx = x - sh.x;
    const dz = z - sh.z;
    const localAlongWidth = dx * c - dz * s;
    const localAcrossDepth = dx * s + dz * c;
    if (Math.abs(localAlongWidth) <= sh.width * 0.5 && Math.abs(localAcrossDepth) <= 0.52) {
      const humpPhase = (1 + Math.cos((localAcrossDepth / 0.52) * Math.PI)) * 0.5;
      y = Math.max(y, humpPhase * 0.11);
    }
  }

  return y;
}

/**
 * Computes realistic crash recoil & structural/cargo damage percentage when a vehicle hits a solid obstacle.
 */
export function resolveVehicleCrashImpulse(
  speed: number,
  rotY: number,
  fromX: number,
  fromZ: number,
  resolvedX: number,
  resolvedZ: number,
  massKg = 1000
): {
  nextSpeed: number;
  impactMagnitude: number;
  damagePct: number;
  severeCrash: boolean;
} {
  const absSpeed = Math.abs(speed);
  const pushDist = Math.hypot(resolvedX - fromX, resolvedZ - fromZ);
  if (absSpeed < 2.2) {
    return { nextSpeed: speed * 0.35, impactMagnitude: 0, damagePct: 0, severeCrash: false };
  }
  const massFactor = clamp(Math.sqrt(massKg / 900), 0.75, 1.55);
  const impactMagnitude = absSpeed * massFactor;
  // Glancing scrape vs head-on collision
  const fwdX = Math.sin(rotY);
  const fwdZ = Math.cos(rotY);
  const normalLen = pushDist > 1e-4 ? pushDist : 1;
  const dot = Math.abs((fwdX * (resolvedX - fromX) + fwdZ * (resolvedZ - fromZ)) / normalLen);
  const headOnWeight = clamp(0.4 + dot * 0.6, 0.4, 1.0);
  const damagePct = absSpeed > 5.0 ? Math.round(clamp((absSpeed - 4.2) * headOnWeight * 2.4, 2, 34)) : 0;
  const severeCrash = absSpeed >= 9.5 && headOnWeight > 0.55;
  // Physical bounce recoil opposite current motion if head-on, else damped slide
  const nextSpeed = severeCrash ? -Math.sign(speed) * Math.min(3.4, absSpeed * 0.22) : speed * 0.42;
  return { nextSpeed, impactMagnitude, damagePct, severeCrash };
}

/**
 * Checks whether the player is genuinely positioned in front of an actual building doorway
 * (within triggerRadius AND on the front approach side of the door normal, never through a back/side wall).
 */
export function isNearDoorwayEntrance(
  px: number,
  pz: number,
  doorway: DoorwayEntranceSpec
): boolean {
  const dx = px - doorway.doorX;
  const dz = pz - doorway.doorZ;
  const dist = Math.hypot(dx, dz);
  if (dist > doorway.triggerRadius) {
    return false;
  }
  const dot = dx * doorway.normalX + dz * doorway.normalZ;
  return dot >= -0.95;
}
