import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { GATE } from '../cinematic/layout.ts'
import type { WakeExtras } from './breachWake.ts'

type Props = {
  extras: RefObject<WakeExtras>
  portalRef: RefObject<number>
}

/** Layered gate depth, widening aperture, tunnel, ruins — hero only. */
export function BreachExtras({ extras, portalRef }: Props) {
  const aperture = useRef<THREE.Mesh>(null)
  const apertureMat = useRef<THREE.MeshBasicMaterial>(null)
  const jambL = useRef<THREE.Mesh>(null)
  const jambR = useRef<THREE.Mesh>(null)
  const tunnel = useRef<THREE.Group>(null)
  const edgeLeft = useRef<THREE.Mesh>(null)
  const edgeRight = useRef<THREE.Mesh>(null)
  const edgeScan = useRef<THREE.MeshBasicMaterial>(null)
  const energyA = useRef<THREE.MeshBasicMaterial>(null)
  const energyB = useRef<THREE.MeshBasicMaterial>(null)
  const energyC = useRef<THREE.MeshBasicMaterial>(null)
  const floorSweep = useRef<THREE.Mesh>(null)
  const floorMat = useRef<THREE.MeshBasicMaterial>(null)
  const fragments = useRef<THREE.Group>(null)
  const layers = useRef<THREE.Group>(null)
  const dust = useRef<THREE.Points>(null)

  const stone = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a2420',
        roughness: 0.78,
        metalness: 0.32,
        flatShading: true,
      }),
    [],
  )
  const stoneDeep = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a0e0c',
        roughness: 0.9,
        metalness: 0.16,
        flatShading: true,
      }),
    [],
  )
  const stoneEdge = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#24352c',
        emissive: '#0a3d28',
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.4,
        flatShading: true,
      }),
    [],
  )

  const dustGeo = useMemo(() => {
    const count = 28
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (i % 2 === 0 ? -1 : 1) * (0.15 + (i % 5) * 0.08)
      positions[i * 3 + 1] = ((i % 7) - 3) * 0.28
      positions[i * 3 + 2] = -0.2 - (i % 9) * 0.28
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#b8f4d6',
        size: 0.04,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  )

  useFrame(({ clock }) => {
    const e = extras.current
    const portal = portalRef.current ?? 0
    if (!e) return

    if (layers.current) {
      layers.current.children.forEach((child, index) => {
        child.visible = e.construct > index * 0.12
        child.scale.setScalar(0.92 + e.construct * 0.08)
      })
    }

    // Visible door opening: thin seam → wide emerald aperture
    const open = Math.max(0.06, portal * 1.85)
    if (aperture.current && apertureMat.current) {
      aperture.current.scale.set(open, 1, 1)
      apertureMat.current.opacity = 0.18 + portal * 0.62 + e.tunnel * 0.18
    }
    if (jambL.current) jambL.current.position.x = GATE.x - 0.08 - open * 0.52
    if (jambR.current) jambR.current.position.x = GATE.x + 0.08 + open * 0.52

    if (tunnel.current) {
      tunnel.current.visible = e.tunnel > 0.06
      const drift = clock.elapsedTime * 0.18
      tunnel.current.children.forEach((child, index) => {
        if (!(child instanceof THREE.Mesh)) return
        if (child.userData.kind === 'grid' && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = e.tunnel * (0.28 + portal * 0.35) * (1 - index * 0.08)
          // Slow depth crawl
          const baseZ = child.userData.baseZ as number
          child.position.z = baseZ + Math.sin(drift + index * 0.7) * 0.04
        }
      })
    }

    if (edgeScan.current) edgeScan.current.opacity = 0.45 + e.edgeScan * 0.55
    const climb = ((clock.elapsedTime * 1.15) % 1) * 4.6 - 0.6
    if (edgeLeft.current) {
      edgeLeft.current.position.y = climb
      edgeLeft.current.visible = e.construct > 0.12
      edgeLeft.current.scale.set(1, 0.7 + e.construct * 0.5, 1)
    }
    if (edgeRight.current) {
      edgeRight.current.position.y = (climb + 1.55) % 4.6 - 0.6
      edgeRight.current.visible = e.construct > 0.12
      edgeRight.current.scale.set(1, 0.7 + e.construct * 0.5, 1)
    }

    if (energyA.current) {
      energyA.current.opacity = e.tunnel * (0.48 + Math.sin(clock.elapsedTime * 0.95) * 0.1)
    }
    if (energyB.current) {
      energyB.current.opacity = e.tunnel * (0.34 + Math.sin(clock.elapsedTime * 1.2 + 1.1) * 0.08)
    }
    if (energyC.current) {
      energyC.current.opacity = e.tunnel * (0.22 + Math.sin(clock.elapsedTime * 0.7 + 2.2) * 0.06)
    }

    if (floorMat.current && floorSweep.current) {
      floorMat.current.opacity =
        0.06 + e.construct * 0.1 + e.floorSweep * 0.5 + portal * 0.14
      floorSweep.current.position.z = GATE.z + 1.1 + Math.sin(clock.elapsedTime * 0.4) * 0.15
      floorSweep.current.scale.set(0.85 + e.construct * 0.2, 1, 1)
    }

    if (fragments.current) {
      fragments.current.visible = e.tunnel > 0.12
      fragments.current.children.forEach((child, index) => {
        child.position.z -= 0.016 + (index % 3) * 0.004
        if (child.position.z < -3.6) child.position.z = -0.15
      })
    }

    if (dust.current) {
      dustMat.opacity = e.tunnel * 0.55
      const attr = dust.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < arr.length / 3; i += 1) {
        const iz = i * 3 + 2
        arr[iz]! -= 0.01 + (i % 4) * 0.002
        if (arr[iz]! < -3.5) arr[iz] = -0.1
      }
      attr.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Background cyber ruins / firewall silhouette */}
      <group position={[GATE.x + 0.2, 0, GATE.z - 4.0]}>
        <mesh position={[-2.8, 1.9, 0]} material={stoneDeep}>
          <boxGeometry args={[1.35, 3.8, 0.5]} />
        </mesh>
        <mesh position={[2.9, 1.35, -0.4]} material={stoneDeep}>
          <boxGeometry args={[1.6, 2.7, 0.48]} />
        </mesh>
        <mesh position={[0.15, 2.7, -1.0]} material={stoneDeep}>
          <boxGeometry args={[4.6, 0.38, 0.4]} />
        </mesh>
        <mesh position={[-1.35, 0.7, 0.3]} material={stone}>
          <boxGeometry args={[0.9, 1.35, 0.55]} />
        </mesh>
        <mesh position={[1.5, 0.55, 0.15]} material={stone}>
          <boxGeometry args={[0.7, 1.05, 0.45]} />
        </mesh>
        {/* faint firewall bars */}
        {[-1.8, -0.6, 0.6, 1.8].map((x) => (
          <mesh key={x} position={[x, 2.1, -1.5]} material={stoneEdge}>
            <boxGeometry args={[0.08, 2.8, 0.08]} />
          </mesh>
        ))}
      </group>

      {/* Multi-layer obsidian gate shells at different z */}
      <group ref={layers}>
        {[
          { z: 0.85, s: 1.14, edge: true },
          { z: 0.35, s: 1.06, edge: false },
          { z: -0.2, s: 0.98, edge: false },
          { z: -0.8, s: 0.9, edge: false },
        ].map((layer) => (
          <group key={layer.z} position={[GATE.x, 2.4, GATE.z + layer.z]} scale={layer.s}>
            <mesh material={layer.edge ? stoneEdge : stone} position={[-1.62, 0, 0]}>
              <boxGeometry args={[0.48, 4.9, 0.36]} />
            </mesh>
            <mesh material={layer.edge ? stoneEdge : stone} position={[1.62, 0, 0]}>
              <boxGeometry args={[0.48, 4.9, 0.36]} />
            </mesh>
            <mesh material={stoneDeep} position={[0, 2.6, 0]}>
              <boxGeometry args={[3.8, 0.4, 0.4]} />
            </mesh>
            <mesh material={stoneDeep} position={[0, -2.5, 0.06]}>
              <boxGeometry args={[3.5, 0.28, 0.5]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Climbing emerald edge segments */}
      <mesh ref={edgeLeft} position={[GATE.x - 1.78, 2.2, GATE.z + 0.92]} renderOrder={6}>
        <planeGeometry args={[0.07, 1.35]} />
        <meshBasicMaterial
          ref={edgeScan}
          color="#d4ffe8"
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={edgeRight} position={[GATE.x + 1.78, 2.2, GATE.z + 0.92]} renderOrder={6}>
        <planeGeometry args={[0.07, 1.35]} />
        <meshBasicMaterial color="#9ee6c3" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Splitting jamb highlights — make the seam widen read clearly */}
      <mesh ref={jambL} position={[GATE.x - 0.12, 2.25, GATE.z + 0.55]} renderOrder={5}>
        <planeGeometry args={[0.05, 3.85]} />
        <meshBasicMaterial color="#b8f4d6" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={jambR} position={[GATE.x + 0.12, 2.25, GATE.z + 0.55]} renderOrder={5}>
        <planeGeometry args={[0.05, 3.85]} />
        <meshBasicMaterial color="#b8f4d6" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Explicit aperture that widens with portal power */}
      <mesh ref={aperture} position={[GATE.x, 2.25, GATE.z + 0.32]} renderOrder={4}>
        <planeGeometry args={[1, 4.0]} />
        <meshBasicMaterial
          ref={apertureMat}
          color="#2db88a"
          transparent
          opacity={0.3}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Corridor / encrypted tunnel depth */}
      <group ref={tunnel} position={[GATE.x, 2.25, GATE.z]}>
        {[-0.45, -1.05, -1.75, -2.5, -3.3, -4.1].map((z, index) => (
          <mesh
            key={z}
            position={[0, 0, z]}
            userData={{ kind: 'grid', baseZ: z }}
            renderOrder={2}
          >
            <planeGeometry args={[1.65 - index * 0.14, 4.0 - index * 0.22]} />
            <meshBasicMaterial
              color={index % 2 === 0 ? '#3dcea0' : '#0c2e20'}
              transparent
              opacity={0.4}
              depthWrite={false}
              toneMapped={false}
              wireframe={index > 0}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, -0.7]} renderOrder={3}>
          <planeGeometry args={[1.4, 3.6]} />
          <meshBasicMaterial
            ref={energyA}
            color="#6ee0b0"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, 0.06, -1.45]} renderOrder={3}>
          <planeGeometry args={[1.2, 3.2]} />
          <meshBasicMaterial
            ref={energyB}
            color="#b8f4d6"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, -0.05, -2.35]} renderOrder={3}>
          <planeGeometry args={[0.95, 2.7]} />
          <meshBasicMaterial
            ref={energyC}
            color="#1f9a62"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <group ref={fragments}>
          {Array.from({ length: 14 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (i % 2 === 0 ? -1 : 1) * (0.22 + (i % 3) * 0.12),
                ((i % 5) - 2) * 0.32,
                -0.25 - i * 0.2,
              ]}
            >
              <boxGeometry args={[0.09, 0.05, 0.18]} />
              <meshBasicMaterial color="#a7f3d0" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
        </group>
        <points ref={dust} geometry={dustGeo} material={dustMat} frustumCulled={false} />
      </group>

      {/* Soft emerald floor reflection under the gate */}
      <mesh
        ref={floorSweep}
        position={[GATE.x + 0.1, 0.04, GATE.z + 1.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[5.2, 4.2]} />
        <meshBasicMaterial
          ref={floorMat}
          color="#1f9a62"
          transparent
          opacity={0.12}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
