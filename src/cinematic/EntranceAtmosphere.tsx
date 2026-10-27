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

/** Far layer — distant towers / monoliths (pulled into frame, mid greys). */
const FAR: Stone[] = [
  { x: -7.4, y: 4.2, z: -9.2, sx: 2.0, sy: 8.4, sz: 1.6, color: '#3a4a42' },
  { x: -5.0, y: 3.0, z: -11.0, sx: 2.4, sy: 6.0, sz: 1.8, color: '#44554c' },
  { x: -2.2, y: 2.2, z: -13.2, sx: 2.6, sy: 4.4, sz: 2.0, color: '#33423a' },
  { x: 6.6, y: 4.6, z: -9.6, sx: 2.1, sy: 9.2, sz: 1.6, color: '#3a4a42' },
  { x: 9.2, y: 3.2, z: -11.8, sx: 2.5, sy: 6.4, sz: 1.9, color: '#44554c' },
  { x: 4.0, y: 1.8, z: -14.0, sx: 3.4, sy: 3.6, sz: 2.4, color: '#2e3c35' },
  { x: -9.8, y: 2.4, z: -7.6, sx: 2.6, sy: 4.8, sz: 1.5, color: '#4a5c52' },
  { x: 11.4, y: 2.6, z: -8.0, sx: 2.2, sy: 5.2, sz: 1.4, color: '#4a5c52' },
]

/** Mid layer — wall panels / blocks flanking the gate (clearly in camera). */
const MID: Stone[] = [
  { x: -3.8, y: 2.0, z: -4.6, sx: 2.2, sy: 4.0, sz: 0.42, color: '#4a5c52' },
  { x: 5.6, y: 1.85, z: -4.9, sx: 2.0, sy: 3.7, sz: 0.4, color: '#4a5c52' },
  { x: -2.6, y: 3.6, z: -3.8, sx: 1.0, sy: 0.38, sz: 0.85, color: '#5a6c62' },
  { x: 4.6, y: 3.3, z: -4.0, sx: 0.9, sy: 0.34, sz: 0.75, color: '#5a6c62' },
  { x: -4.8, y: 1.05, z: -3.4, sx: 1.5, sy: 2.1, sz: 0.75, color: '#3a4c42' },
  { x: 6.4, y: 0.95, z: -3.6, sx: 1.4, sy: 1.9, sz: 0.7, color: '#3a4c42' },
  { x: -1.0, y: 0.65, z: -6.8, sx: 2.4, sy: 1.3, sz: 0.5, color: '#354840' },
  { x: 3.8, y: 0.7, z: -7.2, sx: 2.2, sy: 1.4, sz: 0.5, color: '#354840' },
]

const PLATFORMS: Stone[] = [
  { x: -2.4, y: 0.16, z: -3.2, sx: 2.4, sy: 0.22, sz: 1.7, color: '#455850' },
  { x: 4.8, y: 0.18, z: -3.5, sx: 2.1, sy: 0.2, sz: 1.5, color: '#455850' },
  { x: 1.2, y: 0.9, z: -8.5, sx: 3.2, sy: 0.18, sz: 1.9, color: '#3a4a42' },
]

const BEACONS = [
  { x: -5.2, y: 0.15, z: -8.4, phase: 0.0, rate: 0.38 },
  { x: 7.0, y: 0.15, z: -8.8, phase: 1.9, rate: 0.29 },
] as const

const PATH_MARKERS = [
  { x: 3.2, z: 2.4 },
  { x: 3.35, z: 1.55 },
  { x: 3.2, z: 0.7 },
  { x: 2.95, z: -0.15 },
  { x: 2.7, z: -1.0 },
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
    roughness: 0.88,
    metalness: 0.1,
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
  mesh.frustumCulled = false
  return {
    mesh,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

/**
 * Three-layer cyber-voxel facility backdrop for the opening cinematic.
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
  const reflectMat = useRef<THREE.MeshStandardMaterial>(null)
  const beaconMats = useRef<THREE.MeshStandardMaterial[]>([])
  const beaconCols = useRef<THREE.MeshBasicMaterial[]>([])
  const txLine = useRef<THREE.Mesh>(null)
  const txMat = useRef<THREE.MeshBasicMaterial>(null)
  const pathMats = useRef<THREE.MeshStandardMaterial[]>([])
  const shards = useRef<THREE.Group>(null)

  const architecture = useMemo(() => {
    const towers = buildInstances(FAR)
    const walls = buildInstances(MID)
    const platforms = buildInstances(PLATFORMS)
    return { towers, walls, platforms }
  }, [])

  const fragmentCloud = useMemo(() => {
    const count = compact ? 14 : 28
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = -7 + hash(i + 2) * 16
      positions[i * 3 + 1] = 0.8 + hash(i + 9) * 4.8
      positions[i * 3 + 2] = -6.5 - hash(i + 17) * 9
      seeds[i] = hash(i + 41)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: '#3dba7e',
      size: compact ? 0.04 : 0.032,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      sizeAttenuation: true,
    })
    return {
      points: new THREE.Points(geometry, material),
      seeds,
      count,
      dispose: () => {
        geometry.dispose()
        material.dispose()
      },
    }
  }, [compact])

  const groundDust = useMemo(() => {
    const count = compact ? 10 : 16
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = 1.5 + hash(i + 5) * 3.5
      positions[i * 3 + 1] = 0.08 + hash(i + 11) * 0.35
      positions[i * 3 + 2] = -1.2 + hash(i + 19) * 3.8
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: '#2a8f62',
      size: 0.025,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      sizeAttenuation: true,
    })
    return {
      points: new THREE.Points(geometry, material),
      dispose: () => {
        geometry.dispose()
        material.dispose()
      },
    }
  }, [compact])

  const shardSpecs = useMemo(() => {
    const count = compact ? 4 : 7
    return Array.from({ length: count }, (_, i) => ({
      x: -5 + hash(i + 3) * 12,
      y: 1.4 + hash(i + 11) * 2.8,
      z: -7 - hash(i + 19) * 6,
      sx: 0.05 + hash(i + 7) * 0.09,
      sy: 0.02 + hash(i + 13) * 0.05,
      sz: 0.015,
      phase: hash(i + 29) * Math.PI * 2,
    }))
  }, [compact])

  useEffect(() => {
    return () => {
      architecture.towers.dispose()
      architecture.walls.dispose()
      architecture.platforms.dispose()
      fragmentCloud.dispose()
      groundDust.dispose()
    }
  }, [architecture, fragmentCloud, groundDust])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const reduce = preferences.reduce
    const current = pose.current
    const calm = reduce ? 0 : 1
    const px = attention.pointerX * calm
    const py = attention.pointerY * calm

    if (far.current) {
      far.current.position.x = px * -0.45
      far.current.position.y = py * 0.1
    }
    if (mid.current) {
      mid.current.position.x = px * -0.18
      mid.current.position.y = py * 0.04
    }

    const fogDrift = reduce ? 0 : 1
    if (fogA.current) fogA.current.position.x = GATE.x + Math.sin(t * 0.07) * 1.2 * fogDrift
    if (fogB.current) fogB.current.position.x = GATE.x - 1 + Math.sin(t * 0.055 + 1.4) * 1.6 * fogDrift
    if (fogC.current) fogC.current.position.x = GATE.x + 0.5 + Math.sin(t * 0.045 + 2.2) * 2 * fogDrift

    BEACONS.forEach((beacon, index) => {
      const pulse = reduce ? 0.5 : 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * beacon.rate + beacon.phase))
      const mat = beaconMats.current[index]
      const col = beaconCols.current[index]
      if (mat) mat.emissiveIntensity = 0.55 + pulse * 0.85
      if (col) col.opacity = 0.12 + pulse * 0.18
    })

    if (!reduce) {
      const pos = fragmentCloud.points.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < fragmentCloud.count; i += 1) {
        const seed = fragmentCloud.seeds[i] ?? 0
        let y = pos.getY(i) + (0.0035 + seed * 0.005)
        const x = pos.getX(i) + Math.sin(t * 0.12 + seed * 6) * 0.0012
        if (y > 6.2) y = 0.6
        pos.setXYZ(i, x, y, pos.getZ(i))
      }
      pos.needsUpdate = true
    }

    if (shards.current && !reduce) {
      shards.current.children.forEach((child, index) => {
        const spec = shardSpecs[index]
        if (!spec || !(child instanceof THREE.Mesh)) return
        child.position.y = spec.y + Math.sin(t * 0.18 + spec.phase) * 0.22
        child.position.x = spec.x + Math.sin(t * 0.1 + spec.phase) * 0.3
      })
    }

    if (txLine.current && txMat.current) {
      if (reduce) {
        txMat.current.opacity = 0.05
      } else {
        const cycle = (t % 7.6) / 7.6
        const active = cycle > 0.1 && cycle < 0.36
        const local = active ? (cycle - 0.1) / 0.26 : 0
        txMat.current.opacity = active ? Math.sin(local * Math.PI) * 0.32 : 0
        txLine.current.position.set(GATE.x - 4.8 + local * 7.8, 1.7, -6.9)
      }
    }

    if (scan.current && scanMat.current) {
      if (reduce) {
        scanMat.current.opacity = 0
      } else {
        const period = 8.0
        const local = t % period
        const active = local > 0.35 && local < 1.5
        const u = active ? (local - 0.35) / 1.15 : 0
        scanMat.current.opacity = active ? Math.sin(u * Math.PI) * 0.28 : 0
        scan.current.position.set(GATE.x, 0.5 + u * 5.0, -12.5)
      }
    }

    if (reflectMat.current) {
      const portal = current?.portal ?? 0.12
      reflectMat.current.emissiveIntensity = 0.25 + portal * 0.45
      reflectMat.current.opacity = 0.16 + portal * 0.14
    }

    pathMats.current.forEach((material, index) => {
      const pulse = preferences.reduce ? 0.45 : 0.35 + 0.25 * Math.sin(t * 0.9 + index * 0.7)
      material.emissiveIntensity = pulse
    })
  })

  return (
    <group>
      {/* Dim green-black sky gradient — behind architecture, never plain black */}
      <mesh position={[2, 8, -16]} scale={[40, 18, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1a2e24" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[2, 3.2, -20]} scale={[48, 22, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#121c18" transparent opacity={0.65} depthWrite={false} />
      </mesh>

      <group ref={far}>
        <primitive object={architecture.towers.mesh} />
        <primitive object={architecture.platforms.mesh} />
        {BEACONS.map((beacon, index) => (
          <group key={`${beacon.x}-${beacon.z}`} position={[beacon.x, beacon.y, beacon.z]}>
            <mesh position={[0, 0.14, 0]}>
              <boxGeometry args={[0.32, 0.28, 0.32]} />
              <meshStandardMaterial
                ref={(material) => {
                  if (material) beaconMats.current[index] = material
                }}
                color="#0c1c16"
                emissive="#1f9a62"
                emissiveIntensity={0.7}
                roughness={0.4}
                flatShading
              />
            </mesh>
            <mesh position={[0, 2.6, 0]}>
              <cylinderGeometry args={[0.02, 0.05, 5.0, 6]} />
              <meshBasicMaterial
                ref={(material) => {
                  if (material) beaconCols.current[index] = material
                }}
                color="#2a9a68"
                transparent
                opacity={0.16}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        <mesh ref={scan} position={[GATE.x, 2, -12.5]}>
          <planeGeometry args={[20, 0.07]} />
          <meshBasicMaterial
            ref={scanMat}
            color="#39d98a"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={mid}>
        <primitive object={architecture.walls.mesh} />
        {/* Vertical energy conduits */}
        <mesh position={[-4.55, 1.9, -6.55]}>
          <boxGeometry args={[0.06, 3.2, 0.06]} />
          <meshStandardMaterial
            color="#0a1812"
            emissive="#1a7a52"
            emissiveIntensity={0.45}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[6.35, 1.7, -6.95]}>
          <boxGeometry args={[0.06, 2.8, 0.06]} />
          <meshStandardMaterial
            color="#0a1812"
            emissive="#1a7a52"
            emissiveIntensity={0.4}
            roughness={0.4}
          />
        </mesh>
        <mesh ref={txLine} position={[GATE.x - 3.5, 1.7, -6.9]}>
          <boxGeometry args={[1.6, 0.02, 0.02]} />
          <meshBasicMaterial
            ref={txMat}
            color="#3dba7e"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Soft fog planes — low opacity so architecture still reads */}
      <mesh ref={fogA} position={[GATE.x - 3.5, 1.7, -5.8]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[6, 3.0]} />
        <meshBasicMaterial color="#0d1a14" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh ref={fogB} position={[GATE.x + 3.8, 2.0, -6.4]} rotation={[0, -0.1, 0]}>
        <planeGeometry args={[6.5, 3.4]} />
        <meshBasicMaterial color="#0a1511" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh ref={fogC} position={[GATE.x, 2.6, -14]} rotation={[0, 0.02, 0]}>
        <planeGeometry args={[16, 4.5]} />
        <meshBasicMaterial color="#08120e" transparent opacity={0.16} depthWrite={false} />
      </mesh>

      {/* Reflective tiled floor under operative + path to door */}
      <mesh rotation-x={-Math.PI / 2} position={[2.8, 0.012, 0.4]} receiveShadow>
        <planeGeometry args={[7.5, 8.5]} />
        <meshStandardMaterial
          color="#121a16"
          roughness={0.32}
          metalness={0.62}
          flatShading
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[2.8, 0.014, 0.4]}>
        <planeGeometry args={[7.5, 8.5, 10, 12]} />
        <meshBasicMaterial color="#1f9a62" wireframe transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[GATE.x + 0.15, 0.02, GATE.z + 1.1]}>
        <planeGeometry args={[0.14, 3.4]} />
        <meshStandardMaterial
          ref={reflectMat}
          color="#0a1812"
          emissive="#1f9a62"
          emissiveIntensity={0.35}
          transparent
          opacity={0.2}
          roughness={0.2}
          metalness={0.7}
          depthWrite={false}
        />
      </mesh>

      {PATH_MARKERS.map((mark, index) => (
        <mesh
          key={`${mark.x}-${mark.z}`}
          position={[mark.x, 0.03, mark.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.22, 0.08]} />
          <meshStandardMaterial
            ref={(material) => {
              if (material) pathMats.current[index] = material
            }}
            color="#0a1812"
            emissive="#1f9a62"
            emissiveIntensity={0.4}
            transparent
            opacity={0.55}
            roughness={0.4}
            depthWrite={false}
          />
        </mesh>
      ))}

      <primitive object={fragmentCloud.points} />
      <primitive object={groundDust.points} />
      <group ref={shards}>
        {shardSpecs.map((spec) => (
          <mesh
            key={`${spec.x}-${spec.z}`}
            position={[spec.x, spec.y, spec.z]}
            scale={[spec.sx, spec.sy, spec.sz]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#1f6b4a" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
