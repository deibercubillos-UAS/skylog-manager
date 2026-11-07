'use client';

// Simulador 3D — prototipo de la Fase 0 (docs/skylog-v2/45-simulador-3d-plan.md, entregable 0.3).
// SOLO mide rendimiento en el equipo real (celular, control RC Plus 2) y detecta si el control expone sus palancas al
// navegador. NO es el simulador: el movimiento del dron aquí es un modelo cinemático de prueba, sin la física de la
// Fase 1, y nada de lo que pasa en esta pantalla se guarda en la base.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const QUALITY = {
  alto: { label: 'Alto', dpr: 2, shadows: true, shadowMap: 2048, antialias: true },
  medio: { label: 'Medio', dpr: 1.5, shadows: true, shadowMap: 1024, antialias: true },
  bajo: { label: 'Bajo', dpr: 1, shadows: false, shadowMap: 0, antialias: false },
};

const TERRAIN_SIZE = 400;
const heightAt = (x, z) => 2.2 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + 1.2 * Math.sin((x + z) * 0.06) + 0.4 * Math.cos(x * 0.15);

// Generador pseudoaleatorio con semilla: la escena es idéntica en todos los equipos, para que las mediciones se comparen.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function Terrain({ shadows }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 128, 128);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = heightAt(pos.getX(i), pos.getZ(i));
      pos.setY(i, h);
      c.setHSL(0.27 + h * 0.008, 0.45, 0.3 + h * 0.02);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geometry} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

function Trees({ shadows, count = 400 }) {
  const trunks = useRef();
  const crowns = useRef();
  useEffect(() => {
    const r = rng(42);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      let x;
      let z;
      do {
        x = (r() - 0.5) * TERRAIN_SIZE * 0.9;
        z = (r() - 0.5) * TERRAIN_SIZE * 0.9;
      } while (Math.hypot(x, z) < 35); // claro despejado alrededor del punto de despegue
      const s = 0.8 + r() * 0.8;
      const y = heightAt(x, z);
      m.compose(new THREE.Vector3(x, y + 1.5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      trunks.current.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, y + 4.5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      crowns.current.setMatrixAt(i, m);
    }
    trunks.current.instanceMatrix.needsUpdate = true;
    crowns.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <>
      <instancedMesh ref={trunks} args={[null, null, count]} castShadow={shadows}>
        <cylinderGeometry args={[0.25, 0.35, 3, 6]} />
        <meshStandardMaterial color="#6b4a2b" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[null, null, count]} castShadow={shadows}>
        <coneGeometry args={[1.8, 4.5, 7]} />
        <meshStandardMaterial color="#2f6b34" />
      </instancedMesh>
    </>
  );
}

function Structures({ shadows }) {
  const cones = useMemo(() => Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return [Math.cos(a) * 15, Math.sin(a) * 15];
  }), []);
  const buildings = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 10 }, () => {
      const x = 60 + r() * 60;
      const z = -40 + r() * 80;
      return { x, z, w: 6 + r() * 8, d: 6 + r() * 8, h: 5 + r() * 15 };
    });
  }, []);
  return (
    <>
      {/* Plataforma de despegue */}
      <mesh position={[0, heightAt(0, 0) + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#ec5b13" />
      </mesh>
      {cones.map(([x, z], i) => (
        <mesh key={i} position={[x, heightAt(x, z) + 0.4, z]} castShadow={shadows}>
          <coneGeometry args={[0.3, 0.8, 12]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
      ))}
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, heightAt(b.x, b.z) + b.h / 2, b.z]} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#9aa3b2" />
        </mesh>
      ))}
      {/* Torre de inspección */}
      <group position={[-50, heightAt(-50, 30), 30]}>
        <mesh position={[0, 20, 0]} castShadow={shadows}>
          <cylinderGeometry args={[0.6, 1.2, 40, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.5} />
        </mesh>
        {[10, 22, 34].map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow={shadows}>
            <boxGeometry args={[9, 0.4, 0.4]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.4} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function Drone({ state, shadows }) {
  const group = useRef();
  const rotors = useRef([]);
  useFrame((_, delta) => {
    const s = state.current;
    group.current.position.set(s.x, s.y, s.z);
    group.current.rotation.set(s.pitch, s.yaw, s.roll, 'YXZ');
    rotors.current.forEach((r) => { if (r) r.rotation.y += delta * 60; });
  });
  const arms = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  return (
    <group ref={group}>
      <mesh castShadow={shadows}>
        <boxGeometry args={[0.35, 0.12, 0.5]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, -0.05, -0.27]}>
        <boxGeometry args={[0.12, 0.1, 0.08]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {arms.map(([ax, az], i) => (
        <group key={i}>
          <mesh position={[ax * 0.22, 0, az * 0.22]} rotation={[0, Math.atan2(ax, az), 0]} castShadow={shadows}>
            <boxGeometry args={[0.04, 0.04, 0.5]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <mesh ref={(r) => { rotors.current[i] = r; }} position={[ax * 0.38, 0.06, az * 0.38]}>
            <cylinderGeometry args={[0.17, 0.17, 0.01, 16]} />
            <meshStandardMaterial color="#9ca3af" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Modelo cinemático SOLO de prueba: velocidad objetivo según palancas, con suavizado. La física real es la Fase 1.
function stepKinematic(s, input, dt) {
  const maxH = 12;
  const maxV = 4;
  const yawRate = 1.6;
  s.yaw -= input.yaw * yawRate * dt;
  const fwd = input.pitch * maxH;
  const side = input.roll * maxH;
  const targetVx = -Math.sin(s.yaw) * fwd + Math.cos(s.yaw) * side;
  const targetVz = -Math.cos(s.yaw) * fwd - Math.sin(s.yaw) * side;
  const k = Math.min(1, dt * 2.5);
  s.vx += (targetVx - s.vx) * k;
  s.vz += (targetVz - s.vz) * k;
  s.vy += (input.throttle * maxV - s.vy) * k;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y = Math.max(heightAt(s.x, s.z) + 0.15, s.y + s.vy * dt);
  s.pitch = THREE.MathUtils.lerp(s.pitch, -input.pitch * 0.35, k);
  s.roll = THREE.MathUtils.lerp(s.roll, -input.roll * 0.35, k);
}

// Recorrido fijo para la prueba automática: el mismo vuelo en todos los equipos.
function scriptedInput(t) {
  if (t < 3) return { throttle: 0.8, yaw: 0, pitch: 0, roll: 0 };
  return { throttle: Math.sin(t * 0.4) * 0.3, yaw: 0.35, pitch: 0.7, roll: Math.sin(t * 0.7) * 0.3 };
}

function Rig({ mode, inputRef, state, cameraMode, onFrame, onHud }) {
  const { camera } = useThree();
  const t = useRef(0);
  const hudT = useRef(0);
  const pilot = useMemo(() => new THREE.Vector3(0, heightAt(0, 8) + 1.7, 8), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt;
    const input = mode === 'auto' ? scriptedInput(t.current) : inputRef.current;
    const s = state.current;
    stepKinematic(s, input, dt);
    if (cameraMode === 'piloto') {
      camera.position.copy(pilot);
    } else {
      const back = new THREE.Vector3(Math.sin(s.yaw) * 6, 2.5, Math.cos(s.yaw) * 6);
      camera.position.lerp(new THREE.Vector3(s.x, s.y, s.z).add(back), Math.min(1, dt * 4));
    }
    camera.lookAt(s.x, s.y, s.z);
    onFrame(delta);
    hudT.current += dt;
    if (hudT.current > 0.1) {
      hudT.current = 0;
      onHud({
        alt: s.y - heightAt(0, 0),
        hs: Math.hypot(s.vx, s.vz),
        vs: s.vy,
        dist: Math.hypot(s.x, s.z),
        hdg: ((((-s.yaw * 180) / Math.PI) % 360) + 360) % 360,
      });
    }
  });
  return null;
}

/** Escena 3D. `onReady(info)` entrega el nombre de la GPU; `onFrame(delta)` cada cuadro, para medir. */
export function PrototypeScene({ quality, mode, cameraMode, inputRef, onReady, onFrame, onHud }) {
  const q = QUALITY[quality];
  const state = useRef({ x: 0, y: heightAt(0, 0) + 0.15, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, roll: 0 });
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, q.dpr);
  return (
    <Canvas
      key={quality}
      dpr={dpr}
      shadows={q.shadows}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance' }}
      camera={{ fov: 60, near: 0.1, far: 800, position: [0, 5, 10] }}
      onCreated={({ gl }) => {
        const ctx = gl.getContext();
        const ext = ctx.getExtension('WEBGL_debug_renderer_info');
        onReady({ gpu: ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER), dpr });
      }}
    >
      <color attach="background" args={['#bcd7ef']} />
      <fog attach="fog" args={['#bcd7ef', 120, 380]} />
      <hemisphereLight args={['#ffffff', '#4b6b3a', 0.7]} />
      <directionalLight
        position={[60, 90, 40]}
        intensity={1.6}
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap || 512, q.shadowMap || 512]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <Terrain shadows={q.shadows} />
      <Trees shadows={q.shadows} />
      <Structures shadows={q.shadows} />
      <Drone state={state} shadows={q.shadows} />
      <Rig mode={mode} inputRef={inputRef} state={state} cameraMode={cameraMode} onFrame={onFrame} onHud={onHud} />
    </Canvas>
  );
}

/** Palanca táctil: devuelve x/y entre -1 y 1 mientras se arrastra; vuelve al centro al soltar. */
export function TouchStick({ label, onChange }) {
  const ref = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    const rad = r.width / 2;
    let x = (e.clientX - (r.left + rad)) / rad;
    let y = (e.clientY - (r.top + rad)) / rad;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    setKnob({ x, y });
    onChange(x, -y);
  };
  const end = () => { setKnob({ x: 0, y: 0 }); onChange(0, 0); };
  return (
    <div
      ref={ref}
      aria-label={label}
      className="relative size-32 rounded-full bg-black/25 border-2 border-white/40 touch-none select-none"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute size-12 rounded-full bg-white/80 shadow"
        style={{ left: `calc(50% - 1.5rem + ${knob.x * 40}px)`, top: `calc(50% - 1.5rem + ${knob.y * 40}px)` }}
      />
    </div>
  );
}
