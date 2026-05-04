import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";
import type { BodyProportions } from "../lib/bodyMetrics";

// ── Constants ──────────────────────────────────────────────────────────────
const SKIN = 0xc49a6c;
const SKIN_DARK = 0xa5714a;
const HAIR = 0x241408;
const EYE_WHITE = 0xfff8f0;
const EYE_DARK = 0x2c1a0a;
const LIP = 0x7a3535;

function mat(color: number, dark = false, emissive = 0x000000) {
  return new THREE.MeshPhongMaterial({
    color: dark ? SKIN_DARK : color,
    emissive,
    shininess: 12,
    specular: new THREE.Color(0.08, 0.06, 0.04),
    side: THREE.FrontSide,
  });
}

// ── Geometry helpers ───────────────────────────────────────────────────────
function sphere(r: number, sw = 10, sh = 8) {
  return new THREE.SphereGeometry(r, sw, sh);
}

function cylinder(rTop: number, rBot: number, h: number, seg = 9) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg, 2);
}

// ── Place a tapered cylinder between two points ────────────────────────────
function addLimb(
  parent: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  rTop: number,
  rBot: number,
  seg = 9,
  dark = false
) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = cylinder(rTop, rBot, len, seg);
  const m = new THREE.Mesh(geo, mat(SKIN, dark));
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  m.position.copy(mid);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  parent.add(m);
}

// ── Build the full body as a Three.js Group ────────────────────────────────
function buildBody(p: BodyProportions): THREE.Group {
  const group = new THREE.Group();
  const H = p.totalHeight;
  const oy = -H / 2;

  const add = (geo: THREE.BufferGeometry, color: number, px = 0, py2 = 0, pz = 0, sx = 1, sy = 1, sz = 1, dark = false, emissive = 0) => {
    const m = new THREE.Mesh(geo, mat(color, dark, emissive));
    m.position.set(px, oy + py2, pz);
    if (sx !== 1 || sy !== 1 || sz !== 1) m.scale.set(sx, sy, sz);
    group.add(m);
    return m;
  };

  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, oy + y, z);

  // ── Derived positions ──────────────────────────────────────────────────
  const headBot = H - p.headHeight;
  const headCy = H - p.headHeight / 2;
  const headR = p.headRadius;
  const headRy = headR * 1.18;

  const neckBot = headBot - p.neckLength;
  const torsoTop = neckBot;
  const torsoBase = torsoTop - p.torsoLength;
  const shoulderY = torsoTop - p.torsoLength * 0.038;
  const armStartX = p.shoulderWidth * 0.50 + p.upperArmRadius * 0.15;
  const elbowX = armStartX + p.upperArmLength * 0.045;
  const elbowY = shoulderY - p.upperArmLength;
  const elbowZ = p.upperArmLength * 0.032;
  const wristX = elbowX + p.forearmLength * 0.012;
  const wristY = elbowY - p.forearmLength;
  const wristZ = elbowZ + p.forearmLength * 0.010;
  const handBotY = wristY - p.handLength;

  const legTopY = torsoBase + p.torsoLength * 0.018;
  const legCX = p.hipWidth * 0.258;
  const kneeY = legTopY - p.thighLength;
  const kneeX = legCX * 0.94;
  const kneeZ = -p.thighLength * 0.012;
  const ankleY = kneeY - p.shinLength;
  const ankleX = kneeX * 0.94;
  const footBotY = ankleY - p.footHeight;
  const footTipZ = -p.footLength * 0.62;

  // ── HEAD ──────────────────────────────────────────────────────────────
  // skull
  add(sphere(headR, 14, 12), SKIN, 0, headCy, 0, 1, headRy / headR, 1);
  // jaw
  add(sphere(headR * 0.62, 12, 10), SKIN, 0, headCy - headRy * 0.68, headR * 0.08, 0.95, 0.52, 0.88);
  // ears
  for (const s of [-1, 1]) {
    add(sphere(headR, 10, 8), SKIN, s * headR * 0.99, headCy + headRy * 0.04, 0, 0.24, 0.44, 0.20);
  }

  // eyes
  const eyeR = headR * 0.09;
  const eyeOffX = headR * 0.28;
  const eyeY = headCy + headRy * 0.08;
  const eyeZ = headR * 0.82;
  for (const s of [-1, 1]) {
    add(sphere(eyeR * 1.08, 10, 8), EYE_WHITE, s * eyeOffX, eyeY, eyeZ - eyeR * 0.4);
    add(sphere(eyeR * 0.70, 8, 7), EYE_DARK, s * eyeOffX, eyeY, eyeZ + eyeR * 0.15);
  }

  // nose
  add(sphere(headR * 0.14, 8, 6), SKIN, 0, headCy - headRy * 0.06, headR * 0.90 - headR * 0.04, 0.42, 0.96, 0.58);
  add(sphere(headR * 0.12, 8, 6), SKIN, 0, headCy - headRy * 0.18, headR * 0.90, 1.15, 0.52, 0.82);

  // mouth
  add(sphere(headR * 0.20, 10, 8), LIP, 0, headCy - headRy * 0.30, headR * 0.82, 1, 0.24, 0.22);

  // hair — flat cap sitting on top of skull, doesn't bleed through
  const hairGeo = new THREE.SphereGeometry(headR * 1.015, 12, 8);
  const hairMat = new THREE.MeshPhongMaterial({ color: HAIR, shininess: 30 });
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  // Position high enough so the bottom of the hair (radius*scaleY*0.52) stays above head center
  hairMesh.position.set(0, oy + headCy + headRy * 0.60, -headR * 0.05);
  hairMesh.scale.set(1.0, 0.46, 1.0);
  group.add(hairMesh);

  // ── NECK ──────────────────────────────────────────────────────────────
  addLimb(group, v(0, neckBot, 0), v(0, headBot - 0.003, 0), p.neckRadius * 0.9, p.neckRadius * 1.02, 10);

  // ── TORSO (lathe surface) ──────────────────────────────────────────────
  {
    const L = p.torsoLength;
    const lathePts: THREE.Vector2[] = [
      new THREE.Vector2(p.neckRadius * 1.30, L),
      new THREE.Vector2(p.shoulderWidth * 0.485, L * 0.985),
      new THREE.Vector2(p.shoulderWidth * 0.500, L * 0.960),
      new THREE.Vector2(p.chestWidth * 0.500, L * 0.720),
      new THREE.Vector2(p.chestWidth * 0.498, L * 0.620),
      new THREE.Vector2(p.waistWidth * 0.500, L * 0.400),
      new THREE.Vector2(p.hipWidth * 0.490, L * 0.220),
      new THREE.Vector2(p.hipWidth * 0.500, L * 0.100),
      new THREE.Vector2(p.hipWidth * 0.460, 0.002),
    ];
    const latheGeo = new THREE.LatheGeometry(lathePts, 16);
    const torseMesh = new THREE.Mesh(latheGeo, mat(SKIN));
    const dRatio = p.chestDepth / p.chestWidth;
    torseMesh.position.set(0, oy + torsoBase, 0);
    torseMesh.scale.set(1, 1, dRatio);
    group.add(torseMesh);
  }

  // Pelvis blend — smaller, sits inside torso bottom so it doesn't poke out
  add(sphere(p.hipWidth * 0.380, 10, 8), SKIN, 0, torsoBase + p.torsoLength * 0.06, 0, 1, 0.38, (p.hipDepth / p.hipWidth) * 0.85, true);

  // ── ARMS ──────────────────────────────────────────────────────────────
  for (const s of [-1, 1]) {
    // shoulder cap
    add(sphere(p.upperArmRadius * 1.22, 10, 8), SKIN, s * armStartX, shoulderY, 0);
    // upper arm
    addLimb(group, v(s * armStartX, shoulderY - 0.004, 0), v(s * elbowX, elbowY, elbowZ), p.upperArmRadius, p.upperArmRadius * 0.82, 10);
    // elbow
    add(sphere(p.forearmRadius * 1.06, 10, 8), SKIN, s * elbowX, elbowY, elbowZ);
    // forearm
    addLimb(group, v(s * elbowX, elbowY, elbowZ), v(s * wristX, wristY, wristZ), p.forearmRadius, p.forearmRadius * 0.74, 10);
    // wrist
    add(sphere(p.handRadius * 0.90, 8, 7), SKIN, s * wristX, wristY, wristZ);
    // hand
    const handGeo = new THREE.CapsuleGeometry(p.handRadius, p.handLength * 0.52, 4, 10);
    const handM = new THREE.Mesh(handGeo, mat(SKIN));
    handM.position.set(s * wristX, oy + (wristY + handBotY) / 2, wristZ + 0.006);
    handM.scale.set(1.52, 1, 0.40);
    group.add(handM);
  }

  // ── LEGS ──────────────────────────────────────────────────────────────
  for (const s of [-1, 1]) {
    // hip joint
    add(sphere(p.thighRadius * 1.14, 10, 8), SKIN, s * legCX, legTopY, 0);
    // thigh
    addLimb(group, v(s * legCX, legTopY - 0.005, 0), v(s * kneeX, kneeY, kneeZ), p.thighRadius, p.thighRadius * 0.70, 12);
    // knee
    add(sphere(p.shinRadius * 1.12, 10, 8), SKIN, s * kneeX, kneeY, kneeZ);
    // shin
    addLimb(group, v(s * kneeX, kneeY, kneeZ), v(s * ankleX, ankleY, 0), p.shinRadius, p.shinRadius * 0.72, 11);
    // ankle
    add(sphere(p.shinRadius * 0.70, 8, 7), SKIN, s * ankleX, ankleY, 0, 1, 1, 1, true);
    // foot
    const footGeo = new THREE.BoxGeometry(p.thighRadius * 1.02, p.footHeight, p.footLength * 0.92);
    const footM = new THREE.Mesh(footGeo, mat(SKIN, true));
    footM.position.set(s * ankleX, oy + footBotY + p.footHeight * 0.5, footTipZ / 2 + 0.01);
    group.add(footM);
    // toe
    add(sphere(p.thighRadius * 0.56, 8, 7), SKIN, s * ankleX, footBotY + p.footHeight * 0.62, footTipZ, 0.88, 0.60, 0.52, true);
    // heel
    add(sphere(p.thighRadius * 0.54, 8, 7), SKIN, s * ankleX, footBotY + p.footHeight * 0.44, p.footLength * 0.28, 0.78, 0.52, 0.44, true);
  }

  return group;
}

// ── Main Component ─────────────────────────────────────────────────────────
interface Props {
  proportions: BodyProportions;
  rotating: boolean;
  onStartManual: () => void;
}

export default function HumanBody3D({ proportions, rotating, onStartManual }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    renderer: null as SVGRenderer | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    bodyGroup: null as THREE.Group | null,
    raf: 0,
    rotating: rotating,
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotY: 0,
    rotX: 0.08,
  });

  useEffect(() => {
    stateRef.current.rotating = rotating;
  }, [rotating]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const W = el.clientWidth || 600;
    const H = el.clientHeight || 700;
    const st = stateRef.current;

    // Scene & camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF0F2F7);
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.01, 50);
    const camDist = proportions.totalHeight * 1.65;
    camera.position.set(0, 0, camDist);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.50);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.40);
    keyLight.position.set(2.2, 3.8, 4.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc5d8ff, 0.42);
    fillLight.position.set(-3.0, 1.5, 1.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe4c0, 0.50);
    rimLight.position.set(0.2, 2.0, -4.0);
    scene.add(rimLight);

    // SVGRenderer
    const renderer = new SVGRenderer();
    renderer.setSize(W, H);
    renderer.setQuality("high");
    renderer.setClearColor(new THREE.Color(0xF0F2F7), 1);
    el.appendChild(renderer.domElement as unknown as HTMLElement);

    // Body
    const body = buildBody(proportions);
    body.rotation.y = st.rotY;
    body.rotation.x = st.rotX;
    scene.add(body);

    // Floor reference lines (simple visual cues)
    const floorY = -proportions.totalHeight / 2;
    const floorGeo = new THREE.CircleGeometry(proportions.hipWidth * 1.4, 32);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0xe8eaf0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY - 0.001;
    scene.add(floor);

    st.renderer = renderer;
    st.scene = scene;
    st.camera = camera;
    st.bodyGroup = body;

    // Render loop
    let needsRender = true;
    let frameCount = 0;
    function animate() {
      st.raf = requestAnimationFrame(animate);
      frameCount++;
      if (st.rotating) {
        body.rotation.y += 0.012;
        needsRender = true;
      }
      if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    }
    st.raf = requestAnimationFrame(animate);

    // Resize
    const ro = new ResizeObserver(([e]) => {
      const { width: nW, height: nH } = e.contentRect;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
      needsRender = true;
    });
    ro.observe(el);

    // Mouse drag
    const onDown = (e: MouseEvent) => {
      st.isDragging = true;
      st.prevX = e.clientX;
      st.prevY = e.clientY;
      onStartManual();
    };
    const onMove = (e: MouseEvent) => {
      if (!st.isDragging) return;
      const dx = e.clientX - st.prevX;
      const dy = e.clientY - st.prevY;
      st.prevX = e.clientX;
      st.prevY = e.clientY;
      body.rotation.y += dx * 0.012;
      body.rotation.x = Math.max(-0.6, Math.min(0.6, body.rotation.x + dy * 0.008));
      needsRender = true;
    };
    const onUp = () => { st.isDragging = false; };

    // Touch drag
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        st.isDragging = true;
        st.prevX = e.touches[0].clientX;
        st.prevY = e.touches[0].clientY;
        onStartManual();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!st.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - st.prevX;
      const dy = e.touches[0].clientY - st.prevY;
      st.prevX = e.touches[0].clientX;
      st.prevY = e.touches[0].clientY;
      body.rotation.y += dx * 0.012;
      body.rotation.x = Math.max(-0.6, Math.min(0.6, body.rotation.x + dy * 0.008));
      needsRender = true;
    };

    // Scroll to zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const fov = Math.max(16, Math.min(60, camera.fov + e.deltaY * 0.04));
      camera.fov = fov;
      camera.updateProjectionMatrix();
      needsRender = true;
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(st.raf);
      ro.disconnect();
      const svgEl = renderer.domElement as unknown as HTMLElement;
      if (el.contains(svgEl)) el.removeChild(svgEl);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [proportions]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: "grab", overflow: "hidden" }}
    />
  );
}
