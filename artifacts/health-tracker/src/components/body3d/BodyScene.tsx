import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float } from "@react-three/drei";
import * as THREE from "three";

interface BodyParams {
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  muscleMass?: number;
  sex: "male" | "female";
}

function HumanBody({ params }: { params: BodyParams }) {
  const groupRef = useRef<THREE.Group>(null!);

  const { heightCm, weightKg, bodyFatPct, sex } = params;

  // Derived proportions
  const hScale = heightCm / 175;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const fatFactor = bodyFatPct ? bodyFatPct / 22 : Math.max(0.8, Math.min(2.2, bmi / 21));
  const isFemale = sex === "female";

  // Body part dimensions (normalized)
  const headR = 0.13 * hScale;
  const neckR = 0.055 * hScale;
  const neckH = 0.09 * hScale;

  const shoulderW = (isFemale ? 0.28 : 0.33) * hScale * Math.max(0.9, 1 + (fatFactor - 1) * 0.3);
  const chestW = (isFemale ? 0.22 : 0.26) * hScale * Math.max(0.95, fatFactor * 0.9);
  const waistW = (isFemale ? 0.16 : 0.2) * hScale * fatFactor;
  const hipW = (isFemale ? 0.26 : 0.22) * hScale * Math.max(1, fatFactor);
  const torsoH = 0.42 * hScale;

  const upperArmR = 0.055 * hScale * Math.max(0.9, fatFactor * 0.85);
  const upperArmH = 0.24 * hScale;
  const lowerArmR = 0.045 * hScale;
  const lowerArmH = 0.22 * hScale;

  const upperLegR = 0.085 * hScale * Math.max(0.9, fatFactor * 0.9);
  const upperLegH = 0.32 * hScale;
  const lowerLegR = 0.06 * hScale;
  const lowerLegH = 0.29 * hScale;

  // Heights from feet
  const feetY = -hScale * 0.85;
  const lowerLegY = feetY + lowerLegH / 2 + 0.04;
  const upperLegY = feetY + lowerLegH + upperLegH / 2 + 0.04;
  const pelvisY = upperLegY + upperLegH / 2;
  const torsoY = pelvisY + torsoH / 2;
  const neckY = pelvisY + torsoH + neckH / 2;
  const headY = neckY + neckH / 2 + headR;
  const armY = pelvisY + torsoH * 0.78;
  const elbowY = armY - upperArmH;
  const handY = elbowY - lowerArmH;

  // Materials
  const bodyMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0d1b2e),
    emissive: new THREE.Color(0x051220),
    metalness: 0.05,
    roughness: 0.85,
    clearcoat: 0.1,
  }), []);

  const glowMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1a3a5c),
    emissive: new THREE.Color(0x0a2040),
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.3,
    side: THREE.FrontSide,
  }), []);

  const jointMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1a2a3e),
    emissive: new THREE.Color(0x0d2030),
    metalness: 0.2,
    roughness: 0.7,
  }), []);

  const Torso = () => {
    const shape = useMemo(() => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -torsoH / 2, 0),
        new THREE.Vector3(hipW / 2, -torsoH * 0.3, 0),
        new THREE.Vector3(waistW / 2, 0, 0),
        new THREE.Vector3(chestW / 2, torsoH * 0.3, 0),
        new THREE.Vector3(shoulderW / 2, torsoH / 2, 0),
      ]);
      return curve;
    }, []);

    return (
      <group position={[0, torsoY, 0]}>
        <mesh material={bodyMat} castShadow>
          <cylinderGeometry args={[shoulderW / 2, hipW / 2, torsoH, 24, 6]} />
        </mesh>
        {/* Waist indent */}
        <mesh material={bodyMat} position={[0, -torsoH * 0.05, 0]}>
          <cylinderGeometry args={[waistW / 2 + 0.01, waistW / 2 + 0.01, torsoH * 0.18, 24, 2]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, headY, 0]} material={bodyMat} castShadow>
        <sphereGeometry args={[headR, 24, 20]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, neckY, 0]} material={jointMat} castShadow>
        <cylinderGeometry args={[neckR, neckR * 1.1, neckH, 16]} />
      </mesh>

      {/* Torso */}
      <Torso />

      {/* Pelvis */}
      <mesh position={[0, pelvisY + 0.02, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[hipW / 2 * 0.9, hipW / 2 * 0.95, 0.08 * hScale, 24, 2]} />
      </mesh>

      {/* Upper arms */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Shoulder joint */}
          <mesh position={[(shoulderW / 2 + 0.02) * side, armY + upperArmH * 0.05, 0]} material={jointMat}>
            <sphereGeometry args={[upperArmR * 1.2, 12, 10]} />
          </mesh>
          {/* Upper arm */}
          <mesh position={[(shoulderW / 2 + upperArmR + 0.02) * side, armY - upperArmH / 2, 0]} material={bodyMat} castShadow
            rotation={[0, 0, side * 0.08]}>
            <cylinderGeometry args={[upperArmR, upperArmR * 0.9, upperArmH, 14]} />
          </mesh>
          {/* Elbow */}
          <mesh position={[(shoulderW / 2 + upperArmR * 1.5 + 0.02) * side, elbowY, 0]} material={jointMat}>
            <sphereGeometry args={[lowerArmR * 1.15, 10, 8]} />
          </mesh>
          {/* Lower arm */}
          <mesh position={[(shoulderW / 2 + upperArmR * 1.5 + 0.02) * side, handY + lowerArmH / 2, 0]} material={bodyMat} castShadow>
            <cylinderGeometry args={[lowerArmR, lowerArmR * 0.8, lowerArmH, 12]} />
          </mesh>
          {/* Hand */}
          <mesh position={[(shoulderW / 2 + upperArmR * 1.5 + 0.02) * side, handY - 0.04 * hScale, 0]} material={jointMat}>
            <sphereGeometry args={[lowerArmR * 0.9, 10, 8]} />
          </mesh>
        </group>
      ))}

      {/* Upper legs */}
      {[-1, 1].map((side) => {
        const legX = hipW * 0.38 * side;
        return (
          <group key={side}>
            {/* Hip joint */}
            <mesh position={[legX, pelvisY - 0.02, 0]} material={jointMat}>
              <sphereGeometry args={[upperLegR * 1.1, 12, 10]} />
            </mesh>
            {/* Upper leg */}
            <mesh position={[legX, upperLegY, 0]} material={bodyMat} castShadow>
              <cylinderGeometry args={[upperLegR, upperLegR * 0.85, upperLegH, 16]} />
            </mesh>
            {/* Knee */}
            <mesh position={[legX, feetY + lowerLegH + 0.04, 0]} material={jointMat}>
              <sphereGeometry args={[lowerLegR * 1.15, 10, 8]} />
            </mesh>
            {/* Lower leg */}
            <mesh position={[legX, lowerLegY, 0]} material={bodyMat} castShadow>
              <cylinderGeometry args={[lowerLegR, lowerLegR * 0.75, lowerLegH, 14]} />
            </mesh>
            {/* Foot */}
            <mesh position={[legX, feetY, side > 0 ? 0.04 : 0.04]} material={jointMat}>
              <boxGeometry args={[0.07 * hScale, 0.04 * hScale, 0.14 * hScale]} />
            </mesh>
          </group>
        );
      })}

      {/* Subtle glow shell */}
      <mesh position={[0, torsoY, 0]} material={glowMat}>
        <cylinderGeometry args={[shoulderW / 2 + 0.025, hipW / 2 + 0.025, torsoH + 0.05, 24, 4]} />
      </mesh>
    </group>
  );
}

function GridFloor({ hScale }: { hScale: number }) {
  const gridRef = useRef<THREE.Group>(null!);

  const lines = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const size = 2;
    const divisions = 10;
    const step = (size * 2) / divisions;
    for (let i = -size; i <= size; i += step) {
      positions.push(i, 0, -size, i, 0, size);
      positions.push(-size, 0, i, size, 0, i);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group ref={gridRef} position={[0, -hScale * 0.85 - 0.06, 0]}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.06} />
      </lineSegments>
      {/* Platform circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 64]} />
        <meshBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.4, 64]} />
        <meshBasicMaterial color={new THREE.Color(0x6ee7f7)} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function BodyLights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color={new THREE.Color(0xd0e8ff)} castShadow />
      <directionalLight position={[-3, 2, -1]} intensity={0.4} color={new THREE.Color(0x8080ff)} />
      <pointLight position={[0, 2, 2]} intensity={0.8} color={new THREE.Color(0x6ee7f7)} distance={6} />
      <pointLight position={[0, -1, 1]} intensity={0.3} color={new THREE.Color(0xa855f7)} distance={4} />
    </>
  );
}

export interface BodySceneProps {
  params: BodyParams;
  className?: string;
}

export default function BodyScene({ params, className }: BodySceneProps) {
  const hScale = params.heightCm / 175;

  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0.3 * hScale, 2.2], fov: 45, near: 0.01, far: 100 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <BodyLights />
        <Float speed={0.6} rotationIntensity={0} floatIntensity={0.3}>
          <HumanBody params={params} />
        </Float>
        <GridFloor hScale={hScale} />
        <OrbitControls
          enablePan={false}
          minDistance={1.2}
          maxDistance={4}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.85}
          autoRotate={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
        />
        <fog attach="fog" args={["#020209", 6, 12]} />
      </Suspense>
    </Canvas>
  );
}
