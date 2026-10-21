import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { FallbackWorld } from '../cinematic/FallbackScene.tsx'
import { GATE } from '../cinematic/layout.ts'
import { Landscape } from '../cinematic/Landscape.tsx'
import { Operative } from '../cinematic/Operative.tsx'
import { PortalGate } from '../cinematic/PortalGate.tsx'
import { createPose } from '../cinematic/pose.ts'
import type { Pose } from '../cinematic/pose.ts'
import { webglAvailable } from '../cinematic/runtime.ts'
import { sampleBreachWake, scanBoost, STABLE_PORTAL, WAKE_DURATION } from './breachWake.ts'

const HERO_POS = new THREE.Vector3(-2.35, 2.05, 7.4)
const HERO_LOOK = new THREE.Vector3(2.15, 1.22, -0.55)

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Frame({
  pose,
  reduced,
  startedAt,
}: {
  pose: RefObject<Pose>
  reduced: boolean
  startedAt: number
}) {
  const camera = useThree((state) => state.camera)
  const parallax = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const rim = useRef<THREE.PointLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  const floor = useRef<THREE.MeshBasicMaterial>(null)
  const fog = useRef<THREE.MeshBasicMaterial>(null)
  const unlockMats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const particles = useRef<THREE.Points>(null)
  const particleGeo = useMemo(() => {
    const count = 48
    const positions = new Float32Array(count * 3)
    let seed = 9041
    const next = () => {
      seed = (seed * 48271) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = GATE.x + (next() - 0.5) * 2.4
      positions[i * 3 + 1] = next() * 3.6 + 0.2
      positions[i * 3 + 2] = GATE.z + 0.55 + (next() - 0.5) * 1.2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const particleMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#7dd4ae',
        size: 0.028,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      particleGeo.dispose()
      particleMat.dispose()
    }
  }, [particleGeo, particleMat])

  useLayoutEffect(() => {
    camera.position.copy(HERO_POS)
    camera.lookAt(HERO_LOOK)
  }, [camera])

  useEffect(() => {
    if (reduced) return
    const onPointer = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      // ~8px screen-equivalent in world space
      parallax.current.tx = nx * 0.09
      parallax.current.ty = -ny * 0.055
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => window.removeEventListener('pointermove', onPointer)
  }, [reduced])

  useFrame(({ clock }) => {
    const elapsed = (performance.now() - startedAt) / 1000
    sampleBreachWake(elapsed, pose.current, reduced)

    if (!reduced) {
      const boost = scanBoost(elapsed)
      pose.current.portal = Math.min(0.58, pose.current.portal + boost)
    } else {
      pose.current.portal = STABLE_PORTAL
      pose.current.operativeOpacity = 1
    }

    const p = pose.current
    const wake = clamp01(elapsed / WAKE_DURATION)

    // Soft camera parallax — camera only, left copy untouched
    if (!reduced) {
      parallax.current.x += (parallax.current.tx - parallax.current.x) * 0.06
      parallax.current.y += (parallax.current.ty - parallax.current.y) * 0.06
      camera.position.set(
        HERO_POS.x + parallax.current.x,
        HERO_POS.y + parallax.current.y * 0.35,
        HERO_POS.z,
      )
      camera.lookAt(
        HERO_LOOK.x + parallax.current.x * 0.35,
        HERO_LOOK.y + parallax.current.y * 0.2,
        HERO_LOOK.z,
      )
    }

    // Rim + fill keyed to sequence
    const reveal = p.operativeOpacity
    const unlock = smoothstep(elapsed, 0.3, 0.9)
    if (rim.current) {
      rim.current.intensity = 0.15 + p.portal * 1.35 + reveal * 0.85
    }
    if (fill.current) {
      fill.current.intensity = 0.05 + reveal * 0.55 + unlock * 0.2
    }

    // Floor reflection pulse
    if (floor.current) {
      floor.current.opacity = 0.04 + p.portal * 0.1 + Math.sin(clock.elapsedTime * 0.7) * 0.015
    }
    if (fog.current) {
      fog.current.opacity = 0.08 + p.portal * 0.12
    }

    // Vertical unlock segments (0.3–0.9s)
    unlockMats.current.forEach((mat, index) => {
      if (!mat) return
      const slot = index / 5
      const local = smoothstep(elapsed, 0.3 + slot * 0.1, 0.55 + slot * 0.12)
      const fade = 1 - smoothstep(elapsed, 1.15, 1.45)
      mat.opacity = local * fade * 0.55 + (elapsed > WAKE_DURATION ? 0.08 : 0)
    })

    // Sparse particles drift toward portal
    const pts = particles.current
    if (pts) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      const alive = reduced ? 0.12 : 0.08 + wake * 0.18
      particleMat.opacity = alive * (0.35 + p.portal * 0.45)
      for (let i = 0; i < arr.length / 3; i += 1) {
        const ix = i * 3
        arr[ix]! += (GATE.x - arr[ix]!) * 0.004
        arr[ix + 2]! += (GATE.z + 0.15 - arr[ix + 2]!) * 0.004
        arr[ix + 1]! += Math.sin(clock.elapsedTime * 0.6 + i) * 0.0008
        if (Math.hypot(arr[ix]! - GATE.x, arr[ix + 2]! - (GATE.z + 0.15)) < 0.35) {
          const n = (Math.sin(clock.elapsedTime * 17 + i * 13) + 1) * 0.5
          arr[ix] = GATE.x + (n - 0.5) * 2.2
          arr[ix + 1] = ((n * 7) % 1) * 3.4 + 0.15
          arr[ix + 2] = GATE.z + 0.9 + ((n * 11) % 1) * 0.8
        }
      }
      attr.needsUpdate = true
    }

    // Chest/shoulder signal pulse stronger during reveal
    void clock
  })

  return (
    <>
      <color attach="background" args={['#070a08']} />
      <fogExp2 attach="fog" args={['#070a08', 0.022]} />
      <ambientLight intensity={0.55} color="#183228" />
      <hemisphereLight args={['#24483c', '#070908', 0.7]} />
      <directionalLight position={[6.5, 11.5, 7.5]} intensity={3.6} color="#e5f2ea" />
      {/* Emerald rim from portal toward operative */}
      <pointLight
        ref={rim}
        position={[GATE.x - 0.35, 1.7, GATE.z + 1.1]}
        color="#5fd4a0"
        intensity={0.2}
        distance={6.5}
        decay={2}
      />
      {/* Soft fill so silhouette reads */}
      <pointLight
        ref={fill}
        position={[-0.4, 2.2, 4.2]}
        color="#cfe8db"
        intensity={0.1}
        distance={9}
        decay={2}
      />

      <Landscape shadows={false} />
      <PortalGate pose={pose} />
      <Operative pose={pose} shadows={false} />

      {/* Vertical unlock segments */}
      <group position={[GATE.x, 2.2, GATE.z + 0.36]}>
        {Array.from({ length: 6 }, (_, index) => (
          <mesh key={index} position={[(index - 2.5) * 0.22, 0, 0]} renderOrder={4}>
            <planeGeometry args={[0.028, 3.6]} />
            <meshBasicMaterial
              ref={(node) => {
                unlockMats.current[index] = node
              }}
              color="#8fe6bf"
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Base fog band */}
      <mesh position={[GATE.x, 0.28, GATE.z + 0.55]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[4.2, 2.4]} />
        <meshBasicMaterial
          ref={fog}
          color="#0c1c14"
          transparent
          opacity={0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Obsidian floor reflection wash */}
      <mesh position={[GATE.x + 0.15, 0.04, GATE.z + 1.1]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[3.6, 3.2]} />
        <meshBasicMaterial
          ref={floor}
          color="#1f9a62"
          transparent
          opacity={0.06}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points ref={particles} geometry={particleGeo} material={particleMat} frustumCulled={false} />
    </>
  )
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(t: number, edge0: number, edge1: number): number {
  const x = clamp01((t - edge0) / Math.max(0.0001, edge1 - edge0))
  return x * x * (3 - 2 * x)
}

export function HeroVista() {
  const pose = useRef(sampleBreachWake(WAKE_DURATION, createPose(), true))
  const glOk = useMemo(() => webglAvailable(), [])
  const [reduced] = useState(() => prefersReducedMotion())
  const [startedAt] = useState(() => performance.now())

  useEffect(() => {
    sampleBreachWake(reduced ? WAKE_DURATION : 0, pose.current, reduced)
  }, [reduced])

  if (!glOk) {
    return (
      <div className="hero-fallback" aria-hidden="true">
        <FallbackWorld />
      </div>
    )
  }

  return (
    <div className="hero-vista">
      <Canvas
        dpr={[1, 1.35]}
        shadows={false}
        camera={{ fov: 34, near: 0.12, far: 80, position: HERO_POS.toArray() as [number, number, number] }}
        gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#070a08')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
        }}
      >
        <Frame pose={pose} reduced={reduced} startedAt={startedAt} />
      </Canvas>
    </div>
  )
}
