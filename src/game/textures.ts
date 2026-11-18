import * as THREE from "three";

export interface ProceduralTextureSet {
  lateriteGround: THREE.CanvasTexture;
  lateriteBump: THREE.CanvasTexture;
  asphaltRoad: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  earthPlaster: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  interchangeConcrete: THREE.CanvasTexture;
  zincRoof: THREE.CanvasTexture;
  zincBump: THREE.CanvasTexture;
  thatchRoof: THREE.CanvasTexture;
  paverBrick: THREE.CanvasTexture;
  batakariCloth: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  highwaySign: THREE.CanvasTexture;
  marketSign: THREE.CanvasTexture;
  officeSign: THREE.CanvasTexture;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createShopSignTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  accentHex: string,
  textHex = "#ffffff"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 160);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 512, 16);
  ctx.fillRect(0, 144, 512, 16);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 22, 496, 116);

  ctx.fillStyle = textHex;
  ctx.textAlign = "center";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(title, 256, 78);

  ctx.fillStyle = accentHex;
  ctx.font = "600 22px sans-serif";
  ctx.fillText(subtitle, 256, 116);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // 1. Authentic Tamale red-ochre laterite earth + bump map (modeled from street_tamale.jpg & yellow_yellow_tamale.jpg)
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = 512;
  groundCanvas.height = 512;
  const gCtx = groundCanvas.getContext("2d")!;
  gCtx.fillStyle = "#b5693c";
  gCtx.fillRect(0, 0, 512, 512);

  const gBumpCanvas = document.createElement("canvas");
  gBumpCanvas.width = 512;
  gBumpCanvas.height = 512;
  const gbCtx = gBumpCanvas.getContext("2d")!;
  gbCtx.fillStyle = "#808080";
  gbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 3.8;
    const shades = ["#9c532c", "#c67848", "#884524", "#d48d5d", "#a6643c", "#74623e"];
    gCtx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
    gCtx.globalAlpha = 0.28 + Math.random() * 0.38;
    gCtx.fillRect(x, y, r, r);

    const bVal = Math.floor(90 + Math.random() * 110);
    gbCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    gbCtx.globalAlpha = 0.35;
    gbCtx.fillRect(x, y, r, r);
  }
  gCtx.globalAlpha = 1;
  gbCtx.globalAlpha = 1;

  const lateriteGround = finalizeTexture(groundCanvas, 34, 34, maxAniso, true);
  const lateriteBump = finalizeTexture(gBumpCanvas, 34, 34, maxAniso, false);

  // 2. Sun-baked Tamale tarmac road with dusty laterite shoulders (modeled from street_tamale.jpg)
  const roadCanvas = document.createElement("canvas");
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext("2d")!;
  rCtx.fillStyle = "#4c4640"; // Warm sun-bleached dusty tarmac
  rCtx.fillRect(0, 0, 512, 512);

  const rBumpCanvas = document.createElement("canvas");
  rBumpCanvas.width = 512;
  rBumpCanvas.height = 512;
  const rbCtx = rBumpCanvas.getContext("2d")!;
  rbCtx.fillStyle = "#7c7c7c";
  rbCtx.fillRect(0, 0, 512, 512);

  // Tire wear tracks
  rCtx.fillStyle = "rgba(46, 43, 40, 0.42)";
  rCtx.fillRect(0, 125, 512, 85);
  rCtx.fillRect(0, 305, 512, 85);

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    rCtx.fillStyle = Math.random() > 0.5 ? "#5b534b" : "#3a3632";
    rCtx.fillRect(x, y, 2, 2);
    const bv = Math.floor(100 + Math.random() * 55);
    rbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    rbCtx.fillRect(x, y, 2, 2);
  }

  // Laterite dust gradient creeping inward from road edges
  const gradTop = rCtx.createLinearGradient(0, 0, 0, 68);
  gradTop.addColorStop(0, "rgba(181, 105, 60, 0.88)");
  gradTop.addColorStop(1, "rgba(181, 105, 60, 0)");
  rCtx.fillStyle = gradTop;
  rCtx.fillRect(0, 0, 512, 68);

  const gradBot = rCtx.createLinearGradient(0, 444, 0, 512);
  gradBot.addColorStop(0, "rgba(181, 105, 60, 0)");
  gradBot.addColorStop(1, "rgba(181, 105, 60, 0.88)");
  rCtx.fillStyle = gradBot;
  rCtx.fillRect(0, 444, 512, 68);

  // Subtle faded center lane paint
  rCtx.fillStyle = "rgba(240, 232, 214, 0.65)";
  for (let x = 20; x < 512; x += 128) {
    rCtx.fillRect(x, 252, 56, 8);
  }

  const asphaltRoad = finalizeTexture(roadCanvas, 8, 1, maxAniso, true);
  const asphaltBump = finalizeTexture(rBumpCanvas, 8, 1, maxAniso, false);

  // 3. Weathered clay & plaster compound texture (modeled from northern_clay_compound.jpg)
  const earthCanvas = document.createElement("canvas");
  earthCanvas.width = 512;
  earthCanvas.height = 512;
  const eCtx = earthCanvas.getContext("2d")!;
  eCtx.fillStyle = "#b89678";
  eCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) {
    eCtx.fillStyle = Math.random() > 0.5 ? "rgba(128,88,58,0.22)" : "rgba(215,192,168,0.2)";
    eCtx.fillRect(Math.random() * 512, Math.random() * 512, 5, 4);
  }
  // Exposed clay-soil wear near bottom of wall
  const clayWash = eCtx.createLinearGradient(0, 350, 0, 512);
  clayWash.addColorStop(0, "rgba(130, 74, 42, 0)");
  clayWash.addColorStop(1, "rgba(130, 74, 42, 0.7)");
  eCtx.fillStyle = clayWash;
  eCtx.fillRect(0, 350, 512, 162);
  const earthPlaster = finalizeTexture(earthCanvas, 2, 1, maxAniso, true);

  // 4. Painted cement-block wall with authentic Tamale lower-wall red dust splash patina
  const concCanvas = document.createElement("canvas");
  concCanvas.width = 512;
  concCanvas.height = 512;
  const cCtx = concCanvas.getContext("2d")!;
  cCtx.fillStyle = "#ebe5da";
  cCtx.fillRect(0, 0, 512, 512);

  const cBumpCanvas = document.createElement("canvas");
  cBumpCanvas.width = 512;
  cBumpCanvas.height = 512;
  const cbCtx = cBumpCanvas.getContext("2d")!;
  cbCtx.fillStyle = "#888888";
  cbCtx.fillRect(0, 0, 512, 512);

  cCtx.strokeStyle = "rgba(120, 110, 96, 0.18)";
  cCtx.lineWidth = 2;
  cbCtx.strokeStyle = "#666666";
  cbCtx.lineWidth = 2;
  for (let y = 0; y < 512; y += 32) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(512, y);
    cCtx.stroke();
    cbCtx.beginPath();
    cbCtx.moveTo(0, y);
    cbCtx.lineTo(512, y);
    cbCtx.stroke();
  }
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    cCtx.fillStyle = "rgba(115, 102, 88, 0.1)";
    cCtx.fillRect(x, y, 4, 4);
  }
  // Subtle red-laterite dust splash at base of wall
  const wallDust = cCtx.createLinearGradient(0, 410, 0, 512);
  wallDust.addColorStop(0, "rgba(166, 94, 54, 0)");
  wallDust.addColorStop(1, "rgba(166, 94, 54, 0.45)");
  cCtx.fillStyle = wallDust;
  cCtx.fillRect(0, 410, 512, 102);

  const concreteWall = finalizeTexture(concCanvas, 2, 1, maxAniso, true);
  const concreteBump = finalizeTexture(cBumpCanvas, 2, 1, maxAniso, false);

  // 5. Tamale Interchange cast concrete box-girder texture (modeled from tamale_interchange.jpg)
  const bridgeCanvas = document.createElement("canvas");
  bridgeCanvas.width = 512;
  bridgeCanvas.height = 256;
  const brCtx = bridgeCanvas.getContext("2d")!;
  brCtx.fillStyle = "#c4beb5";
  brCtx.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 64) {
    brCtx.fillStyle = "rgba(90, 84, 76, 0.25)";
    brCtx.fillRect(x, 0, 3, 256);
  }
  for (let i = 0; i < 2400; i++) {
    brCtx.fillStyle = Math.random() > 0.5 ? "rgba(145,138,128,0.2)" : "rgba(95,88,80,0.18)";
    brCtx.fillRect(Math.random() * 512, Math.random() * 256, 5, 3);
  }
  const interchangeConcrete = finalizeTexture(bridgeCanvas, 6, 1, maxAniso, true);

  // 6. Corrugated zinc metal roof + sinusoidal bump map
  const zincCanvas = document.createElement("canvas");
  zincCanvas.width = 256;
  zincCanvas.height = 256;
  const zCtx = zincCanvas.getContext("2d")!;

  const zBumpCanvas = document.createElement("canvas");
  zBumpCanvas.width = 256;
  zBumpCanvas.height = 256;
  const zbCtx = zBumpCanvas.getContext("2d")!;

  for (let x = 0; x < 256; x += 2) {
    const wave = 0.5 + 0.5 * Math.sin((x / 16) * Math.PI * 2);
    const shade = Math.floor(115 + wave * 65);
    zCtx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
    zCtx.fillRect(x, 0, 2, 256);

    const bShade = Math.floor(55 + wave * 185);
    zbCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
    zbCtx.fillRect(x, 0, 2, 256);
  }
  // Rust oxidation streaks
  zCtx.fillStyle = "rgba(154, 72, 34, 0.34)";
  for (let i = 0; i < 65; i++) {
    zCtx.fillRect(Math.random() * 256, Math.random() * 256, 6, 44);
  }
  const zincRoof = finalizeTexture(zincCanvas, 4, 2, maxAniso, true);
  const zincBump = finalizeTexture(zBumpCanvas, 4, 2, maxAniso, false);

  // 7. Savannah grass thatch roof (modeled from northern_clay_compound.jpg)
  const thatchCanvas = document.createElement("canvas");
  thatchCanvas.width = 256;
  thatchCanvas.height = 256;
  const tCtx = thatchCanvas.getContext("2d")!;
  tCtx.fillStyle = "#8c7650";
  tCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const colors = ["#b89f63", "#705d3d", "#9e8652", "#635542"];
    tCtx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    tCtx.lineWidth = 2;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    tCtx.beginPath();
    tCtx.moveTo(x, y);
    tCtx.lineTo(x + (Math.random() - 0.5) * 7, y + 20);
    tCtx.stroke();
  }
  const thatchRoof = finalizeTexture(thatchCanvas, 3, 2, maxAniso, true);

  // 8. Interlocking sandstone courtyard pavers (modeled from tamale_office_building.jpg)
  const paverCanvas = document.createElement("canvas");
  paverCanvas.width = 256;
  paverCanvas.height = 256;
  const pCtx = paverCanvas.getContext("2d")!;
  pCtx.fillStyle = "#b58560";
  pCtx.fillRect(0, 0, 256, 256);
  pCtx.strokeStyle = "rgba(85, 58, 40, 0.45)";
  pCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 24) {
    const offset = (y / 24) % 2 === 0 ? 0 : 16;
    for (let x = -16; x < 256; x += 32) {
      pCtx.fillStyle = (x + y) % 64 === 0 ? "#c2926d" : "#a87752";
      pCtx.fillRect(x + offset + 1, y + 1, 30, 22);
      pCtx.strokeRect(x + offset, y, 32, 24);
    }
  }
  const paverBrick = finalizeTexture(paverCanvas, 6, 6, maxAniso, true);

  // 9. Handwoven Batakari striped cotton
  const bataCanvas = document.createElement("canvas");
  bataCanvas.width = 256;
  bataCanvas.height = 256;
  const bCtx = bataCanvas.getContext("2d")!;
  const stripes = ["#1e3a5f", "#f2efe9", "#2b5280", "#d99b38", "#162942", "#f2efe9"];
  const stripeW = 256 / 12;
  for (let i = 0; i < 12; i++) {
    bCtx.fillStyle = stripes[i % stripes.length];
    bCtx.fillRect(i * stripeW, 0, stripeW, 256);
  }
  bCtx.fillStyle = "rgba(0,0,0,0.09)";
  for (let y = 0; y < 256; y += 4) {
    bCtx.fillRect(0, y, 256, 1);
  }
  const batakariCloth = finalizeTexture(bataCanvas, 1, 1, maxAniso, true);

  // 10. Soft radial contact shadow
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext("2d")!;
  const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, "rgba(22, 14, 10, 0.58)");
  grad.addColorStop(0.55, "rgba(22, 14, 10, 0.24)");
  grad.addColorStop(1, "rgba(22, 14, 10, 0)");
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.needsUpdate = true;

  // 11. Authentic Tamale Signboards
  const highwaySign = createShopSignTexture(
    "TAMALE INTERCHANGE (NAA GBEWAA)",
    "CENTRAL MARKET NW  ·  CENTRAL MOSQUE S  ·  JUBILEE PARK E",
    "#065f46",
    "#fde047"
  );
  const marketSign = createShopSignTexture(
    "TAMALE CENTRAL MARKET · DAA",
    "SHEA BUTTER (KPAKPILI) · YAMS · BATAKARI · PROVISIONS",
    "#9a3412",
    "#fef08a"
  );
  const officeSign = createShopSignTexture(
    "TAMALE HIGH STREET · REGIONAL CENTRE",
    "CIVIC & COMMERCIAL PRECINCT · JUBILEE PARK",
    "#0284c7",
    "#ffffff"
  );

  return {
    lateriteGround,
    lateriteBump,
    asphaltRoad,
    asphaltBump,
    earthPlaster,
    concreteWall,
    concreteBump,
    interchangeConcrete,
    zincRoof,
    zincBump,
    thatchRoof,
    paverBrick,
    batakariCloth,
    contactShadow,
    highwaySign,
    marketSign,
    officeSign,
  };
}
