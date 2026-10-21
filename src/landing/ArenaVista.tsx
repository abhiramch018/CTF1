import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { webglAvailable } from '../cinematic/runtime.ts'
import type { ArenaExtras } from './arenaAccess.ts'

const CAM_POS = new THREE.Vector3(0, 2.55, 5.85)
const CAM_LOOK = new THREE.Vector3(0, 0.7, -2.2)

type Props = {
  extras: RefObject<ArenaExtras>
  reduced: boolean
}

function ArenaWorld({ extras, reduced }: Props) {
  const camera = useThree((state) => state.camera)
  const parallax = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const panels = useRef<THREE.Group>(null)
  const pylons = useRef<THREE.Group>(null)
  const portal = useRef<THREE.Mesh>(null)
  const portalMat = useRef<THREE.MeshBasicMaterial>(null)
  const portalDeep = useRef<THREE.MeshBasicMaterial>(null)
  const portalWire = useRef<THREE.Mesh>(null)
  const route = useRef<THREE.MeshBasicMaterial>(null)
  const core = useRef<THREE.Group>(null)
  const coreMat = useRef<THREE.MeshStandardMaterial>(null)
  const sweep = useRef<THREE.MeshBasicMaterial>(null)
  const particles = useRef<THREE.Points>(null)
  const rim = useRef<THREE.PointLight>(null)

  const stone = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c2621',
        roughness: 0.78,
        metalness: 0.32,
        flatShading: true,
      }),
    [],
  )
  const stoneDeep = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#101612',
        roughness: 0.88,
        metalness: 0.18,
        flatShading: true,
      }),
    [],
  )
  const stoneEdge = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#24352c',
        emissive: '#0a3d28',
        emissiveIntensity: 0.4,
        roughness: 0.55,
        metalness: 0.42,
        flatShading: true,
      }),
    [],
  )

  const particleGeo = useMemo(() => {
    const count = 36
    const positions = new Float32Array(count * 3)
    let seed = 4103
    const next = () => {
      seed = (seed * 48271) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (next() - 0.5) * 1.6
      positions[i * 3 + 1] = 0.35 + next() * 1.8
      positions[i * 3 + 2] = -0.4 - next() * 3.2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const particleMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#9ee6c3',
        size: 0.028,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      stone.dispose()
      stoneDeep.dispose()
      stoneEdge.dispose()
      particleGeo.dispose()
      particleMat.dispose()
    }
  }, [stone, stoneDeep, stoneEdge, particleGeo, particleMat])

  useLayoutEffect(() => {
    camera.position.copy(CAM_POS)
    camera.lookAt(CAM_LOOK)
  }, [camera])

  useEffect(() => {
    if (reduced) return
    const onPointer = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      // ~4–6px screen parallax
      parallax.current.tx = nx * 0.032
      parallax.current.ty = -ny * 0.022
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => window.removeEventListener('pointermove', onPointer)
  }, [reduced])

  useFrame(({ clock }) => {
    const e = extras.current
    if (!e) return

    if (!reduced) {
      parallax.current.x += (parallax.current.tx - parallax.current.x) * 0.08
      parallax.current.y += (parallax.current.ty - parallax.current.y) * 0.08
      camera.position.set(
        CAM_POS.x + parallax.current.x,
        CAM_POS.y + parallax.current.y * 0.35,
        CAM_POS.z,
      )
      camera.lookAt(
        CAM_LOOK.x + parallax.current.x * 0.35,
        CAM_LOOK.y + parallax.current.y * 0.2,
        CAM_LOOK.z,
      )
    }

    if (panels.current) {
      panels.current.children.forEach((child, index) => {
        const local = Math.max(0, Math.min(1, (e.path - index * 0.1) / 0.28))
        const rise = local * local * (3 - 2 * local)
        child.position.y = -1.55 + rise * 1.55
        child.scale.setScalar(0.6 + rise * 0.4)
        child.visible = rise > 0.02
      })
    }

    if (pylons.current) {
      const rise = e.pylons
      pylons.current.position.y = -2.4 + rise * 2.4
      pylons.current.visible = rise > 0.04
    }

    if (route.current) {
      route.current.opacity = 0.08 + e.route * 0.28 + e.portal * 0.12
    }

    if (portal.current && portalMat.current && portalDeep.current) {
      const open = Math.max(0.04, e.portal)
      portal.current.visible = e.portal > 0.04
      portal.current.scale.set(0.25 + open * 0.9, 0.4 + open * 0.6, 1)
      portalMat.current.opacity = 0.14 + e.portal * 0.52
      portalDeep.current.opacity = e.portal * 0.4
    }
    if (portalWire.current) {
      portalWire.current.visible = e.portal > 0.12
      const mat = portalWire.current.material
      if (mat instanceof THREE.MeshBasicMaterial) mat.opacity = e.portal * 0.28
    }

    if (core.current && coreMat.current) {
      core.current.visible = e.core > 0.08
      const pulse = 0.85 + Math.sin(clock.elapsedTime * 1.6) * 0.08
      core.current.scale.setScalar(e.core * pulse)
      core.current.rotation.y = clock.elapsedTime * 0.55
      core.current.rotation.x = Math.sin(clock.elapsedTime * 0.7) * 0.2
      coreMat.current.emissiveIntensity = 0.45 + e.core * 0.9 + Math.sin(clock.elapsedTime * 2.1) * 0.12
    }

    if (sweep.current) {
      sweep.current.opacity = 0.04 + e.sweep * 0.42 + e.path * 0.06
    }

    if (rim.current) {
      rim.current.intensity = 0.15 + e.portal * 1.6 + e.core * 0.4
    }

    const pts = particles.current
    if (pts) {
      particleMat.opacity = e.portal * 0.55
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      const speed = 0.014 + e.portal * 0.01
      for (let i = 0; i < arr.length / 3; i += 1) {
        const ix = i * 3
        arr[ix]! += (0 - arr[ix]!) * speed * 0.35
        arr[ix + 1]! += (1.15 - arr[ix + 1]!) * speed * 0.2
        arr[ix + 2]! -= speed
        if (arr[ix + 2]! < -4.2) {
          arr[ix] = (Math.sin(clock.elapsedTime * 9 + i) * 0.5) * 1.4
          arr[ix + 1] = 0.4 + ((i * 17) % 10) * 0.12
          arr[ix + 2] = -0.2
        }
      }
      attr.needsUpdate = true
    }
  })

  const panelLayout = useMemo(
    () =>
      [
        { z: 2.55, w: 2.45 },
        { z: 1.65, w: 2.15 },
        { z: 0.75, w: 1.9 },
        { z: -0.1, w: 1.7 },
        { z: -0.95, w: 1.5 },
        { z: -1.8, w: 1.35 },
        { z: -2.55, w: 1.2 },
      ] as const,
    [],
  )

  return (
    <>
      <color attach="background" args={['#070a08']} />
      <fogExp2 attach="fog" args={['#070a08', 0.038]} />
      <ambientLight intensity={0.58} color="#1a3a2c" />
      <hemisphereLight args={['#2a5544', '#050706', 0.85]} />
      <directionalLight position={[3.2, 8.5, 4.5]} intensity={3.2} color="#eef7f1" />
      <pointLight
        ref={rim}
        position={[0, 1.7, -2.9]}
        color="#6ee0b0"
        intensity={0.25}
        distance={8}
        decay={2}
      />

      {/* Soft floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[10, 12]} />
        <meshStandardMaterial color="#070a08" roughness={1} metalness={0} />
      </mesh>

      {/* Dormant emerald route line into depth */}
      <mesh position={[0, 0.04, -0.35]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[0.055, 7.4]} />
        <meshBasicMaterial
          ref={route}
          color="#3dcea0"
          transparent
          opacity={0.14}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Assembling voxel floor panels */}
      <group ref={panels}>
        {panelLayout.map((panel, index) => (
          <group key={panel.z} position={[0, -1.4, panel.z]}>
            <mesh material={index % 2 === 0 ? stone : stoneDeep}>
              <boxGeometry args={[panel.w, 0.16, 0.78]} />
            </mesh>
            <mesh position={[0, 0.09, 0]} material={stoneEdge}>
              <boxGeometry args={[panel.w * 0.92, 0.02, 0.04]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Far gate pylons */}
      <group ref={pylons} position={[0, -2.4, -3.15]}>
        <mesh position={[-1.05, 1.45, 0]} material={stoneEdge}>
          <boxGeometry args={[0.4, 2.9, 0.4]} />
        </mesh>
        <mesh position={[1.05, 1.45, 0]} material={stoneEdge}>
          <boxGeometry args={[0.4, 2.9, 0.4]} />
        </mesh>
        <mesh position={[0, 2.95, -0.02]} material={stone}>
          <boxGeometry args={[2.5, 0.22, 0.34]} />
        </mesh>
        <mesh position={[-1.05, 0.12, 0.12]} material={stoneDeep}>
          <boxGeometry args={[0.5, 0.18, 0.55]} />
        </mesh>
        <mesh position={[1.05, 0.12, 0.12]} material={stoneDeep}>
          <boxGeometry args={[0.5, 0.18, 0.55]} />
        </mesh>
      </group>

      {/* Contained portal surface */}
      <mesh ref={portal} position={[0, 1.25, -3.05]} renderOrder={3}>
        <planeGeometry args={[1.45, 2.25]} />
        <meshBasicMaterial
          ref={portalMat}
          color="#2db88a"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 1.25, -3.3]} renderOrder={2}>
        <planeGeometry args={[1.15, 1.9]} />
        <meshBasicMaterial
          ref={portalDeep}
          color="#0a2e20"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={portalWire} position={[0, 1.25, -3.55]} renderOrder={2} visible={false}>
        <planeGeometry args={[0.82, 1.45]} />
        <meshBasicMaterial color="#6ee0b0" transparent opacity={0} depthWrite={false} wireframe toneMapped={false} />
      </mesh>

      {/* Original flag core / encrypted shard */}
      <group ref={core} position={[0, 1.3, -2.9]}>
        <mesh>
          <octahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial
            ref={coreMat}
            color="#0c2418"
            emissive="#34d399"
            emissiveIntensity={0.6}
            roughness={0.35}
            metalness={0.55}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0, 0.02]} scale={[0.55, 0.55, 0.55]}>
          <boxGeometry args={[0.12, 0.12, 0.04]} />
          <meshBasicMaterial color="#b8f4d6" transparent opacity={0.75} toneMapped={false} />
        </mesh>
      </group>

      {/* Path reflection sweep */}
      <mesh position={[0, 0.04, 0.2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[2.4, 5.5]} />
        <meshBasicMaterial
          ref={sweep}
          color="#1f9a62"
          transparent
          opacity={0.05}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points ref={particles} geometry={particleGeo} material={particleMat} frustumCulled={false} />
    </>
  )
}

function ArenaFallback() {
  return (
    <div className="arena-fallback" aria-hidden="true">
      <div className="arena-fallback-path" />
      <div className="arena-fallback-portal" />
      <div className="arena-fallback-core" />
    </div>
  )
}

export function ArenaVista({ extras, reduced }: Props) {
  const glOk = useMemo(() => webglAvailable(), [])

  if (!glOk) return <ArenaFallback />

  return (
    <div className="arena-vista">
      <Canvas
        dpr={[1, 1.25]}
        shadows={false}
        camera={{ fov: 36, near: 0.15, far: 40, position: CAM_POS.toArray() as [number, number, number] }}
        gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#070a08')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
        }}
      >
        <ArenaWorld extras={extras} reduced={reduced} />
      </Canvas>
    </div>
  )
}
