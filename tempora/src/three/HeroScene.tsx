import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, RoundedBox, Sparkles, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, InstancedMesh, Object3D, SRGBColorSpace, type Group, type Mesh } from 'three'
import { img } from '../data'

const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Phone() {
  const tex = useTexture(img('01-pointage.png'), (t) => {
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
  })
  return (
    <group>
      <RoundedBox args={[1.62, 3.12, 0.16]} radius={0.2} smoothness={6}>
        <meshPhysicalMaterial color="#14172b" metalness={0.9} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0, 0.082]}>
        <planeGeometry args={[1.46, 2.6]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.42, 0.083]}>
        <capsuleGeometry args={[0.035, 0.28, 4, 12]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  )
}

/** Cadran holographique : 60 graduations, trotteuse synchronisée sur l'heure réelle. */
function Dial() {
  const ticks = useRef<InstancedMesh>(null)
  const hand = useRef<Group>(null)
  const sweep = useRef<Mesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const R = 2.35

  useEffect(() => {
    const m = ticks.current
    if (!m) return
    const cyan = new Color('#3dd6e6')
    const indigo = new Color('#2f6fe0')
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      const major = i % 5 === 0
      dummy.position.set(Math.sin(a) * R, Math.cos(a) * R, 0)
      dummy.rotation.set(0, 0, -a)
      dummy.scale.set(major ? 1.6 : 1, major ? 2.6 : 1, 1)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, major ? cyan : indigo)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [dummy])

  useFrame(() => {
    const d = new Date()
    const s = d.getSeconds() + (reduced ? 0 : d.getMilliseconds() / 1000)
    const a = -(s / 60) * Math.PI * 2
    if (hand.current) hand.current.rotation.z = a
    if (sweep.current) sweep.current.rotation.z = a + Math.PI / 2
  })

  return (
    <group position={[0, 0, -0.6]}>
      <mesh>
        <torusGeometry args={[R + 0.22, 0.006, 8, 200]} />
        <meshBasicMaterial color="#4d9bff" transparent opacity={0.5} />
      </mesh>
      <mesh>
        <torusGeometry args={[R - 0.25, 0.004, 8, 200]} />
        <meshBasicMaterial color="#3dd6e6" transparent opacity={0.25} />
      </mesh>
      <instancedMesh ref={ticks} args={[undefined, undefined, 60]}>
        <boxGeometry args={[0.025, 0.08, 0.02]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* Traînée lumineuse derrière la trotteuse */}
      <mesh ref={sweep}>
        <ringGeometry args={[0.4, R - 0.08, 64, 1, 0, Math.PI / 3]} />
        <meshBasicMaterial color="#3dd6e6" transparent opacity={0.045} depthWrite={false} />
      </mesh>
      <group ref={hand}>
        <mesh position={[0, R / 2, 0]}>
          <boxGeometry args={[0.014, R, 0.01]} />
          <meshBasicMaterial color="#ff7f50" toneMapped={false} />
        </mesh>
        <mesh position={[0, R - 0.05, 0]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color="#ff7f50" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const k = Math.min(1, dt * 2.5)
    g.rotation.y += (state.pointer.x * 0.45 - 0.25 - g.rotation.y) * k
    g.rotation.x += (-state.pointer.y * 0.25 + 0.05 - g.rotation.x) * k
  })
  return <group ref={ref}>{children}</group>
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas frameloop={visible ? 'always' : 'never'} dpr={[1, 1.75]} camera={{ position: [0, 0, 7.1], fov: 40 }} gl={{ antialias: true, alpha: true }} aria-hidden>
        <ambientLight intensity={0.4} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} color="#4d9bff" position={[-5, 2, 3]} scale={[6, 8, 1]} />
          <Lightformer form="rect" intensity={2.5} color="#3dd6e6" position={[5, -1, 3]} scale={[6, 8, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ff7f50" position={[0, -5, 2]} scale={[8, 2, 1]} />
        </Environment>
        <Rig>
          <Dial />
          <Float speed={reduced ? 0 : 1.6} rotationIntensity={0.25} floatIntensity={0.6}>
            <Phone />
          </Float>
        </Rig>
        <Sparkles count={60} scale={[8, 6, 4]} size={2} speed={reduced ? 0 : 0.3} color="#4d9bff" opacity={0.6} />
      </Canvas>
    </div>
  )
}
