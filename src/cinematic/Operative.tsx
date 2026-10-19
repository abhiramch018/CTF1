import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import type { Pose } from './pose.ts'

type Materials = {
  cloak: THREE.MeshStandardMaterial
  armor: THREE.MeshStandardMaterial
  shade: THREE.MeshStandardMaterial
  signal: THREE.MeshStandardMaterial
}

function Block({
  size,
  position,
  material,
}: {
  size: [number, number, number]
  position: [number, number, number]
  material: THREE.Material
}) {
  return (
    <mesh position={position} material={material} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}

export function Operative({ pose, shadows }: { pose: RefObject<Pose>; shadows: boolean }) {
  const root = useRef<THREE.Group>(null)
  const bob = useRef<THREE.Group>(null)
  const hipL = useRef<THREE.Group>(null)
  const hipR = useRef<THREE.Group>(null)
  const kneeL = useRef<THREE.Group>(null)
  const kneeR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const elbowL = useRef<THREE.Group>(null)
  const elbowR = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)

  const materials = useMemo<Materials>(() => {
    const shared = { flatShading: true, transparent: false, opacity: 1 }
    return {
      cloak: new THREE.MeshStandardMaterial({
        ...shared,
        color: '#121816',
        roughness: 0.88,
        metalness: 0.06,
      }),
      armor: new THREE.MeshStandardMaterial({
        ...shared,
        color: '#1b2420',
        roughness: 0.42,
        metalness: 0.64,
      }),
      shade: new THREE.MeshStandardMaterial({
        ...shared,
        color: '#090c0a',
        roughness: 0.94,
        metalness: 0.04,
      }),
      signal: new THREE.MeshStandardMaterial({
        ...shared,
        color: '#0c2418',
        emissive: '#1f9a62',
        emissiveIntensity: 0.42,
        roughness: 0.32,
        metalness: 0.38,
      }),
    }
  }, [])

  useEffect(() => {
    return () => {
      materials.cloak.dispose()
      materials.armor.dispose()
      materials.shade.dispose()
      materials.signal.dispose()
    }
  }, [materials])

  useFrame(({ clock }) => {
    const current = pose.current
    const group = root.current
    const body = bob.current
    if (!current || !group || !body || !hipL.current || !hipR.current || !kneeL.current || !kneeR.current) return
    if (!armL.current || !armR.current || !elbowL.current || !elbowR.current || !head.current) return

    const opacity = current.operativeOpacity
    group.visible = opacity > 0.02
    group.position.set(current.operativePos[0], 0.02, current.operativePos[2])
    group.rotation.y = current.operativeYaw

    const fading = opacity < 0.985
    for (const material of Object.values(materials)) {
      material.opacity = opacity
      material.transparent = fading
      material.depthWrite = opacity > 0.2
    }

    const swing = Math.sin(current.walkPhase) * 0.46 * current.walkWeight
    hipL.current.rotation.x = swing
    hipR.current.rotation.x = -swing
    kneeL.current.rotation.x = Math.max(0, -swing) * 1.2
    kneeR.current.rotation.x = Math.max(0, swing) * 1.2
    armL.current.rotation.x = -swing * 0.58
    armR.current.rotation.x = swing * 0.58
    elbowL.current.rotation.x = 0.28
    elbowR.current.rotation.x = 0.28
    body.position.y = Math.abs(Math.sin(current.walkPhase)) * 0.035 * current.walkWeight
    body.rotation.x = 0.045 * current.walkWeight
    const idle = (1 - current.walkWeight) * (opacity > 0.9 ? 1 : 0)
    const time = clock.elapsedTime
    head.current.rotation.y = Math.sin(time * 0.5) * 0.04 * idle
    head.current.rotation.x = Math.sin(time * 0.38) * 0.016 * idle
    materials.signal.emissiveIntensity = 0.34 + Math.sin(time * 1.45) * 0.08
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) child.castShadow = shadows && opacity > 0.4
    })
  })

  return (
    <group ref={root} renderOrder={1} scale={1.06}>
      <group ref={bob}>
        <Block size={[0.9, 1.16, 0.1]} position={[0, 1.22, -0.24]} material={materials.shade} />
        <Block size={[0.5, 0.2, 0.28]} position={[0, 1.06, 0]} material={materials.armor} />
        <Block size={[0.58, 0.56, 0.32]} position={[0, 1.42, 0.01]} material={materials.cloak} />
        <Block size={[0.36, 0.28, 0.07]} position={[0, 1.4, 0.18]} material={materials.armor} />
        <Block size={[0.07, 0.16, 0.025]} position={[0, 1.38, 0.225]} material={materials.signal} />
        <group ref={head} position={[0, 1.86, 0]}>
          <Block size={[0.4, 0.34, 0.38]} position={[0, 0, -0.02]} material={materials.shade} />
          <Block size={[0.28, 0.1, 0.26]} position={[0, 0.21, -0.02]} material={materials.shade} />
          <Block size={[0.34, 0.08, 0.16]} position={[0, -0.08, 0.16]} material={materials.shade} />
          <Block size={[0.22, 0.04, 0.02]} position={[0, -0.16, 0.22]} material={materials.signal} />
          <Block size={[0.07, 0.26, 0.2]} position={[-0.21, -0.16, 0.02]} material={materials.shade} />
          <Block size={[0.07, 0.26, 0.2]} position={[0.21, -0.16, 0.02]} material={materials.shade} />
        </group>
        <Block size={[0.28, 0.12, 0.28]} position={[-0.4, 1.64, 0]} material={materials.armor} />
        <Block size={[0.08, 0.1, 0.08]} position={[-0.52, 1.74, -0.02]} material={materials.signal} />
        <Block size={[0.1, 0.06, 0.025]} position={[0, 1.74, -0.3]} material={materials.signal} />
        <Block size={[0.24, 0.11, 0.24]} position={[0.4, 1.62, 0.02]} material={materials.armor} />

        <group ref={hipL} position={[-0.15, 0.98, 0]}>
          <Block size={[0.17, 0.4, 0.18]} position={[0, -0.2, 0]} material={materials.armor} />
          <group ref={kneeL} position={[0, -0.4, 0]}>
            <Block size={[0.15, 0.36, 0.16]} position={[0, -0.18, 0]} material={materials.cloak} />
            <Block size={[0.17, 0.1, 0.28]} position={[0, -0.4, 0.05]} material={materials.armor} />
          </group>
        </group>
        <group ref={hipR} position={[0.15, 0.98, 0]}>
          <Block size={[0.17, 0.4, 0.18]} position={[0, -0.2, 0]} material={materials.armor} />
          <group ref={kneeR} position={[0, -0.4, 0]}>
            <Block size={[0.15, 0.36, 0.16]} position={[0, -0.18, 0]} material={materials.cloak} />
            <Block size={[0.17, 0.1, 0.28]} position={[0, -0.4, 0.05]} material={materials.armor} />
          </group>
        </group>

        <group ref={armL} position={[-0.48, 1.5, 0]}>
          <Block size={[0.13, 0.34, 0.13]} position={[0, -0.17, 0]} material={materials.armor} />
          <group ref={elbowL} position={[0, -0.34, 0]}>
            <Block size={[0.12, 0.3, 0.12]} position={[0, -0.15, 0]} material={materials.cloak} />
            <Block size={[0.1, 0.08, 0.14]} position={[0, -0.32, 0.03]} material={materials.armor} />
          </group>
        </group>
        <group ref={armR} position={[0.48, 1.5, 0]}>
          <Block size={[0.13, 0.34, 0.13]} position={[0, -0.17, 0]} material={materials.armor} />
          <group ref={elbowR} position={[0, -0.34, 0]}>
            <Block size={[0.12, 0.3, 0.12]} position={[0, -0.15, 0]} material={materials.cloak} />
            <Block size={[0.1, 0.08, 0.14]} position={[0, -0.32, 0.03]} material={materials.armor} />
          </group>
        </group>
      </group>
    </group>
  )
}
