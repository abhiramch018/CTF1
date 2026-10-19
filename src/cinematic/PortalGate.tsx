import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { GATE } from './layout.ts'
import type { Pose } from './pose.ts'
import { preferences } from './runtime.ts'

const TABLETS = [
  { x: -1.12, y: 2.15, z: 0.28, ry: 0.1 },
  { x: 1.16, y: 2.6, z: 0.26, ry: -0.08 },
  { x: -0.92, y: 3.55, z: 0.18, ry: 0.05 },
  { x: 1.02, y: 3.7, z: 0.2, ry: -0.06 },
]

function glyphTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 128
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  if (!context) return texture

  context.clearRect(0, 0, 96, 128)
  context.fillStyle = 'rgba(8, 20, 14, 0.2)'
  context.fillRect(6, 6, 84, 116)
  context.strokeStyle = '#d8ffee'
  context.lineWidth = 3
  context.strokeRect(8, 8, 80, 112)
  let state = seed
  const next = () => {
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
  context.beginPath()
  for (let row = 0; row < 5; row += 1) {
    const y = 28 + row * 16
    context.moveTo(18, y)
    context.lineTo(22 + next() * 54, y)
  }
  context.moveTo(18, 108)
  context.lineTo(78, 108)
  context.stroke()
  texture.needsUpdate = true
  return texture
}

const portalVertex = /* glsl */ `
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const portalFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uPower;
  uniform float uTime;
  #include <fog_pars_fragment>
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = pow(1.0 - smoothstep(0.0, 1.0, x), 1.45);
    float side = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
    float vertical = smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    float flow = 0.84 + 0.16 * sin(vUv.y * 16.0 - uTime * 1.25);
    float thread = smoothstep(0.9, 1.0, sin(vUv.y * 34.0 - uTime * 0.7));
    vec3 deep = vec3(0.035, 0.2, 0.12);
    vec3 mint = vec3(0.5, 0.9, 0.72);
    vec3 color = mix(deep, mint, core);
    color += mint * thread * core * 0.12;
    float alpha = clamp(uPower * core * side * vertical * flow, 0.0, 0.62);
    gl_FragColor = vec4(color, alpha);
    #include <fog_fragment>
  }
`

export function PortalGate({ pose }: { pose: RefObject<Pose> }) {
  const leftLeaf = useRef<THREE.Group>(null)
  const rightLeaf = useRef<THREE.Group>(null)
  const tablets = useRef<THREE.Group>(null)
  const seam = useRef<THREE.MeshStandardMaterial>(null)
  const beamCore = useRef<THREE.MeshBasicMaterial>(null)
  const beamHalo = useRef<THREE.MeshBasicMaterial>(null)
  const beam = useRef<THREE.Group>(null)
  const glow = useRef<THREE.PointLight>(null)

  const energy = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        fog: true,
        uniforms: {
          uPower: { value: 0 },
          uTime: { value: 0 },
          fogColor: { value: new THREE.Color('#070a08') },
          fogDensity: { value: 0.018 },
          fogNear: { value: 1 },
          fogFar: { value: 80 },
        },
        vertexShader: portalVertex,
        fragmentShader: portalFragment,
      }),
    [],
  )

  const glyphMaterials = useMemo(
    () =>
      TABLETS.map((_, index) => {
        const texture = glyphTexture(140 + index * 37)
        return new THREE.MeshBasicMaterial({
          map: texture,
          color: '#e7fff4',
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      }),
    [],
  )

  const stone = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#161e1a',
        roughness: 0.74,
        metalness: 0.32,
        flatShading: true,
      }),
    [],
  )
  const stoneDark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0c100e',
        roughness: 0.88,
        metalness: 0.14,
        flatShading: true,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      energy.dispose()
      stone.dispose()
      stoneDark.dispose()
      glyphMaterials.forEach((material) => {
        material.map?.dispose()
        material.dispose()
      })
    }
  }, [energy, glyphMaterials, stone, stoneDark])

  useFrame(({ clock }) => {
    const current = pose.current
    const power = energy.uniforms.uPower
    const time = energy.uniforms.uTime
    if (!current || !power || !time) return
    power.value = current.portal
    time.value = preferences.reduce ? 2.4 : clock.elapsedTime
    if (leftLeaf.current) leftLeaf.current.position.x = GATE.x - 0.46 - current.portal * 0.62
    if (rightLeaf.current) rightLeaf.current.position.x = GATE.x + 0.46 + current.portal * 0.62
    if (seam.current) seam.current.emissiveIntensity = 0.04 + current.portal * 1.35
    if (beam.current) beam.current.visible = current.beam > 0.03
    if (beamCore.current) beamCore.current.opacity = current.beam * 0.16
    if (beamHalo.current) beamHalo.current.opacity = current.beam * 0.04
    if (glow.current) glow.current.intensity = current.portal * 2.8
    if (!tablets.current) return
    tablets.current.visible = current.shards > 0.03
    tablets.current.children.forEach((child, index) => {
      const material = glyphMaterials[index]
      const origin = TABLETS[index]
      if (!material || !origin) return
      material.opacity = current.shards * 0.36
      const drift = preferences.reduce ? 0 : Math.sin(clock.elapsedTime * 0.35 + index) * 0.03
      child.position.y = origin.y + drift
    })
  })

  return (
    <group>
      <mesh position={[GATE.x - 1.28, 2.45, GATE.z]} material={stone} castShadow receiveShadow>
        <boxGeometry args={[0.72, 4.9, 0.9]} />
      </mesh>
      <mesh position={[GATE.x + 1.28, 2.45, GATE.z]} material={stone} castShadow receiveShadow>
        <boxGeometry args={[0.72, 4.9, 0.9]} />
      </mesh>
      <mesh position={[GATE.x, 5.08, GATE.z]} material={stone} castShadow receiveShadow>
        <boxGeometry args={[3.35, 0.58, 1]} />
      </mesh>
      <mesh position={[GATE.x, 5.52, GATE.z]} material={stoneDark} castShadow>
        <boxGeometry args={[2.35, 0.32, 0.72]} />
      </mesh>
      <mesh position={[GATE.x, 0.12, GATE.z + 0.08]} material={stoneDark} receiveShadow>
        <boxGeometry args={[3.5, 0.24, 1.15]} />
      </mesh>

      <group ref={leftLeaf} position={[GATE.x - 0.46, 2.35, GATE.z + 0.28]}>
        <mesh material={stoneDark} castShadow>
          <boxGeometry args={[0.84, 4.15, 0.12]} />
        </mesh>
        <mesh position={[0, 0.7, 0.07]} material={stone}>
          <boxGeometry args={[0.62, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0, -0.15, 0.07]} material={stone}>
          <boxGeometry args={[0.62, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0, -1.0, 0.07]} material={stone}>
          <boxGeometry args={[0.62, 0.06, 0.02]} />
        </mesh>
      </group>
      <group ref={rightLeaf} position={[GATE.x + 0.46, 2.35, GATE.z + 0.28]}>
        <mesh material={stoneDark} castShadow>
          <boxGeometry args={[0.84, 4.15, 0.12]} />
        </mesh>
        <mesh position={[0, 0.35, 0.07]} material={stone}>
          <boxGeometry args={[0.62, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0, -0.55, 0.07]} material={stone}>
          <boxGeometry args={[0.62, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0, -1.35, 0.07]} material={stone}>
          <boxGeometry args={[0.5, 0.06, 0.02]} />
        </mesh>
      </group>

      <mesh position={[GATE.x, 2.28, GATE.z + 0.34]} renderOrder={3}>
        <planeGeometry args={[0.045, 3.55]} />
        <meshStandardMaterial
          ref={seam}
          color="#0e2418"
          emissive="#39d98a"
          emissiveIntensity={0.05}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[GATE.x, 2.25, GATE.z - 0.08]} material={energy} renderOrder={2}>
        <planeGeometry args={[1.55, 4.2]} />
      </mesh>

      <group ref={beam} position={[GATE.x, 4.6, GATE.z]} visible={false}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 4.4, 8]} />
          <meshBasicMaterial ref={beamCore} color="#c8f6de" transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 4.4, 8]} />
          <meshBasicMaterial ref={beamHalo} color="#1f9a62" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      <group ref={tablets} position={[GATE.x, 0, GATE.z]}>
        {TABLETS.map((tablet, index) => (
          <mesh
            key={`${tablet.x}-${tablet.y}`}
            position={[tablet.x, tablet.y, tablet.z]}
            rotation={[0, tablet.ry, 0]}
            material={glyphMaterials[index]}
          >
            <planeGeometry args={[0.2, 0.28]} />
          </mesh>
        ))}
      </group>

      <pointLight
        ref={glow}
        position={[GATE.x, 2.35, GATE.z - 0.2]}
        color="#1f9a62"
        intensity={0}
        distance={5.4}
        decay={2}
      />
    </group>
  )
}
