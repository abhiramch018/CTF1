import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { FallbackWorld } from '../cinematic/FallbackScene.tsx'
import { Landscape } from '../cinematic/Landscape.tsx'
import { Operative } from '../cinematic/Operative.tsx'
import { PortalGate } from '../cinematic/PortalGate.tsx'
import { createPose, DURATION, samplePose } from '../cinematic/pose.ts'
import type { Pose } from '../cinematic/pose.ts'
import { webglAvailable } from '../cinematic/runtime.ts'

const HERO_POS: [number, number, number] = [-2.35, 2.05, 7.4]
const HERO_LOOK: [number, number, number] = [2.15, 1.22, -0.55]

function Frame({ pose }: { pose: RefObject<Pose> }) {
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    camera.position.set(HERO_POS[0], HERO_POS[1], HERO_POS[2])
    camera.lookAt(HERO_LOOK[0], HERO_LOOK[1], HERO_LOOK[2])
  }, [camera])

  return (
    <>
      <color attach="background" args={['#070a08']} />
      <fogExp2 attach="fog" args={['#070a08', 0.018]} />
      <ambientLight intensity={0.48} color="#14281e" />
      <hemisphereLight args={['#1a3830', '#070908', 0.55]} />
      <directionalLight position={[6.5, 11.5, 7.5]} intensity={4.2} color="#e5f2ea" />
      <Landscape shadows={false} />
      <PortalGate pose={pose} />
      <Operative pose={pose} shadows={false} />
    </>
  )
}

export function HeroVista() {
  const pose = useRef(samplePose(DURATION, createPose()))
  const glOk = useMemo(() => webglAvailable(), [])

  if (!glOk) {
    return (
      <div className="hero-fallback" aria-hidden="true">
        <FallbackWorld />
      </div>
    )
  }

  return (
    <Canvas
      dpr={[1, 1.4]}
      shadows={false}
      camera={{ fov: 34, near: 0.12, far: 80, position: HERO_POS }}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#070a08')
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <Frame pose={pose} />
    </Canvas>
  )
}
