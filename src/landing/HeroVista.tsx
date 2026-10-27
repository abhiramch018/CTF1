import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { FallbackWorld } from '../cinematic/FallbackScene.tsx'
import { GATE, WALK_DOOR } from '../cinematic/layout.ts'
import { Landscape } from '../cinematic/Landscape.tsx'
import { Operative } from '../cinematic/Operative.tsx'
import { PortalGate } from '../cinematic/PortalGate.tsx'
import { createPose } from '../cinematic/pose.ts'
import type { Pose } from '../cinematic/pose.ts'
import { webglAvailable } from '../cinematic/runtime.ts'
import { BreachExtras } from './BreachExtras.tsx'
import {
  createWakeExtras,
  sampleBreachWake,
  scanBoost,
  STABLE_PORTAL,
  WAKE_DURATION,
  type WakeExtras,
} from './breachWake.ts'
import { heroApproachProgress, prefersReducedMotion } from './scrollDrive.ts'

const HERO_POS = new THREE.Vector3(-1.35, 2.0, 6.35)
const HERO_LOOK = new THREE.Vector3(2.55, 1.5, -1.55)
/** Subtle approach — forward + down toward the gate (not a tunnel push). */
const SCROLL_CAM_DELTA = new THREE.Vector3(0.45, -0.42, -1.55)
const SCROLL_LOOK_DELTA = new THREE.Vector3(0.12, -0.18, -0.85)

function Frame({
  pose,
  extras,
  signalBoost,
  portalValue,
  reduced,
  startedAt,
  scrollProgress,
  heroNode,
  copyNode,
}: {
  pose: RefObject<Pose>
  extras: RefObject<WakeExtras>
  signalBoost: RefObject<number>
  portalValue: RefObject<number>
  reduced: boolean
  startedAt: number | null
  scrollProgress: RefObject<number>
  heroNode: RefObject<HTMLElement | null>
  copyNode: RefObject<HTMLElement | null>
}) {
  const camera = useThree((state) => state.camera)
  const parallax = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const rim = useRef<THREE.PointLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.PointLight>(null)
  const chest = useRef<THREE.PointLight>(null)
  const particles = useRef<THREE.Points>(null)
  const farGroup = useRef<THREE.Group>(null)
  const midGroup = useRef<THREE.Group>(null)
  const fog = useRef<THREE.FogExp2>(null)
  const scrollSmooth = useRef(0)

  const particleGeo = useMemo(() => {
    const count = 48
    const positions = new Float32Array(count * 3)
    let seed = 9041
    const next = () => {
      seed = (seed * 48271) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = GATE.x + (next() - 0.5) * 3.4
      positions[i * 3 + 1] = next() * 4.2 + 0.2
      positions[i * 3 + 2] = GATE.z + 1.2 + (next() - 0.5) * 4.5
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const particleMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#9ee6c3',
        size: 0.032,
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
      parallax.current.tx = nx * 0.045
      parallax.current.ty = -ny * 0.028
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => window.removeEventListener('pointermove', onPointer)
  }, [reduced])

  useFrame(({ clock }) => {
    const active = startedAt != null
    const freeze = (window as unknown as { __breachFreezeAt?: number }).__breachFreezeAt
    const elapsed =
      typeof freeze === 'number'
        ? freeze
        : active
          ? (performance.now() - startedAt) / 1000
          : 0

    if (!active && !reduced) {
      pose.current.portal = 0.04
      pose.current.operativeOpacity = 0
      extras.current.construct = 0.15
      extras.current.tunnel = 0
      extras.current.edgeScan = 0.05
      extras.current.chestPulse = 0
      signalBoost.current = 0
    } else {
      sampleBreachWake(elapsed, pose.current, extras.current, reduced)
      if (!reduced) {
        pose.current.portal = Math.min(0.98, pose.current.portal + scanBoost(elapsed))
      } else {
        pose.current.portal = STABLE_PORTAL
      }
      signalBoost.current = extras.current.chestPulse
    }

    // Sample layout each frame so approach stays smooth even if scroll events are coalesced.
    const heroEl = heroNode.current
    if (heroEl) {
      const sampled = reduced ? 0 : heroApproachProgress(heroEl)
      scrollProgress.current = sampled
      const fade = reduced ? 0 : Math.max(0, (sampled - 0.72) / 0.28)
      copyNode.current?.style.setProperty('--hero-fade', fade.toFixed(3))
    }

    const scrollTarget = reduced ? 0 : clamp01(scrollProgress.current)
    scrollSmooth.current += (scrollTarget - scrollSmooth.current) * 0.08
    const s = scrollSmooth.current

    // Portal seam intensifies gently with scroll (never a wash).
    if (active || reduced) {
      pose.current.portal = Math.min(0.98, pose.current.portal + s * 0.12)
    }

    // Operative eases toward the gate but stays clearly in front of the door.
    if (active || reduced) {
      const baseX = WALK_DOOR[0]
      const baseZ = WALK_DOOR[2]
      const towardX = THREE.MathUtils.lerp(baseX, GATE.x + 0.35, s * 0.22)
      const towardZ = THREE.MathUtils.lerp(baseZ, GATE.z + 1.15, s * 0.28)
      pose.current.operativePos[0] = towardX
      pose.current.operativePos[2] = Math.max(towardZ, GATE.z + 1.05)
      pose.current.operativeOpacity = Math.max(pose.current.operativeOpacity, 0.92)
    }

    const p = pose.current
    portalValue.current = p.portal

    if (!reduced && active) {
      parallax.current.x += (parallax.current.tx - parallax.current.x) * 0.07
      parallax.current.y += (parallax.current.ty - parallax.current.y) * 0.07
      camera.position.set(
        HERO_POS.x + SCROLL_CAM_DELTA.x * s + parallax.current.x,
        HERO_POS.y + SCROLL_CAM_DELTA.y * s + parallax.current.y * 0.4,
        HERO_POS.z + SCROLL_CAM_DELTA.z * s,
      )
      camera.lookAt(
        HERO_LOOK.x + SCROLL_LOOK_DELTA.x * s + parallax.current.x * 0.4,
        HERO_LOOK.y + SCROLL_LOOK_DELTA.y * s + parallax.current.y * 0.25,
        HERO_LOOK.z + SCROLL_LOOK_DELTA.z * s,
      )
    }

    // Depth parallax: far towers lag, mid portal/floor advance gently.
    if (farGroup.current) {
      farGroup.current.position.z = s * 0.35
      farGroup.current.position.y = s * -0.08
    }
    if (midGroup.current) {
      midGroup.current.position.z = s * 0.85
      midGroup.current.position.y = s * -0.12
    }

    if (fog.current) {
      fog.current.density = 0.02 + s * 0.008
    }

    const unlock = p.portal
    const reveal = p.operativeOpacity
    if (rim.current) rim.current.intensity = 0.7 + unlock * 3.2 + reveal * 1.8 + s * 0.35
    if (fill.current) fill.current.intensity = 0.45 + reveal * 1.45 + unlock * 0.55
    if (key.current) key.current.intensity = 0.55 + unlock * 2.6 + s * 0.45
    if (chest.current) {
      chest.current.intensity = extras.current.chestPulse * 3.4
      chest.current.position.set(p.operativePos[0], 1.4, p.operativePos[2] + 0.28)
    }

    const pts = particles.current
    if (pts && !reduced) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      particleMat.opacity = (0.1 + unlock * 0.28 + s * 0.12) * (active || reduced ? 1 : 0.25)
      const speed = active ? 0.01 + s * 0.008 : 0.002
      for (let i = 0; i < arr.length / 3; i += 1) {
        const ix = i * 3
        arr[ix]! += (GATE.x - arr[ix]!) * speed * 0.35
        arr[ix + 2]! += speed * (0.6 + s * 0.8)
        arr[ix + 1]! += Math.sin(clock.elapsedTime * 0.55 + i) * 0.001
        if (arr[ix + 2]! > GATE.z + 3.2) {
          const n = (Math.sin(clock.elapsedTime * 19 + i * 11) + 1) * 0.5
          arr[ix] = GATE.x + (n - 0.5) * 3.2
          arr[ix + 1] = ((n * 7) % 1) * 3.8 + 0.25
          arr[ix + 2] = GATE.z - 1.8 - ((n * 13) % 1) * 2.2
        }
      }
      attr.needsUpdate = true
    }
  })

  return (
    <>
      <color attach="background" args={['#070a08']} />
      <fogExp2 ref={fog} attach="fog" args={['#070a08', 0.02]} />
      <ambientLight intensity={0.72} color="#1e4233" />
      <hemisphereLight args={['#2f6050', '#070908', 0.95]} />
      <directionalLight position={[5.2, 10.2, 6.8]} intensity={4.4} color="#f2faf5" />

      <pointLight
        ref={rim}
        position={[GATE.x - 0.4, 1.9, GATE.z + 1.55]}
        color="#7aebc0"
        intensity={0.5}
        distance={8}
        decay={2}
      />
      <pointLight
        ref={fill}
        position={[0.1, 2.5, 4.6]}
        color="#d7efe4"
        intensity={0.3}
        distance={10}
        decay={2}
      />
      <pointLight
        ref={key}
        position={[GATE.x + 0.05, 2.55, GATE.z - 0.45]}
        color="#34d399"
        intensity={0.35}
        distance={6}
        decay={2}
      />
      <pointLight ref={chest} color="#b8f4d6" intensity={0} distance={2.6} decay={2} />

      <group ref={farGroup}>
        <Landscape shadows={false} />
      </group>
      <group ref={midGroup}>
        <BreachExtras extras={extras} portalRef={portalValue} />
        <PortalGate pose={pose} leafTravel={1.05} wideEnergy />
      </group>
      <Operative pose={pose} shadows={false} signalBoost={signalBoost} heroLit />

      <points ref={particles} geometry={particleGeo} material={particleMat} frustumCulled={false} />
    </>
  )
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function HeroVista({
  scrollProgress,
  heroNode,
  copyNode,
}: {
  scrollProgress: RefObject<number>
  heroNode: RefObject<HTMLElement | null>
  copyNode: RefObject<HTMLElement | null>
}) {
  const pose = useRef(createPose())
  const extras = useRef(createWakeExtras())
  const signalBoost = useRef(0)
  const portalValue = useRef(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const glOk = useMemo(() => webglAvailable(), [])
  const [reduced] = useState(() => prefersReducedMotion())
  const [startedAt, setStartedAt] = useState<number | null>(null)

  useEffect(() => {
    const onReplay = () => setStartedAt(performance.now())
    window.addEventListener('dn-breach-wake', onReplay)
    return () => window.removeEventListener('dn-breach-wake', onReplay)
  }, [])

  useEffect(() => {
    if (reduced) {
      sampleBreachWake(WAKE_DURATION, pose.current, extras.current, true)
      setStartedAt(performance.now())
      return
    }

    const node = wrapRef.current
    if (!node) return

    let visible = false
    let started = false
    let poll = 0
    let fallback = 0

    const armStart = () => {
      if (started) return
      started = true
      setStartedAt(performance.now())
      observer.disconnect()
      window.clearInterval(poll)
      window.clearTimeout(fallback)
    }

    const siteReady = () =>
      document.body.classList.contains('is-site') &&
      !document.querySelector('.command') &&
      !document.querySelector('.entry.is-on')

    const tryStart = () => {
      if (started || !siteReady() || !visible) return
      armStart()
    }

    const forceStart = () => {
      if (started || !siteReady()) return
      armStart()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        tryStart()
      },
      { threshold: [0, 0.12, 0.25], rootMargin: '80px 0px 80px 0px' },
    )
    observer.observe(node)
    poll = window.setInterval(tryStart, 100)
    fallback = window.setTimeout(forceStart, 600)
    tryStart()
    return () => {
      observer.disconnect()
      window.clearInterval(poll)
      window.clearTimeout(fallback)
    }
  }, [reduced])

  if (!glOk) {
    return (
      <div className="hero-fallback" aria-hidden="true">
        <FallbackWorld />
      </div>
    )
  }

  return (
    <div className="hero-vista" ref={wrapRef}>
      <Canvas
        dpr={[1, 1.4]}
        shadows={false}
        camera={{ fov: 33, near: 0.12, far: 80, position: HERO_POS.toArray() as [number, number, number] }}
        gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#070a08')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.22
        }}
      >
        <Frame
          pose={pose}
          extras={extras}
          signalBoost={signalBoost}
          portalValue={portalValue}
          reduced={reduced}
          startedAt={startedAt}
          scrollProgress={scrollProgress}
          heroNode={heroNode}
          copyNode={copyNode}
        />
      </Canvas>
    </div>
  )
}
