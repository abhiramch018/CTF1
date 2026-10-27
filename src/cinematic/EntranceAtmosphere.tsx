import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { attention } from './attention.ts'
import { GATE } from './layout.ts'
import type { Pose } from './pose.ts'
import { preferences } from './runtime.ts'

type Stone = {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  color: string
}

const TOWERS: Stone[] = [
  { x: -7.2, y: 3.2, z: -14.5, sx: 1.4, sy: 6.4, sz: 1.2, color: '#0c1210' },
  { x: -4.6, y: 2.1, z: -12.8, sx: 1.8, sy: 4.2, sz: 1.5, color: '#101614' },
  { x: -2.1, y: 1.4, z: -16.2, sx: 2.4, sy: 2.8, sz: 1.8, color: '#0e1311' },
  { x: 6.4, y: 3.6, z: -13.5, sx: 1.6, sy: 7.2, sz: 1.3, color: '#0c1210' },
  { x: 9.1, y: 2.4, z: -15.8, sx: 2.1, sy: 4.8, sz: 1.6, color: '#101614' },
  { x: 4.2, y: 1.1, z: -18.4, sx: 3.2, sy: 2.2, sz: 2.4, color: '#0b100e' },
  { x: -9.4, y: 1.6, z: -11.2, sx: 2.6, sy: 3.2, sz: 1.4, color: '#121816' },
  { x: 11.5, y: 1.8, z: -10.6, sx: 1.9, sy: 3.6, sz: 1.2, color: '#121816' },
]

const WALLS: Stone[] = [
  { x: -5.8, y: 1.55, z: -9.6, sx: 3.4, sy: 3.1, sz: 0.35, color: '#131a17' },
  { x: 7.6, y: 1.35, z: -10.2, sx: 2.8, sy: 2.7, sz: 0.32, color: '#131a17' },
  { x: 0.4, y: 0.85, z: -12.4, sx: 4.2, sy: 1.7, sz: 0.4, color: '#0f1512' },
]

const PLATFORMS: Stone[] = [
  { x: -3.2, y: 0.18, z: -8.4, sx: 2.4, sy: 0.2, sz: 1.6, color: '#141c18' },
  { x: 5.5, y: 0.22, z: -9.1, sx: 2.0, sy: 0.18, sz: 1.4, color: '#141c18' },
  { x: 1.2, y: 0.9, z: -14.8, sx: 3.6, sy: 0.16, sz: 2.2, color: '#101614' },
]

const BEACONS = [
  { x: -6.1, y: 0.2, z: -13.2, phase: 0.0, rate: 0.42 },
  { x: 8.4, y: 0.2, z: -14.6, phase: 1.7, rate: 0.31 },
  { x: 1.8, y: 0.2, z: -17.5, phase: 3.1, rate: 0.37 },
] as const

function hash(n: number): number {
  const v = Math.sin(n * 127.1) * 43758.5453
  return v - Math.floor(v)
}

function buildInstances(stones: Stone[]): {
  mesh: THREE.InstancedMesh
  dispose: () => void
} {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.92,
    metalness: 0.06,
    flatShading: true,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, stones.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  stones.forEach((stone, index) => {
    dummy.position.set(stone.x, stone.y, stone.z)
    dummy.scale.set(stone.sx, stone.sy, stone.sz)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
    color.set(stone.color)
    mesh.setColorAt(index, color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
  return {
    mesh,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

/**
 * Premium background depth for the opening cinematic only.
 * Does not alter door/operative lighting.
 */
export function EntranceAtmosphere({
  pose,
  compact = false,
}: {
  pose: RefObject<Pose>
  compact?: boolean
}) {
  const far = useRef<THREE.Group>(null)
  const mid = useRef<THREE.Group>(null)
  const fogA = useRef<THREE.Mesh>(null)
  const fogB = useRef<THREE.Mesh>(null)
  const fogC = useRef<THREE.Mesh>(null)
  const scan = useRef<THREE.Mesh>(null)
  const scanMat = useRef<THREE.MeshBasicMaterial>(null)
  const gridMat = useRef<THREE.MeshStandardMaterial>(null)
  const reflectMat = useRef<THREE.MeshStandardMaterial>(null)
  const beaconMats = useRef<THREE.MeshStandardMaterial[]>([])
  const beaconCols = useRef<THREE.MeshBasicMaterial[]>([])
  const txLine = useRef<THREE.Mesh>(null)
  const txMat = useRef<THREE.MeshBasicMaterial>(null)
  const shards = useRef<THREE.Group>(null)

  const architecture = useMemo(() => {
    const towers = buildInstances(TOWERS)
    const walls = buildInstances(WALLS)
    const platforms = buildInstances(PLATFORMS)
    return { towers, walls, platforms }
  }, [])

  const fragmentCloud = useMemo(() => {
    const count = compact ? 18 : 36
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = -8 + hash(i + 2) * 18
      positions[i * 3 + 1] = 0.6 + hash(i + 9) * 5.5
      positions[i * 3 + 2] = -7.5 - hash(i + 17) * 10
      seeds[i] = hash(i + 41)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: '#2a8f62',
      size: compact ? 0.035 : 0.028,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const points = new THREE.Points(geometry, material)
    return { points, seeds, count, dispose: () => {
      geometry.dispose()
      material.dispose()
    } }
  }, [compact])

  const shardSpecs = useMemo(() => {
    const count = compact ? 5 : 9
    return Array.from({ length: count }, (_, i) => ({
      x: -6 + hash(i + 3) * 14,
      y: 1.2 + hash(i + 11) * 3.2,
      z: -8 - hash(i + 19) * 8,
      sx: 0.04 + hash(i + 7) * 0.08,
      sy: 0.02 + hash(i + 13) * 0.05,
      sz: 0.015,
      drift: 0.012 + hash(i + 23) * 0.02,
      phase: hash(i + 29) * Math.PI * 2,
    }))
  }, [compact])

  useEffect(() => {
    return () => {
      architecture.towers.dispose()
      architecture.walls.dispose()
      architecture.platforms.dispose()
      fragmentCloud.dispose()
    }
  }, [architecture, fragmentCloud])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const reduce = preferences.reduce
    const current = pose.current
    const calm = reduce ? 0 : 1
    const px = attention.pointerX * calm
    const py = attention.pointerY * calm

    // Layered parallax on distant layers only — gate/operative stay put.
    if (far.current) {
      far.current.position.x = px * -0.55
      far.current.position.y = py * 0.12
    }
    if (mid.current) {
      mid.current.position.x = px * -0.22
      mid.current.position.y = py * 0.05
    }

    // Soft fog planes drift horizontally.
    const fogDrift = reduce ? 0 : 1
    if (fogA.current) fogA.current.position.x = GATE.x + Math.sin(t * 0.08) * 1.4 * fogDrift
    if (fogB.current) fogB.current.position.x = GATE.x - 1.2 + Math.sin(t * 0.06 + 1.2) * 1.8 * fogDrift
    if (fogC.current) fogC.current.position.x = GATE.x + 0.6 + Math.sin(t * 0.05 + 2.4) * 2.2 * fogDrift

    // Beacons pulse at staggered slow rates.
    BEACONS.forEach((beacon, index) => {
      const pulse = reduce ? 0.45 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * beacon.rate + beacon.phase))
      const mat = beaconMats.current[index]
      const col = beaconCols.current[index]
      if (mat) mat.emissiveIntensity = 0.4 + pulse * 0.7
      if (col) col.opacity = 0.08 + pulse * 0.14
    })

    // Sparse data fragments drift slowly.
    if (!reduce) {
      const pos = fragmentCloud.points.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < fragmentCloud.count; i += 1) {
        const seed = fragmentCloud.seeds[i] ?? 0
        let y = pos.getY(i) + (0.004 + seed * 0.006)
        let x = pos.getX(i) + Math.sin(t * 0.15 + seed * 6) * 0.0015
        if (y > 6.4) y = 0.5
        pos.setXYZ(i, x, y, pos.getZ(i))
      }
      pos.needsUpdate = true
    }

    if (shards.current && !reduce) {
      shards.current.children.forEach((child, index) => {
        const spec = shardSpecs[index]
        if (!spec || !(child instanceof THREE.Mesh)) return
        child.position.y = spec.y + Math.sin(t * 0.2 + spec.phase) * 0.25
        child.position.x = spec.x + Math.sin(t * 0.12 + spec.phase) * 0.35
        child.rotation.z = Math.sin(t * 0.1 + spec.phase) * 0.2
      })
    }

    // Occasional transmission line across distant panels.
    if (txLine.current && txMat.current) {
      if (reduce) {
        txMat.current.opacity = 0.04
        txLine.current.position.set(GATE.x - 4.2, 2.1, -9.7)
      } else {
        const cycle = (t % 7.4) / 7.4
        const active = cycle > 0.12 && cycle < 0.38
        const local = active ? (cycle - 0.12) / 0.26 : 0
        txMat.current.opacity = active ? Math.sin(local * Math.PI) * 0.28 : 0
        txLine.current.position.set(GATE.x - 5.4 + local * 8.5, 1.6 + Math.sin(t * 0.2) * 0.2, -9.7)
      }
    }

    // Quiet scan sweep every ~8s across far background.
    if (scan.current && scanMat.current) {
      if (reduce) {
        scanMat.current.opacity = 0
      } else {
        const period = 8.2
        const local = t % period
        const active = local > 0.4 && local < 1.55
        const u = active ? (local - 0.4) / 1.15 : 0
        scanMat.current.opacity = active ? Math.sin(u * Math.PI) * 0.22 : 0
        scan.current.position.set(GATE.x, 0.4 + u * 5.2, -15.2)
      }
    }

    // Floor grid + soft seam/operative reflection cue.
    if (gridMat.current) {
      gridMat.current.opacity = 0.12 + (current?.approach ?? 0) * 0.04
    }
    if (reflectMat.current) {
      const portal = current?.portal ?? 0
      const op = current?.operativeOpacity ?? 0
      reflectMat.current.emissiveIntensity = 0.15 + portal * 0.35 + op * 0.12
      reflectMat.current.opacity = 0.1 + portal * 0.12 + op * 0.08
    }
  })

  return (
    <group>
      {/* Far architecture — strongest parallax */}
      <group ref={far}>
        <primitive object={architecture.towers.mesh} />
        <primitive object={architecture.platforms.mesh} />
        {BEACONS.map((beacon, index) => (
          <group key={`${beacon.x}-${beacon.z}`} position={[beacon.x, beacon.y, beacon.z]}>
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[0.28, 0.24, 0.28]} />
              <meshStandardMaterial
                ref={(material) => {
                  if (material) beaconMats.current[index] = material
                }}
                color="#0a1812"
                emissive="#1f9a62"
                emissiveIntensity={0.55}
                roughness={0.45}
                flatShading
              />
            </mesh>
            <mesh position={[0, 2.4, 0]}>
              <cylinderGeometry args={[0.015, 0.04, 4.6, 6]} />
              <meshBasicMaterial
                ref={(material) => {
                  if (material) beaconCols.current[index] = material
                }}
                color="#2a9a68"
                transparent
                opacity={0.12}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        <mesh ref={scan} position={[GATE.x, 2, -15.2]} rotation={[0, 0, 0]}>
          <planeGeometry args={[18, 0.06]} />
          <meshBasicMaterial
            ref={scanMat}
            color="#39d98a"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Mid depth — broken walls + softer parallax */}
      <group ref={mid}>
        <primitive object={architecture.walls.mesh} />
        <mesh ref={txLine} position={[GATE.x - 4, 2.1, -9.7]}>
          <boxGeometry args={[1.8, 0.018, 0.02]} />
          <meshBasicMaterial
            ref={txMat}
            color="#3dba7e"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Soft dark-green fog planes for depth separation */}
      <mesh ref={fogA} position={[GATE.x, 1.6, -6.2]} rotation={[0, 0.08, 0]}>
        <planeGeometry args={[10, 3.4]} />
        <meshBasicMaterial color="#0a1612" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh ref={fogB} position={[GATE.x - 1.2, 1.9, -9.4]} rotation={[0, -0.05, 0]}>
        <planeGeometry args={[14, 4.2]} />
        <meshBasicMaterial color="#08110e" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={fogC} position={[GATE.x + 0.6, 2.3, -13.5]} rotation={[0, 0.03, 0]}>
        <planeGeometry args={[18, 5]} />
        <meshBasicMaterial color="#070e0b" transparent opacity={0.24} depthWrite={false} />
      </mesh>

      {/* Tiled floor grid extending into darkness */}
      <mesh rotation-x={-Math.PI / 2} position={[GATE.x, 0.015, GATE.z - 4.5]} receiveShadow>
        <planeGeometry args={[12, 16, 12, 16]} />
        <meshStandardMaterial
          ref={gridMat}
          color="#0c1210"
          wireframe
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      {/* Soft reflection strip of portal seam / silhouette cue */}
      <mesh rotation-x={-Math.PI / 2} position={[GATE.x, 0.02, GATE.z + 0.55]}>
        <planeGeometry args={[0.12, 2.8]} />
        <meshStandardMaterial
          ref={reflectMat}
          color="#0a1812"
          emissive="#1f9a62"
          emissiveIntensity={0.2}
          transparent
          opacity={0.12}
          roughness={0.25}
          metalness={0.6}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[GATE.x + 0.35, 0.018, GATE.z + 1.1]}>
        <planeGeometry args={[0.55, 1.1]} />
        <meshStandardMaterial
          color="#0a100e"
          emissive="#0f2a1c"
          emissiveIntensity={0.18}
          transparent
          opacity={0.1}
          roughness={0.35}
          metalness={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* Floating data fragments */}
      <primitive object={fragmentCloud.points} />
      <group ref={shards}>
        {shardSpecs.map((spec) => (
          <mesh
            key={`${spec.x}-${spec.z}`}
            position={[spec.x, spec.y, spec.z]}
            scale={[spec.sx, spec.sy, spec.sz]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#1f6b4a" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
