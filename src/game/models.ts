import * as THREE from "three";
import { CargoPropKind, HairstyleOption, HeadwearStyle, OutfitStyle } from "../types/game";
import { createShopSignTexture, ProceduralTextureSet } from "./textures";

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftShinPivot: THREE.Group;
  rightShinPivot: THREE.Group;
  shadowPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

export type NpcCarryProp =
  | "none"
  | "headpan"
  | "basket"
  | "backpack"
  | "parcel_box"
  | "water_pack"
  | "umbrella_hand"
  | "apron";

export interface CharacterAppearance {
  outfit: OutfitStyle;
  headwear: HeadwearStyle;
  hairstyle?: HairstyleOption;
  primaryColor: string;
  accentColor: string;
  skinTone: string;
  carryProp?: NpcCarryProp;
  ownShadowMaterial?: boolean;
  policeUniform?: boolean;
}

const CHAR_STD_MAT_CACHE = new Map<string, THREE.MeshStandardMaterial>();
function getCachedCharMat(
  key: string,
  factory: () => THREE.MeshStandardMaterial
): THREE.MeshStandardMaterial {
  let mat = CHAR_STD_MAT_CACHE.get(key);
  if (!mat) {
    mat = factory();
    CHAR_STD_MAT_CACHE.set(key, mat);
  }
  return mat;
}

let SHARED_NPC_SHADOW_MAT: THREE.MeshBasicMaterial | null = null;

const CHAR_GEOS = {
  shadowPlane: new THREE.PlaneGeometry(1.15, 1.15),
  thigh: new THREE.CylinderGeometry(0.105, 0.082, 0.38, 10),
  shin: new THREE.CylinderGeometry(0.08, 0.062, 0.36, 10),
  foot: new THREE.BoxGeometry(0.15, 0.085, 0.27),
  pelvis: new THREE.CylinderGeometry(0.18, 0.16, 0.16, 10),
  torsoWide: new THREE.CylinderGeometry(0.27, 0.24, 0.56, 12),
  torsoStd: new THREE.CylinderGeometry(0.22, 0.185, 0.56, 12),
  shoulderCap: new THREE.SphereGeometry(0.092, 8, 8),
  batakariFlare: new THREE.CylinderGeometry(0.24, 0.35, 0.4, 12),
  batakariEmbroidery: new THREE.BoxGeometry(0.2, 0.22, 0.03),
  kabaSkirt: new THREE.CylinderGeometry(0.21, 0.28, 0.54, 12),
  collar: new THREE.CylinderGeometry(0.125, 0.155, 0.085, 10),
  belt: new THREE.CylinderGeometry(0.205, 0.205, 0.06, 12),
  sleeve: new THREE.CylinderGeometry(0.082, 0.068, 0.27, 10),
  forearm: new THREE.CylinderGeometry(0.062, 0.048, 0.28, 10),
  hand: new THREE.SphereGeometry(0.052, 8, 8),
  neck: new THREE.CylinderGeometry(0.072, 0.084, 0.14, 10),
  head: new THREE.SphereGeometry(0.165, 14, 12),
  jaw: new THREE.BoxGeometry(0.16, 0.11, 0.15),
  noseBridge: new THREE.BoxGeometry(0.036, 0.068, 0.052),
  browRidge: new THREE.BoxGeometry(0.18, 0.028, 0.04),
  ear: new THREE.SphereGeometry(0.034, 6, 6),
  eye: new THREE.SphereGeometry(0.021, 6, 6),
  kufi: new THREE.CylinderGeometry(0.162, 0.172, 0.14, 12),
  policeCapCrown: new THREE.CylinderGeometry(0.185, 0.165, 0.1, 12),
  policeCapVisor: new THREE.CylinderGeometry(0.17, 0.17, 0.025, 12, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
  headwrapTorus: new THREE.TorusGeometry(0.15, 0.065, 8, 14),
  headwrapCrown: new THREE.SphereGeometry(0.16, 10, 8),
  braidCap: new THREE.SphereGeometry(0.172, 10, 8),
  braidStrand: new THREE.CylinderGeometry(0.022, 0.017, 0.24, 6),
  shortHair: new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
  // Carry prop geometries
  headpanBowl: new THREE.CylinderGeometry(0.29, 0.18, 0.16, 12),
  headpanCloth: new THREE.TorusGeometry(0.14, 0.04, 6, 12),
  headpanGoods: new THREE.DodecahedronGeometry(0.16, 0),
  waterBundle: new THREE.BoxGeometry(0.36, 0.2, 0.28),
  backpack: new THREE.BoxGeometry(0.34, 0.42, 0.16),
  parcelBox: new THREE.BoxGeometry(0.36, 0.24, 0.3),
  handBag: new THREE.BoxGeometry(0.12, 0.28, 0.24),
  apron: new THREE.BoxGeometry(0.38, 0.56, 0.04),
};

export function createCharacterRig(
  appearance: CharacterAppearance,
  textures: ProceduralTextureSet
): CharacterRig {
  const root = new THREE.Group();

  let shadowMat: THREE.MeshBasicMaterial;
  if (appearance.ownShadowMaterial) {
    shadowMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
    });
  } else {
    if (!SHARED_NPC_SHADOW_MAT) {
      SHARED_NPC_SHADOW_MAT = new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.54,
      });
    }
    shadowMat = SHARED_NPC_SHADOW_MAT;
  }

  const shadowPlane = new THREE.Mesh(CHAR_GEOS.shadowPlane, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = getCachedCharMat(
    `skin:${appearance.skinTone}`,
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.skinTone,
        roughness: 0.64,
        metalness: 0.02,
      })
  );

  const primaryCol = appearance.policeUniform ? "#1e3a8a" : appearance.primaryColor;
  const accentCol = appearance.policeUniform ? "#eab308" : appearance.accentColor;

  const outfitMat =
    appearance.outfit === "batakari" && !appearance.policeUniform
      ? getCachedCharMat(
          `batakari:${primaryCol}`,
          () =>
            new THREE.MeshStandardMaterial({
              map: textures.batakariCloth,
              color: primaryCol,
              roughness: 0.86,
              metalness: 0.02,
            })
        )
      : getCachedCharMat(
          `outfit:${primaryCol}`,
          () =>
            new THREE.MeshStandardMaterial({
              color: primaryCol,
              roughness: 0.76,
              metalness: 0.05,
            })
        );

  const accentMat = getCachedCharMat(
    `accent:${accentCol}`,
    () =>
      new THREE.MeshStandardMaterial({
        color: accentCol,
        roughness: 0.68,
        metalness: appearance.policeUniform ? 0.35 : 0.06,
      })
  );

  const trouserColor = appearance.policeUniform
    ? "#0f172a"
    : appearance.outfit === "kaba"
    ? primaryCol
    : "#272b33";
  const trouserMat = getCachedCharMat(
    `trouser:${trouserColor}`,
    () =>
      new THREE.MeshStandardMaterial({
        color: trouserColor,
        roughness: 0.84,
      })
  );

  const shoeMat = getCachedCharMat(
    "shoe:#1c1917",
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c1917",
        roughness: 0.48,
        metalness: 0.14,
      })
  );

  const makeLeg = (offsetX: number) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(offsetX, 0.8, 0);

    const thigh = new THREE.Mesh(CHAR_GEOS.thigh, trouserMat);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.37, 0);
    hipPivot.add(kneePivot);

    const shin = new THREE.Mesh(CHAR_GEOS.shin, trouserMat);
    shin.position.y = -0.18;
    shin.castShadow = true;
    kneePivot.add(shin);

    const foot = new THREE.Mesh(CHAR_GEOS.foot, shoeMat);
    foot.position.set(0, -0.385, 0.05);
    foot.castShadow = true;
    kneePivot.add(foot);

    return { hipPivot, kneePivot };
  };

  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  const leftLegPivot = leftLeg.hipPivot;
  const rightLegPivot = rightLeg.hipPivot;
  const leftShinPivot = leftLeg.kneePivot;
  const rightShinPivot = rightLeg.kneePivot;
  bodyGroup.add(leftLegPivot, rightLegPivot);

  const pelvis = new THREE.Mesh(CHAR_GEOS.pelvis, trouserMat);
  pelvis.position.y = 0.84;
  bodyGroup.add(pelvis);

  const isBatakari = appearance.outfit === "batakari" && !appearance.policeUniform;
  const torso = new THREE.Mesh(isBatakari ? CHAR_GEOS.torsoWide : CHAR_GEOS.torsoStd, outfitMat);
  torso.scale.set(1.12, 1, 0.72);
  torso.position.y = 1.15;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  if (isBatakari) {
    const flare = new THREE.Mesh(CHAR_GEOS.batakariFlare, outfitMat);
    flare.position.y = 0.74;
    flare.castShadow = true;
    bodyGroup.add(flare);

    const embroidery = new THREE.Mesh(CHAR_GEOS.batakariEmbroidery, accentMat);
    embroidery.position.set(0, 1.2, 0.16);
    bodyGroup.add(embroidery);
  } else if (appearance.outfit === "kaba" && !appearance.policeUniform) {
    const wrapSkirt = new THREE.Mesh(CHAR_GEOS.kabaSkirt, accentMat);
    wrapSkirt.position.y = 0.6;
    wrapSkirt.castShadow = true;
    bodyGroup.add(wrapSkirt);
  } else {
    const collar = new THREE.Mesh(CHAR_GEOS.collar, accentMat);
    collar.position.y = 1.44;
    bodyGroup.add(collar);

    if (appearance.outfit === "workwear") {
      const workBand = new THREE.Mesh(CHAR_GEOS.batakariEmbroidery, accentMat);
      workBand.scale.set(2.2, 0.28, 1.0);
      workBand.position.set(0, 1.08, 0.16);
      bodyGroup.add(workBand);
    } else if (appearance.outfit === "formal") {
      const tie = new THREE.Mesh(CHAR_GEOS.batakariEmbroidery, accentMat);
      tie.scale.set(0.45, 1.05, 1.0);
      tie.position.set(0, 1.24, 0.16);
      bodyGroup.add(tie);
    } else if (appearance.outfit === "sportswear") {
      const stripe = new THREE.Mesh(CHAR_GEOS.batakariEmbroidery, accentMat);
      stripe.scale.set(1.9, 0.22, 1.0);
      stripe.position.set(0, 1.28, 0.16);
      bodyGroup.add(stripe);
    } else if (appearance.outfit === "nightlife") {
      const lapel = new THREE.Mesh(CHAR_GEOS.batakariEmbroidery, accentMat);
      lapel.scale.set(1.2, 0.9, 1.0);
      lapel.position.set(0, 1.24, 0.158);
      bodyGroup.add(lapel);
    }
  }

  if (appearance.policeUniform) {
    const belt = new THREE.Mesh(
      CHAR_GEOS.belt,
      getCachedCharMat("police:belt", () => new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.4, metalness: 0.3 }))
    );
    belt.scale.set(1.06, 1, 0.78);
    belt.position.y = 0.89;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.04), accentMat);
    buckle.position.set(0, 0.89, 0.16);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.025), accentMat);
    badge.position.set(-0.09, 1.24, 0.16);
    bodyGroup.add(belt, buckle, badge);
  }

  const makeArm = (offsetX: number) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(offsetX, 1.38, 0);

    const shoulderCap = new THREE.Mesh(CHAR_GEOS.shoulderCap, outfitMat);
    shoulderCap.castShadow = true;
    shoulderPivot.add(shoulderCap);

    const sleeve = new THREE.Mesh(CHAR_GEOS.sleeve, outfitMat);
    sleeve.position.y = -0.14;
    sleeve.castShadow = true;
    shoulderPivot.add(sleeve);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.27, 0);
    shoulderPivot.add(elbowPivot);

    const forearm = new THREE.Mesh(CHAR_GEOS.forearm, skinMat);
    forearm.position.y = -0.14;
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    const hand = new THREE.Mesh(CHAR_GEOS.hand, skinMat);
    hand.position.y = -0.29;
    elbowPivot.add(hand);

    return { shoulderPivot, elbowPivot };
  };

  const shoulderOffset = isBatakari ? 0.32 : 0.27;
  const leftArm = makeArm(-shoulderOffset);
  const rightArm = makeArm(shoulderOffset);
  const leftArmPivot = leftArm.shoulderPivot;
  const rightArmPivot = rightArm.shoulderPivot;
  const leftForearmPivot = leftArm.elbowPivot;
  const rightForearmPivot = rightArm.elbowPivot;
  bodyGroup.add(leftArmPivot, rightArmPivot);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.54, 0);

  const neck = new THREE.Mesh(CHAR_GEOS.neck, skinMat);
  neck.position.y = -0.05;
  headGroup.add(neck);

  const head = new THREE.Mesh(CHAR_GEOS.head, skinMat);
  head.position.y = 0.12;
  head.scale.set(0.95, 1.08, 1.0);
  head.castShadow = true;
  headGroup.add(head);

  // Subtle facial structure: jawline, nose bridge, brow ridge & ears
  const jaw = new THREE.Mesh(CHAR_GEOS.jaw, skinMat);
  jaw.position.set(0, 0.04, 0.035);
  const nose = new THREE.Mesh(CHAR_GEOS.noseBridge, skinMat);
  nose.position.set(0, 0.11, 0.148);
  nose.rotation.x = -0.18;
  const brow = new THREE.Mesh(CHAR_GEOS.browRidge, skinMat);
  brow.position.set(0, 0.155, 0.135);
  const leftEar = new THREE.Mesh(CHAR_GEOS.ear, skinMat);
  leftEar.scale.set(0.65, 1.15, 0.8);
  leftEar.position.set(-0.155, 0.115, 0.0);
  const rightEar = new THREE.Mesh(CHAR_GEOS.ear, skinMat);
  rightEar.scale.set(0.65, 1.15, 0.8);
  rightEar.position.set(0.155, 0.115, 0.0);
  headGroup.add(jaw, nose, brow, leftEar, rightEar);

  const eyeMat = getCachedCharMat(
    "eye:#151210",
    () => new THREE.MeshStandardMaterial({ color: "#151210", roughness: 0.25 })
  );
  const leftEye = new THREE.Mesh(CHAR_GEOS.eye, eyeMat);
  leftEye.position.set(-0.055, 0.132, 0.145);
  const rightEye = new THREE.Mesh(CHAR_GEOS.eye, eyeMat);
  rightEye.position.set(0.055, 0.132, 0.145);
  headGroup.add(leftEye, rightEye);

  const hairMat = getCachedCharMat(
    "hair:#1a1512",
    () => new THREE.MeshStandardMaterial({ color: "#1a1512", roughness: 0.9 })
  );

  if (appearance.policeUniform) {
    const capBodyMat = getCachedCharMat(
      "police:cap",
      () => new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.45 })
    );
    const visorMat = getCachedCharMat(
      "police:visor",
      () => new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.2, metalness: 0.3 })
    );
    const capCrown = new THREE.Mesh(CHAR_GEOS.policeCapCrown, capBodyMat);
    capCrown.position.y = 0.245;
    capCrown.castShadow = true;
    const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.035, 12), accentMat);
    capBand.position.y = 0.2;
    const visor = new THREE.Mesh(CHAR_GEOS.policeCapVisor, visorMat);
    visor.position.set(0, 0.19, 0.075);
    visor.rotation.x = 0.15;
    headGroup.add(capCrown, capBand, visor);
  } else if (appearance.headwear === "kufi") {
    const cap = new THREE.Mesh(CHAR_GEOS.kufi, accentMat);
    cap.position.y = 0.23;
    cap.castShadow = true;
    headGroup.add(cap);
  } else if (appearance.headwear === "headwrap") {
    const wrap = new THREE.Mesh(CHAR_GEOS.headwrapTorus, accentMat);
    wrap.rotation.x = Math.PI / 2 - 0.15;
    wrap.position.y = 0.21;
    wrap.castShadow = true;
    headGroup.add(wrap);
    const crown = new THREE.Mesh(CHAR_GEOS.headwrapCrown, accentMat);
    crown.position.y = 0.22;
    headGroup.add(crown);
  } else if (appearance.headwear === "braids") {
    const capHair = new THREE.Mesh(CHAR_GEOS.braidCap, hairMat);
    capHair.position.set(0, 0.155, -0.02);
    headGroup.add(capHair);
    for (let i = -2; i <= 2; i++) {
      const braid = new THREE.Mesh(CHAR_GEOS.braidStrand, hairMat);
      braid.position.set(i * 0.052, 0.03, -0.14);
      braid.rotation.x = 0.22;
      headGroup.add(braid);
    }
  } else {
    const shortHair = new THREE.Mesh(CHAR_GEOS.shortHair, hairMat);
    shortHair.position.y = 0.132;
    if (appearance.hairstyle === "afro_trim") {
      shortHair.scale.set(1.16, 1.24, 1.16);
    } else if (appearance.hairstyle === "braided_crown") {
      shortHair.scale.set(1.06, 1.14, 1.06);
      const crownRing = new THREE.Mesh(CHAR_GEOS.headwrapTorus, hairMat);
      crownRing.rotation.x = Math.PI / 2 - 0.12;
      crownRing.position.y = 0.205;
      headGroup.add(crownRing);
    } else if (appearance.hairstyle === "waves") {
      shortHair.scale.set(1.02, 0.94, 1.04);
    } else if (appearance.hairstyle === "low_fade") {
      shortHair.scale.set(0.96, 0.88, 0.96);
    }
    headGroup.add(shortHair);
  }

  // Optional Authentic Everyday Carried Props
  const prop = appearance.carryProp ?? "none";
  if (prop === "headpan" || prop === "basket" || prop === "water_pack") {
    const pad = new THREE.Mesh(CHAR_GEOS.headpanCloth, accentMat);
    pad.rotation.x = Math.PI / 2;
    pad.position.y = 0.3;
    headGroup.add(pad);

    if (prop === "water_pack") {
      const coolerMat = getCachedCharMat(
        "prop:watercooler",
        () => new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.4 })
      );
      const pack = new THREE.Mesh(CHAR_GEOS.waterBundle, coolerMat);
      pack.position.y = 0.41;
      pack.castShadow = true;
      headGroup.add(pack);
    } else {
      const panMat =
        prop === "headpan"
          ? getCachedCharMat(
              "prop:silverpan",
              () => new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.72, roughness: 0.3 })
            )
          : getCachedCharMat(
              "prop:wovenbasket",
              () => new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.88 })
            );
      const pan = new THREE.Mesh(CHAR_GEOS.headpanBowl, panMat);
      pan.position.y = 0.39;
      pan.castShadow = true;
      headGroup.add(pan);

      const goodsMat = getCachedCharMat(
        prop === "headpan" ? "prop:fruit" : "prop:yams",
        () =>
          new THREE.MeshStandardMaterial({
            color: prop === "headpan" ? "#ea580c" : "#eab308",
            roughness: 0.72,
          })
      );
      const mound = new THREE.Mesh(CHAR_GEOS.headpanGoods, goodsMat);
      mound.position.y = 0.47;
      mound.scale.set(1.2, 0.75, 1.2);
      headGroup.add(mound);
    }
  } else if (prop === "backpack") {
    const bagMat = getCachedCharMat(
      "prop:backpack",
      () => new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.82 })
    );
    const bag = new THREE.Mesh(CHAR_GEOS.backpack, bagMat);
    bag.position.set(0, 1.16, -0.2);
    bag.castShadow = true;
    bodyGroup.add(bag);
  } else if (prop === "parcel_box") {
    const boxMat = getCachedCharMat(
      "prop:parcel",
      () => new THREE.MeshStandardMaterial({ color: "#c2854c", roughness: 0.86 })
    );
    const box = new THREE.Mesh(CHAR_GEOS.parcelBox, boxMat);
    box.position.set(0, 1.04, 0.27);
    box.castShadow = true;
    bodyGroup.add(box);
  } else if (prop === "umbrella_hand") {
    const toteMat = getCachedCharMat(
      "prop:tote",
      () => new THREE.MeshStandardMaterial({ color: "#be123c", roughness: 0.78 })
    );
    const tote = new THREE.Mesh(CHAR_GEOS.handBag, toteMat);
    tote.position.set(0, -0.34, 0.04);
    rightForearmPivot.add(tote);
  } else if (prop === "apron") {
    const apronMat = getCachedCharMat(
      "prop:apron",
      () => new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.82 })
    );
    const apron = new THREE.Mesh(CHAR_GEOS.apron, apronMat);
    apron.position.set(0, 1.02, 0.16);
    bodyGroup.add(apron);
  }

  bodyGroup.add(headGroup);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftForearmPivot,
    rightForearmPivot,
    leftLegPivot,
    rightLegPivot,
    leftShinPivot,
    rightShinPivot,
    shadowPlane,
  };
}

export function setCharacterPose(
  rig: CharacterRig,
  mode:
    | "foot"
    | "pragya"
    | "motorcycle"
    | "bench"
    | "taxi"
    | "cargo_trike"
    | "pickup_truck"
    | "box_truck"
    | "flatbed_truck"
    | "police_car"
    | "dance"
    | "carry"
) {
  if (mode === "foot") {
    rig.bodyGroup.position.y = 0;
    rig.leftLegPivot.rotation.set(0, 0, 0);
    rig.rightLegPivot.rotation.set(0, 0, 0);
    rig.leftShinPivot.rotation.set(0, 0, 0);
    rig.rightShinPivot.rotation.set(0, 0, 0);
    rig.leftArmPivot.rotation.set(0, 0, 0);
    rig.rightArmPivot.rotation.set(0, 0, 0);
    rig.leftForearmPivot.rotation.set(-0.18, 0, 0);
    rig.rightForearmPivot.rotation.set(-0.18, 0, 0);
    rig.shadowPlane.visible = true;
    return;
  }
  if (mode === "carry") {
    rig.bodyGroup.position.y = 0;
    rig.leftArmPivot.rotation.set(-0.62, 0, -0.1);
    rig.rightArmPivot.rotation.set(-0.62, 0, 0.1);
    rig.leftForearmPivot.rotation.set(-0.75, 0, 0);
    rig.rightForearmPivot.rotation.set(-0.75, 0, 0);
    rig.shadowPlane.visible = true;
    return;
  }
  if (mode === "bench") {
    rig.bodyGroup.position.y = -0.34;
    rig.leftLegPivot.rotation.x = -Math.PI * 0.45;
    rig.rightLegPivot.rotation.x = -Math.PI * 0.45;
    rig.leftShinPivot.rotation.x = Math.PI * 0.44;
    rig.rightShinPivot.rotation.x = Math.PI * 0.44;
    rig.leftArmPivot.rotation.x = -0.28;
    rig.rightArmPivot.rotation.x = -0.28;
    rig.leftForearmPivot.rotation.x = -0.52;
    rig.rightForearmPivot.rotation.x = -0.52;
    rig.shadowPlane.visible = true;
    return;
  }
  if (mode === "dance") {
    rig.bodyGroup.position.y = 0;
    rig.shadowPlane.visible = true;
    return;
  }
  if (mode === "pragya" || mode === "cargo_trike") {
    rig.bodyGroup.position.y = -0.35;
    rig.leftLegPivot.rotation.x = -Math.PI * 0.44;
    rig.rightLegPivot.rotation.x = -Math.PI * 0.44;
    rig.leftShinPivot.rotation.x = Math.PI * 0.45;
    rig.rightShinPivot.rotation.x = Math.PI * 0.45;
    rig.leftArmPivot.rotation.x = -0.78;
    rig.rightArmPivot.rotation.x = -0.78;
    rig.leftForearmPivot.rotation.x = -0.45;
    rig.rightForearmPivot.rotation.x = -0.45;
    rig.shadowPlane.visible = false;
    return;
  }
  if (mode === "taxi" || mode === "pickup_truck" || mode === "box_truck" || mode === "flatbed_truck" || mode === "police_car") {
    rig.bodyGroup.position.y = -0.36;
    rig.leftLegPivot.rotation.x = -Math.PI * 0.46;
    rig.rightLegPivot.rotation.x = -Math.PI * 0.46;
    rig.leftShinPivot.rotation.x = Math.PI * 0.44;
    rig.rightShinPivot.rotation.x = Math.PI * 0.44;
    rig.leftArmPivot.rotation.x = -0.82;
    rig.rightArmPivot.rotation.x = -0.82;
    rig.leftForearmPivot.rotation.x = -0.42;
    rig.rightForearmPivot.rotation.x = -0.42;
    rig.shadowPlane.visible = false;
    return;
  }
  // motorcycle rider/passenger straddle
  rig.bodyGroup.position.y = -0.28;
  rig.leftLegPivot.rotation.x = -Math.PI * 0.32;
  rig.rightLegPivot.rotation.x = -Math.PI * 0.32;
  rig.leftShinPivot.rotation.x = Math.PI * 0.38;
  rig.rightShinPivot.rotation.x = Math.PI * 0.38;
  rig.leftArmPivot.rotation.x = -0.76;
  rig.rightArmPivot.rotation.x = -0.76;
  rig.leftForearmPivot.rotation.x = -0.35;
  rig.rightForearmPivot.rotation.x = -0.35;
  rig.shadowPlane.visible = false;
}

export function animateCharacterRigWalk(rig: CharacterRig, phase: number, amp = 0.48) {
  const s = Math.sin(phase);
  rig.leftLegPivot.rotation.x = s * amp;
  rig.rightLegPivot.rotation.x = -s * amp;
  rig.leftShinPivot.rotation.x = Math.max(0, -s * amp * 0.85) + 0.08;
  rig.rightShinPivot.rotation.x = Math.max(0, s * amp * 0.85) + 0.08;
  rig.leftArmPivot.rotation.x = -s * amp * 0.82;
  rig.rightArmPivot.rotation.x = s * amp * 0.82;
  rig.leftForearmPivot.rotation.x = -0.28 - Math.max(0, -s) * 0.25;
  rig.rightForearmPivot.rotation.x = -0.28 - Math.max(0, s) * 0.25;
}

export function animateCharacterRigDance(rig: CharacterRig, time: number, seed = 0) {
  const beat = time * 4.6 + seed;
  rig.bodyGroup.position.y = Math.abs(Math.sin(beat)) * 0.09;
  rig.bodyGroup.rotation.y = Math.sin(beat * 0.5) * 0.16;
  rig.headGroup.rotation.z = Math.sin(beat) * 0.08;
  rig.leftArmPivot.rotation.set(-0.9 + Math.sin(beat) * 0.45, 0, -0.35);
  rig.rightArmPivot.rotation.set(-0.9 - Math.sin(beat) * 0.45, 0, 0.35);
  rig.leftForearmPivot.rotation.x = -0.85 + Math.cos(beat) * 0.3;
  rig.rightForearmPivot.rotation.x = -0.85 - Math.cos(beat) * 0.3;
  rig.leftLegPivot.rotation.x = Math.sin(beat) * 0.22;
  rig.rightLegPivot.rotation.x = -Math.sin(beat) * 0.22;
  rig.leftShinPivot.rotation.x = 0.18 + Math.max(0, Math.cos(beat)) * 0.28;
  rig.rightShinPivot.rotation.x = 0.18 + Math.max(0, -Math.cos(beat)) * 0.28;
}

/**
 * Pragya / Yellow-Yellow (Bajaj RE style) modeled from yellow_yellow_tamale.jpg
 */
export function createPragyaMesh(
  bodyColor = "#0284c7",
  canopyColor = "#6b4f3a",
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 3.2),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.3,
    metalness: 0.35,
  });
  const cowlMat = new THREE.MeshStandardMaterial({
    color: "#1c1917",
    roughness: 0.55,
    metalness: 0.15,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: canopyColor,
    roughness: 0.88,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: "#334155",
    roughness: 0.35,
    metalness: 0.8,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: "#18181b",
    roughness: 0.9,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: "#cbd5e1",
    roughness: 0.3,
    metalness: 0.8,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#e0f2fe",
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
    roughness: 0.18,
  });
  const amberMat = new THREE.MeshStandardMaterial({
    color: "#f97316",
    emissive: "#ea580c",
    emissiveIntensity: 0.18,
  });

  // Wheels + silver hubs
  const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.15, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.17, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions: Array<[number, number, number]> = [
    [0, 0.26, 1.02],
    [-0.66, 0.26, -0.82],
    [0.66, 0.26, -0.82],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    const hub = new THREE.Mesh(rimGeo, rimMat);
    w.add(hub);
    group.add(w);
    wheels.push(w);
  }

  // Front mudguard
  const fender = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7),
    paintMat
  );
  fender.rotation.z = Math.PI / 2;
  fender.position.set(0, 0.32, 1.02);
  group.add(fender);

  // Chassis floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.12, 2.15), cowlMat);
  floor.position.set(0, 0.34, -0.05);
  floor.castShadow = true;
  group.add(floor);

  // Front painted apron & sculpted black headlamp cowl
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.54), paintMat);
  apron.position.set(0, 0.74, 0.82);
  apron.castShadow = true;
  group.add(apron);

  const blackCowl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.22), cowlMat);
  blackCowl.position.set(0, 0.76, 1.04);
  group.add(blackCowl);

  // Twin round headlights & amber blinkers (signature Bajaj RE face)
  for (const hx of [-0.31, 0.31]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 0.76, 1.14);
    group.add(hl);

    const blinker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.06), amberMat);
    blinker.position.set(hx * 1.12, 0.96, 1.08);
    group.add(blinker);
  }

  // Ghana blue motorcycle license plate on front nose
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.03),
    new THREE.MeshStandardMaterial({ color: "#1d4ed8", roughness: 0.4 })
  );
  plate.position.set(0, 0.94, 1.11);
  group.add(plate);

  // Rear passenger cab
  const rearTub = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.56, 1.15), paintMat);
  rearTub.position.set(0, 0.64, -0.58);
  rearTub.castShadow = true;
  group.add(rearTub);

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 0.16, 0.45),
    new THREE.MeshStandardMaterial({ color: "#3b1d0c", roughness: 0.85 })
  );
  bench.position.set(0, 0.76, -0.82);
  group.add(bench);

  // Windshield frame + side mirrors
  const windshieldFrame = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.62, 0.05), paintMat);
  windshieldFrame.position.set(0, 1.38, 0.74);
  windshieldFrame.rotation.x = -0.18;
  group.add(windshieldFrame);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.5, 0.07), glassMat);
  windshield.position.set(0, 1.38, 0.74);
  windshield.rotation.x = -0.18;
  group.add(windshield);

  for (const mx of [-0.54, 0.54]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.05), cowlMat);
    mirror.position.set(mx, 1.44, 0.72);
    group.add(mirror);
  }

  // Canvas roof & rear/side curtains
  const roofTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.1, 1.85), canopyMat);
  roofTop.position.set(0, 1.76, -0.18);
  roofTop.castShadow = true;
  group.add(roofTop);

  for (const sx of [-0.61, 0.61]) {
    const sideCanvas = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.82, 1.05), canopyMat);
    sideCanvas.position.set(sx, 1.32, -0.55);
    group.add(sideCanvas);
  }
  const rearCanvas = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.84, 0.06), canopyMat);
  rearCanvas.position.set(0, 1.32, -1.08);
  group.add(rearCanvas);

  // Tubular pillars
  for (const [px, pz] of [[-0.56, -0.06], [0.56, -0.06]]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.96, 8), metalMat);
    pillar.position.set(px, 1.28, pz);
    group.add(pillar);
  }

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.22,
  });

  // Twin rear brake/tail lamps on rear mudguard flanks
  for (const bx of [-0.48, 0.48]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.05), brakeLightMat);
    tl.position.set(bx, 0.52, -1.16);
    group.add(tl);
  }

  return { group, headlightMat, brakeLightMat, wheels };
}

/**
 * Blue Cargo Tricycle ("Motor King") modeled from street_tamale.jpg
 */
export function createCargoTrikeMesh(
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  cargoMountGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const cargoMountGroup = new THREE.Group();
  cargoMountGroup.position.set(0, 0.56, -0.52);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 3.3),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const blueMat = new THREE.MeshStandardMaterial({ color: "#1d4ed8", roughness: 0.38, metalness: 0.35 });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.4, metalness: 0.72 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.28, metalness: 0.8 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.22,
  });

  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.17, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[0, 1.05], [-0.68, -0.82], [0.68, -0.82]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.28, wz);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  // Open ribbed blue steel cargo bed (floor + 3 side rails so placed cargo looks nestled inside)
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.14, 1.62), frameMat);
  bedFloor.position.set(0, 0.46, -0.52);
  bedFloor.castShadow = true;
  group.add(bedFloor);

  for (const sx of [-0.64, 0.64]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 1.62), blueMat);
    side.position.set(sx, 0.7, -0.52);
    side.castShadow = true;
    group.add(side);
  }
  const frontGate = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.4, 0.07), blueMat);
  frontGate.position.set(0, 0.7, 0.27);
  const tailGate = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.36, 0.07), blueMat);
  tailGate.position.set(0, 0.68, -1.3);
  group.add(frontGate, tailGate);

  // Rear brake lights + handlebar + saddle
  for (const bx of [-0.46, 0.46]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.05), brakeLightMat);
    tail.position.set(bx, 0.56, -1.34);
    group.add(tail);
  }

  const saddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.16, 0.55),
    new THREE.MeshStandardMaterial({ color: "#27272a", roughness: 0.85 })
  );
  saddle.position.set(0, 0.82, 0.55);
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.78, 8), frameMat);
  fork.position.set(0, 0.68, 0.96);
  fork.rotation.x = -0.25;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), frameMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.04, 0.86);
  group.add(saddle, fork, bar);

  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), headlightMat);
  hl.position.set(0, 0.92, 1.1);
  group.add(hl, cargoMountGroup);

  return { group, headlightMat, brakeLightMat, wheels, cargoMountGroup };
}

export function createMotorcycleMesh(
  tankColor = "#dc2626",
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 2.3),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.2, metalness: 0.9 });
  const tankMat = new THREE.MeshStandardMaterial({ color: tankColor, roughness: 0.28, metalness: 0.45 });
  const seatMat = new THREE.MeshStandardMaterial({ color: "#27272a", roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.25,
  });

  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.11, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const frontW = new THREE.Mesh(wheelGeo, tireMat);
  frontW.position.set(0, 0.32, 0.72);
  frontW.castShadow = true;
  frontW.add(new THREE.Mesh(rimGeo, chromeMat));
  const rearW = new THREE.Mesh(wheelGeo, tireMat);
  rearW.position.set(0, 0.32, -0.68);
  rearW.castShadow = true;
  rearW.add(new THREE.Mesh(rimGeo, chromeMat));
  wheels.push(frontW, rearW);
  group.add(frontW, rearW);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 1.15), chromeMat);
  frame.position.set(0, 0.56, 0);
  frame.castShadow = true;
  group.add(frame);

  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.52), tankMat);
  tank.position.set(0, 0.82, 0.24);
  tank.castShadow = true;
  group.add(tank);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.65), seatMat);
  seat.position.set(0, 0.78, -0.34);
  group.add(seat);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.78, 8), chromeMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.16, 0.38, -0.45);
  group.add(exhaust);

  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.76, 8), chromeMat);
  fork.position.set(0, 0.66, 0.62);
  fork.rotation.x = -0.3;
  group.add(fork);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.66, 8), chromeMat);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.0, 0.52);
  group.add(handlebar);

  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), headlightMat);
  headlight.position.set(0, 0.9, 0.68);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.05), brakeLightMat);
  tail.position.set(0, 0.76, -0.82);
  group.add(headlight, tail);

  return { group, headlightMat, brakeLightMat, wheels };
}

export function createTaxiMesh(
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 4.8),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Classic Ghana yellow-fender & white-body taxi livery
  const yellowMat = new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.32, metalness: 0.28 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.34, metalness: 0.22 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.12, metalness: 0.7 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.26, metalness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.22,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.24,
  });

  // Hood & rear fender (yellow) + mid-doors (white)
  const frontEnd = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.58, 1.2), yellowMat);
  frontEnd.position.set(0, 0.56, 1.45);
  frontEnd.castShadow = true;
  const rearEnd = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.62, 1.15), yellowMat);
  rearEnd.position.set(0, 0.58, -1.45);
  rearEnd.castShadow = true;
  const midDoors = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.6, 1.75), whiteMat);
  midDoors.position.set(0, 0.57, 0);
  midDoors.castShadow = true;
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.18), trimMat);
  frontBumper.position.set(0, 0.34, 2.06);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.18), trimMat);
  rearBumper.position.set(0, 0.34, -2.06);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.06), trimMat);
  grille.position.set(0, 0.56, 2.06);
  group.add(frontEnd, rearEnd, midDoors, frontBumper, rearBumper, grille);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.54, 1.95), glassMat);
  cabin.position.set(0, 1.12, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.9), whiteMat);
  roof.position.set(0, 1.41, -0.1);
  group.add(roof);

  for (const mx of [-0.88, 0.88]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.1), trimMat);
    mirror.position.set(mx, 0.96, 0.65);
    group.add(mirror);
  }

  const taxiSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.14, 0.2),
    new THREE.MeshStandardMaterial({ color: "#fef08a", emissive: "#facc15", emissiveIntensity: 0.35 })
  );
  taxiSign.position.set(0, 1.51, 0.22);
  group.add(taxiSign);

  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [x, y, z] of [
    [-0.86, 0.32, 1.25],
    [0.86, 0.32, 1.25],
    [-0.86, 0.32, -1.25],
    [0.86, 0.32, -1.25],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(x, y, z);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), headlightMat);
    hl.position.set(sx, 0.62, 2.06);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.06), brakeLightMat);
    tl.position.set(sx, 0.64, -2.04);
    group.add(hl, tl);
  }

  return { group, headlightMat, brakeLightMat, wheels };
}

export interface MotorcycleRiderOptions {
  tankColor?: string;
  style?: "commuter" | "sport" | "delivery";
  hasPassenger?: boolean;
  hasGoods?: boolean;
  riderOutfitColor?: string;
  passengerOutfitColor?: string;
  skinTone?: string;
  hasHelmet?: boolean;
}

/**
 * Motorcycle with seated rider, optional pillion passenger, and optional delivery cargo.
 * Exposes `chassisGroup` so TamaleEngine can smoothly lean the bike + riders into turns.
 */
export function createMotorcycleWithRiderMesh(
  options: MotorcycleRiderOptions,
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  chassisGroup: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const chassisGroup = new THREE.Group();
  group.add(chassisGroup);
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const style = options.style ?? "commuter";
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.25, metalness: 0.85 });
  const tankMat = new THREE.MeshStandardMaterial({
    color: options.tankColor ?? "#dc2626",
    roughness: 0.3,
    metalness: 0.42,
  });
  const seatMat = new THREE.MeshStandardMaterial({ color: "#27272a", roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: "#dc2626",
    emissive: "#ef4444",
    emissiveIntensity: 0.35,
  });

  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.11, 14);
  wheelGeo.rotateZ(Math.PI / 2);

  const frontW = new THREE.Mesh(wheelGeo, tireMat);
  frontW.position.set(0, 0.32, 0.72);
  frontW.castShadow = true;
  const rearW = new THREE.Mesh(wheelGeo, tireMat);
  rearW.position.set(0, 0.32, -0.68);
  rearW.castShadow = true;
  wheels.push(frontW, rearW);
  chassisGroup.add(frontW, rearW);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 1.18), chromeMat);
  frame.position.set(0, 0.56, 0);
  frame.castShadow = true;
  chassisGroup.add(frame);

  const tank = new THREE.Mesh(
    new THREE.BoxGeometry(style === "sport" ? 0.38 : 0.32, 0.24, 0.52),
    tankMat
  );
  tank.position.set(0, 0.82, 0.26);
  tank.castShadow = true;
  chassisGroup.add(tank);

  if (style === "sport") {
    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), tankMat);
    fairing.position.set(0, 0.92, 0.54);
    fairing.rotation.x = -0.35;
    chassisGroup.add(fairing);
  }

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.72), seatMat);
  seat.position.set(0, 0.79, -0.3);
  chassisGroup.add(seat);

  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.76, 8), chromeMat);
  fork.position.set(0, 0.66, 0.62);
  fork.rotation.x = -0.3;
  chassisGroup.add(fork);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 8), chromeMat);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.0, 0.52);
  chassisGroup.add(handlebar);

  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), headlightMat);
  headlight.position.set(0, 0.9, 0.69);
  const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.05), taillightMat);
  taillight.position.set(0, 0.78, -0.82);
  chassisGroup.add(headlight, taillight);

  const addSeatedFigure = (
    zOffset: number,
    shirtHex: string,
    leanX: number,
    armReachZ: number,
    helmet: boolean
  ) => {
    const person = new THREE.Group();
    person.position.set(0, 0.84, zOffset);

    const skinMat = new THREE.MeshStandardMaterial({
      color: options.skinTone ?? "#62381f",
      roughness: 0.68,
    });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.78 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.85 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.22), shirtMat);
    torso.position.set(0, 0.28, 0);
    torso.rotation.x = leanX;
    torso.castShadow = true;
    person.add(torso);

    for (const sx of [-0.18, 0.18]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.36, 8), pantsMat);
      thigh.position.set(sx, -0.02, 0.12);
      thigh.rotation.x = 1.05;
      thigh.rotation.z = sx > 0 ? -0.18 : 0.18;
      person.add(thigh);

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.38, 8), pantsMat);
      shin.position.set(sx * 1.15, -0.26, 0.24);
      person.add(shin);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.44, 8), shirtMat);
      arm.position.set(sx * 1.15, 0.32, armReachZ);
      arm.rotation.x = -0.95;
      person.add(arm);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 10), skinMat);
    head.position.set(0, 0.64, Math.sin(leanX) * 0.22);
    head.castShadow = true;
    person.add(head);

    const crownMat = new THREE.MeshStandardMaterial({
      color: helmet ? "#f8fafc" : "#18181b",
      roughness: helmet ? 0.28 : 0.88,
    });
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(helmet ? 0.165 : 0.15, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      crownMat
    );
    cap.position.copy(head.position);
    cap.position.y += 0.015;
    person.add(cap);

    chassisGroup.add(person);
  };

  addSeatedFigure(
    -0.06,
    options.riderOutfitColor ?? "#1d4ed8",
    0.26,
    0.26,
    options.hasHelmet ?? style === "delivery"
  );

  if (options.hasPassenger) {
    addSeatedFigure(
      -0.44,
      options.passengerOutfitColor ?? "#b45309",
      0.1,
      0.16,
      false
    );
  }

  if (options.hasGoods || style === "delivery") {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.46), chromeMat);
    rack.position.set(0, 0.84, -0.72);
    chassisGroup.add(rack);

    const crateMat = new THREE.MeshStandardMaterial({
      color: style === "delivery" ? "#ea580c" : "#d97706",
      roughness: 0.72,
    });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.46), crateMat);
    crate.position.set(0, 1.05, -0.74);
    crate.castShadow = true;
    chassisGroup.add(crate);
  }

  return { group, chassisGroup, headlightMat, brakeLightMat: taillightMat, wheels };
}

/**
 * Private Tamale saloon car (Ghanaian sedan with silver/burgundy/blue/champagne finishes)
 */
export function createPrivateCarMesh(
  bodyColor: string,
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 4.9),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.54,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const paintMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.28, metalness: 0.38 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.14, metalness: 0.68 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.3, metalness: 0.8 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.22,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.24,
  });

  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.58, 4.18), paintMat);
  lowerBody.position.set(0, 0.56, 0);
  lowerBody.castShadow = true;
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.18, 0.16), trimMat);
  bumperF.position.set(0, 0.34, 2.08);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.18, 0.16), trimMat);
  bumperR.position.set(0, 0.34, -2.08);
  group.add(lowerBody, bumperF, bumperR);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 2.05), glassMat);
  cabin.position.set(0, 1.09, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.95), paintMat);
  roof.position.set(0, 1.37, -0.15);
  group.add(roof);

  for (const mx of [-0.89, 0.89]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.1), paintMat);
    mirror.position.set(mx, 0.94, 0.65);
    group.add(mirror);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [x, y, z] of [
    [-0.86, 0.32, 1.28],
    [0.86, 0.32, 1.28],
    [-0.86, 0.32, -1.28],
    [0.86, 0.32, -1.28],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(x, y, z);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.58, 0.58]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), headlightMat);
    hl.position.set(sx, 0.62, 2.1);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.06), brakeLightMat);
    tl.position.set(sx, 0.64, -2.08);
    group.add(hl, tl);
  }

  return { group, headlightMat, brakeLightMat, wheels };
}

/**
 * Authentic Ghanaian Minibus Trotro (Sprinter/Urvan commuter bus with roof luggage rack & destination sign)
 */
export function createMinibusTrotroMesh(
  bodyColor = "#f8fafc",
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 5.8),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const paintMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.42, metalness: 0.2 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.68 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.15, metalness: 0.65 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.3, metalness: 0.78 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.24,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.25,
  });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.9, 4.9), paintMat);
  lower.position.set(0, 0.78, 0);
  lower.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.97, 0.18, 4.92), stripeMat);
  stripe.position.set(0, 0.88, 0);
  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.78, 4.55), glassMat);
  upperCabin.position.set(0, 1.6, -0.14);
  upperCabin.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 4.65), paintMat);
  roof.position.set(0, 2.04, -0.12);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 2.8), trimMat);
  rack.position.set(0, 2.18, -0.45);
  group.add(lower, stripe, upperCabin, roof, rack);

  const destTex = createShopSignTexture("TAMALE · CENTRAL MARKET", "ABOABO - LAMASHEGU", "#0f172a", "#facc15");
  const destBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.26, 0.08),
    new THREE.MeshStandardMaterial({ map: destTex, roughness: 0.4 })
  );
  destBoard.position.set(0, 1.98, 2.22);
  group.add(destBoard);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.94, 1.55], [0.94, 1.55], [-0.94, -1.55], [0.94, -1.55]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.68, 0.68]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), headlightMat);
    hl.position.set(sx, 0.72, 2.46);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.07), brakeLightMat);
    tl.position.set(sx, 0.84, -2.46);
    group.add(hl, tl);
  }

  return { group, headlightMat, brakeLightMat, wheels };
}

/**
 * Ghana Police Service Tamale Patrol Cruiser with active red/blue rooftop lightbar
 */
export function createPoliceCarMesh(
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  lightbarRedMat: THREE.MeshStandardMaterial;
  lightbarBlueMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 5.0),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const whiteMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.28, metalness: 0.25 });
  const navyMat = new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.32, metalness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.38, metalness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.12, metalness: 0.72 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.25, metalness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.35,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.28,
  });
  const lightbarRedMat = new THREE.MeshStandardMaterial({
    color: "#ef4444",
    emissive: "#ef4444",
    emissiveIntensity: 0.8,
  });
  const lightbarBlueMat = new THREE.MeshStandardMaterial({
    color: "#3b82f6",
    emissive: "#3b82f6",
    emissiveIntensity: 0.8,
  });

  const frontHood = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.62, 1.35), navyMat);
  frontHood.position.set(0, 0.58, 1.48);
  frontHood.castShadow = true;
  const doors = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 1.72), whiteMat);
  doors.position.set(0, 0.58, -0.05);
  doors.castShadow = true;
  const rearTrunk = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.64, 1.25), navyMat);
  rearTrunk.position.set(0, 0.59, -1.52);
  rearTrunk.castShadow = true;
  const goldStripe = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 4.28), goldMat);
  goldStripe.position.set(0, 0.74, -0.02);
  const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.32, 0.16), trimMat);
  bullbar.position.set(0, 0.45, 2.22);
  group.add(frontHood, doors, rearTrunk, goldStripe, bullbar);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 2.02), glassMat);
  cabin.position.set(0, 1.15, -0.15);
  cabin.castShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.09, 1.94), whiteMat);
  roof.position.set(0, 1.46, -0.15);
  group.add(cabin, roof);

  // Police sign + red/blue emergency lightbar
  const plateTex = createShopSignTexture("GHANA POLICE", "TAMALE PATROL", "#1e3a8a", "#facc15");
  for (const sx of [-0.92, 0.92]) {
    const doorSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.26, 0.96),
      new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4 })
    );
    doorSign.position.set(sx, 0.56, -0.05);
    group.add(doorSign);
  }
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 0.24), trimMat);
  barBase.position.set(0, 1.54, -0.02);
  const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.22), lightbarRedMat);
  redPod.position.set(-0.32, 1.58, -0.02);
  const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.22), lightbarBlueMat);
  bluePod.position.set(0.32, 1.58, -0.02);
  group.add(barBase, redPod, bluePod);

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.89, 1.34], [0.89, 1.34], [-0.89, -1.34], [0.89, -1.34]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(x, 0.34, z);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), headlightMat);
    hl.position.set(sx, 0.64, 2.16);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), brakeLightMat);
    tl.position.set(sx, 0.66, -2.14);
    group.add(hl, tl);
  }

  return { group, headlightMat, brakeLightMat, lightbarRedMat, lightbarBlueMat, wheels };
}

/**
 * Tamale Utility Pickup Truck (double-cab with open rear cargo bed & mountable cargo anchor)
 */
export function createPickupTruckMesh(
  bodyColor = "#0f766e",
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  cargoMountGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const cargoMountGroup = new THREE.Group();
  cargoMountGroup.position.set(0, 0.72, -1.12);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 5.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const paintMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.34, metalness: 0.36 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.14, metalness: 0.68 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.28, metalness: 0.82 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.24,
  });

  // Front engine hood + cab
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.68, 1.35), paintMat);
  hood.position.set(0, 0.72, 1.62);
  hood.castShadow = true;
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.68, 1.45), paintMat);
  cabBody.position.set(0, 0.72, 0.24);
  cabBody.castShadow = true;
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.54, 1.32), glassMat);
  cabGlass.position.set(0, 1.32, 0.24);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.1, 1.28), paintMat);
  cabRoof.position.set(0, 1.62, 0.24);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.34, 0.08), trimMat);
  grille.position.set(0, 0.72, 2.31);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 0.2), trimMat);
  bumper.position.set(0, 0.42, 2.32);
  group.add(hood, cabBody, cabGlass, cabRoof, grille, bumper);

  // Open rear pickup bed (floor + 3 side walls + tailgate)
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 1.92), trimMat);
  bedFloor.position.set(0, 0.6, -1.16);
  bedFloor.castShadow = true;
  group.add(bedFloor);
  for (const sx of [-0.88, 0.88]) {
    const bedWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 1.92), paintMat);
    bedWall.position.set(sx, 0.96, -1.16);
    bedWall.castShadow = true;
    group.add(bedWall);
  }
  const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.54, 0.12), paintMat);
  tailgate.position.set(0, 0.95, -2.08);
  tailgate.castShadow = true;
  group.add(tailgate);

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.26, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.27, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.95, 1.48], [0.95, 1.48], [-0.95, -1.32], [0.95, -1.32]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.4, wz);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), headlightMat);
    hl.position.set(sx, 0.78, 2.31);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.06), brakeLightMat);
    tl.position.set(sx * 1.15, 0.92, -2.15);
    group.add(hl, tl);
  }

  group.add(cargoMountGroup);
  return { group, headlightMat, brakeLightMat, wheels, cargoMountGroup };
}

/**
 * Tamale Freight Box Truck (cabover truck + branded Northern Logistics enclosed cargo body)
 */
export function createBoxTruckMesh(
  bodyColor = "#f8fafc",
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  cargoMountGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const cargoMountGroup = new THREE.Group();
  cargoMountGroup.position.set(0, 1.0, -0.75);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 6.9),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const cabMat = new THREE.MeshStandardMaterial({ color: "#0369a1", roughness: 0.36, metalness: 0.35 });
  const boxMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.48, metalness: 0.18 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.75 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.14, metalness: 0.7 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.28, metalness: 0.8 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.25,
  });

  // Cabover front cab + steel ladder chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 5.9), trimMat);
  chassis.position.set(0, 0.74, -0.1);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.65, 1.65), cabMat);
  cab.position.set(0, 1.56, 2.02);
  cab.castShadow = true;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.66, 0.1), glassMat);
  windshield.position.set(0, 1.85, 2.84);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.28, 0.24), trimMat);
  bumper.position.set(0, 0.58, 2.88);
  group.add(chassis, cab, windshield, bumper);

  // Enclosed Box Cargo Container + Branded Side Plaques
  const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(2.26, 2.1, 4.1), boxMat);
  cargoBox.position.set(0, 1.92, -0.95);
  cargoBox.castShadow = true;
  cargoBox.receiveShadow = true;
  group.add(cargoBox);

  const logoTex = createShopSignTexture("NORTHERN FREIGHT", "TAMALE CARGO LOGISTICS", "#0369a1", "#fef08a");
  for (const sx of [-1.14, 1.14]) {
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.15, 3.0),
      new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.45 })
    );
    plaque.position.set(sx, 2.0, -0.95);
    group.add(plaque);
  }
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.75, 0.08), trimMat);
  shutter.position.set(0, 1.85, -3.0);
  group.add(shutter);

  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.31, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-1.02, 1.9], [1.02, 1.9], [-1.04, -1.85], [1.04, -1.85]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.45, wz);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.76, 0.76]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), headlightMat);
    hl.position.set(sx, 0.94, 2.86);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.07), brakeLightMat);
    tl.position.set(sx, 0.82, -3.04);
    group.add(hl, tl);
  }

  group.add(cargoMountGroup);
  return { group, headlightMat, brakeLightMat, wheels, cargoMountGroup };
}

/**
 * Heavy Tamale Flatbed Timber & Grain Haulage Truck with wooden side stake rails + visible cargo bed
 */
export function createFlatbedTruckMesh(
  cabColor = "#b45309",
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  cargoMountGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const cargoMountGroup = new THREE.Group();
  cargoMountGroup.position.set(0, 1.0, -1.1);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 7.3),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const cabMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.36, metalness: 0.38 });
  const deckMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.88 });
  const railMat = new THREE.MeshStandardMaterial({ color: "#92400e", roughness: 0.82 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.72 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.15, metalness: 0.7 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.28, metalness: 0.8 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.25,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: "#991b1b",
    emissive: "#ef4444",
    emissiveIntensity: 0.25,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.3, 6.4), trimMat);
  chassis.position.set(0, 0.72, -0.15);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.62, 1.75), cabMat);
  cab.position.set(0, 1.56, 2.15);
  cab.castShadow = true;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 0.1), glassMat);
  windshield.position.set(0, 1.85, 3.04);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.24), trimMat);
  bumper.position.set(0, 0.56, 3.12);
  group.add(chassis, cab, windshield, bumper);

  // Open timber/heavy flatbed deck + wooden side stake slats
  const flatbedDeck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 4.35), deckMat);
  flatbedDeck.position.set(0, 0.92, -1.1);
  flatbedDeck.castShadow = true;
  flatbedDeck.receiveShadow = true;
  group.add(flatbedDeck);

  for (const sx of [-1.1, 1.1]) {
    for (let pz = -3.0; pz <= 0.8; pz += 0.95) {
      const stake = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.1), trimMat);
      stake.position.set(sx, 1.32, pz);
      group.add(stake);
    }
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 4.25), railMat);
    topRail.position.set(sx, 1.52, -1.1);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 4.25), railMat);
    midRail.position.set(sx, 1.24, -1.1);
    group.add(topRail, midRail);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.3, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.31, 10);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [
    [-1.02, 2.08], [1.02, 2.08],
    [-1.06, -1.2], [1.06, -1.2],
    [-1.06, -2.35], [1.06, -2.35],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.46, wz);
    w.castShadow = true;
    w.add(new THREE.Mesh(rimGeo, rimMat));
    group.add(w);
    wheels.push(w);
  }

  for (const sx of [-0.76, 0.76]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), headlightMat);
    hl.position.set(sx, 0.92, 3.06);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.07), brakeLightMat);
    tl.position.set(sx, 0.82, -3.28);
    group.add(hl, tl);
  }

  group.add(cargoMountGroup);
  return { group, headlightMat, brakeLightMat, wheels, cargoMountGroup };
}

/**
 * Detailed Multi-Part Cargo Bundle meshes mounted onto Cargo Trikes / Pickups / Flatbed Trucks
 */
export function createCargoBundleMesh(cargoKind: CargoPropKind): THREE.Group {
  const group = new THREE.Group();
  const sackMat = new THREE.MeshStandardMaterial({ color: "#e7d7b8", roughness: 0.9 });
  const cementMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.88 });
  const yamMat = new THREE.MeshStandardMaterial({ color: "#7c5234", roughness: 0.94 });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#a1622e", roughness: 0.86 });
  const blueWaterMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.42 });
  const crateMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.78 });
  const strapMat = new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.65 });

  if (cargoKind === "timber_beams") {
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 2.2), woodMat);
        beam.position.set(col * 0.34, 0.14 + row * 0.26, 0);
        beam.castShadow = true;
        group.add(beam);
      }
    }
    for (const sz of [-0.65, 0.65]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.56, 0.06), strapMat);
      strap.position.set(0, 0.28, sz);
      group.add(strap);
    }
  } else if (cargoKind === "cement_bags" || cargoKind === "rice_sacks") {
    const mat = cargoKind === "cement_bags" ? cementMat : sackMat;
    for (let layer = 0; layer < 2; layer++) {
      for (let ix = -1; ix <= 1; ix += 2) {
        for (let iz = -1; iz <= 1; iz++) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.38), mat);
          bag.position.set(ix * 0.28, 0.12 + layer * 0.23, iz * 0.42);
          bag.rotation.y = (ix + iz) * 0.04;
          bag.castShadow = true;
          group.add(bag);
        }
      }
    }
  } else if (cargoKind === "yam_bundles") {
    for (let i = 0; i < 8; i++) {
      const tuber = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.72, 8), yamMat);
      tuber.rotation.x = Math.PI / 2;
      tuber.rotation.z = ((i % 3) - 1) * 0.14;
      tuber.position.set(((i % 4) - 1.5) * 0.24, 0.14 + Math.floor(i / 4) * 0.22, ((i % 2) - 0.5) * 0.25);
      tuber.castShadow = true;
      group.add(tuber);
    }
  } else if (cargoKind === "water_packs") {
    for (let ix = -1; ix <= 1; ix += 2) {
      for (let iz = -1; iz <= 1; iz += 2) {
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.48), blueWaterMat);
        pack.position.set(ix * 0.28, 0.16, iz * 0.28);
        pack.castShadow = true;
        group.add(pack);
      }
    }
  } else {
    // market_crates or mixed_parcels
    for (let i = 0; i < 4; i++) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.36, 0.48),
        i % 2 === 0 ? crateMat : sackMat
      );
      crate.position.set((i % 2 === 0 ? -0.28 : 0.28), 0.18 + Math.floor(i / 2) * 0.36, (i % 2 === 0 ? 0.22 : -0.22));
      crate.castShadow = true;
      group.add(crate);
    }
  }

  return group;
}

/**
 * Commuter Bicycle + Cyclist common along Tamale neighbourhood roads & market approaches
 */
export function createBicycleMesh(
  frameColor: string,
  riderShirtColor: string,
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  chassisGroup: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const chassisGroup = new THREE.Group();
  group.add(chassisGroup);
  const wheels: THREE.Mesh[] = [];

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 2.0),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.45, metalness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: "#62381f", roughness: 0.68 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: riderShirtColor, roughness: 0.8 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: "#fef9c3",
    emissive: "#fde047",
    emissiveIntensity: 0.1,
  });

  const wheelGeo = new THREE.TorusGeometry(0.32, 0.035, 8, 16);
  wheelGeo.rotateY(Math.PI / 2);
  const fw = new THREE.Mesh(wheelGeo, tireMat);
  fw.position.set(0, 0.34, 0.58);
  const rw = new THREE.Mesh(wheelGeo, tireMat);
  rw.position.set(0, 0.34, -0.58);
  wheels.push(fw, rw);
  chassisGroup.add(fw, rw);

  const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6), frameMat);
  topTube.rotation.x = Math.PI / 2;
  topTube.position.set(0, 0.72, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 6), frameMat);
  stem.position.set(0, 0.72, 0.45);
  stem.rotation.x = -0.22;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 6), frameMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.02, 0.38);
  chassisGroup.add(topTube, stem, bar);

  // Cyclist figure
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.2), shirtMat);
  torso.position.set(0, 1.15, -0.08);
  torso.rotation.x = 0.28;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
  head.position.set(0, 1.5, 0.05);
  chassisGroup.add(torso, head);

  return { group, chassisGroup, headlightMat, wheels };
}

/**
 * Tamale Roadside Commercial Details: Wooden Kiosks, Charcoal Food Vendor Tables, Mobile-Money Booths
 */
export function createRoadsideStallMesh(
  kind:
    | "kiosk"
    | "food_vendor"
    | "mobile_money"
    | "accessories_cart"
    | "cloth_table"
    | "corn_grill"
    | "ice_cream_cart"
    | "household_table",
  accentColor: string,
  textures: ProceduralTextureSet
): { group: THREE.Group; emberMat?: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: "#8a5a36",
    roughness: 0.9,
  });
  const zincMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.03,
    color: "#94a3b8",
    roughness: 0.52,
    metalness: 0.5,
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.74 });

  if (kind === "kiosk") {
    // Classic Northern Ghana painted wooden roadside provision kiosk
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.9), accentMat);
    body.position.set(0, 1.1, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 0.45), woodMat);
    counter.position.set(0, 1.05, 1.05);
    group.add(counter);

    const windowOpen = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.85, 0.1),
      new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.9 })
    );
    windowOpen.position.set(0, 1.48, 0.94);
    group.add(windowOpen);

    const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.85), accentMat);
    shutter.position.set(0, 1.96, 1.32);
    shutter.rotation.x = -0.25;
    group.add(shutter);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 2.5), zincMat);
    roof.position.set(0, 2.28, 0.1);
    roof.rotation.x = 0.09;
    roof.castShadow = true;
    group.add(roof);

    for (const [jx, col] of [[-0.45, "#ef4444"], [0, "#22c55e"], [0.42, "#eab308"]] as const) {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.24, 8),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 })
      );
      jar.position.set(jx, 1.24, 1.06);
      group.add(jar);
    }
    return { group };
  }

  if (kind === "mobile_money") {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 2.5, 8),
      new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.6 })
    );
    pole.position.set(0, 1.25, 0);
    const umb = new THREE.Mesh(
      new THREE.ConeGeometry(1.55, 0.56, 8),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.72, side: THREE.DoubleSide })
    );
    umb.position.set(0, 2.55, 0);
    umb.castShadow = true;

    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.78, 0.72), woodMat);
    desk.position.set(0, 0.39, 0.35);
    desk.castShadow = true;

    const topCloth = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.05, 0.74), accentMat);
    topCloth.position.set(0, 0.8, 0.35);

    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), woodMat);
    stool.position.set(0, 0.225, -0.35);
    group.add(pole, umb, desk, topCloth, stool);
    return { group };
  }

  if (kind === "accessories_cart") {
    // Glass-fronted Tamale phone accessory push-cart
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.85, 0.75),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.45, metalness: 0.6 })
    );
    frame.position.set(0, 0.65, 0);
    frame.castShadow = true;
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.68, 0.78),
      new THREE.MeshPhysicalMaterial({ color: "#e0f2fe", transparent: true, opacity: 0.45, roughness: 0.1 })
    );
    glass.position.set(0, 1.28, 0);
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.08, 0.82), accentMat);
    topCap.position.set(0, 1.65, 0);
    group.add(frame, glass, topCap);

    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
    for (const [wx, wz] of [[-0.68, 0.28], [0.68, 0.28], [-0.68, -0.28], [0.68, -0.28]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, 0.16, wz);
      group.add(w);
    }
    for (const [bx, col] of [[-0.4, "#ef4444"], [0, "#facc15"], [0.4, "#3b82f6"]] as const) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.18, 0.36),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })
      );
      box.position.set(bx, 1.2, 0);
      group.add(box);
    }
    return { group };
  }

  if (kind === "cloth_table") {
    // Tabletop footwear, folded wax prints & display rack
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.76, 0.95), woodMat);
    table.position.set(0, 0.38, 0);
    table.castShadow = true;
    group.add(table);

    for (const [px, col] of [[-0.55, "#1d4ed8"], [-0.15, "#b45309"], [0.25, "#15803d"], [0.62, "#be123c"]] as const) {
      const stack = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.22, 0.48),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })
      );
      stack.position.set(px, 0.87, -0.1);
      stack.rotation.y = px * 0.15;
      group.add(stack);
    }
    return { group };
  }

  if (kind === "ice_cream_cart") {
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.82, 0.78),
      new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.32, metalness: 0.15 })
    );
    chest.position.set(0, 0.58, 0);
    chest.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.47, 0.18, 0.8), accentMat);
    stripe.position.set(0, 0.76, 0);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.9, 8),
      new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.6 })
    );
    pole.position.set(0, 1.5, 0);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.25, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.68, side: THREE.DoubleSide })
    );
    canopy.position.set(0, 2.45, 0);
    canopy.castShadow = true;
    group.add(chest, stripe, pole, canopy);
    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
    for (const [wx, wz] of [[-0.68, 0.28], [0.68, 0.28], [-0.68, -0.28], [0.68, -0.28]]) {
      const w = new THREE.Mesh(wheelGeo, wMat);
      w.position.set(wx, 0.16, wz);
      group.add(w);
    }
    return { group };
  }

  if (kind === "household_table") {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 0.98), woodMat);
    table.position.set(0, 0.375, 0);
    table.castShadow = true;
    group.add(table);
    for (const [bx, col] of [[-0.58, "#0284c7"], [0, "#ec4899"], [0.58, "#16a34a"]] as const) {
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.16, 0.24, 10),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 })
      );
      basin.position.set(bx, 0.87, 0);
      group.add(basin);
    }
    return { group };
  }

  if (kind === "corn_grill") {
    // Roadside roasted corn & kelewele charcoal drum brazier + umbrella
    const grillBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.32, 0.75, 12),
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.8, metalness: 0.55 })
    );
    grillBody.position.set(0, 0.38, 0);
    grillBody.castShadow = true;
    const emberMat = new THREE.MeshStandardMaterial({
      color: "#ea580c",
      emissive: "#f97316",
      emissiveIntensity: 0.95,
      roughness: 0.55,
    });
    const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12), emberMat);
    embers.position.set(0, 0.77, 0);
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.45), woodMat);
    stool.position.set(-0.78, 0.21, 0);
    const cornMat = new THREE.MeshStandardMaterial({ color: "#facc15", roughness: 0.65 });
    for (const cx of [-0.12, 0.08]) {
      const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.24, 8), cornMat);
      cob.rotation.z = Math.PI / 2;
      cob.position.set(cx, 0.85, 0.05);
      group.add(cob);
    }
    group.add(grillBody, embers, stool);
    return { group, emberMat };
  }

  // "food_vendor": Roadside Waakye / Kɔɔsɛ / Chichinga Table + Aluminum Pot + Charcoal Brazier
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.8, 0.92), woodMat);
  table.position.set(0, 0.4, 0);
  table.castShadow = true;
  group.add(table);

  const umbPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.45, 8),
    new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.6 })
  );
  umbPole.position.set(-0.55, 1.22, -0.2);
  const umb = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 0.52, 8),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.75, side: THREE.DoubleSide })
  );
  umb.position.set(-0.55, 2.48, -0.2);
  umb.castShadow = true;
  group.add(umbPole, umb);

  const potMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.35, metalness: 0.78 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.34, 12), potMat);
  pot.position.set(-0.28, 0.98, 0);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 12), potMat);
  lid.position.set(-0.28, 1.16, 0);
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.16, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.82 })
  );
  bowl.position.set(0.38, 0.9, 0.05);
  group.add(pot, lid, bowl);

  // Charcoal coalpot brazier on ground beside table
  const coalPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.18, 0.42, 10),
    new THREE.MeshStandardMaterial({ color: "#27272a", roughness: 0.85, metalness: 0.45 })
  );
  coalPot.position.set(1.12, 0.21, 0.12);
  const emberMat = new THREE.MeshStandardMaterial({
    color: "#ea580c",
    emissive: "#f97316",
    emissiveIntensity: 0.9,
    roughness: 0.6,
  });
  const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), emberMat);
  embers.position.set(1.12, 0.43, 0.12);
  const grillPot = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.2, 0.22, 10), potMat);
  grillPot.position.set(1.12, 0.56, 0.12);
  group.add(coalPot, embers, grillPot);

  return { group, emberMat };
}

/**
 * Simple wooden shade bench placed outside Tamale shops & residential compounds
 */
export function createRoadsideBenchMesh(_textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: "#784c2c",
    roughness: 0.9,
  });
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.52), woodMat);
  plank.position.set(0, 0.46, 0);
  plank.castShadow = true;
  group.add(plank);
  for (const lx of [-0.68, 0.68]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.44), woodMat);
    leg.position.set(lx, 0.22, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  return group;
}


export function createTreeMesh(type: "baobab" | "shea" | "neem" | "mango"): THREE.Group {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: type === "baobab" ? "#78695e" : "#5c4332",
    roughness: 0.92,
  });

  if (type === "baobab") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.45, 5.2, 10), trunkMat);
    trunk.position.y = 2.6;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: "#4d6b2d", roughness: 0.85 });
    for (const [cx, cy, cz, cr] of [
      [0, 5.8, 0, 2.1],
      [-1.5, 5.3, 0.9, 1.45],
      [1.6, 5.2, -0.8, 1.5],
      [0.4, 5.4, 1.5, 1.35],
    ]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.1, 6), trunkMat);
      b.position.set(cx * 0.55, 4.6, cz * 0.55);
      b.rotation.z = -cx * 0.25;
      b.rotation.x = cz * 0.25;
      group.add(b);

      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 1), leafMat);
      canopy.position.set(cx, cy, cz);
      canopy.scale.set(1.2, 0.65, 1.2);
      canopy.castShadow = true;
      group.add(canopy);
    }
  } else {
    const height = type === "neem" ? 4.2 : 3.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, height, 8), trunkMat);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageColor =
      type === "shea" ? "#477328" : type === "mango" ? "#2f6b31" : "#386e34";
    const leafMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.84 });

    for (const [px, py, pz, pr] of [
      [0, height + 0.8, 0, 1.95],
      [-1.0, height + 0.3, 0.6, 1.35],
      [1.0, height + 0.4, -0.5, 1.4],
      [0.2, height + 0.3, -1.0, 1.3],
    ]) {
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(pr, 1), leafMat);
      leaf.position.set(px, py, pz);
      leaf.scale.y = 0.78;
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  return group;
}

/**
 * Tamale (Naa Gbewaa) Interchange reconstructed from tamale_interchange.jpg
 */
export function createTamaleInterchangeGroup(
  textures: ProceduralTextureSet
): { group: THREE.Group; bridgeLampBulbs: THREE.MeshStandardMaterial[] } {
  const group = new THREE.Group();
  const bridgeLampBulbs: THREE.MeshStandardMaterial[] = [];

  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.interchangeConcrete,
    roughness: 0.82,
    metalness: 0.04,
  });
  const roadDeckMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltRoad,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.03,
    roughness: 0.88,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: "#64748b",
    roughness: 0.4,
    metalness: 0.78,
  });

  // Central roundabout curb ring below viaduct
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(4.1, 4.4, 0.32, 24),
    new THREE.MeshStandardMaterial({ color: "#b5693c", roughness: 0.92 })
  );
  island.position.y = 0.16;
  island.receiveShadow = true;
  group.add(island);

  const islandCurb = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.24, 8, 32),
    new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.7 })
  );
  islandCurb.rotation.x = Math.PI / 2;
  islandCurb.position.y = 0.24;
  group.add(islandCurb);

  // Elevated concrete box-girder main span (East-West along Gbewaa High Street)
  const deckY = 5.6;
  const spanLength = 66;
  const girderDeck = new THREE.Mesh(new THREE.BoxGeometry(spanLength, 1.35, 10.6), concreteMat);
  girderDeck.position.set(0, deckY, 0);
  girderDeck.castShadow = true;
  girderDeck.receiveShadow = true;
  group.add(girderDeck);

  // Top asphalt surface on flyover
  const deckRoad = new THREE.Mesh(new THREE.PlaneGeometry(spanLength, 9.6), roadDeckMat);
  deckRoad.rotation.x = -Math.PI / 2;
  deckRoad.position.set(0, deckY + 0.69, 0);
  group.add(deckRoad);

  // Continuous concrete parapets + steel guardrails (matching tamale_interchange.jpg!)
  for (const side of [-1, 1]) {
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(spanLength, 0.85, 0.42), concreteMat);
    parapet.position.set(0, deckY + 1.05, side * 5.1);
    parapet.castShadow = true;
    group.add(parapet);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanLength, 0.14, 0.08), railMat);
    rail.position.set(0, deckY + 1.72, side * 5.1);
    group.add(rail);
  }

  // Tapered concrete bridge piers + footings (leaving wide central passage for Gukpegu Rd!)
  for (const px of [-24, -10, 10, 24]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.7, deckY - 0.5, 5.2), concreteMat);
    pier.position.set(px, (deckY - 0.5) / 2, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    group.add(pier);

    const capBeam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 8.8), concreteMat);
    capBeam.position.set(px, deckY - 0.85, 0);
    capBeam.castShadow = true;
    group.add(capBeam);
  }

  // Sloped concrete approach ramps on West & East ends (cleanly meeting viaduct deck at ±33 & ground at ±60.6)
  for (const dir of [-1, 1]) {
    const rampLen = 28;
    const rampGroup = new THREE.Group();
    rampGroup.position.set(dir * (spanLength / 2 + rampLen / 2 - 0.4), deckY / 2 - 0.34, 0);
    rampGroup.rotation.z = -dir * Math.atan2(deckY + 0.65, rampLen);

    const rampBody = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 1.35, 10.4), concreteMat);
    rampBody.castShadow = true;
    rampBody.receiveShadow = true;
    rampGroup.add(rampBody);

    const rampRoad = new THREE.Mesh(new THREE.PlaneGeometry(rampLen, 9.5), roadDeckMat);
    rampRoad.rotation.x = -Math.PI / 2;
    rampRoad.position.y = 0.685;
    rampGroup.add(rampRoad);

    for (const side of [-1, 1]) {
      const rp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.78, 0.38), concreteMat);
      rp.position.set(0, 1.0, side * 5.0);
      rampGroup.add(rp);
    }
    group.add(rampGroup);
  }

  // Overhead highway lights on the flyover
  for (const lx of [-18, 0, 18]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.4, 8), railMat);
    pole.position.set(lx, deckY + 2.8, -5.0);
    group.add(pole);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: "#fef3c7",
      emissive: "#f59e0b",
      emissiveIntensity: 0.15,
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.56), bulbMat);
    lamp.position.set(lx, deckY + 5.0, -4.4);
    group.add(lamp);
    bridgeLampBulbs.push(bulbMat);
  }

  // Green Ghana Highway Authority directional gantry sign beside the Interchange
  const signPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.2, 8), railMat);
  signPostL.position.set(-14, 2.6, 10.5);
  const signPostR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.2, 8), railMat);
  signPostR.position.set(-7, 2.6, 10.5);
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 2.1, 0.2),
    new THREE.MeshStandardMaterial({ map: textures.highwaySign, roughness: 0.45 })
  );
  signBoard.position.set(-10.5, 4.2, 10.5);
  signBoard.castShadow = true;
  group.add(signPostL, signPostR, signBoard);

  return { group, bridgeLampBulbs };
}

/**
 * Tamale Central Mosque reconstructed directly from tamale_central_mosque.jpg:
 * Circular cream sanctuary drum, tall narrow green-tinted windows, projecting green cornice,
 * broad emerald-green dome with crescent finial, and twin cream-and-green minarets.
 */
export function createCentralMosqueGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const creamMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    bumpMap: textures.concreteBump,
    bumpScale: 0.02,
    color: "#f2ece1",
    roughness: 0.78,
  });
  const emeraldMat = new THREE.MeshStandardMaterial({
    color: "#337a42",
    roughness: 0.44,
    metalness: 0.1,
  });
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: "#1f4733",
    roughness: 0.15,
    metalness: 0.55,
  });
  const whiteTrimMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.5 });

  // Paved courtyard terrace
  const courtyard = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.26, 24),
    new THREE.MeshStandardMaterial({ map: textures.paverBrick, color: "#cfc4b4", roughness: 0.88 })
  );
  courtyard.position.y = 0.13;
  courtyard.receiveShadow = true;
  group.add(courtyard);

  // Broad circular sanctuary hall (from photo!)
  const drumRadius = 8.4;
  const drumHeight = 4.6;
  const sanctuaryDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(drumRadius, drumRadius, drumHeight, 32),
    creamMat
  );
  sanctuaryDrum.position.set(0, 0.26 + drumHeight / 2, -1);
  sanctuaryDrum.castShadow = true;
  sanctuaryDrum.receiveShadow = true;
  group.add(sanctuaryDrum);

  // Tall narrow arched-style windows around the circular wall
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const wx = Math.sin(ang) * (drumRadius + 0.04);
    const wz = -1 + Math.cos(ang) * (drumRadius + 0.04);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.25, 0.14), whiteTrimMat);
    frame.position.set(wx, 2.65, wz);
    frame.rotation.y = ang;
    group.add(frame);

    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.05, 0.18), windowGlassMat);
    pane.position.set(wx, 2.65, wz);
    pane.rotation.y = ang;
    group.add(pane);
  }

  // Projecting emerald-green cornice eave rim
  const cornice = new THREE.Mesh(
    new THREE.CylinderGeometry(drumRadius + 0.65, drumRadius + 0.55, 0.38, 32),
    emeraldMat
  );
  cornice.position.set(0, 0.26 + drumHeight + 0.12, -1);
  cornice.castShadow = true;
  group.add(cornice);

  // Broad hemispherical emerald-green dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(drumRadius + 0.1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
    emeraldMat
  );
  dome.position.set(0, 0.26 + drumHeight + 0.2, -1);
  dome.castShadow = true;
  group.add(dome);

  // Finial spire with white orb
  const spireShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.5, 10), emeraldMat);
  spireShaft.position.set(0, 0.26 + drumHeight + drumRadius + 0.7, -1);
  const spireOrb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), whiteTrimMat);
  spireOrb.position.set(0, 0.26 + drumHeight + drumRadius + 1.5, -1);
  group.add(spireShaft, spireOrb);

  // Twin tall cylindrical cream-and-green minarets (matching left side of tamale_central_mosque.jpg)
  for (const mx of [-10.2, 10.2]) {
    const mz = 4.5;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.48, 12.2, 20), creamMat);
    shaft.position.set(mx, 6.3, mz);
    shaft.castShadow = true;
    group.add(shaft);

    // Cantilevered green balcony rings at 3 tiers
    for (const by of [4.2, 8.2, 12.1]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.58, 0.32, 20), emeraldMat);
      ring.position.set(mx, by, mz);
      ring.castShadow = true;
      group.add(ring);
    }

    // Green louvered ventilation slots
    for (let s = 0; s < 4; s++) {
      const ang = (s / 4) * Math.PI * 2;
      const vx = mx + Math.sin(ang) * 1.38;
      const vz = mz + Math.cos(ang) * 1.38;
      for (const vy of [6.2, 10.1]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.14), emeraldMat);
        vent.position.set(vx, vy, vz);
        vent.rotation.y = ang;
        group.add(vent);
      }
    }

    // Minaret green cap dome + orb
    const mDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      emeraldMat
    );
    mDome.position.set(mx, 12.25, mz);
    mDome.castShadow = true;
    const mOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), whiteTrimMat);
    mOrb.position.set(mx, 14.0, mz);
    group.add(mDome, mOrb);
  }

  return group;
}

/**
 * Tamale Central Market reconstructed from tamale_market_ghana.jpg:
 * Corrugated zinc sheds, colorful tilted market umbrellas, wooden tables on stone blocks,
 * tomato/yam displays, aluminum bowls, and a concrete lock-up shop perimeter.
 */
export function createCentralMarketGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const zincMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    roughness: 0.56,
    metalness: 0.58,
  });
  const rustyZincMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    color: "#c28562",
    roughness: 0.72,
    metalness: 0.35,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.88 });
  const blockMat = new THREE.MeshStandardMaterial({ color: "#9c8570", roughness: 0.92 });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    bumpMap: textures.concreteBump,
    bumpScale: 0.02,
    color: "#e6ded1",
    roughness: 0.85,
  });

  // Compacted market apron
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.14, 24),
    new THREE.MeshStandardMaterial({ map: textures.lateriteGround, roughness: 0.94 })
  );
  floor.position.y = 0.07;
  floor.receiveShadow = true;
  group.add(floor);

  // Two large corrugated-zinc covered market sheds
  for (const bz of [-5.8, 3.2]) {
    for (let px = -11; px <= 11; px += 5.5) {
      for (const pz of [-2.8, 2.8]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), woodMat);
        post.position.set(px, 1.6, bz + pz);
        post.castShadow = true;
        group.add(post);
      }
    }
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(25, 0.14, 7.6),
      bz < 0 ? zincMat : rustyZincMat
    );
    roof.position.set(0, 3.35, bz);
    roof.rotation.x = bz < 0 ? 0.08 : -0.08;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
  }

  // Foreground open-air vendor stalls with colorful umbrellas & stacked stone table legs (from photo!)
  const umbrellaColors = ["#dc2626", "#eab308", "#1d4ed8", "#ea580c", "#be123c"];
  for (let i = 0; i < 5; i++) {
    const sx = -10 + i * 5.0;
    const sz = 8.4;

    // Stacked stone/cement block table supports
    for (const lx of [-1.1, 1.1]) {
      const stoneLeg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.9), blockMat);
      stoneLeg.position.set(sx + lx, 0.38, sz);
      stoneLeg.castShadow = true;
      group.add(stoneLeg);
    }

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.1, 1.35), woodMat);
    tableTop.position.set(sx, 0.78, sz);
    tableTop.castShadow = true;
    group.add(tableTop);

    // Produce pyramids (red tomatoes, yams, aluminum pans, shea butter bowls)
    const tomatoHeap = new THREE.Mesh(
      new THREE.ConeGeometry(0.36, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.6 })
    );
    tomatoHeap.position.set(sx - 0.65, 1.0, sz);
    group.add(tomatoHeap);

    const yamPile = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.25, 0.55),
      new THREE.MeshStandardMaterial({ color: "#784f2a", roughness: 0.9 })
    );
    yamPile.position.set(sx + 0.15, 0.95, sz);
    group.add(yamPile);

    const metalPan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.22, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.75, roughness: 0.3 })
    );
    metalPan.position.set(sx + 0.85, 0.94, sz);
    group.add(metalPan);

    // Colorful market umbrella
    const uPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 2.5, 8),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.6 })
    );
    uPole.position.set(sx, 1.85, sz - 0.55);
    group.add(uPole);

    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(1.95, 0.68, 8),
      new THREE.MeshStandardMaterial({
        color: umbrellaColors[i % umbrellaColors.length],
        roughness: 0.78,
        side: THREE.DoubleSide,
      })
    );
    umbrella.position.set(sx, 3.05, sz - 0.55);
    umbrella.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.08;
    umbrella.castShadow = true;
    group.add(umbrella);
  }

  // Concrete perimeter market shop block + Market signboard
  const lockupBlock = new THREE.Mesh(new THREE.BoxGeometry(24, 3.8, 3.6), concreteMat);
  lockupBlock.position.set(0, 1.9, -10.5);
  lockupBlock.castShadow = true;
  group.add(lockupBlock);

  for (let rx = -9; rx <= 9; rx += 4.5) {
    const shutter = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.4, 0.14),
      new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.65, roughness: 0.45 })
    );
    shutter.position.set(rx, 1.35, -8.68);
    group.add(shutter);
  }

  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 1.6, 0.18),
    new THREE.MeshStandardMaterial({ map: textures.marketSign, roughness: 0.5 })
  );
  signMesh.position.set(0, 4.3, -8.8);
  group.add(signMesh);

  // Authentic Tamale market details: grain & rice sacks, woven raffia baskets, shea calabashes, and hanging batakari/wax print racks
  const sackMat = new THREE.MeshStandardMaterial({ color: "#d6c3a5", roughness: 0.95 });
  const sackBandMat = new THREE.MeshStandardMaterial({ color: "#854d0e", roughness: 0.9 });
  const basketMat = new THREE.MeshStandardMaterial({ color: "#b78b4b", roughness: 0.92 });
  const sheaMat = new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.65 });
  const crateMat = new THREE.MeshStandardMaterial({ color: "#7c4a21", roughness: 0.88 });

  // Grain/millet/maize sacks stacked near shed columns & inner aisle
  for (const [sx, sz] of [
    [-12.6, -1.2],
    [-12.0, -0.4],
    [-12.5, 0.5],
    [12.4, -1.0],
    [11.8, -0.2],
    [12.3, 0.7],
    [-6.2, -1.3],
    [6.2, -1.3],
  ]) {
    const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.88, 10), sackMat);
    sack.position.set(sx, 0.55, sz);
    sack.scale.set(1.05, 1, 0.85);
    sack.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.12, 10), sackBandMat);
    band.position.set(sx, 0.62, sz);
    group.add(sack, band);
  }

  // Woven raffia baskets & golden kpakpili (shea butter) calabashes along foreground & side apron
  for (const [bx, bz] of [
    [-12.4, 5.2],
    [-7.5, 6.2],
    [-2.5, 6.2],
    [2.5, 6.2],
    [7.5, 6.2],
    [12.4, 5.2],
  ]) {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.34, 0.42, 12), basketMat);
    basket.position.set(bx, 0.35, bz);
    basket.castShadow = true;
    const sheaMound = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), sheaMat);
    sheaMound.position.set(bx, 0.52, bz);
    group.add(basket, sheaMound);
  }

  // Hanging Batakari & colorful Ghanaian wax print cloth racks on market flanks
  const fabricColors = ["#1e3a5f", "#dc2626", "#eab308", "#047857", "#9a3412"];
  for (const rx of [-13.2, 13.2]) {
    for (const pz of [2.5, 4.3]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), woodMat);
      post.position.set(rx, 1.25, pz);
      group.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), woodMat);
    bar.position.set(rx, 2.35, 3.4);
    group.add(bar);

    for (let f = 0; f < 4; f++) {
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.25, 0.42),
        new THREE.MeshStandardMaterial({
          color: fabricColors[(f + (rx > 0 ? 2 : 0)) % fabricColors.length],
          roughness: 0.78,
        })
      );
      cloth.position.set(rx, 1.65, 2.75 + f * 0.44);
      cloth.castShadow = true;
      group.add(cloth);
    }
  }

  // Stacked tomato/pepper wooden crates along the front aisle
  for (const cx of [-8.2, -3.2, 3.2, 8.2]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.46, 0.65), crateMat);
    crate.position.set(cx, 0.36, 9.75);
    crate.castShadow = true;
    group.add(crate);
  }

  return group;
}

/**
 * Tamale High Street Multi-Story Commercial Office + Jubilee Park Ceremonial Precinct
 * Modeled from tamale_office_building.jpg
 */
export function createJubileeAndOfficeGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const whiteConcrete = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    color: "#f8fafc",
    roughness: 0.72,
  });
  const skyBlueMat = new THREE.MeshStandardMaterial({
    color: "#60a5fa",
    roughness: 0.65,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#1e3a5f",
    roughness: 0.15,
    metalness: 0.7,
  });
  const paverMat = new THREE.MeshStandardMaterial({
    map: textures.paverBrick,
    roughness: 0.88,
  });

  // Interlocking brick forecourt
  const forecourt = new THREE.Mesh(new THREE.BoxGeometry(24, 0.16, 22), paverMat);
  forecourt.position.y = 0.08;
  forecourt.receiveShadow = true;
  group.add(forecourt);

  // Main 4-story building (white wings + sky-blue center bay from tamale_office_building.jpg)
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(16.5, 10.5, 9.5), whiteConcrete);
  mainBody.position.set(0, 5.4, -3.5);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  const blueBay = new THREE.Mesh(new THREE.BoxGeometry(8.2, 10.6, 9.7), skyBlueMat);
  blueBay.position.set(0, 5.45, -3.4);
  blueBay.castShadow = true;
  group.add(blueBay);

  // Recessed grid windows across floors
  for (let floor = 0; floor < 3; floor++) {
    const wy = 3.6 + floor * 2.5;
    for (const wx of [-6.0, -4.6, -2.1, -0.7, 0.7, 2.1, 4.6, 6.0]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.15), glassMat);
      win.position.set(wx, wy, 1.48);
      group.add(win);
    }
  }

  // Ground glass portico + overhang
  const portico = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.24, 2.4), whiteConcrete);
  portico.position.set(0, 2.75, 2.2);
  portico.castShadow = true;
  group.add(portico);

  // Gatehouse + perimeter white/blue fence
  const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 3.2), skyBlueMat);
  gatehouse.position.set(-7.5, 1.5, 7.6);
  gatehouse.castShadow = true;
  group.add(gatehouse);

  const fenceRight = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.8, 0.35), whiteConcrete);
  fenceRight.position.set(5.8, 1.0, 9.2);
  fenceRight.castShadow = true;
  group.add(fenceRight);

  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.4, 0.16),
    new THREE.MeshStandardMaterial({ map: textures.officeSign, roughness: 0.45 })
  );
  signMesh.position.set(5.8, 2.4, 9.2);
  group.add(signMesh);

  // Jubilee Park Ceremonial Dais & Monument beside the avenue
  const parkGround = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.14, 18),
    new THREE.MeshStandardMaterial({ color: "#4d7c3f", roughness: 0.92 })
  );
  parkGround.position.set(0, 0.07, 22);
  parkGround.receiveShadow = true;
  group.add(parkGround);

  const monumentPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.5, 1.1, 8),
    whiteConcrete
  );
  monumentPlinth.position.set(0, 0.65, 22);
  monumentPlinth.castShadow = true;
  const monumentShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.65, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.5 })
  );
  monumentShaft.position.set(0, 3.2, 22);
  monumentShaft.castShadow = true;
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: "#eab308", metalness: 0.85, roughness: 0.25 })
  );
  star.position.set(0, 5.7, 22);
  group.add(monumentPlinth, monumentShaft, star);

  return group;
}

export function createCulturalCentreGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const earthMat = new THREE.MeshStandardMaterial({
    map: textures.earthPlaster,
    roughness: 0.92,
  });
  const thatchMat = new THREE.MeshStandardMaterial({
    map: textures.thatchRoof,
    roughness: 0.94,
  });
  const timberMat = new THREE.MeshStandardMaterial({ color: "#5c3a21", roughness: 0.85 });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.2, 18),
    new THREE.MeshStandardMaterial({ map: textures.lateriteGround, roughness: 0.94 })
  );
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  group.add(floor);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(12, 4.0, 7.5), earthMat);
  hall.position.set(-2.5, 2.1, -3.5);
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  const pavilionBase = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.4, 16), earthMat);
  pavilionBase.position.set(4.5, 0.4, 2.5);
  group.add(pavilionBase);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.0, 8), timberMat);
    post.position.set(4.5 + Math.cos(ang) * 3.6, 1.9, 2.5 + Math.sin(ang) * 3.6);
    post.castShadow = true;
    group.add(post);
  }

  const coneRoof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 2.8, 16), thatchMat);
  coneRoof.position.set(4.5, 4.7, 2.5);
  coneRoof.castShadow = true;
  group.add(coneRoof);

  for (const dx of [3.8, 5.2]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 10), timberMat);
    drum.position.set(dx, 0.92, 2.5);
    drum.castShadow = true;
    group.add(drum);
  }

  return group;
}

/**
 * Authentic Northern Ghanaian Compound House modeled from northern_clay_compound.jpg
 */
export function createCompoundGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const earthMat = new THREE.MeshStandardMaterial({ map: textures.earthPlaster, roughness: 0.92 });
  const thatchMat = new THREE.MeshStandardMaterial({ map: textures.thatchRoof, roughness: 0.96 });
  const zincMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    roughness: 0.6,
    metalness: 0.5,
  });

  // Swept compound perimeter
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 0.45), earthMat);
  wallBack.position.set(0, 0.9, -7.2);
  wallBack.castShadow = true;
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.8, 14), earthMat);
  wallLeft.position.set(-7.6, 0.9, -0.2);
  wallLeft.castShadow = true;
  group.add(wallBack, wallLeft);

  // Three circular huts with overhanging conical grass thatch
  for (const [hx, hz, r] of [
    [-4.2, -3.5, 2.6],
    [1.6, -4.1, 2.4],
    [5.8, -1.6, 2.5],
  ]) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.1, 2.5, 16), earthMat);
    cyl.position.set(hx, 1.25, hz);
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    group.add(cyl);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 0.68, 2.15, 16), thatchMat);
    roof.position.set(hx, 3.45, hz);
    roof.castShadow = true;
    group.add(roof);
  }

  // Rectangular concrete-and-zinc extension room
  const modRoom = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 2.8, 4.2),
    new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#dfd5c3", roughness: 0.86 })
  );
  modRoom.position.set(-4.0, 1.4, 3.4);
  modRoom.castShadow = true;
  const modRoof = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.15, 4.7), zincMat);
  modRoof.position.set(-4.0, 2.88, 3.4);
  modRoof.rotation.z = 0.06;
  modRoof.castShadow = true;
  group.add(modRoom, modRoof);

  // Courtyard firewood stack (as seen in northern_clay_compound.jpg)
  const woodMat = new THREE.MeshStandardMaterial({ color: "#6e4e34", roughness: 0.95 });
  for (let i = 0; i < 6; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.6, 6), woodMat);
    log.position.set(0.5 + (i % 3) * 0.25, 0.18 + Math.floor(i / 3) * 0.15, 2.2);
    log.rotation.z = Math.PI / 2 - 0.12;
    log.rotation.y = (i - 2) * 0.18;
    group.add(log);
  }

  return group;
}

export function createSchoolGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    bumpMap: textures.concreteBump,
    bumpScale: 0.02,
    color: "#f3ead8",
    roughness: 0.82,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.75 });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    color: "#9a3412",
    roughness: 0.55,
    metalness: 0.45,
  });

  const block = new THREE.Mesh(new THREE.BoxGeometry(18, 3.6, 7), wallMat);
  block.position.set(0, 1.8, -3);
  block.castShadow = true;
  block.receiveShadow = true;
  group.add(block);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.25, 8.6), roofMat);
  roof.position.set(0, 3.72, -2.6);
  roof.rotation.x = 0.08;
  roof.castShadow = true;
  group.add(roof);

  for (let px = -7.5; px <= 7.5; px += 3.0) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.4, 0.32), trimMat);
    col.position.set(px, 1.7, 1.2);
    col.castShadow = true;
    group.add(col);
  }

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8),
    new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.3 })
  );
  pole.position.set(-7, 3.1, 6.5);
  group.add(pole);

  const stripeGeo = new THREE.BoxGeometry(1.4, 0.28, 0.04);
  const red = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: "#dc2626" }));
  red.position.set(-6.25, 5.85, 6.5);
  const gold = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: "#eab308" }));
  gold.position.set(-6.25, 5.57, 6.5);
  const green = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: "#15803d" }));
  green.position.set(-6.25, 5.29, 6.5);
  group.add(red, gold, green);

  return group;
}

/**
 * Detailed Tamale Commercial Shopfront (windows, shutters, zinc gable roof, signboard, rooftop Polytank)
 */
export type ShopArchitecturalStyle =
  | "default"
  | "fast_food"
  | "supermarket"
  | "restaurant"
  | "cafe"
  | "salon"
  | "mechanic"
  | "electronics"
  | "boutique"
  | "bank_momo"
  | "ice_cream"
  | "nightclub";

/**
 * Detailed Tamale Commercial Shopfront (windows, shutters, zinc gable roof, signboard, architectural style props)
 */
export function createShopBuilding(
  width: number,
  height: number,
  depth: number,
  wallColor: string,
  awningColor: string,
  shopName: string,
  shopSub: string,
  textures: ProceduralTextureSet,
  style: ShopArchitecturalStyle = "default"
): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    bumpMap: textures.concreteBump,
    bumpScale: 0.02,
    color: wallColor,
    roughness: 0.84,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    roughness: 0.54,
    metalness: 0.52,
  });
  const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.72 });
  const doorMat = new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.65, roughness: 0.45 });
  const litGlass =
    style === "supermarket" ||
    style === "fast_food" ||
    style === "electronics" ||
    style === "boutique" ||
    style === "ice_cream" ||
    style === "bank_momo";
  const glassFrontMat = new THREE.MeshStandardMaterial({
    color: litGlass ? "#bae6fd" : "#1e293b",
    emissive:
      style === "electronics"
        ? "#0ea5e9"
        : style === "boutique"
        ? "#f472b6"
        : style === "ice_cream"
        ? "#fde047"
        : litGlass
        ? "#0284c7"
        : "#000000",
    emissiveIntensity: litGlass ? 0.28 : 0,
    roughness: 0.16,
    metalness: 0.45,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.16, depth + 0.7), roofMat);
  roof.position.y = height + 0.08;
  roof.rotation.x = 0.06;
  roof.castShadow = true;
  group.add(roof);

  // Front door (wide glass doors for modern retail/bank/electronics, roller-shutter otherwise)
  const doorW = style === "supermarket" || style === "bank_momo" ? 2.4 : 1.5;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, 2.35, 0.12),
    litGlass ? glassFrontMat : doorMat
  );
  door.position.set(0, 1.18, depth / 2 + 0.03);
  group.add(door);

  for (const wx of [-width * 0.34, width * 0.34]) {
    const winW = style === "supermarket" || style === "boutique" || style === "electronics" ? 1.85 : 1.15;
    const win = new THREE.Mesh(new THREE.BoxGeometry(winW, 1.2, 0.1), glassFrontMat);
    win.position.set(wx, 1.75, depth / 2 + 0.03);
    group.add(win);
  }

  const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.1, 1.8), awningMat);
  awning.position.set(0, 2.75, depth / 2 + 0.85);
  awning.rotation.x = 0.22;
  awning.castShadow = true;
  group.add(awning);

  // Ghanaian shop signboard fascia
  const signTex = createShopSignTexture(shopName, shopSub, awningColor, "#fef08a");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.82, 0.82, 0.12),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(0, height - 0.12, depth / 2 + 0.1);
  group.add(sign);

  // Style-specific sidewalk atmosphere & exterior fixtures
  if (style === "fast_food" || style === "cafe" || style === "restaurant" || style === "ice_cream") {
    const tableMat = new THREE.MeshStandardMaterial({
      color: style === "ice_cream" ? "#f8fafc" : "#78350f",
      roughness: 0.72,
    });
    const patioUmbrellaMat = new THREE.MeshStandardMaterial({
      color: awningColor,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    for (const tx of [-width * 0.28, width * 0.28]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), tableMat);
      table.position.set(tx, 0.75, depth / 2 + 2.15);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.35, 8), doorMat);
      leg.position.set(tx, 1.18, depth / 2 + 2.15);
      const umb = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.42, 8), patioUmbrellaMat);
      umb.position.set(tx, 2.42, depth / 2 + 2.15);
      umb.castShadow = true;
      group.add(table, leg, umb);
    }
    if (style === "ice_cream") {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.7, 10),
        new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.8 })
      );
      cone.rotation.x = Math.PI;
      cone.position.set(-width * 0.44, 0.65, depth / 2 + 0.65);
      const scoop = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 10, 10),
        new THREE.MeshStandardMaterial({ color: "#f472b6", roughness: 0.45 })
      );
      scoop.position.set(-width * 0.44, 1.05, depth / 2 + 0.65);
      group.add(cone, scoop);
    }
  } else if (style === "salon") {
    const poleMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.3 });
    const barberStripe = new THREE.MeshStandardMaterial({
      color: "#dc2626",
      emissive: "#dc2626",
      emissiveIntensity: 0.25,
    });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 10), poleMat);
    post.position.set(width * 0.42, 1.85, depth / 2 + 0.22);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 10), barberStripe);
    band.position.set(width * 0.42, 1.85, depth / 2 + 0.22);
    group.add(post, band);
  } else if (style === "mechanic") {
    const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.92 });
    const drumMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.5, metalness: 0.4 });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.85, 12), drumMat);
    drum.position.set(-width * 0.4, 0.425, depth / 2 + 0.75);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 14), tireMat);
    tire.position.set(width * 0.4, 0.4, depth / 2 + 0.65);
    group.add(drum, tire);
  } else if (style === "electronics") {
    const panelMat = new THREE.MeshStandardMaterial({
      color: "#1e3a8a",
      metalness: 0.65,
      roughness: 0.25,
    });
    const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.3), panelMat);
    solarPanel.position.set(-width * 0.22, height + 0.42, 0.2);
    solarPanel.rotation.x = 0.35;
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.35, 0.42),
      new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.45 })
    );
    rack.position.set(-width * 0.38, 0.68, depth / 2 + 0.52);
    group.add(solarPanel, rack);
  } else if (style === "boutique") {
    const rackMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.75, roughness: 0.3 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), rackMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(width * 0.32, 1.3, depth / 2 + 0.62);
    for (const dx of [-0.4, 0, 0.4]) {
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.75, 0.18),
        new THREE.MeshStandardMaterial({
          color: dx < 0 ? "#ec4899" : dx === 0 ? "#eab308" : "#0284c7",
          roughness: 0.78,
        })
      );
      cloth.position.set(width * 0.32 + dx, 0.9, depth / 2 + 0.62);
      group.add(cloth);
    }
    group.add(bar);
  } else if (style === "bank_momo") {
    const atm = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 1.55, 0.38),
      new THREE.MeshStandardMaterial({ color: "#0369a1", roughness: 0.35, metalness: 0.5 })
    );
    atm.position.set(-width * 0.36, 0.95, depth / 2 + 0.22);
    const atmScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.34, 0.05),
      new THREE.MeshStandardMaterial({
        color: "#7dd3fc",
        emissive: "#38bdf8",
        emissiveIntensity: 0.65,
      })
    );
    atmScreen.position.set(-width * 0.36, 1.25, depth / 2 + 0.42);
    group.add(atm, atmScreen);
  } else if (style === "nightclub") {
    const neonMat = new THREE.MeshStandardMaterial({
      color: awningColor,
      emissive: awningColor,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const marqueeBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.14, 0.16), neonMat);
    marqueeBar.position.set(0, 2.84, depth / 2 + 1.65);
    const vipStep = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 1.25),
      new THREE.MeshStandardMaterial({ color: "#991b1b", roughness: 0.85 })
    );
    vipStep.position.set(0, 0.04, depth / 2 + 0.65);
    const speakerMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.65 });
    for (const sx of [-1.85, 1.85]) {
      const spk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.45), speakerMat);
      spk.position.set(sx, 0.54, depth / 2 + 0.4);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), neonMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(sx, 0.68, depth / 2 + 0.63);
      group.add(spk, cone);
    }
    group.add(marqueeBar, vipStep);
  }

  return group;
}

export function createUtilityPoleWithLamp(): {
  group: THREE.Group;
  bulbMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: "#6b5a4b",
    roughness: 0.9,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: "#64748b",
    roughness: 0.4,
    metalness: 0.75,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: "#fef3c7",
    emissive: "#f59e0b",
    emissiveIntensity: 0.15,
    roughness: 0.2,
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 6.2, 8), poleMat);
  pole.position.y = 3.1;
  pole.castShadow = true;
  group.add(pole);

  // Twin ECG utility crossarms
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), metalMat);
  crossArm.position.set(0, 5.8, 0);
  group.add(crossArm);

  // Streetlamp arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.1), metalMat);
  arm.position.set(0, 5.1, 0.5);
  group.add(arm);

  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.48), bulbMat);
  lantern.position.set(0, 5.0, 0.94);
  group.add(lantern);

  return { group, bulbMat };
}

/**
 * Dakpema Chief's Palace & Regional House of Chiefs hall
 * Modeled from regional_house_of_chiefs.jpg
 */
export function createDakpemaPalaceGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const creamMat = new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#efeae0", roughness: 0.78 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: "#3f4651", roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    color: "#7f2b2b",
    roughness: 0.52,
    metalness: 0.48,
  });
  const paverMat = new THREE.MeshStandardMaterial({ map: textures.paverBrick, color: "#dfd3be", roughness: 0.88 });

  const plaza = new THREE.Mesh(new THREE.BoxGeometry(28, 0.18, 22), paverMat);
  plaza.position.y = 0.09;
  plaza.receiveShadow = true;
  group.add(plaza);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 4.4, 10), creamMat);
  hall.position.set(0, 2.38, -3.5);
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.9, 10.2), plinthMat);
  plinth.position.set(0, 0.6, -3.5);
  group.add(plinth);

  const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(23.5, 0.25, 12.2), roofMat);
  mainRoof.position.set(0, 4.95, -3.5);
  mainRoof.rotation.x = 0.12;
  mainRoof.castShadow = true;
  group.add(mainRoof);

  // Central gable clerestory & entrance portico with twin charcoal columns
  const porticoRoof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.2, 4), roofMat);
  porticoRoof.rotation.y = Math.PI / 4;
  porticoRoof.position.set(0, 5.1, 3.0);
  porticoRoof.castShadow = true;
  group.add(porticoRoof);

  const pediment = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.4, 0.4), creamMat);
  pediment.position.set(0, 3.7, 3.8);
  group.add(pediment);

  for (const cx of [-2.8, -2.3, 2.3, 2.8]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.3, 12), plinthMat);
    col.position.set(cx, 1.85, 3.8);
    col.castShadow = true;
    group.add(col);
  }

  const signTex = createShopSignTexture("DAKPUMA YILI · PALACE", "DAGBON TRADITIONAL COUNCIL", "#7f2b2b", "#fbbf24");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.0, 0.15),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(0, 3.7, 4.05);
  group.add(sign);

  return group;
}

/**
 * Tamale Teaching Hospital reconstructed from tamale_teaching_hospital.jpg:
 * Multi-storey peach/terracotta block with ribbon louvers, low outpatient wing, and iconic open steel staircase tower.
 */
export function createTeachingHospitalGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const peachMat = new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#deb597", roughness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.65 });
  const steelMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.72, roughness: 0.32 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#1e3a5f", roughness: 0.16, metalness: 0.6 });
  const roofRedMat = new THREE.MeshStandardMaterial({ color: "#991b1b", roughness: 0.52, metalness: 0.4 });

  const lot = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.16, 26),
    new THREE.MeshStandardMaterial({ map: textures.asphaltRoad, roughness: 0.9 })
  );
  lot.position.y = 0.08;
  lot.receiveShadow = true;
  group.add(lot);

  // Main 4-storey hospital ward block
  const mainWard = new THREE.Mesh(new THREE.BoxGeometry(26, 10.5, 9), peachMat);
  mainWard.position.set(0, 5.4, -5.5);
  mainWard.castShadow = true;
  mainWard.receiveShadow = true;
  group.add(mainWard);

  for (let fl = 0; fl < 3; fl++) {
    const wy = 3.6 + fl * 2.5;
    const band = new THREE.Mesh(new THREE.BoxGeometry(24.5, 1.0, 0.16), glassMat);
    band.position.set(0, wy, -0.95);
    group.add(band);

    const louver = new THREE.Mesh(new THREE.BoxGeometry(24.8, 0.16, 0.55), trimMat);
    louver.position.set(0, wy + 0.62, -0.75);
    group.add(louver);
  }

  // Low foreground outpatient wing
  const opdWing = new THREE.Mesh(new THREE.BoxGeometry(26, 3.0, 4.8), peachMat);
  opdWing.position.set(0, 1.65, 1.4);
  opdWing.castShadow = true;
  group.add(opdWing);

  // Signature exterior open-frame steel staircase tower (from tamale_teaching_hospital.jpg!)
  for (const sx of [2.5, 8.5]) {
    for (const sz of [-0.5, 5.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 12.2, 10), steelMat);
      col.position.set(sx, 6.2, sz);
      col.castShadow = true;
      group.add(col);
    }
  }
  for (const py of [3.4, 6.6, 9.6]) {
    const landing = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 6.4), steelMat);
    landing.position.set(5.5, py, 2.5);
    landing.castShadow = true;
    group.add(landing);
  }
  const towerRoof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.22, 7.2), roofRedMat);
  towerRoof.position.set(5.5, 12.4, 2.5);
  towerRoof.rotation.x = 0.08;
  towerRoof.castShadow = true;
  group.add(towerRoof);

  const signTex = createShopSignTexture("TAMALE TEACHING HOSPITAL", "CHANGLI · NORTHERN REGION", "#0f766e", "#f8fafc");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 1.3, 0.16),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(-5.5, 3.6, 3.9);
  group.add(sign);

  return group;
}

/**
 * Aliu Mahama Sports Stadium reconstructed from aliu_mahama_stadium.jpg:
 * Circular white precast concrete buttresses, exposed white steel truss roof ring, and NE-2 gatehouse.
 */
export function createStadiumGroup(textures: ProceduralTextureSet): {
  group: THREE.Group;
  floodlightMats: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const floodlightMats: THREE.MeshStandardMaterial[] = [];

  const concreteMat = new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#f1f5f9", roughness: 0.72 });
  const darkBowlMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.65, roughness: 0.3 });
  const pitchMat = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.9 });

  const pitch = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.18, 28), pitchMat);
  pitch.position.y = 0.09;
  pitch.receiveShadow = true;
  group.add(pitch);

  // Outer seating bowl wall
  const bowlWall = new THREE.Mesh(
    new THREE.CylinderGeometry(20.5, 19.5, 7.6, 28, 1, true),
    darkBowlMat
  );
  bowlWall.position.y = 3.9;
  group.add(bowlWall);

  // White precast concrete radial buttress ribs around perimeter
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8.6, 1.6), concreteMat);
    rib.position.set(Math.sin(ang) * 20.6, 4.3, Math.cos(ang) * 20.6);
    rib.rotation.y = ang;
    rib.castShadow = true;
    group.add(rib);
  }

  // Exposed steel truss roof canopy ring
  const roofRing = new THREE.Mesh(new THREE.TorusGeometry(19.2, 1.15, 8, 32), steelMat);
  roofRing.rotation.x = Math.PI / 2;
  roofRing.position.y = 9.4;
  roofRing.scale.set(1, 1, 0.35);
  roofRing.castShadow = true;
  group.add(roofRing);

  // Gatehouse (peach/teal like NE 2 in photo) + floodlight masts
  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 2.8, 3.2),
    new THREE.MeshStandardMaterial({ color: "#e6b89c", roughness: 0.82 })
  );
  gate.position.set(0, 1.4, 22.8);
  gate.castShadow = true;
  group.add(gate);

  const signTex = createShopSignTexture("ALIU MAHAMA STADIUM", "SAGNARIGU RD · TAMALE", "#1e3a5f", "#facc15");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 1.1, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(0, 3.2, 24.4);
  group.add(sign);

  for (const ang of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
    const mat = new THREE.MeshStandardMaterial({
      color: "#fef9c3",
      emissive: "#fde047",
      emissiveIntensity: 0.2,
    });
    const pod = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.5), mat);
    pod.position.set(Math.sin(ang) * 19.5, 11.2, Math.cos(ang) * 19.5);
    pod.rotation.y = ang;
    group.add(pod);
    floodlightMats.push(mat);
  }

  return { group, floodlightMats };
}

/**
 * Tamale International Airport Terminal & Runway Apron modeled from tamale_airport_terminal.jpg
 */
export function createAirportGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const tanMat = new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#c2ab8e", roughness: 0.78 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#2d241c", roughness: 0.12, metalness: 0.72 });
  const runwayMat = new THREE.MeshStandardMaterial({ map: textures.asphaltRoad, roughness: 0.85 });

  // Apron & runway strip behind terminal
  const tarmac = new THREE.Mesh(new THREE.BoxGeometry(58, 0.16, 26), runwayMat);
  tarmac.position.set(0, 0.08, -10);
  tarmac.receiveShadow = true;
  group.add(tarmac);

  // Main terminal hall
  const hall = new THREE.Mesh(new THREE.BoxGeometry(26, 5.2, 9), tanMat);
  hall.position.set(0, 2.75, -1);
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  // Cantilevered canopy & tapered V-pillars (signature tamale_airport_terminal.jpg geometry!)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.8, 7.5), tanMat);
  canopy.position.set(0, 5.8, 4.5);
  canopy.castShadow = true;
  group.add(canopy);

  for (const px of [-5.2, 5.2]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.26, 5.5, 6), tanMat);
    pillar.position.set(px, 2.9, 6.8);
    pillar.castShadow = true;
    group.add(pillar);
  }

  const glassWall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 4.4, 0.2), glassMat);
  glassWall.position.set(0, 2.4, 3.6);
  group.add(glassWall);

  const depTex = createShopSignTexture("DEPARTURES / DÉPARTS", "TAMALE INTL AIRPORT", "#eab308", "#18181b", "#18181b");
  const depSign = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.0, 0.16),
    new THREE.MeshStandardMaterial({ map: depTex, roughness: 0.45 })
  );
  depSign.position.set(0, 3.1, 3.8);
  group.add(depSign);

  // Control tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 11.5, 3.4), tanMat);
  tower.position.set(16, 5.9, -4);
  tower.castShadow = true;
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.0, 2.2, 8), glassMat);
  cab.position.set(16, 12.6, -4);
  group.add(tower, cab);

  // Parked aircraft silhouette on tarmac
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.0, 14, 12),
    new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.35 })
  );
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(-14, 1.8, -14);
  fuselage.castShadow = true;
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.2, 2.4),
    new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.4 })
  );
  wing.position.set(-14, 1.7, -14);
  wing.castShadow = true;
  group.add(fuselage, wing);

  return group;
}

/**
 * SCCA Tamale & Red Clay Studio Gallery modeled from scca_tamale.jpg & red_clay_studio.jpg
 */
export function createSccaRedClayGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const brickMat = new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#9a462b", roughness: 0.86 });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    color: "#7f1d1d",
    roughness: 0.5,
    metalness: 0.45,
  });
  const foilArtMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.72, roughness: 0.32 });
  const paverMat = new THREE.MeshStandardMaterial({ map: textures.paverBrick, roughness: 0.88 });

  const courtyard = new THREE.Mesh(new THREE.BoxGeometry(28, 0.16, 24), paverMat);
  courtyard.position.y = 0.08;
  courtyard.receiveShadow = true;
  group.add(courtyard);

  const gallery = new THREE.Mesh(new THREE.BoxGeometry(20, 6.2, 10.5), brickMat);
  gallery.position.set(0, 3.25, -4);
  gallery.castShadow = true;
  gallery.receiveShadow = true;
  group.add(gallery);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.25, 12.2), roofMat);
  roof.position.set(0, 6.65, -4);
  roof.rotation.x = 0.1;
  roof.castShadow = true;
  group.add(roof);

  // Shimmering metallic woven relief panels across upper gallery facade (from scca_tamale.jpg!)
  for (const fx of [-4.6, 0, 4.6]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.3, 0.18), foilArtMat);
    panel.position.set(fx, 4.5, 1.32);
    group.add(panel);
  }

  const signTex = createShopSignTexture("SCCA TAMALE", "RED CLAY ART PRECINCT", "#1c1917", "#dc2626");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.2, 0.15),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(-7.2, 2.2, 1.35);
  group.add(sign);

  // Outdoor sculptural earth mound & steel frame (Red Clay courtyard element)
  const earthMound = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3.2, 1.8, 12),
    new THREE.MeshStandardMaterial({ map: textures.earthPlaster, color: "#9c4d2e", roughness: 0.92 })
  );
  earthMound.position.set(6.5, 1.0, 6.8);
  earthMound.castShadow = true;
  group.add(earthMound);

  return group;
}

/**
 * Kukuo Market & Earthen Pottery Centre
 */
export function createKukuoPotteryGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const clayMat = new THREE.MeshStandardMaterial({ map: textures.earthPlaster, color: "#b45a35", roughness: 0.85 });
  const zincMat = new THREE.MeshStandardMaterial({ map: textures.zincRoof, bumpMap: textures.zincBump, bumpScale: 0.04, roughness: 0.62, metalness: 0.45 });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.9 });

  const yard = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.14, 20),
    new THREE.MeshStandardMaterial({ map: textures.lateriteGround, roughness: 0.94 })
  );
  yard.position.y = 0.07;
  yard.receiveShadow = true;
  group.add(yard);

  // Market & drying shed
  for (const px of [-8, 0, 8]) {
    for (const pz of [-6, -2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.0, 0.22), woodMat);
      post.position.set(px, 1.5, pz);
      post.castShadow = true;
      group.add(post);
    }
  }
  const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(19, 0.14, 6.5), zincMat);
  shedRoof.position.set(0, 3.1, -4);
  shedRoof.rotation.x = 0.08;
  shedRoof.castShadow = true;
  group.add(shedRoof);

  // Rows of spherical clay water pots (duɣu) drying in the sun
  for (let row = 0; row < 2; row++) {
    for (let col = -3; col <= 3; col++) {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), clayMat);
      pot.position.set(col * 1.4, 0.48, 2.5 + row * 2.2);
      pot.scale.set(1, 0.92, 1);
      pot.castShadow = true;
      group.add(pot);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12), clayMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(col * 1.4, 0.86, 2.5 + row * 2.2);
      group.add(rim);
    }
  }

  // Earthen firing mound
  const kiln = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.5, 14), clayMat);
  kiln.position.set(7.5, 0.8, 5.5);
  kiln.castShadow = true;
  group.add(kiln);

  const signTex = createShopSignTexture("KUKUO POTTERY & MARKET", "HAND-FIRED DUƔU CLAY POTS", "#9a3412", "#fde68a");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.2, 0.15),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(0, 3.6, -0.7);
  group.add(sign);

  return group;
}

/**
 * Gunayili Cattle & Timber Yard (Lumber stacks, shaded stalls, livestock corral)
 */
export function createLivestockTimberGroup(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: "#784f2a", roughness: 0.9 });
  const plankMat = new THREE.MeshStandardMaterial({ color: "#b07d4f", roughness: 0.85 });
  const zincMat = new THREE.MeshStandardMaterial({ map: textures.zincRoof, roughness: 0.65, metalness: 0.45 });

  // Wooden livestock corral fences
  for (const fx of [-9, 1]) {
    const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 10), woodMat);
    fSide.position.set(fx, 0.6, 0);
    fSide.castShadow = true;
    group.add(fSide);
  }
  for (const fz of [-5, 5]) {
    const fEnd = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 0.22), woodMat);
    fEnd.position.set(-4, 0.6, fz);
    fEnd.castShadow = true;
    group.add(fEnd);
  }

  // Stacked timber planks under open zinc shed
  const shed = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 7), zincMat);
  shed.position.set(8, 3.1, 0);
  shed.castShadow = true;
  group.add(shed);

  for (let i = 0; i < 4; i++) {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.4), plankMat);
    stack.position.set(6.5 + (i % 2) * 3.4, 0.45, -2 + Math.floor(i / 2) * 3.5);
    stack.castShadow = true;
    group.add(stack);
  }

  const signTex = createShopSignTexture("GUNAYILI CATTLE & TIMBER", "EASTERN RING MARKET", "#3f6212", "#fef08a");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 1.1, 0.15),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45 })
  );
  sign.position.set(2, 3.6, 5.2);
  group.add(sign);

  return group;
}

export type TamaleHouseVariant =
  | "modern_gated"
  | "multi_storey_apt"
  | "uncompleted_build"
  | "mechanic_timber_bay";

/**
 * Distinct Tamale Residential & Neighbourhood Buildings (Section 3 architectural diversity)
 */
export function createTamaleHouseVariant(
  variant: TamaleHouseVariant,
  textures: ProceduralTextureSet,
  primaryHex = "#d1fae5",
  accentHex = "#15803d"
): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    bumpMap: textures.concreteBump,
    bumpScale: 0.02,
    color: primaryHex,
    roughness: 0.84,
  });
  const zincMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoof,
    bumpMap: textures.zincBump,
    bumpScale: 0.04,
    color: accentHex,
    roughness: 0.55,
    metalness: 0.48,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.2, metalness: 0.5 });

  if (variant === "modern_gated") {
    // Modeled from grnma_tamale_building.jpg: walled house, green gate, Polytank stand
    const house = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 7.5), concreteMat);
    house.position.set(0, 1.8, -1.5);
    house.castShadow = true;
    house.receiveShadow = true;
    group.add(house);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 1.9, 4), zincMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 4.5, -1.5);
    roof.castShadow = true;
    group.add(roof);

    const fenceFrontL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 0.28), concreteMat);
    fenceFrontL.position.set(-4.2, 0.9, 5.2);
    const fenceFrontR = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 0.28), concreteMat);
    fenceFrontR.position.set(4.2, 0.9, 5.2);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.7, 0.16), zincMat);
    gate.position.set(0, 0.85, 5.2);
    group.add(fenceFrontL, fenceFrontR, gate);

    // Elevated black Polytank water storage tower
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.2, 1.5),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.8 })
    );
    stand.position.set(4.6, 1.1, -3.5);
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 1.5, 12),
      new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.45 })
    );
    tank.position.set(4.6, 2.95, -3.5);
    group.add(stand, tank);
  } else if (variant === "multi_storey_apt") {
    const block = new THREE.Mesh(new THREE.BoxGeometry(12, 6.8, 7.8), concreteMat);
    block.position.set(0, 3.4, 0);
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.2, 8.6), zincMat);
    roof.position.set(0, 6.9, 0);
    roof.rotation.x = 0.06;
    roof.castShadow = true;
    group.add(roof);

    for (const fy of [1.8, 4.9]) {
      for (const wx of [-4.0, -1.4, 1.4, 4.0]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.14), glassMat);
        win.position.set(wx, fy, 3.94);
        group.add(win);
      }
    }
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.18, 1.4), concreteMat);
    balcony.position.set(0, 3.5, 4.5);
    group.add(balcony);
  } else if (variant === "uncompleted_build") {
    // Raw gray sandcrete block walls + iron rebar rods (developing Gumani / Kalpohin houses)
    const sandcreteMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.94 });
    const rebarMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.6, metalness: 0.5 });

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(10, 2.8, 0.35), sandcreteMat);
    wallBack.position.set(0, 1.4, -3.5);
    wallBack.castShadow = true;
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 7), sandcreteMat);
    wallL.position.set(-4.8, 1.4, 0);
    wallL.castShadow = true;
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 7), sandcreteMat);
    wallR.position.set(4.8, 1.1, 0);
    wallR.castShadow = true;
    group.add(wallBack, wallL, wallR);

    for (const [rx, rz] of [[-4.8, -3.5], [4.8, -3.5], [-4.8, 3.5], [4.8, 3.5]]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.3, 0.42), sandcreteMat);
      col.position.set(rx, 1.65, rz);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), rebarMat);
      rod.position.set(rx, 3.65, rz);
      group.add(col, rod);
    }

    const blockStack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.4), sandcreteMat);
    blockStack.position.set(0, 0.45, 2.2);
    group.add(blockStack);
  } else {
    // Lamashegu Mechanic & Spare-Parts / Artisan Bay
    const bay = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 6.2), concreteMat);
    bay.position.set(0, 1.6, -1.2);
    bay.castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.16, 8.2), zincMat);
    roof.position.set(0, 3.35, -0.4);
    roof.rotation.x = 0.08;
    roof.castShadow = true;
    group.add(bay, roof);

    const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 8, 14), tireMat);
      tire.position.set(-3.2 + i * 0.55, 0.45, 3.1);
      group.add(tire);
    }
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: "#1d4ed8", roughness: 0.5 })
    );
    drum.position.set(3.4, 0.5, 3.0);
    group.add(drum);
  }

  return group;
}

/**
 * Floating 3D Landmark & Important Building Plate Sprite (English + Dagbani name)
 */
export function createLandmarkLabelSprite(
  title: string,
  subtitle: string,
  accentHex = "#f59e0b"
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dark rounded label card
  const r = 18;
  const w = canvas.width - 16;
  const h = canvas.height - 20;
  const x = 8;
  const y = 8;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = "rgba(18, 15, 12, 0.92)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.stroke();

  // Left accent bar
  ctx.fillStyle = accentHex;
  ctx.fillRect(x + 14, y + 20, 8, h - 40);

  // Title (English / Official Name)
  ctx.fillStyle = "#f8f5ef";
  ctx.font = "bold 28px Inter, system-ui, sans-serif";
  ctx.textBaseline = "top";
  const maxTitle = title.length > 29 ? `${title.slice(0, 27)}…` : title;
  ctx.fillText(maxTitle, x + 36, y + 22);

  // Subtitle (Dagbani Label / District)
  ctx.fillStyle = "#fbbf24";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  const maxSub = subtitle.length > 34 ? `${subtitle.slice(0, 32)}…` : subtitle;
  ctx.fillText(maxSub, x + 36, y + 62);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0);
  sprite.scale.set(11, 2.75, 1);
  return sprite;
}

/**
 * Compact 3D Speech Bubble Sprite above speaking market & street pedestrians
 */
export function createSpeechBubbleSprite(dagbani: string, english: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 440;
  canvas.height = 112;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const x = 8;
  const y = 6;
  const w = canvas.width - 16;
  const h = 84;
  const r = 16;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(canvas.width / 2 + 12, y + h);
  ctx.lineTo(canvas.width / 2, y + h + 16);
  ctx.lineTo(canvas.width / 2 - 12, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = "rgba(20, 17, 14, 0.94)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(245, 158, 11, 0.72)";
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 24px Inter, system-ui, sans-serif";
  const dText = dagbani.length > 30 ? `${dagbani.slice(0, 28)}…` : dagbani;
  ctx.fillText(dText, canvas.width / 2, y + 14);

  ctx.fillStyle = "#e5dfd5";
  ctx.font = "500 18px Inter, system-ui, sans-serif";
  const eText = english.length > 40 ? `${english.slice(0, 38)}…` : english;
  ctx.fillText(eText, canvas.width / 2, y + 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0);
  sprite.scale.set(3.9, 1.0, 1);
  return sprite;
}

/**
 * Green Ghanaian street/neighbourhood direction signposts at intersections
 */
export function createStreetDirectionSignMesh(
  title: string,
  sub: string,
  bgHex = "#065f46"
): THREE.Group {
  const group = new THREE.Group();
  const poleMat = getCachedCharMat(
    "street:pole",
    () => new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.7, roughness: 0.35 })
  );
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.8, 8), poleMat);
  pole.position.y = 1.4;
  pole.castShadow = true;
  group.add(pole);

  const tex = createShopSignTexture(title, sub, bgHex, "#f8fafc");
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.68, 0.08),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })
  );
  board.position.y = 2.65;
  board.castShadow = true;
  group.add(board);
  return group;
}

/**
 * Yellow-and-black asphalt speed hump on Tamale roads near markets, schools & hospital
 */
export function createSpeedHumpMesh(width = 9.0): THREE.Group {
  const group = new THREE.Group();
  const baseMat = getCachedCharMat(
    "hump:black",
    () => new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.88 })
  );
  const yellowMat = getCachedCharMat(
    "hump:yellow",
    () => new THREE.MeshStandardMaterial({ color: "#eab308", roughness: 0.72 })
  );
  const stripCount = 6;
  const segW = width / stripCount;
  for (let i = 0; i < stripCount; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(segW * 0.96, 0.09, 0.75),
      i % 2 === 0 ? yellowMat : baseMat
    );
    mesh.position.set(-width / 2 + segW * (i + 0.5), 0.045, 0);
    group.add(mesh);
  }
  return group;
}

/**
 * Concrete street planter or public waste bin along High Street & Civic plazas
 */
export function createRoadsidePlanterBinMesh(hasPlant: boolean): THREE.Group {
  const group = new THREE.Group();
  if (hasPlant) {
    const potMat = getCachedCharMat(
      "planter:pot",
      () => new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.86 })
    );
    const shrubMat = getCachedCharMat(
      "planter:leaf",
      () => new THREE.MeshStandardMaterial({ color: "#2f6b31", roughness: 0.82 })
    );
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.62, 10), potMat);
    pot.position.y = 0.31;
    pot.castShadow = true;
    const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), shrubMat);
    shrub.position.y = 0.78;
    shrub.scale.set(1, 0.85, 1);
    shrub.castShadow = true;
    group.add(pot, shrub);
  } else {
    const binMat = getCachedCharMat(
      "bin:green",
      () => new THREE.MeshStandardMaterial({ color: "#047857", roughness: 0.55 })
    );
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.82, 10), binMat);
    bin.position.y = 0.41;
    bin.castShadow = true;
    group.add(bin);
  }
  return group;
}

/**
 * Tamale Pragya / Taxi Transport Rank Shelter with shaded corrugated roof & waiting bench
 */
export function createBusStopShelterMesh(label: string, accentColor = "#0284c7"): THREE.Group {
  const group = new THREE.Group();
  const postMat = getCachedCharMat(
    "infra:steel",
    () => new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.6, roughness: 0.4 })
  );
  const roofMat = getCachedCharMat(
    `infra:roof:${accentColor}`,
    () => new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.55, metalness: 0.15 })
  );
  const benchMat = getCachedCharMat(
    "infra:wood",
    () => new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.85 })
  );

  for (const x of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 2.45, 8), postMat);
    post.position.set(x, 1.225, -0.55);
    post.castShadow = true;
    group.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.75), roofMat);
  roof.position.set(0, 2.48, 0.05);
  roof.rotation.x = 0.08;
  roof.castShadow = true;
  group.add(roof);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.44, 0.55), benchMat);
  bench.position.set(0, 0.22, -0.3);
  bench.castShadow = true;
  group.add(bench);

  const tex = createShopSignTexture(label, "PRAGYA & TAXI RANK", "#0f172a", "#fbbf24");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.52, 0.08),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })
  );
  sign.position.set(0, 2.75, 0.35);
  group.add(sign);

  return group;
}

/**
 * Weathered Tamale asphalt patch or concrete drainage culvert grate
 */
export function createSurfacePatchAndCulvertMesh(
  kind: "asphalt_patch" | "concrete_culvert"
): THREE.Group {
  const group = new THREE.Group();
  if (kind === "asphalt_patch") {
    const mat = getCachedCharMat(
      "infra:patch",
      () =>
        new THREE.MeshStandardMaterial({
          color: "#27272a",
          roughness: 0.95,
          polygonOffset: true,
          polygonOffsetFactor: -3,
        })
    );
    const patch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 1.8), mat);
    patch.position.y = 0.032;
    patch.receiveShadow = true;
    group.add(patch);
  } else {
    const concreteMat = getCachedCharMat(
      "infra:culvert",
      () => new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.88 })
    );
    const grateMat = getCachedCharMat(
      "infra:grate",
      () => new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.65, roughness: 0.5 })
    );
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.15), concreteMat);
    slab.position.y = 0.07;
    slab.receiveShadow = true;
    const grate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.62), grateMat);
    grate.position.y = 0.08;
    group.add(slab, grate);
  }
  return group;
}

/**
 * Rooftop solar panel array & elevated black water Polytank common across Tamale
 */
export function createPolytankAndSolarAddon(includeSolar = true): THREE.Group {
  const group = new THREE.Group();
  const standMat = getCachedCharMat(
    "infra:steel",
    () => new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.6, roughness: 0.4 })
  );
  const tankMat = getCachedCharMat(
    "infra:polytank",
    () => new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.55 })
  );
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.4), standMat);
  stand.position.y = 0.32;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.35, 12), tankMat);
  tank.position.y = 1.32;
  tank.castShadow = true;
  group.add(stand, tank);

  if (includeSolar) {
    const frameMat = standMat;
    const panelMat = getCachedCharMat(
      "infra:solar",
      () => new THREE.MeshStandardMaterial({ color: "#1e3a8a", metalness: 0.45, roughness: 0.25 })
    );
    const solar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.35), panelMat);
    solar.position.set(2.1, 0.38, 0);
    solar.rotation.x = 0.28;
    const mount = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.32, 0.9), frameMat);
    mount.position.set(2.1, 0.16, 0);
    group.add(mount, solar);
  }
  return group;
}

/**
 * Tamale Police Divisional Headquarters (Ghana Police Service navy/white fascia, vehicle bay, blue beacon & flag)
 */
export function createPoliceStationGroup(textures: ProceduralTextureSet): {
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ map: textures.concreteWall, color: "#f8fafc", roughness: 0.78 });
  const navyMat = new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.52, metalness: 0.2 });
  const roofMat = new THREE.MeshStandardMaterial({ map: textures.zincRoof, color: "#0f172a", roughness: 0.45, metalness: 0.52 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.16, metalness: 0.6 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: "#38bdf8",
    emissive: "#2563eb",
    emissiveIntensity: 1.15,
  });

  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(16.5, 0.14, 15.5),
    new THREE.MeshStandardMaterial({ map: textures.paverBrick, color: "#cbd5e1", roughness: 0.88 })
  );
  apron.position.y = 0.07;
  apron.receiveShadow = true;
  group.add(apron);

  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(10.6, 5.2, 13.6), wallMat);
  mainHall.position.set(0, 2.7, 0);
  mainHall.castShadow = true;
  mainHall.receiveShadow = true;
  group.add(mainHall);

  const band = new THREE.Mesh(new THREE.BoxGeometry(10.75, 0.85, 13.75), navyMat);
  band.position.set(0, 0.75, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.26, 14.4), roofMat);
  roof.position.set(0, 5.4, 0);
  roof.castShadow = true;
  group.add(band, roof);

  // West-facing Charge Office entrance portico + double glass doors
  const portico = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 4.6), navyMat);
  portico.position.set(-5.9, 3.25, 0);
  portico.castShadow = true;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.45, 2.2), glassMat);
  door.position.set(-5.32, 1.32, 0);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), beaconMat);
  beacon.position.set(-6.6, 3.65, 0);
  group.add(portico, door, beacon);

  const signTex = createShopSignTexture("GHANA POLICE SERVICE", "TAMALE DIVISIONAL HQ", "#1e3a8a", "#facc15");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.95, 5.8),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.42 })
  );
  sign.position.set(-5.4, 4.45, 0);
  group.add(sign);

  // Flagpole on station forecourt
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 6.2, 8),
    new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.3 })
  );
  pole.position.set(-6.8, 3.1, -4.5);
  group.add(pole);

  return { group, beaconMat };
}



