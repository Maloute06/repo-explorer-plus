import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Environment, Html, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { playerHue } from "@/lib/game-utils";

export interface Racer3DState {
  name: string;
  /** 0 → 1 progression le long de la piste */
  p: number;
  /** couloir latéral -1 → 1 */
  lane: number;
  arrived: boolean;
}

/* ------------------------------------------------------------------ piste */

const LENGTH = 260;
const DROP = 34;
const WIDTH = 9;
const WALL = 1.35;

function trackPoint(p: number, out = new THREE.Vector3()) {
  const z = -p * LENGTH;
  const x = Math.sin(p * Math.PI * 4.6) * 15 + Math.sin(p * Math.PI * 11.3) * 3.2;
  const y = 16 - p * DROP - Math.sin(p * Math.PI * 3) * 1.6;
  return out.set(x, y, z);
}

function trackCurve() {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 600; i++) pts.push(trackPoint(i / 600));
  return new THREE.CatmullRomCurve3(pts);
}

const UP = new THREE.Vector3(0, 1, 0);

/** Repère local (position, côté) à la progression p. */
function frameAt(p: number, pos: THREE.Vector3, side: THREE.Vector3) {
  const a = trackPoint(Math.max(0, p - 0.0012));
  const b = trackPoint(Math.min(1, p + 0.0012));
  trackPoint(p, pos);
  side.subVectors(b, a).normalize().cross(UP).normalize();
}

function ribbon() {
  const SEG = 600;
  const floor: number[] = [];
  const wall: number[] = [];
  const pA = new THREE.Vector3();
  const sA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const sB = new THREE.Vector3();
  const push = (arr: number[], v: THREE.Vector3) => arr.push(v.x, v.y, v.z);
  const tmp = new THREE.Vector3();
  const edge = (p: THREE.Vector3, s: THREE.Vector3, sign: number, dy: number) =>
    tmp.copy(p).addScaledVector(s, (sign * WIDTH) / 2).setY(p.y + dy);

  for (let i = 0; i < SEG; i++) {
    frameAt(i / SEG, pA, sA);
    frameAt((i + 1) / SEG, pB, sB);
    const al = edge(pA, sA, -1, 0).clone();
    const ar = edge(pA, sA, 1, 0).clone();
    const bl = edge(pB, sB, -1, 0).clone();
    const br = edge(pB, sB, 1, 0).clone();
    push(floor, al);
    push(floor, ar);
    push(floor, br);
    push(floor, al);
    push(floor, br);
    push(floor, bl);
    for (const sign of [-1, 1]) {
      const a0 = sign < 0 ? al : ar;
      const b0 = sign < 0 ? bl : br;
      const a1 = a0.clone().setY(a0.y + WALL);
      const b1 = b0.clone().setY(b0.y + WALL);
      push(wall, a0);
      push(wall, a1);
      push(wall, b1);
      push(wall, a0);
      push(wall, b1);
      push(wall, b0);
    }
  }
  const make = (arr: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  };
  return { floor: make(floor), wall: make(wall) };
}

/* --------------------------------------------------------------- textures */

function makeAsphaltTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#20283a";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    const g = 26 + Math.random() * 70;
    ctx.fillStyle = `rgba(${g},${g + 8},${g + 22},${0.15 + Math.random() * 0.35})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
  }
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = "rgba(190,215,140,0.16)";
    ctx.fillRect(0, i * 102, 512, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 90);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#141d20";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = `rgba(${60 + Math.random() * 60},${90 + Math.random() * 70},${70 + Math.random() * 50},${0.05 + Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 4, Math.random() * 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ décor */

function Track() {
  const { floor, wall } = useMemo(ribbon, []);
  const asphalt = useMemo(makeAsphaltTexture, []);
  const rails = useMemo(() => {
    const curve = trackCurve();
    const pos = new THREE.Vector3();
    const side = new THREE.Vector3();
    const build = (sign: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 300; i++) {
        frameAt(i / 300, pos, side);
        pts.push(pos.clone().addScaledVector(side, (sign * WIDTH) / 2).setY(pos.y + WALL));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.12, 6, false);
    };
    void curve;
    return [build(-1), build(1)];
  }, []);

  return (
    <group>
      <mesh geometry={floor} receiveShadow>
        <meshStandardMaterial map={asphalt} color="#8ea3c0" metalness={0.35} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={wall}>
        <meshStandardMaterial
          color="#2c4a44"
          emissive="#8fd36a"
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.4}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>
      {rails.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#d6ff8f" emissive="#c3f472" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Portiques lumineux répartis le long de la piste. */
function Gates() {
  const gates = useMemo(() => {
    const pos = new THREE.Vector3();
    const side = new THREE.Vector3();
    const out: { p: [number, number, number]; ry: number }[] = [];
    for (let i = 1; i < 14; i++) {
      const p = i / 14;
      frameAt(p, pos, side);
      out.push({
        p: [pos.x, pos.y + 1.2, pos.z],
        ry: Math.atan2(side.z, side.x) + Math.PI / 2,
      });
    }
    return out;
  }, []);
  return (
    <>
      {gates.map((g, i) => (
        <mesh key={i} position={g.p} rotation-y={g.ry}>
          <torusGeometry args={[WIDTH * 0.62, 0.14, 8, 40, Math.PI]} />
          <meshStandardMaterial
            color="#7b4fd6"
            emissive="#a86bff"
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function FinishLine() {
  const pos = useMemo(() => {
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    frameAt(0.995, p, s);
    return { p, ry: Math.atan2(s.z, s.x) + Math.PI / 2 };
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.2;
  });
  return (
    <group position={[pos.p.x, pos.p.y, pos.p.z]} rotation-y={pos.ry}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[WIDTH, 2]} />
        <meshStandardMaterial color="#f5d14a" emissive="#f5d14a" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={ref} position={[0, 4, 0]}>
        <planeGeometry args={[WIDTH, 8]} />
        <meshBasicMaterial
          color="#f5d14a"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function Ground() {
  const tex = useMemo(makeGroundTexture, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -26, -LENGTH / 2]} receiveShadow>
      <planeGeometry args={[420, 520]} />
      <meshStandardMaterial map={tex} color="#4e6b5a" roughness={1} />
    </mesh>
  );
}

/** Colonnes de soutien sous la piste. */
function Pillars() {
  const items = useMemo(() => {
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const out: { x: number; y: number; z: number; h: number }[] = [];
    for (let i = 0; i <= 26; i++) {
      frameAt(i / 26, p, s);
      const h = p.y + 26;
      out.push({ x: p.x, y: p.y - h / 2, z: p.z, h });
    }
    return out;
  }, []);
  return (
    <>
      {items.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} castShadow>
          <cylinderGeometry args={[0.5, 0.9, c.h, 10]} />
          <meshStandardMaterial color="#23303a" roughness={0.8} metalness={0.3} />
        </mesh>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- coureurs */

function Racer({ state, rank }: { state: Racer3DState; rank: number }) {
  const ref = useRef<THREE.Group>(null);
  const hue = playerHue(state.name);
  const color = useMemo(() => new THREE.Color().setStyle(`oklch(0.75 0.16 ${hue})`), [hue]);
  const lead = rank === 1;
  const pos = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    frameAt(THREE.MathUtils.clamp(state.p, 0, 1), pos, side);
    const wob = Math.sin(clock.elapsedTime * 3 + hue) * 0.35;
    g.position.set(
      pos.x + side.x * (state.lane * (WIDTH / 2 - 1) + wob),
      pos.y + 0.55,
      pos.z + side.z * (state.lane * (WIDTH / 2 - 1) + wob),
    );
    g.rotation.x -= 0.22;
  });

  const r = lead ? 0.62 : 0.52;

  return (
    <group ref={ref}>
      <mesh castShadow>
        <sphereGeometry args={[r, 26, 26]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={lead ? 1.5 : 0.7}
          metalness={0.8}
          roughness={0.12}
        />
      </mesh>
      <Billboard position={[0, r + 0.75, 0]}>
        <Html center distanceFactor={26} zIndexRange={[20, 0]}>
          <span
            className="pointer-events-none flex select-none items-center gap-1 whitespace-nowrap rounded-full px-2 py-[2px] font-mono text-[12px] font-semibold backdrop-blur-sm"
            style={{
              background: "oklch(0.16 0.02 210 / 78%)",
              border: `1px solid oklch(0.75 0.12 ${hue} / 70%)`,
              color: `oklch(0.93 0.09 ${hue})`,
              boxShadow: lead ? "0 0 16px oklch(0.85 0.16 95 / 60%)" : undefined,
            }}
          >
            {lead && <span>👑</span>}
            {state.name}
            {state.arrived && <span>🏁</span>}
          </span>
        </Html>
      </Billboard>
    </group>
  );
}

/** Caméra poursuite derrière le leader. */
function ChaseCam({ leadP }: { leadP: number }) {
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = THREE.MathUtils.clamp(leadP, 0, 1);
    frameAt(p, pos, side);
    frameAt(Math.min(1, p + 0.035), ahead, side);
    const back = new THREE.Vector3().subVectors(pos, ahead).normalize();
    const orbit = Math.sin(clock.elapsedTime * 0.25) * 3.2;
    target
      .copy(pos)
      .addScaledVector(back, 15)
      .addScaledVector(side, orbit)
      .setY(pos.y + 7.5);
    camera.position.lerp(target, 1 - Math.exp(-3.2 * dt));
    look.lerp(ahead.clone().setY(ahead.y + 1.2), 1 - Math.exp(-4 * dt));
    camera.lookAt(look);
  });
  return null;
}

export default function Race3D({
  racers,
  ranks,
  leadP,
}: {
  racers: Racer3DState[];
  ranks: Record<string, number>;
  leadP: number;
}) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 24, 22], fov: 55 }} gl={{ antialias: true }}>
      <color attach="background" args={["#07110f"]} />
      <fog attach="fog" args={["#0b1a1c", 40, 170]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#9fd48f", "#16232b", 0.8]} />
      <directionalLight
        position={[30, 50, 10]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Environment>
        <Lightformer intensity={2} position={[0, 30, -60]} scale={[40, 20, 1]} />
        <Lightformer
          intensity={1.2}
          color="#a86bff"
          position={[-30, 8, -80]}
          rotation-y={Math.PI / 2}
          scale={[60, 8, 1]}
        />
      </Environment>
      <ChaseCam leadP={leadP} />
      <Ground />
      <Pillars />
      <Track />
      <Gates />
      <FinishLine />
      {racers.map((r) => (
        <Racer key={r.name} state={r} rank={ranks[r.name] ?? 99} />
      ))}
    </Canvas>
  );
}
