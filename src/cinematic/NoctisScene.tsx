import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { attention } from './attention.ts'
import { Landscape } from './Landscape.tsx'
import { Operative } from './Operative.tsx'
import { PortalGate } from './PortalGate.tsx'
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

function KeyLight({ shadows }: { shadows: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null)
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    const sun = light.current
    if (!sun) return
    sun.target.position.set(2.4, 1.45, -1.7)
    scene.add(sun.target)
    sun.shadow.camera.updateProjectionMatrix()
    return () => {
      scene.remove(sun.target)
    }
  }, [scene])

  return (
    <directionalLight
      ref={light}
      position={[6.5, 11.5, 7.5]}
      intensity={4.2}
      color="#e5f2ea"
      castShadow={shadows}
      shadow-mapSize-width={512}
      shadow-mapSize-height={512}
      shadow-camera-near={2}
      shadow-camera-far={32}
      shadow-camera-left={-9}
      shadow-camera-right={9}
      shadow-camera-top={9}
      shadow-camera-bottom={-9}
      shadow-bias={-0.0004}
      shadow-normalBias={0.045}
    />
  )
}

function Stage({ pose, shadows, ...events }: SceneEvents & { pose: RefObject<Pose>; shadows: boolean }) {
  return (
    <>
      <color attach="background" args={['#070a08']} />
      <fogExp2 attach="fog" args={['#070a08', 0.018]} />
      <ambientLight intensity={0.48} color="#14281e" />
      <hemisphereLight args={['#1a3830', '#070908', 0.55]} />
      <KeyLight shadows={shadows} />
      <Director pose={pose} {...events} />
      <Landscape shadows={shadows} />
      <PortalGate pose={pose} />
      <Operative pose={pose} shadows={shadows} />
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
        gl.toneMappingExposure = 1.05
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
      <Stage pose={pose} shadows={presentation.shadows} {...props} />
    </Canvas>
  )
}
