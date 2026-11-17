import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshDistortMaterial, Sparkles, Stars } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'

const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPEED = reduced ? 0.15 : 1

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const { viewport } = useThree()
  const wide = viewport.width > 7
  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const tx = wide ? Math.min(3.2, viewport.width * 0.24) : viewport.width * 0.28
    const ty = wide ? 0.1 : viewport.height * 0.3
    g.position.x += (tx - g.position.x) * Math.min(1, dt * 3)
    g.position.y += (ty - g.position.y) * Math.min(1, dt * 3)
    g.rotation.y += (state.pointer.x * 0.5 - g.rotation.y) * Math.min(1, dt * 2)
    g.rotation.x += (-state.pointer.y * 0.35 - g.rotation.x) * Math.min(1, dt * 2)
    const s = wide ? 0.78 : 0.42
    g.scale.setScalar(s)
  })
  return <group ref={ref}>{children}</group>
}

function Core() {
  return (
    <mesh>
      <icosahedronGeometry args={[1.35, 24]} />
      <MeshDistortMaterial color="#4c3bb8" emissive="#1a0f4d" metalness={0.55} roughness={0.18} clearcoat={1} clearcoatRoughness={0.15} iridescence={1} iridescenceIOR={1.4} distort={0.4} speed={2 * SPEED} envMapIntensity={1.6} />
    </mesh>
  )
}

function Shell() {
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.y += dt * 0.15 * SPEED
    ref.current.rotation.z += dt * 0.08 * SPEED
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[2.05, 1]} />
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.22} />
    </mesh>
  )
}

function Ring({ r, tilt, speed, color }: { r: number; tilt: [number, number, number]; speed: number; color: string }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed * SPEED
  })
  return (
    <group rotation={tilt}>
      <group ref={ref}>
        <mesh>
          <torusGeometry args={[r, 0.008, 8, 160]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[r, 0, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
    </group>
  )
}

function Lights() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.5} color="#22d3ee" position={[6, 0, 0]} rotation-y={-Math.PI / 2} scale={[12, 8, 1]} />
      <Lightformer form="rect" intensity={2.5} color="#a78bfa" position={[-6, 0, 0]} rotation-y={Math.PI / 2} scale={[12, 8, 1]} />
      <Lightformer form="rect" intensity={1.5} color="#f472b6" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#6d5dfc" position={[0, 0, -6]} scale={[12, 12, 1]} />
    </Environment>
  )
}

export default function Scene() {
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  // Coupe le rendu quand la scène sort de l’écran (économie batterie/CPU)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        aria-hidden
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 4, 5]} intensity={40} color="#22d3ee" />
        <pointLight position={[-5, -3, 3]} intensity={35} color="#a78bfa" />
        <Lights />
        <Rig>
          <Float speed={1.4 * SPEED} rotationIntensity={0.5} floatIntensity={0.9}>
            <Core />
            <Shell />
          </Float>
          <Ring r={2.6} tilt={[1.2, 0.2, 0]} speed={0.35} color="#22d3ee" />
          <Ring r={3.1} tilt={[1.4, -0.5, 0.3]} speed={-0.25} color="#a78bfa" />
          <Ring r={3.6} tilt={[1.0, 0.6, -0.2]} speed={0.18} color="#f472b6" />
        </Rig>
        <Sparkles count={70} scale={[14, 8, 6]} size={2.2} speed={0.35 * SPEED} color="#a78bfa" opacity={0.7} />
        <Stars radius={60} depth={40} count={1400} factor={3} saturation={0} fade speed={0.6 * SPEED} />
      </Canvas>
    </div>
  )
}
