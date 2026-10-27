import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { webglAvailable } from '../cinematic/runtime.ts'
import type { ArenaExtras } from './arenaAccess.ts'

const CAM_POS = new THREE.Vector3(0, 2.55, 8.1)
const CAM_LOOK = new THREE.Vector3(0, 1.15, -1.5)

type Props = {
  extras: RefObject<ArenaExtras>
  reduced: boolean
  compact?: boolean
}

type TowerSpec = { x: number; z: number; w: number; d: number; h: number; y?: number }
type FragSpec = { r: number; y: number; size: number; speed: number; phase: number }

const TOWERS: TowerSpec[] = [
  { x: -4.2, z: -2.2, w: 1.25, d: 1.1, h: 6.4 },
  { x: -3.1, z: -3.6, w: 0.95, d: 1.0, h: 4.6 },
  { x: -5.2, z: -4.2, w: 0.6, d: 0.6, h: 8.0 },
  { x: -2.0, z: -4.8, w: 1.5, d: 0.75, h: 2.6, y: 3.0 },
  { x: -6.0, z: -3.0, w: 0.9, d: 0.9, h: 3.2 },
  { x: 4.4, z: -2.4, w: 1.3, d: 1.15, h: 6.6 },
  { x: 3.2, z: -3.8, w: 1.0, d: 0.95, h: 4.3 },
  { x: 5.3, z: -4.5, w: 0.55, d: 0.55, h: 8.4 },
  { x: 2.2, z: -5.0, w: 1.4, d: 0.7, h: 2.3, y: 3.3 },
  { x: 6.1, z: -3.2, w: 0.85, d: 0.85, h: 3.5 },
  { x: -1.4, z: -5.6, w: 0.75, d: 0.75, h: 3.8 },
  { x: 1.35, z: -5.8, w: 0.7, d: 0.7, h: 3.5 },
]

const FRAGMENTS: FragSpec[] = [
  { r: 0.55, y: 0.08, size: 0.14, speed: 0.55, phase: 0 },
  { r: 0.72, y: -0.12, size: 0.11, speed: -0.42, phase: 1.1 },
  { r: 0.48, y: 0.22, size: 0.09, speed: 0.7, phase: 2.2 },
  { r: 0.85, y: 0.05, size: 0.13, speed: -0.5, phase: 3.4 },
  { r: 0.62, y: -0.2, size: 0.1, speed: 0.38, phase: 4.5 },
  { r: 0.95, y: 0.18, size: 0.08, speed: -0.62, phase: 5.3 },
  { r: 0.4, y: 0.0, size: 0.12, speed: 0.48, phase: 0.7 },
  { r: 0.78, y: 0.28, size: 0.07, speed: 0.85, phase: 1.9 },
]

const BEAMS = [
  { x: -4.2, z: -5.8, h: 9 },
  { x: 4.5, z: -6.0, h: 8.2 },
  { x: -1.8, z: -7.2, h: 7.5 },
  { x: 2.0, z: -7.4, h: 7.8 },
  { x: 0.1, z: -8.0, h: 6.5 },
]

function ArenaWorld({ extras, reduced, compact }: Props & { compact: boolean }) {
  const camera = useThree((state) => state.camera)
  const parallax = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const coreGroup = useRef<THREE.Group>(null)
  const fragGroup = useRef<THREE.Group>(null)
  const ringGroup = useRef<THREE.Group>(null)
  const gridMat = useRef<THREE.MeshBasicMaterial>(null)
  const pathMat = useRef<THREE.MeshBasicMaterial>(null)
  const reflectMat = useRef<THREE.MeshBasicMaterial>(null)
  const fogMat = useRef<THREE.MeshBasicMaterial>(null)
  const coreMat = useRef<THREE.MeshStandardMaterial>(null)
  const coreGlow = useRef<THREE.MeshBasicMaterial>(null)
  const arcMat = useRef<THREE.MeshBasicMaterial>(null)
  const arcMesh = useRef<THREE.Mesh>(null)
  const beamMats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const bridgeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const particles = useRef<THREE.Points>(null)
  const symbols = useRef<THREE.Points>(null)
  const coreLight = useRef<THREE.PointLight>(null)
  const hoverSmooth = useRef(0)
  const glitch = useRef(0)
  const nextArc = useRef(2.4)
  const arcLife = useRef(0)

  const stone = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#101614',
        roughness: 0.78,
        metalness: 0.35,
        flatShading: true,
      }),
    [],
  )
  const graphite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#161c1a',
        roughness: 0.7,
        metalness: 0.42,
        flatShading: true,
      }),
    [],
  )
  const obsidian = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a0e0c',
        roughness: 0.88,
        metalness: 0.22,
        flatShading: true,
      }),
    [],
  )
  const litBlock = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#121a16',
        emissive: '#0d3d28',
        emissiveIntensity: 0.25,
        roughness: 0.55,
        metalness: 0.4,
        flatShading: true,
      }),
    [],
  )

  const particleGeo = useMemo(() => {
    const count = compact ? 48 : 72
    const positions = new Float32Array(count * 3)
    let seed = 5107
    const next = () => {
      seed = (seed * 48271) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (next() - 0.5) * 10
      positions[i * 3 + 1] = next() * 5.5
      positions[i * 3 + 2] = -1 - next() * 8
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [compact])

  const symbolGeo = useMemo(() => {
    const count = compact ? 18 : 28
    const positions = new Float32Array(count * 3)
    let seed = 9901
    const next = () => {
      seed = (seed * 48271) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (next() - 0.5) * 7
      positions[i * 3 + 1] = 0.4 + next() * 3.8
      positions[i * 3 + 2] = -2 - next() * 5
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [compact])

  const particleMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#7dceb0',
        size: 0.035,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  )
  const symbolMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#9ee6c3',
        size: 0.055,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      stone.dispose()
      graphite.dispose()
      obsidian.dispose()
      litBlock.dispose()
      particleGeo.dispose()
      symbolGeo.dispose()
      particleMat.dispose()
      symbolMat.dispose()
    }
  }, [stone, graphite, obsidian, litBlock, particleGeo, symbolGeo, particleMat, symbolMat])

  useLayoutEffect(() => {
    const z = compact ? 6.6 : CAM_POS.z
    camera.position.set(CAM_POS.x, compact ? 2.0 : CAM_POS.y, z)
    camera.lookAt(CAM_LOOK)
  }, [camera, compact])

  useEffect(() => {
    if (reduced) return
    const onPointer = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      parallax.current.tx = nx * 0.04
      parallax.current.ty = -ny * 0.025
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => window.removeEventListener('pointermove', onPointer)
  }, [reduced])

  useFrame(({ clock }) => {
    const e = extras.current
    if (!e) return
    const t = clock.elapsedTime

    hoverSmooth.current += (e.hover - hoverSmooth.current) * 0.14
    if (e.hover > 0.02) e.hover = Math.max(0, e.hover - 0.018)

    // Occasional glitch flicker (scene only — text is DOM)
    if (!reduced && Math.sin(t * 11.3) > 0.992) glitch.current = 1
    glitch.current = Math.max(0, glitch.current - 0.08)
    const g = glitch.current

    if (!reduced) {
      parallax.current.x += (parallax.current.tx - parallax.current.x) * 0.08
      parallax.current.y += (parallax.current.ty - parallax.current.y) * 0.08
      camera.position.set(
        CAM_POS.x + parallax.current.x + g * 0.04,
        (compact ? 2.0 : CAM_POS.y) + parallax.current.y * 0.35,
        (compact ? 6.6 : CAM_POS.z) + g * 0.03,
      )
      camera.lookAt(
        CAM_LOOK.x + parallax.current.x * 0.35,
        CAM_LOOK.y + parallax.current.y * 0.2,
        CAM_LOOK.z,
      )
    }

    const pulse = 1 + hoverSmooth.current * 0.45 + Math.sin(t * 1.7) * 0.04

    // Core rotation + scale pulse
    if (coreGroup.current) {
      coreGroup.current.rotation.y = reduced ? 0.4 : t * 0.55
      coreGroup.current.rotation.x = reduced ? 0.2 : Math.sin(t * 0.45) * 0.22
      coreGroup.current.rotation.z = reduced ? 0 : Math.cos(t * 0.35) * 0.12
      coreGroup.current.scale.setScalar(pulse * (1 + g * 0.08))
    }
    if (coreMat.current) {
      coreMat.current.emissiveIntensity = 0.85 + Math.sin(t * 2.1) * 0.2 + hoverSmooth.current * 0.9
    }
    if (coreGlow.current) {
      coreGlow.current.opacity = 0.35 + hoverSmooth.current * 0.35 + g * 0.2
    }
    if (coreLight.current) {
      coreLight.current.intensity = 1.6 + hoverSmooth.current * 2.2 + Math.sin(t * 1.8) * 0.25
    }
    litBlock.emissiveIntensity = 0.2 + hoverSmooth.current * 0.35

    // Orbiting voxel fragments
    if (fragGroup.current && !reduced) {
      fragGroup.current.children.forEach((child, index) => {
        const spec = FRAGMENTS[index]
        if (!spec) return
        const ang = t * spec.speed + spec.phase
        child.position.set(
          Math.cos(ang) * spec.r,
          spec.y + Math.sin(t * 0.8 + spec.phase) * 0.06,
          Math.sin(ang) * spec.r * 0.85,
        )
        child.rotation.x = t * 0.6 + spec.phase
        child.rotation.y = t * 0.45 + index
      })
    }

    // Fractured ring slow spin
    if (ringGroup.current) {
      ringGroup.current.rotation.z = reduced ? 0.15 : t * 0.12
      ringGroup.current.rotation.y = Math.sin(t * 0.25) * 0.08
    }

    // Floor grid energy crawl
    if (gridMat.current) {
      gridMat.current.opacity = 0.22 + hoverSmooth.current * 0.2 + Math.sin(t * 0.9) * 0.03
    }
    if (pathMat.current) {
      pathMat.current.opacity = 0.35 + hoverSmooth.current * 0.4 + Math.sin(t * 1.4) * 0.05
    }
    if (reflectMat.current) {
      reflectMat.current.opacity = 0.1 + hoverSmooth.current * 0.18
    }
    if (fogMat.current) {
      fogMat.current.opacity = 0.1 + Math.sin(t * 0.35) * 0.02
    }

    // Distant beams pulse independently
    beamMats.current.forEach((mat, i) => {
      if (!mat) return
      mat.opacity = 0.12 + Math.sin(t * (0.45 + i * 0.11) + i) * 0.06 + hoverSmooth.current * 0.05
    })
    bridgeMats.current.forEach((mat, i) => {
      if (!mat) return
      mat.opacity = 0.35 + Math.sin(t * 0.8 + i * 1.3) * 0.12 + hoverSmooth.current * 0.15
    })

    // Lightning arc every few seconds
    if (!reduced) {
      if (arcLife.current <= 0 && t > nextArc.current) {
        arcLife.current = 0.28
        nextArc.current = t + 2.8 + Math.sin(t * 3) * 1.2
      }
      if (arcLife.current > 0) arcLife.current -= 0.016
    }
    if (arcMesh.current && arcMat.current) {
      const on = arcLife.current > 0 || hoverSmooth.current > 0.55
      arcMesh.current.visible = on
      arcMat.current.opacity = on
        ? Math.max(arcLife.current * 2.2, hoverSmooth.current * 0.45) * (0.7 + g * 0.3)
        : 0
      if (on) {
        arcMesh.current.rotation.z = Math.sin(t * 18) * 0.4
        arcMesh.current.scale.set(1 + Math.sin(t * 22) * 0.15, 1, 1)
      }
    }

    // Particles float upward
    const pts = particles.current
    if (pts && !reduced) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < arr.length / 3; i += 1) {
        const ix = i * 3
        arr[ix + 1]! += 0.006 + (i % 5) * 0.001
        arr[ix]! += Math.sin(t * 0.5 + i) * 0.0015
        if (arr[ix + 1]! > 5.8) {
          arr[ix] = (Math.sin(t * 9 + i) * 0.5) * 9
          arr[ix + 1] = -0.2
          arr[ix + 2] = -1 - ((i * 17) % 80) * 0.1
        }
      }
      attr.needsUpdate = true
      particleMat.opacity = 0.35 + hoverSmooth.current * 0.15
    }

    const sym = symbols.current
    if (sym && !reduced) {
      const attr = sym.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < arr.length / 3; i += 1) {
        const ix = i * 3
        arr[ix + 1]! += 0.003
        arr[ix]! += Math.cos(t * 0.3 + i) * 0.001
        if (arr[ix + 1]! > 4.5) {
          arr[ix + 1] = 0.3
          arr[ix] = (Math.sin(t * 5 + i * 2) * 0.5) * 6
        }
      }
      attr.needsUpdate = true
      symbolMat.opacity = 0.2 + Math.sin(t * 0.7) * 0.05
    }
  })

  const setBeamMat = (index: number) => (mat: THREE.MeshBasicMaterial | null) => {
    beamMats.current[index] = mat
  }
  const setBridgeMat = (index: number) => (mat: THREE.MeshBasicMaterial | null) => {
    bridgeMats.current[index] = mat
  }

  return (
    <>
      <color attach="background" args={['#050807']} />
      <fogExp2 attach="fog" args={['#050807', 0.028]} />
      <ambientLight intensity={0.78} color="#1e4634" />
      <hemisphereLight args={['#3a6b52', '#050706', 1.15]} />
      <directionalLight position={[4, 10, 6]} intensity={4.0} color="#f5fcf8" />
      <directionalLight position={[-5, 4, -2]} intensity={1.45} color="#2db88a" />
      <pointLight
        ref={coreLight}
        position={[0, 1.85, -1.6]}
        color="#5eecb4"
        intensity={2.6}
        distance={14}
        decay={2}
      />
      <pointLight position={[-4.5, 3.5, -4]} color="#2db88a" intensity={1.35} distance={18} decay={2} />
      <pointLight position={[4.8, 4, -4.5]} color="#34d399" intensity={1.25} distance={18} decay={2} />
      <pointLight position={[0, 5.2, 0.5]} color="#9ee6c3" intensity={1.4} distance={18} decay={2} />

      {/* Reflective dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.5]} receiveShadow>
        <planeGeometry args={[22, 20]} />
        <meshStandardMaterial color="#070b09" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -0.2]} renderOrder={1}>
        <planeGeometry args={[14, 12]} />
        <meshBasicMaterial
          ref={reflectMat}
          color="#1f9a62"
          transparent
          opacity={0.1}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Emerald grid floor — subdivided so wireframe reads as a real grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.6]} renderOrder={2}>
        <planeGeometry args={[14, 14, 28, 28]} />
        <meshBasicMaterial
          ref={gridMat}
          color="#3dcea0"
          transparent
          opacity={0.38}
          depthWrite={false}
          toneMapped={false}
          wireframe
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Central energy path + cross lanes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 1.2]} renderOrder={3}>
        <planeGeometry args={[0.18, 8.2]} />
        <meshBasicMaterial
          ref={pathMat}
          color="#9ee6c3"
          transparent
          opacity={0.6}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.055, -0.4]} renderOrder={3}>
        <planeGeometry args={[0.06, 6.5]} />
        <meshBasicMaterial
          color="#2db88a"
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Soft floor fog / smoke */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} renderOrder={1}>
        <planeGeometry args={[16, 14]} />
        <meshBasicMaterial
          ref={fogMat}
          color="#0d2a1c"
          transparent
          opacity={0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Massive side towers + floating blocks */}
      <group>
        {TOWERS.map((tower, index) => (
          <mesh
            key={`${tower.x}-${tower.h}`}
            position={[tower.x, tower.y ?? tower.h * 0.5, tower.z]}
            material={index % 3 === 0 ? litBlock : index % 2 === 0 ? graphite : stone}
          >
            <boxGeometry args={[tower.w, tower.h, tower.d]} />
          </mesh>
        ))}
        {/* Broken floating chunks */}
        <mesh position={[-3.8, 4.2, -3.6]} material={obsidian} rotation={[0.2, 0.4, 0.1]}>
          <boxGeometry args={[0.7, 0.45, 0.55]} />
        </mesh>
        <mesh position={[3.9, 3.6, -3.9]} material={graphite} rotation={[-0.15, -0.3, 0.2]}>
          <boxGeometry args={[0.55, 0.6, 0.4]} />
        </mesh>
        <mesh position={[-2.5, 5.1, -5.2]} material={litBlock} rotation={[0.1, 0.6, -0.1]}>
          <boxGeometry args={[0.4, 0.35, 0.9]} />
        </mesh>
        <mesh position={[2.8, 4.8, -5.5]} material={stone} rotation={[0.25, -0.5, 0.15]}>
          <boxGeometry args={[0.85, 0.3, 0.45]} />
        </mesh>
      </group>

      {/* Neon energy bridges */}
      {[
        { pos: [-3.8, 3.4, -4.0] as const, rot: [0, 0.4, 0.15] as const, len: 2.4 },
        { pos: [3.9, 3.1, -4.2] as const, rot: [0, -0.35, -0.12] as const, len: 2.2 },
        { pos: [-1.2, 4.6, -5.5] as const, rot: [0, 0.1, 0.05] as const, len: 3.0 },
        { pos: [1.4, 4.4, -5.6] as const, rot: [0, -0.15, -0.05] as const, len: 2.6 },
      ].map((bridge, index) => (
        <mesh key={bridge.len} position={[...bridge.pos]} rotation={[...bridge.rot]}>
          <boxGeometry args={[bridge.len, 0.035, 0.035]} />
          <meshBasicMaterial
            ref={setBridgeMat(index)}
            color="#3dcea0"
            transparent
            opacity={0.4}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Distant vertical light beams */}
      {BEAMS.map((beam, index) => (
        <mesh key={beam.x} position={[beam.x, beam.h * 0.45, beam.z]} renderOrder={2}>
          <planeGeometry args={[0.18, beam.h]} />
          <meshBasicMaterial
            ref={setBeamMat(index)}
            color="#2db88a"
            transparent
            opacity={0.14}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Fractured circular energy field behind core */}
      <group ref={ringGroup} position={[0, 1.85, -2.55]}>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2
          if (i % 4 === 0) return null
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 1.85, Math.sin(a) * 1.85, 0]}
              rotation={[0, 0, a]}
            >
              <boxGeometry args={[0.72, 0.1, 0.07]} />
              <meshBasicMaterial
                color="#34d399"
                transparent
                opacity={0.55}
                depthWrite={false}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )
        })}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 + 0.18
          return (
            <mesh key={`inner-${i}`} position={[Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0.06]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.34, 0.05, 0.05]} />
              <meshBasicMaterial
                color="#9ee6c3"
                transparent
                opacity={0.38}
                depthWrite={false}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )
        })}
        {/* Digital particle sparks on the ring */}
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2 + 0.05
          return (
            <mesh key={`spark-${i}`} position={[Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0.1]}>
              <boxGeometry args={[0.06, 0.06, 0.06]} />
              <meshBasicMaterial color="#b8f4d6" transparent opacity={0.5} toneMapped={false} />
            </mesh>
          )
        })}
      </group>

      {/* Floating energy core + orbiting fragments */}
      <group position={[0, 1.85, -1.55]}>
        <group ref={coreGroup}>
          <mesh>
            <octahedronGeometry args={[0.36, 0]} />
            <meshStandardMaterial
              ref={coreMat}
              color="#0a2418"
              emissive="#34d399"
              emissiveIntensity={1.3}
              roughness={0.22}
              metalness={0.7}
              flatShading
            />
          </mesh>
          <mesh scale={[0.75, 0.75, 0.75]}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshBasicMaterial
              ref={coreGlow}
              color="#b8f4d6"
              transparent
              opacity={0.5}
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>

        <group ref={fragGroup}>
          {FRAGMENTS.map((spec, index) => (
            <mesh key={index} material={index % 2 === 0 ? litBlock : graphite}>
              <boxGeometry args={[spec.size, spec.size * 0.85, spec.size * 0.7]} />
            </mesh>
          ))}
        </group>

        {/* Electric arc between fragments */}
        <mesh ref={arcMesh} visible={false} position={[0.15, 0.1, 0]}>
          <planeGeometry args={[0.9, 0.06]} />
          <meshBasicMaterial
            ref={arcMat}
            color="#9ee6c3"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Soft radial glow — not a flat portal panel */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0.2]} renderOrder={1}>
          <circleGeometry args={[1.6, 24]} />
          <meshBasicMaterial
            color="#1f9a62"
            transparent
            opacity={0.12}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <points ref={particles} geometry={particleGeo} material={particleMat} frustumCulled={false} />
      <points ref={symbols} geometry={symbolGeo} material={symbolMat} frustumCulled={false} />
    </>
  )
}

function ArenaFallback() {
  return (
    <div className="arena-fallback" aria-hidden="true">
      <div className="arena-fallback-grid" />
      <div className="arena-fallback-towers" />
      <div className="arena-fallback-ring" />
      <div className="arena-fallback-core" />
      <div className="arena-fallback-path" />
    </div>
  )
}

export function ArenaVista({ extras, reduced, compact = false }: Props) {
  const glOk = useMemo(() => webglAvailable(), [])

  if (!glOk) return <ArenaFallback />

  return (
    <div className="arena-vista">
      <Canvas
        dpr={compact ? [1, 1.15] : [1, 1.35]}
        shadows={false}
        camera={{
          fov: compact ? 38 : 36,
          near: 0.15,
          far: 60,
          position: CAM_POS.toArray() as [number, number, number],
        }}
        gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#050807')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.28
        }}
      >
        <ArenaWorld extras={extras} reduced={reduced} compact={compact} />
      </Canvas>
    </div>
  )
}
