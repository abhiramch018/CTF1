import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { attention } from './attention.ts'
import { EntranceAtmosphere } from './EntranceAtmosphere.tsx'
import { GateInterior } from './GateInterior.tsx'
import { Landscape } from './Landscape.tsx'
import { Operative } from './Operative.tsx'
import { PortalGate } from './PortalGate.tsx'
import { GATE } from './layout.ts'
import { createPose, DURATION, samplePose } from './pose.ts'
import type { Pose } from './pose.ts'
import { preferences, runtime } from './runtime.ts'

type SceneEvents = {
  onReady: () => void
  onTitle: () => void
  onHold: () => void
}

type SceneProps = SceneEvents & {
  onFail: () => void
}

function initialPose(): Pose {
  const pose = createPose()
  const time = runtime.stage === 'hold' || runtime.skip ? DURATION : 0
  return samplePose(time, pose)
}

function Director({
  pose,
  onReady,
  onTitle,
  onHold,
}: SceneEvents & { pose: RefObject<Pose> }) {
  const camera = useThree((state) => state.camera)
  const readySent = useRef(false)
  const titleSent = useRef(false)
  const holdSent = useRef(false)

  useFrame(() => {
    if (!pose.current) return
    if (!readySent.current) {
      readySent.current = true
      onReady()
    }

    const ended = runtime.skip || runtime.stage === 'hold'
    const elapsed = ended ? DURATION : (performance.now() - runtime.startedAt) / 1000
    const next = samplePose(elapsed, pose.current)
    const calm = preferences.reduce ? 0 : 1
    attention.pointerX += (attention.targetX - attention.pointerX) * 0.045
    attention.pointerY += (attention.targetY - attention.pointerY) * 0.045
    const scroll = runtime.stage === 'hold' ? attention.scroll : 0
    const px = attention.pointerX * 0.2 * calm
    const py = -attention.pointerY * 0.09 * calm
    camera.position.set(
      next.camPos[0] + px + (0.4 - next.camPos[0]) * scroll * 0.34,
      next.camPos[1] + py + (1.7 - next.camPos[1]) * scroll * 0.28,
      next.camPos[2] + (4.15 - next.camPos[2]) * scroll * 0.4,
    )
    camera.lookAt(next.camLook[0] + px * 0.3, next.camLook[1] + py * 0.2, next.camLook[2])

    if (next.showTitle && !titleSent.current) {
      titleSent.current = true
      onTitle()
    }
    if (next.done && runtime.stage === 'run' && !holdSent.current) {
      holdSent.current = true
      runtime.stage = 'hold'
      onHold()
    }
  })

  return null
}

/**
 * Balanced three-point cinematic rig — readable forms without washing the scene.
 * Key tracks the camera/operative; portal spill and interior settle over ~1s.
 */
function CinematicRig({ pose, shadows }: { pose: RefObject<Pose>; shadows: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  const floor = useRef<THREE.PointLight>(null)
  const portalSpill = useRef<THREE.PointLight>(null)
  const depth = useRef<THREE.PointLight>(null)
  const fog = useRef<THREE.FogExp2>(null)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    const sun = key.current
    if (!sun) return
    sun.target.position.set(GATE.x, 1.4, GATE.z + 1.2)
    scene.add(sun.target)
    sun.shadow.camera.updateProjectionMatrix()
    return () => {
      scene.remove(sun.target)
    }
  }, [scene])

  useFrame(() => {
    const current = pose.current
    const sun = key.current
    if (!current || !sun) return

    const reduce = preferences.reduce
    const op = current.operativeOpacity
    const cross = current.crossing
    const interior = current.interior
    const portal = current.portal

    // Soft cool key from upper front-left — eases with camera during approach/cross.
    const followX = reduce ? 0 : THREE.MathUtils.clamp(camera.position.x * 0.35, -1.2, 0.4)
    const followZ = reduce ? 0 : THREE.MathUtils.clamp((camera.position.z - 6) * 0.2, -0.8, 0.6)
    sun.position.set(-2.8 + followX + cross * 1.1, 7.4, 6.2 + followZ - cross * 2.4)
    sun.target.position.set(
      THREE.MathUtils.lerp(GATE.x - 0.15, current.operativePos[0], 0.45 + cross * 0.35),
      1.35,
      THREE.MathUtils.lerp(GATE.z + 1.4, current.operativePos[2], 0.35 + cross * 0.4),
    )
    sun.target.updateMatrixWorld()
    // Dim slightly after crossing — interior takes over, no blackout.
    sun.intensity = 2.35 - interior * 0.55

    if (rim.current) {
      rim.current.position.set(
        current.operativePos[0] + 1.15,
        1.75,
        current.operativePos[2] - 0.95,
      )
      rim.current.intensity = (0.55 + portal * 0.35) * Math.max(op, 0.25) * (1 - interior * 0.25)
    }

    if (floor.current) {
      floor.current.position.set(GATE.x - 0.2, 0.28, GATE.z + 1.55)
      floor.current.intensity = 0.28 + current.approach * 0.12 + portal * 0.18
    }

    if (portalSpill.current) {
      // Emerald spill onto the operative's back and nearby ground while crossing.
      portalSpill.current.position.set(
        GATE.x + (current.operativePos[0] - GATE.x) * 0.2,
        1.55,
        GATE.z + 0.15 - cross * 0.8,
      )
      const spillPeak = portal * 0.9 + cross * 0.55
      portalSpill.current.intensity = spillPeak * (1 - interior * 0.55)
    }

    if (depth.current) {
      // Gentle depth cue for rear architecture — softer than the gate mid-tone.
      depth.current.intensity = 0.32 + current.approach * 0.08 - interior * 0.06
    }

    if (fog.current) {
      fog.current.density = 0.02 + interior * 0.006
    }
  })

  return (
    <>
      <color attach="background" args={['#070a08']} />
      <fogExp2 ref={fog} attach="fog" args={['#0a120e', 0.02]} />
      {/* Low ambient — mood stays dark; readability comes from the three-point rig. */}
      <ambientLight intensity={0.22} color="#14241c" />
      <hemisphereLight args={['#1a3028', '#050706', 0.28]} />

      <directionalLight
        ref={key}
        position={[-2.8, 7.4, 6.2]}
        intensity={2.35}
        color="#d7e4dc"
        castShadow={shadows}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={2}
        shadow-camera-far={28}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
        shadow-normalBias={0.045}
      />

      {/* Emerald rim — silhouette of operative + outer gate edges */}
      <pointLight ref={rim} color="#1f9a62" intensity={0.55} distance={5.5} decay={2} />
      {/* Very low floor fill — feet, platform, tile depth */}
      <pointLight ref={floor} color="#6a8f7c" intensity={0.28} distance={4.8} decay={2} />
      {/* Portal spill during approach / crossing */}
      <pointLight ref={portalSpill} color="#2a9a68" intensity={0} distance={4.2} decay={2} />
      {/* Soft depth light on rear masses */}
      <pointLight
        ref={depth}
        position={[4.5, 3.2, -8.5]}
        color="#16352a"
        intensity={0.32}
        distance={14}
        decay={2}
      />
    </>
  )
}

function Stage({
  pose,
  shadows,
  compact,
  ...events
}: SceneEvents & { pose: RefObject<Pose>; shadows: boolean; compact: boolean }) {
  return (
    <>
      <CinematicRig pose={pose} shadows={shadows} />
      <Director pose={pose} {...events} />
      <EntranceAtmosphere pose={pose} compact={compact} />
      <Landscape shadows={shadows} />
      <PortalGate pose={pose} entrance />
      <GateInterior pose={pose} />
      <Operative pose={pose} shadows={shadows} entrance />
    </>
  )
}

export function NoctisScene({ onFail, ...props }: SceneProps) {
  const pose = useRef(initialPose())
  const failRef = useRef(onFail)
  const openingCamera = useMemo(() => initialPose().camPos, [])
  const presentation = useMemo(() => {
    const compact = window.matchMedia('(max-width: 760px)').matches
    return {
      compact,
      shadows: !compact,
      dpr: (compact ? [1, 1.25] : [1, 1.6]) as [number, number],
    }
  }, [])

  return (
    <Canvas
      dpr={presentation.dpr}
      shadows={presentation.shadows}
      camera={{
        fov: 36,
        near: 0.12,
        far: 80,
        position: openingCamera,
      }}
      gl={{
        antialias: true,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#070a08')
        gl.toneMapping = THREE.ACESFilmicToneMapping
        // Keep exposure restrained — avoid global brightening.
        gl.toneMappingExposure = 1.08
        const renderScene = gl.render.bind(gl)
        let stopped = false
        gl.render = (scene, camera) => {
          if (stopped) return
          try {
            renderScene(scene, camera)
          } catch (error) {
            stopped = true
            console.error(error)
            failRef.current()
          }
        }
      }}
    >
      <Stage
        pose={pose}
        shadows={presentation.shadows}
        compact={presentation.compact}
        {...props}
      />
    </Canvas>
  )
}
