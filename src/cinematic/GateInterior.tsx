import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { GATE } from './layout.ts'
import type { Pose } from './pose.ts'
import { preferences } from './runtime.ts'

const GUIDES = [
  { z: -0.85, w: 0.9, opacity: 0.55 },
  { z: -2.05, w: 0.78, opacity: 0.42 },
  { z: -3.35, w: 0.64, opacity: 0.3 },
  { z: -4.7, w: 0.5, opacity: 0.2 },
  { z: -6.1, w: 0.38, opacity: 0.14 },
] as const

const PILLARS = [
  { x: -0.72, z: -1.6, h: 3.4 },
  { x: 0.72, z: -2.4, h: 3.5 },
  { x: -0.72, z: -3.8, h: 3.3 },
  { x: 0.72, z: -5.1, h: 3.45 },
] as const

/**
 * Dim command corridor revealed through the open gate.
 * Only mounted by the opening cinematic — does not affect landing.
 */
export function GateInterior({ pose }: { pose: RefObject<Pose> }) {
  const root = useRef<THREE.Group>(null)
  const pathLight = useRef<THREE.PointLight>(null)
  const coreLight = useRef<THREE.PointLight>(null)
  const coreMat = useRef<THREE.MeshStandardMaterial>(null)
  const fogMat = useRef<THREE.MeshBasicMaterial>(null)
  const reflectMat = useRef<THREE.MeshStandardMaterial>(null)
  const signalMats = useRef<THREE.MeshBasicMaterial[]>([])

  const wall = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#101614',
        roughness: 0.92,
        metalness: 0.08,
        flatShading: true,
      }),
    [],
  )
  const floor = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#141c18',
        roughness: 0.42,
        metalness: 0.48,
        flatShading: true,
      }),
    [],
  )
  const far = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0c1210',
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
      }),
    [],
  )
  const edge = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a1812',
        emissive: '#1a7a52',
        emissiveIntensity: 0.32,
        roughness: 0.5,
        flatShading: true,
      }),
    [],
  )
  const guides = useMemo(
    () =>
      GUIDES.map(
        (guide) =>
          new THREE.MeshStandardMaterial({
            color: '#0a1c14',
            emissive: '#1f9a62',
            emissiveIntensity: guide.opacity * 0.35,
            transparent: true,
            opacity: 0.4,
            roughness: 0.4,
            metalness: 0.2,
            depthWrite: false,
          }),
      ),
    [],
  )

  useEffect(() => {
    return () => {
      wall.dispose()
      floor.dispose()
      far.dispose()
      edge.dispose()
      guides.forEach((material) => material.dispose())
    }
  }, [edge, far, floor, guides, wall])

  useFrame(({ clock }) => {
    const current = pose.current
    const group = root.current
    if (!current || !group) return
    const reveal = preferences.reduce
      ? Math.max(current.crossing, current.interior)
      : current.crossing * 0.55 + current.interior * 0.45
    group.visible = reveal > 0.02
    if (!group.visible) return

    const t = clock.elapsedTime
    if (pathLight.current) {
      pathLight.current.intensity = 0.22 + reveal * 0.55
      pathLight.current.position.set(GATE.x, 0.55, GATE.z - 2.4 - current.interior * 1.4)
    }
    if (coreLight.current) {
      const pulse = preferences.reduce ? 0.55 : 0.45 + 0.25 * Math.sin(t * 0.7)
      coreLight.current.intensity = (0.35 + reveal * 0.55) * pulse
    }
    if (coreMat.current) {
      coreMat.current.emissiveIntensity = 0.55 + reveal * 0.7 + (preferences.reduce ? 0 : Math.sin(t * 0.7) * 0.12)
    }
    if (fogMat.current) fogMat.current.opacity = 0.08 + reveal * 0.14
    if (reflectMat.current) {
      reflectMat.current.opacity = 0.08 + reveal * 0.12
      reflectMat.current.emissiveIntensity = 0.15 + reveal * 0.25
    }
    guides.forEach((material, index) => {
      const guide = GUIDES[index]
      if (!guide) return
      material.emissiveIntensity = guide.opacity * (0.35 + reveal * 0.85)
      material.opacity = 0.25 + reveal * 0.55
    })
    edge.emissiveIntensity = 0.22 + reveal * 0.28

    // Intermittent low-opacity signal traces along wall seams.
    signalMats.current.forEach((material, index) => {
      if (preferences.reduce) {
        material.opacity = 0.06
        return
      }
      const period = 5.2 + index * 0.7
      const local = (t + index * 1.3) % period
      const active = local < 1.1
      const u = active ? local / 1.1 : 0
      material.opacity = active ? Math.sin(u * Math.PI) * 0.28 : 0
    })
  })

  return (
    <group ref={root} position={[GATE.x, 0, GATE.z]} visible={false}>
      <mesh position={[-1.05, 1.9, -3.1]} material={wall} receiveShadow>
        <boxGeometry args={[0.22, 3.6, 7.4]} />
      </mesh>
      <mesh position={[1.05, 1.9, -3.1]} material={wall} receiveShadow>
        <boxGeometry args={[0.22, 3.6, 7.4]} />
      </mesh>
      <mesh position={[0, 3.75, -3.1]} material={far}>
        <boxGeometry args={[2.2, 0.2, 7.4]} />
      </mesh>
      <mesh position={[0, 0.04, -3.2]} material={floor} receiveShadow>
        <boxGeometry args={[1.9, 0.08, 7.6]} />
      </mesh>
      <mesh position={[0, 1.85, -7.1]} material={far}>
        <boxGeometry args={[2.15, 3.5, 0.28]} />
      </mesh>

      {PILLARS.map((pillar) => (
        <mesh key={`${pillar.x}-${pillar.z}`} position={[pillar.x, pillar.h / 2, pillar.z]} material={wall}>
          <boxGeometry args={[0.22, pillar.h, 0.22]} />
        </mesh>
      ))}

      <mesh position={[-0.45, 0.55, -5.8]} material={wall}>
        <boxGeometry args={[0.55, 0.9, 0.4]} />
      </mesh>
      <mesh position={[0.5, 0.35, -5.35]} material={far}>
        <boxGeometry args={[0.4, 0.55, 0.35]} />
      </mesh>

      {GUIDES.map((guide, index) => (
        <mesh
          key={guide.z}
          position={[0, 0.1, guide.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={guides[index]}
        >
          <planeGeometry args={[guide.w, 0.045]} />
        </mesh>
      ))}

      <mesh position={[-0.92, 1.4, -1.8]} material={edge}>
        <boxGeometry args={[0.03, 2.2, 0.02]} />
      </mesh>
      <mesh position={[0.92, 1.4, -2.6]} material={edge}>
        <boxGeometry args={[0.03, 2.2, 0.02]} />
      </mesh>

      {/* Dim floor reflection strip */}
      <mesh position={[0, 0.085, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 5.8]} />
        <meshStandardMaterial
          ref={reflectMat}
          color="#0a1410"
          emissive="#1a6b48"
          emissiveIntensity={0.2}
          transparent
          opacity={0.1}
          roughness={0.3}
          metalness={0.65}
          depthWrite={false}
        />
      </mesh>

      {/* Slow interior fog */}
      <mesh position={[0, 1.5, -4.2]}>
        <planeGeometry args={[1.8, 2.6]} />
        <meshBasicMaterial ref={fogMat} color="#08110e" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* Intermittent wall signal traces */}
      {[
        { x: -0.93, y: 1.2, z: -2.2 },
        { x: 0.93, y: 1.8, z: -3.5 },
        { x: -0.93, y: 2.4, z: -4.8 },
      ].map((trace, index) => (
        <mesh key={`${trace.z}-${trace.y}`} position={[trace.x, trace.y, trace.z]}>
          <boxGeometry args={[0.02, 0.02, 1.1]} />
          <meshBasicMaterial
            ref={(material) => {
              if (material) signalMats.current[index] = material
            }}
            color="#2a9a68"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Distant green core / terminal destination */}
      <mesh position={[0, 1.15, -6.85]}>
        <boxGeometry args={[0.45, 0.7, 0.18]} />
        <meshStandardMaterial
          ref={coreMat}
          color="#0a1812"
          emissive="#1f9a62"
          emissiveIntensity={0.7}
          roughness={0.4}
          metalness={0.35}
          flatShading
        />
      </mesh>
      <mesh position={[0, 1.55, -6.72]}>
        <boxGeometry args={[0.18, 0.08, 0.04]} />
        <meshStandardMaterial color="#0c2418" emissive="#34d399" emissiveIntensity={0.9} flatShading />
      </mesh>

      <pointLight ref={pathLight} color="#2a8f62" intensity={0} distance={5.5} decay={2} />
      <pointLight ref={coreLight} position={[0, 1.2, -6.6]} color="#1f9a62" intensity={0} distance={4.2} decay={2} />
    </group>
  )
}
