import {
  Suspense, useRef, useMemo, useState, useCallback,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

/* ─── Types ─────────────────────────────────────────────────────────────── */
export interface BodyParams {
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  muscleMass?: number;
  sex: "male" | "female";
}

interface BodyRegion {
  id: string;
  label: string;
  labelRu: string;
  system: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  info: string;
  icon: string;
}

/* ─── Body region definitions ────────────────────────────────────────────── */
function getRegions(h: number): BodyRegion[] {
  const s = h / 175;
  return [
    {
      id: "brain", label: "Brain & Cognition", labelRu: "Мозг", system: "neuro",
      position: [0, 1.55 * s, 0.08],
      color: "#a855f7", glowColor: "#7c3aed",
      info: "Гиппокамп и префронтальная кора управляют памятью и принятием решений. Сон ≥7 ч, омега-3, витамин B12 и фолат критичны для нейрогенеза. Дефицит витамина D связан с ↑ риском деменции (Lancet, 2023).",
      icon: "🧠",
    },
    {
      id: "heart", label: "Heart", labelRu: "Сердце", system: "cardio",
      position: [-0.09, 1.12 * s, 0.12],
      color: "#ef4444", glowColor: "#dc2626",
      info: "Сердечно-сосудистый риск: LDL <100 мг/дл, давление <120/80, ЧСС покоя 50–70 уд/мин. Омега-3 (≥1 г EPA+DHA/день) снижает риск инфаркта на 25% (REDUCE-IT, NEJM 2019). Средиземноморская диета снижает ССЗ на 30% (PREDIMED, NEJM 2013).",
      icon: "❤️",
    },
    {
      id: "lungs", label: "Lungs", labelRu: "Лёгкие", system: "respiratory",
      position: [0.12, 1.15 * s, 0.1],
      color: "#38bdf8", glowColor: "#0ea5e9",
      info: "ЖЕЛ (жизненная ёмкость лёгких) улучшается аэробными тренировками. Антиоксиданты (вит. C, E) защищают лёгочный эпителий от оксидативного стресса. Магний расширяет бронхи (метаанализ, Cochrane 2021). Спирометрия — ключевой скрининг.",
      icon: "🫁",
    },
    {
      id: "liver", label: "Liver", labelRu: "Печень", system: "metabolic",
      position: [0.14, 0.96 * s, 0.1],
      color: "#f59e0b", glowColor: "#d97706",
      info: "Печень — центр детоксикации и метаболизма. АЛТ, АСТ, ГГТ — маркеры функции. НАЖБП (жировой гепатоз) поражает 25% взрослых. Холин (550 мг/сут муж.) и витамин Е (800 МЕ/сут) эффективны при НАЖБП (NASH CRN, Hepatology 2023). Ограничение фруктозы критично.",
      icon: "🫀",
    },
    {
      id: "gut", label: "Gut", labelRu: "Кишечник", system: "digestive",
      position: [0, 0.82 * s, 0.12],
      color: "#22c55e", glowColor: "#16a34a",
      info: "Микробиом: 38 трлн бактерий формируют иммунитет, настроение (ось кишечник–мозг), метаболизм. Клетчатка ≥25 г/сут стимулирует Lactobacillus и Bifidobacterium. Пробиотики снижают тревогу на 33% (мета-анализ, Nutrients 2023). Ферментированные продукты увеличивают разнообразие микробиома (Cell 2021).",
      icon: "🦠",
    },
    {
      id: "kidneys", label: "Kidneys", labelRu: "Почки", system: "renal",
      position: [-0.14, 0.9 * s, -0.05],
      color: "#f97316", glowColor: "#ea580c",
      info: "СКФ (скорость клубочковой фильтрации) >90 — норма. Суточная норма воды: 35 мл/кг массы тела (NRC 2022). Избыток белка >2,5 г/кг нагружает почки при ХБП. Натрий <2 г/сут снижает давление на 5–6 мм рт.ст. Мочевина, креатинин — ключевые маркеры.",
      icon: "🫘",
    },
    {
      id: "muscles", label: "Muscles", labelRu: "Мышцы", system: "musculoskeletal",
      position: [0.2, 0.6 * s, 0.05],
      color: "#06b6d4", glowColor: "#0891b2",
      info: "Мышечная масса: синтез белка стимулируется 1,6–2,2 г/кг/сут (Morton, BJSM 2018). Лейцин (≥3 г/приём) — ключевой активатор mTOR. Тренировки с отягощением 3×/нед поддерживают массу. Саркопения начинается с 30 лет (-3–8%/декаду). Креатин (3–5 г/сут) увеличивает силу на 8–14% (мета-анализ 2022).",
      icon: "💪",
    },
    {
      id: "bones", label: "Bones", labelRu: "Скелет / Суставы", system: "musculoskeletal",
      position: [-0.2, 0.4 * s, 0.02],
      color: "#e2e8f0", glowColor: "#cbd5e1",
      info: "МПКТ (минеральная плотность костей) зависит от Са (1000–1200 мг/сут), вит. D (1500–2000 МЕ/сут) и К2 (МК-7, 100–300 мкг/сут). Удар весовой нагрузки (бег, прыжки) в 2× эффективнее для костей, чем плавание (JBMR 2023). СРБ — маркер воспаления суставов.",
      icon: "🦴",
    },
    {
      id: "skin", label: "Skin", labelRu: "Кожа", system: "integumentary",
      position: [0.25, 1.0 * s, 0.05],
      color: "#fbbf24", glowColor: "#f59e0b",
      info: "Синтез вит. D: 15–30 мин солнца (UVI>3) на лицо и руки = 1000–2000 МЕ. Коллаген стимулируется вит. C (≥100 мг/сут), Zn и пептидами. Гидратация кожи коррелирует с потреблением воды и омега-3. Антиоксиданты (ликопин, астаксантин) защищают от UV-старения.",
      icon: "✨",
    },
    {
      id: "reproductive", label: "Hormones", labelRu: "Гормоны", system: "endocrine",
      position: [0, 0.55 * s, 0.1],
      color: "#ec4899", glowColor: "#db2777",
      info: "Тестостерон у мужчин: 10–35 нмоль/л норма. Цинк (11 мг/сут), вит. D, сон и тренировки критичны. Лептин и грелин регулируют аппетит и зависят от сна. Кортизол снижается при адаптогенах (ашваганда −27%, KSM-66, Medicine 2019). Инсулин: HOMA-IR <2.5 — норма.",
      icon: "⚡",
    },
  ];
}

/* ─── Holographic Skin Material ─────────────────────────────────────────── */
function createSkinMaterial(opacity = 1.0, wireframe = false) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0d2040),
    emissive: new THREE.Color(0x061525),
    emissiveIntensity: 0.4,
    metalness: 0.0,
    roughness: 0.75,
    transparent: opacity < 1,
    opacity,
    wireframe,
    side: THREE.FrontSide,
  });
}

function createGlowMaterial(color: string) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

/* ─── Lathe-based Torso ─────────────────────────────────────────────────── */
function buildTorsoGeometry(
  shoulderW: number, chestW: number, waistW: number,
  hipW: number, torsoH: number, isFemale: boolean
): THREE.LatheGeometry {
  const halfH = torsoH / 2;
  // Profile points [x = radius, y = height] from bottom to top
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(hipW * 0.52, -halfH),
    new THREE.Vector2(hipW * 0.50, -halfH * 0.82),
    new THREE.Vector2(hipW * 0.48, -halfH * 0.65),
    new THREE.Vector2(waistW * 0.52, -halfH * 0.25),
    new THREE.Vector2(waistW * 0.48, 0),
    new THREE.Vector2(chestW * 0.52, halfH * 0.28),
    new THREE.Vector2(chestW * 0.54, halfH * 0.5),
    new THREE.Vector2(shoulderW * 0.50, halfH * 0.72),
    new THREE.Vector2(shoulderW * 0.46, halfH * 0.85),
    new THREE.Vector2(shoulderW * 0.30, halfH),
  ];
  return new THREE.LatheGeometry(pts, 48);
}

/* ─── Procedural Head Geometry ────────────────────────────────────────────── */
function buildHeadGeometry(r: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(r, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y / r + 1) / 2; // 0 at bottom, 1 at top
    // Elongate slightly for realistic skull shape
    const xz = Math.sqrt(pos.getX(i) ** 2 + pos.getZ(i) ** 2);
    const scaleFactor = t > 0.5 ? 1.0 + (t - 0.5) * 0.18 : 1.0 - (0.5 - t) * 0.12;
    if (xz > 0.001) {
      const nx = pos.getX(i) / xz;
      const nz = pos.getZ(i) / xz;
      pos.setX(i, pos.getX(i) * scaleFactor);
      pos.setZ(i, pos.getZ(i) * scaleFactor);
    }
    pos.setY(i, y * 1.15);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ─── Main Human Body ───────────────────────────────────────────────────── */
function HumanBody({
  params, activeRegion, onRegionClick, viewMode,
}: {
  params: BodyParams;
  activeRegion: string | null;
  onRegionClick: (id: string) => void;
  viewMode: "surface" | "xray" | "muscle";
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const { heightCm, weightKg, bodyFatPct, sex } = params;
  const isFemale = sex === "female";

  const s = heightCm / 175; // height scale
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const fat = bodyFatPct ?? Math.max(8, Math.min(40, bmi * 1.2 - 5));
  const fatFactor = fat / (isFemale ? 25 : 18);
  const muscleFactor = Math.max(0.7, 1.4 - fatFactor * 0.35);

  // Anatomical proportions (based on anthropometric research)
  const headR = 0.118 * s;
  const neckR = 0.048 * s;
  const neckH = 0.088 * s;

  const shoulderW = (isFemale ? 0.30 : 0.36) * s * Math.max(0.88, 1 + (fatFactor - 1) * 0.15);
  const chestW = (isFemale ? 0.26 : 0.30) * s * Math.max(0.92, fatFactor * 0.85);
  const waistW = (isFemale ? 0.20 : 0.24) * s * Math.max(0.85, fatFactor * 0.92);
  const hipW = (isFemale ? 0.32 : 0.28) * s * Math.max(0.95, fatFactor * 0.90);
  const torsoH = 0.44 * s;

  const upperArmR = 0.05 * s * Math.max(0.85, muscleFactor * 0.9 + fatFactor * 0.1);
  const upperArmH = 0.25 * s;
  const lowerArmR = 0.038 * s;
  const lowerArmH = 0.22 * s;
  const handR = 0.038 * s;

  const upperLegR = 0.078 * s * Math.max(0.88, muscleFactor * 0.88 + fatFactor * 0.12);
  const upperLegH = 0.33 * s;
  const lowerLegR = 0.052 * s;
  const lowerLegH = 0.30 * s;

  // Y positions (from center)
  const feetY = -s * 0.88;
  const lowerLegY = feetY + lowerLegH / 2;
  const kneeY = feetY + lowerLegH;
  const upperLegY = kneeY + upperLegH / 2;
  const pelvisY = kneeY + upperLegH;
  const torsoY = pelvisY + torsoH / 2;
  const neckY = pelvisY + torsoH + neckH / 2;
  const headY = neckY + neckH / 2 + headR * 1.1;
  const armY = pelvisY + torsoH * 0.82;
  const elbowY = armY - upperArmH;
  const handY = elbowY - lowerArmH;

  // Materials
  const opacity = viewMode === "xray" ? 0.22 : viewMode === "muscle" ? 0.45 : 1.0;
  const bodyMat = useMemo(() => createSkinMaterial(opacity), [opacity]);
  const glowMat = useMemo(() => createGlowMaterial("#0a4a7a"), []);
  const muscleMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x7f1d1d),
    emissive: new THREE.Color(0x450a0a),
    emissiveIntensity: 0.5,
    roughness: 0.8,
    transparent: true,
    opacity: viewMode === "muscle" ? 0.85 : 0,
  }), [viewMode]);
  const jointMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x162842),
    emissive: new THREE.Color(0x0d1f35),
    emissiveIntensity: 0.3,
    metalness: 0.1,
    roughness: 0.7,
    transparent: opacity < 1,
    opacity,
  }), [opacity]);
  const boneMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xc8d8e8),
    emissive: new THREE.Color(0x8090a0),
    emissiveIntensity: 0.2,
    roughness: 0.6,
    transparent: true,
    opacity: viewMode === "xray" ? 0.7 : 0,
  }), [viewMode]);

  // Torso geometry
  const torsoGeo = useMemo(() =>
    buildTorsoGeometry(shoulderW, chestW, waistW, hipW, torsoH, isFemale),
    [shoulderW, chestW, waistW, hipW, torsoH, isFemale]);

  const headGeo = useMemo(() => buildHeadGeometry(headR), [headR]);

  // Scan line animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child) => {
      if ((child as any).__scanline) {
        (child as THREE.Mesh).material instanceof THREE.MeshBasicMaterial &&
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHSL(
            0.55 + Math.sin(t * 0.8) * 0.05, 0.9, 0.5 + Math.sin(t * 2) * 0.1
          );
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* ── Head ── */}
      <mesh geometry={headGeo} material={bodyMat} position={[0, headY, 0]} castShadow />
      {/* Skull bone (x-ray) */}
      <mesh position={[0, headY, 0]} material={boneMat} castShadow>
        <sphereGeometry args={[headR * 0.88, 24, 18]} />
      </mesh>
      {/* Face details */}
      {viewMode === "surface" && (
        <>
          {/* Brow ridge */}
          <mesh position={[0, headY + headR * 0.28, headR * 0.88]} material={jointMat}>
            <boxGeometry args={[headR * 1.3, headR * 0.08, headR * 0.12]} />
          </mesh>
          {/* Jaw */}
          <mesh position={[0, headY - headR * 0.52, headR * 0.65]} material={jointMat}>
            <boxGeometry args={[headR * 1.1, headR * 0.28, headR * 0.5]} />
          </mesh>
        </>
      )}

      {/* ── Neck ── */}
      <mesh position={[0, neckY, 0]} material={jointMat} castShadow>
        <cylinderGeometry args={[neckR, neckR * 1.12, neckH, 20]} />
      </mesh>
      {/* Spine (x-ray) */}
      <mesh position={[0, torsoY, -chestW * 0.38]} material={boneMat}>
        <cylinderGeometry args={[0.018 * s, 0.018 * s, torsoH * 0.92, 8]} />
      </mesh>

      {/* ── Torso ── */}
      <mesh geometry={torsoGeo} material={bodyMat} position={[0, torsoY, 0]} castShadow />
      {/* Glow shell */}
      <mesh geometry={torsoGeo} material={glowMat} position={[0, torsoY, 0]} />
      {/* Rib cage (x-ray) */}
      {viewMode === "xray" && [-0.09,-0.05,0,0.05,0.09].map((xOffset, i) => (
        <mesh key={i} position={[0, torsoY + 0.06 - i * 0.065, 0]} material={boneMat}>
          <torusGeometry args={[chestW * 0.44 + xOffset, 0.008 * s, 6, 24, Math.PI]} />
        </mesh>
      ))}
      {/* Muscle overlay */}
      {viewMode === "muscle" && (
        <>
          {/* Pecs */}
          {[-1,1].map(side => (
            <mesh key={side} position={[chestW * 0.22 * side, torsoY + torsoH * 0.22, chestW * 0.44]} material={muscleMat}>
              <sphereGeometry args={[chestW * 0.22, 16, 12]} />
            </mesh>
          ))}
          {/* Abs */}
          {[-0.06, 0.06].flatMap(xOff => [-0.04, 0.08, 0.2].map(yOff => (
            <mesh key={`${xOff}-${yOff}`} position={[xOff * s, torsoY - yOff * s, chestW * 0.48]} material={muscleMat}>
              <sphereGeometry args={[0.048 * s, 12, 8]} />
            </mesh>
          )))}
          {/* Obliques */}
          {[-1,1].map(side => (
            <mesh key={side} position={[waistW * 0.5 * side, torsoY, chestW * 0.38]} material={muscleMat} rotation={[0,0, side * 0.4]}>
              <capsuleGeometry args={[0.035 * s, torsoH * 0.42, 6, 12]} />
            </mesh>
          ))}
        </>
      )}

      {/* ── Arms ── */}
      {([-1, 1] as const).map((side) => {
        const armX = (shoulderW / 2 + upperArmR * 0.6) * side;
        const legX = hipW * 0.38 * side;
        return (
          <group key={side}>
            {/* Shoulder joint */}
            <mesh position={[(shoulderW / 2 + 0.015) * side, armY + upperArmH * 0.06, 0]} material={jointMat}>
              <sphereGeometry args={[upperArmR * 1.25, 16, 12]} />
            </mesh>
            {/* Upper arm */}
            <mesh position={[armX * 1.05, armY - upperArmH / 2, 0]} material={bodyMat} castShadow
              rotation={[0, 0, side * 0.07]}>
              <capsuleGeometry args={[upperArmR, upperArmH * 0.7, 6, 16]} />
            </mesh>
            {/* Bicep muscle */}
            {viewMode === "muscle" && (
              <mesh position={[armX * 1.05, armY - upperArmH * 0.38, upperArmR * 0.5]} material={muscleMat}
                rotation={[0, 0, side * 0.07]}>
                <capsuleGeometry args={[upperArmR * 0.72, upperArmH * 0.35, 4, 10]} />
              </mesh>
            )}
            {/* Elbow */}
            <mesh position={[(shoulderW / 2 + upperArmR * 1.6 + 0.015) * side, elbowY, 0]} material={jointMat}>
              <sphereGeometry args={[lowerArmR * 1.2, 12, 8]} />
            </mesh>
            {/* Lower arm */}
            <mesh position={[(shoulderW / 2 + upperArmR * 1.6 + 0.015) * side, handY + lowerArmH / 2, 0]} material={bodyMat} castShadow>
              <capsuleGeometry args={[lowerArmR, lowerArmH * 0.65, 6, 14]} />
            </mesh>
            {/* Wrist + hand */}
            <mesh position={[(shoulderW / 2 + upperArmR * 1.6 + 0.015) * side, handY - 0.02, 0]} material={jointMat}>
              <sphereGeometry args={[handR, 12, 10]} />
            </mesh>
            {/* Fingers hint */}
            {[-0.02, 0, 0.02].map((fx, fi) => (
              <mesh key={fi} position={[(shoulderW / 2 + upperArmR * 1.6 + 0.015) * side + fx * side, handY - handR * 2.2, 0]} material={jointMat}>
                <capsuleGeometry args={[handR * 0.22, handR * 0.55, 4, 8]} />
              </mesh>
            ))}

            {/* ── Legs ── */}
            {/* Hip joint */}
            <mesh position={[legX, pelvisY - 0.03, 0]} material={jointMat}>
              <sphereGeometry args={[upperLegR * 1.15, 16, 12]} />
            </mesh>
            {/* Upper leg */}
            <mesh position={[legX, upperLegY, 0]} material={bodyMat} castShadow>
              <capsuleGeometry args={[upperLegR, upperLegH * 0.65, 6, 18]} />
            </mesh>
            {/* Quad muscle */}
            {viewMode === "muscle" && (
              <mesh position={[legX, upperLegY + upperLegH * 0.05, upperLegR * 0.55]} material={muscleMat}>
                <capsuleGeometry args={[upperLegR * 0.75, upperLegH * 0.55, 6, 14]} />
              </mesh>
            )}
            {/* Femur bone (x-ray) */}
            <mesh position={[legX, upperLegY, 0]} material={boneMat}>
              <capsuleGeometry args={[0.014 * s, upperLegH * 0.8, 4, 8]} />
            </mesh>
            {/* Knee */}
            <mesh position={[legX, kneeY, 0]} material={jointMat}>
              <sphereGeometry args={[lowerLegR * 1.2, 12, 10]} />
            </mesh>
            {/* Lower leg */}
            <mesh position={[legX, lowerLegY, 0]} material={bodyMat} castShadow>
              <capsuleGeometry args={[lowerLegR, lowerLegH * 0.65, 6, 16]} />
            </mesh>
            {/* Calf muscle */}
            {viewMode === "muscle" && (
              <mesh position={[legX, lowerLegY - lowerLegH * 0.1, -lowerLegR * 0.6]} material={muscleMat}>
                <capsuleGeometry args={[lowerLegR * 0.65, lowerLegH * 0.35, 4, 10]} />
              </mesh>
            )}
            {/* Ankle */}
            <mesh position={[legX, feetY + 0.03, 0]} material={jointMat}>
              <sphereGeometry args={[lowerLegR * 0.85, 10, 8]} />
            </mesh>
            {/* Foot */}
            <mesh position={[legX, feetY - 0.01, 0.055 * s]} material={bodyMat} castShadow
              rotation={[0.12, 0, 0]}>
              <boxGeometry args={[0.068 * s, 0.035 * s, 0.16 * s]} />
            </mesh>
          </group>
        );
      })}

      {/* ── Pelvis ── */}
      <mesh position={[0, pelvisY, 0]} material={jointMat}>
        <cylinderGeometry args={[hipW * 0.44, hipW * 0.48, 0.075 * s, 24]} />
      </mesh>
    </group>
  );
}

/* ─── Hotspot Spheres ───────────────────────────────────────────────────── */
function HealthHotspots({
  params, regions, activeRegion, onSelect,
}: {
  params: BodyParams;
  regions: BodyRegion[];
  activeRegion: string | null;
  onSelect: (id: string) => void;
}) {
  const s = params.heightCm / 175;
  const refs = useRef<Record<string, THREE.Mesh>>({});

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    regions.forEach((r) => {
      const mesh = refs.current[r.id];
      if (!mesh) return;
      const isActive = activeRegion === r.id;
      const scale = isActive
        ? 1 + Math.sin(t * 4) * 0.25
        : 0.85 + Math.sin(t * 1.5 + regions.indexOf(r)) * 0.1;
      mesh.scale.setScalar(scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        isActive ? 0.9 : 0.55 + Math.sin(t * 2 + regions.indexOf(r)) * 0.15;
    });
  });

  return (
    <group>
      {regions.map((region) => (
        <mesh
          key={region.id}
          ref={(el) => { if (el) refs.current[region.id] = el; }}
          position={region.position}
          onClick={(e) => { e.stopPropagation(); onSelect(region.id); }}
        >
          <sphereGeometry args={[0.032 * s, 12, 8]} />
          <meshBasicMaterial
            color={new THREE.Color(region.color)}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
      {/* Outer glow rings */}
      {regions.map((region) => (
        <mesh
          key={`ring-${region.id}`}
          position={region.position}
          onClick={(e) => { e.stopPropagation(); onSelect(region.id); }}
        >
          <torusGeometry args={[0.04 * s, 0.004 * s, 6, 20]} />
          <meshBasicMaterial
            color={new THREE.Color(region.glowColor)}
            transparent
            opacity={activeRegion === region.id ? 0.9 : 0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Scan Ring ─────────────────────────────────────────────────────────── */
function ScanRing({ heightCm }: { heightCm: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const s = heightCm / 175;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    const y = -s * 0.88 + ((t * 0.4) % (s * 1.9));
    ref.current.position.y = y;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * 3) * 0.03;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.18 * s, 0.28 * s, 48]} />
      <meshBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─── Grid Platform ─────────────────────────────────────────────────────── */
function Platform({ heightCm }: { heightCm: number }) {
  const s = heightCm / 175;
  const gridGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pts: number[] = [];
    const sz = 1.6;
    const steps = 14;
    const step = (sz * 2) / steps;
    for (let i = -sz; i <= sz + 0.001; i += step) {
      pts.push(i, 0, -sz, i, 0, sz, -sz, 0, i, sz, 0, i);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  return (
    <group position={[0, -s * 0.88 - 0.06, 0]}>
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.05} />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 64]} />
        <meshBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.42, 64]} />
        <meshBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.56, 64]} />
        <meshBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─── Lighting ───────────────────────────────────────────────────────────── */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.25} color={new THREE.Color(0x8090c0)} />
      <directionalLight position={[4, 7, 3]} intensity={1.4} color={new THREE.Color(0xd0e8ff)} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} color={new THREE.Color(0x6060d0)} />
      <pointLight position={[0, 2.5, 2.5]} intensity={1.0} color={new THREE.Color(0x6ee7f7)} distance={7} />
      <pointLight position={[0, -0.5, 1.5]} intensity={0.4} color={new THREE.Color(0xa855f7)} distance={5} />
      <pointLight position={[1.5, 1, -1]} intensity={0.25} color={new THREE.Color(0x4488ff)} distance={4} />
    </>
  );
}

/* ─── Info Panel (HTML overlay) ─────────────────────────────────────────── */
function InfoPanel({ region, onClose }: { region: BodyRegion; onClose: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        pointerEvents: "auto",
        width: 260,
        background: "rgba(2,6,20,0.92)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(110,231,247,0.18)",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 24px rgba(110,231,247,0.06)",
        color: "#e2e8f0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        fontSize: 12,
        lineHeight: 1.6,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{region.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: region.color }}>{region.labelRu}</span>
        <button
          onClick={onClose}
          style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)",
            cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
        >×</button>
      </div>
      <div style={{ color: "rgba(226,232,240,0.75)", fontSize: 11 }}>{region.info}</div>
      <div style={{ marginTop: 8, fontSize: 10, color: "rgba(110,231,247,0.45)", letterSpacing: "0.05em" }}>
        НАУЧНАЯ БАЗА · {region.system.toUpperCase()}
      </div>
    </div>
  );
}

/* ─── View Mode Toggle UI ────────────────────────────────────────────────── */
function ViewToggle({
  mode, onChange,
}: {
  mode: "surface" | "xray" | "muscle";
  onChange: (m: "surface" | "xray" | "muscle") => void;
}) {
  const modes: { id: "surface" | "xray" | "muscle"; label: string }[] = [
    { id: "surface", label: "Тело" },
    { id: "xray", label: "Скелет" },
    { id: "muscle", label: "Мышцы" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 6, zIndex: 50, pointerEvents: "auto",
      background: "rgba(2,6,20,0.7)", backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 40, padding: "4px",
    }}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          style={{
            background: mode === m.id ? "rgba(110,231,247,0.15)" : "transparent",
            border: mode === m.id ? "1px solid rgba(110,231,247,0.35)" : "1px solid transparent",
            color: mode === m.id ? "#6ee7f7" : "rgba(255,255,255,0.3)",
            borderRadius: 32, padding: "5px 14px", fontSize: 11, cursor: "pointer",
            transition: "all 0.2s", fontFamily: "inherit",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Scene wrapper ─────────────────────────────────────────────────────── */
function Scene({
  params, activeRegion, onRegionClick, viewMode,
}: {
  params: BodyParams;
  activeRegion: string | null;
  onRegionClick: (id: string) => void;
  viewMode: "surface" | "xray" | "muscle";
}) {
  const regions = useMemo(() => getRegions(params.heightCm), [params.heightCm]);
  const activeReg = regions.find((r) => r.id === activeRegion);
  const s = params.heightCm / 175;

  return (
    <>
      <SceneLighting />
      <HumanBody
        params={params}
        activeRegion={activeRegion}
        onRegionClick={onRegionClick}
        viewMode={viewMode}
      />
      <HealthHotspots
        params={params}
        regions={regions}
        activeRegion={activeRegion}
        onSelect={onRegionClick}
      />
      <ScanRing heightCm={params.heightCm} />
      <Platform heightCm={params.heightCm} />
      <OrbitControls
        enablePan={false}
        minDistance={1.1}
        maxDistance={4.5}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.88}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
      />
      <fog attach="fog" args={["#020209", 8, 16]} />

      {activeReg && (
        <Html
          position={[
            activeReg.position[0] > 0 ? -0.65 * s : 0.65 * s,
            activeReg.position[1],
            0,
          ]}
          center={false}
          distanceFactor={2}
          style={{ pointerEvents: "none" }}
        >
          <InfoPanel region={activeReg} onClose={() => onRegionClick(activeRegion!)} />
        </Html>
      )}
    </>
  );
}

/* ─── Public Component ─────────────────────────────────────────────────────*/
export interface BodySceneProps {
  params: BodyParams;
  className?: string;
}

export default function BodyScene({ params, className }: BodySceneProps) {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"surface" | "xray" | "muscle">("surface");
  const s = params.heightCm / 175;

  const handleRegionClick = useCallback((id: string) => {
    setActiveRegion((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      <Canvas
        camera={{ position: [0, 0.28 * s, 2.4], fov: 44, near: 0.01, far: 50 }}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
        onPointerMissed={() => setActiveRegion(null)}
      >
        <Suspense fallback={null}>
          <Scene
            params={params}
            activeRegion={activeRegion}
            onRegionClick={handleRegionClick}
            viewMode={viewMode}
          />
        </Suspense>
      </Canvas>

      <ViewToggle mode={viewMode} onChange={setViewMode} />

      {/* Hint */}
      {!activeRegion && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          fontSize: 10, color: "rgba(110,231,247,0.35)", letterSpacing: "0.08em",
          pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          НАЖМИ НА ТОЧКУ · КРУТИ МЫШКОЙ / ПАЛЬЦЕМ
        </div>
      )}
    </div>
  );
}
