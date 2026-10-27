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
    const px = attention.pointerX * 0.14 * calm
    const py = -attention.pointerY * 0.06 * calm
    camera.position.set(
      next.camPos[0] + px + (-0.35 - next.camPos[0]) * scroll * 0.2,
      next.camPos[1] + py + (1.95 - next.camPos[1]) * scroll * 0.18,
      next.camPos[2] + (7.35 - next.camPos[2]) * scroll * 0.25,
    )
    camera.lookAt(next.camLook[0] + px * 0.25, next.camLook[1] + py * 0.15, next.camLook[2])

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
 * Readable cinematic lighting — graphite figure + layered environment.
 * Ambient stays restrained; operative readability comes from dedicated keys.
 */
function CinematicRig({ pose, shadows }: { pose: RefObject<Pose>; shadows: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const face = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  const floor = useRef<THREE.PointLight>(null)
  const portalSpill = useRef<THREE.PointLight>(null)
  const depth = useRef<THREE.PointLight>(null)
  const fog = useRef<THREE.FogExp2>(null)
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    const sun = key.current
    if (!sun) return
    sun.target.position.set(3.2, 1.35, 0.6)
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

    const [ox, , oz] = current.operativePos
    const cross = current.crossing
    const interior = current.interior
    const portal = current.portal

    sun.position.set(-3.4 + cross * 0.8, 6.8, 5.8 - cross * 2.2)
    sun.target.position.set(ox, 1.35, oz)
    sun.target.updateMatrixWorld()
    sun.intensity = 4.2 - interior * 0.8

    if (face.current) {
      face.current.position.set(ox - 0.95, 1.85, oz + 1.55)
      face.current.intensity = 2.6 - interior * 0.4
    }
    if (rim.current) {
      rim.current.position.set(ox + 1.25, 1.7, oz - 0.85)
      rim.current.intensity = 1.85 + portal * 0.35 - interior * 0.3
    }
    if (floor.current) {
      floor.current.position.set(ox - 0.1, 0.32, oz + 0.4)
      floor.current.intensity = 0.85 + portal * 0.3
    }
    if (portalSpill.current) {
      portalSpill.current.position.set(GATE.x + 0.35, 1.55, GATE.z + 0.55)
      portalSpill.current.intensity = 0.7 + portal * 1.0 + cross * 0.4 - interior * 0.35
    }
    if (depth.current) {
      depth.current.intensity = 1.45 - interior * 0.2
    }
    if (fog.current) {
      fog.current.density = 0.008 + interior * 0.004
    }
  })

  return (
    <>
      <color attach="background" args={['#101a16']} />
      <fogExp2 ref={fog} attach="fog" args={['#101a16', 0.008]} />
      <ambientLight intensity={0.58} color="#243d32" />
      <hemisphereLight args={['#3a5c4a', '#0a1210', 0.75]} />

      <directionalLight
        ref={key}
        position={[-3.4, 6.8, 5.8]}
        intensity={4.2}
        color="#eef6f1"
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

      {/* Soft neutral front-left on face/chest/arms/legs */}
      <pointLight ref={face} color="#e2f0e8" intensity={2.6} distance={6} decay={2} />
      {/* Emerald rim — shoulders, right arm, outer edge */}
      <pointLight ref={rim} color="#2a9a68" intensity={1.85} distance={5.5} decay={2} />
      <pointLight ref={floor} color="#8fbfa8" intensity={0.85} distance={5} decay={2} />
      <pointLight ref={portalSpill} color="#2a9a68" intensity={0.7} distance={5.5} decay={2} />
      {/* Background architecture fill — keeps distant voxels readable */}
      <pointLight
        ref={depth}
        position={[2.5, 5.0, -9]}
        color="#2a5a44"
        intensity={1.45}
        distance={22}
        decay={2}
      />
      <pointLight position={[-5.5, 4.5, -8]} color="#1f4a36" intensity={1.1} distance={16} decay={2} />
      <pointLight position={[7.5, 3.8, -7]} color="#1f4a36" intensity={1.0} distance={14} decay={2} />
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
      <Landscape shadows={shadows} entrance />
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
        far: 90,
        position: openingCamera,
      }}
      gl={{
        antialias: true,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#101a16')
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.28
        // Clear the intro veil as soon as WebGL is live — don't wait on first frame.
        props.onReady()
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
