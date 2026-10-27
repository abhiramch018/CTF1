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
    float seamCore = pow(1.0 - smoothstep(0.0, 1.0, x), 1.45);
    // As the gate unlocks, fill the aperture instead of a thin center line.
    float fill = mix(seamCore, 1.0 - x * 0.42, clamp(uPower * 1.15, 0.0, 1.0));
    float side = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
    float vertical = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    float flow = 0.82 + 0.18 * sin(vUv.y * 14.0 - uTime * 1.15);
    float thread = smoothstep(0.88, 1.0, sin(vUv.y * 28.0 - uTime * 0.65));
    float depthBand = 0.55 + 0.45 * sin(vUv.y * 9.0 - uTime * 0.55);
    vec3 deep = vec3(0.02, 0.16, 0.1);
    vec3 mint = vec3(0.48, 0.9, 0.7);
    vec3 color = mix(deep, mint, fill * depthBand);
    color += mint * thread * fill * 0.14;
    float alpha = clamp(uPower * fill * side * vertical * flow, 0.0, 0.78);
    gl_FragColor = vec4(color, alpha);
    #include <fog_fragment>
  }
`

export function PortalGate({
  pose,
  leafTravel = 0.62,
  wideEnergy = false,
  entrance = false,
}: {
  pose: RefObject<Pose>
  /** Horizontal door-leaf travel multiplier (hero uses a wider unlock). */
  leafTravel?: number
  /** Widen the energy aperture with portal power (hero Breach Wake). */
  wideEnergy?: boolean
  /** Opening cinematic: wider local seam spill + post-crossing dim. */
  entrance?: boolean
}) {
  const leftLeaf = useRef<THREE.Group>(null)
  const rightLeaf = useRef<THREE.Group>(null)
  const tablets = useRef<THREE.Group>(null)
  const seam = useRef<THREE.Mesh>(null)
  const seamMat = useRef<THREE.MeshStandardMaterial>(null)
  const energyMesh = useRef<THREE.Mesh>(null)
  const beamCore = useRef<THREE.MeshBasicMaterial>(null)
  const beamHalo = useRef<THREE.MeshBasicMaterial>(null)
  const beam = useRef<THREE.Group>(null)
  const glow = useRef<THREE.PointLight>(null)
  const frameSpill = useRef<THREE.PointLight>(null)
  const mistMat = useRef<THREE.MeshBasicMaterial>(null)
  const rippleMat = useRef<THREE.MeshBasicMaterial>(null)
  const rippleMesh = useRef<THREE.Mesh>(null)
  const embers = useRef<THREE.Points>(null)
  const emberSeeds = useRef<Float32Array | null>(null)

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
  const engraving = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0e1814',
        emissive: '#1a6b48',
        emissiveIntensity: 0.22,
        roughness: 0.55,
        metalness: 0.25,
        flatShading: true,
      }),
    [],
  )
  const emberCloud = useMemo(() => {
    if (!entrance) return null
    const count = 14
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (i % 2 === 0 ? -0.04 : 0.04) + (Math.sin(i * 12.1) * 0.5 + 0.5) * 0.06
      positions[i * 3 + 1] = 0.4 + (i / count) * 3.2
      positions[i * 3 + 2] = 0
      seeds[i] = Math.sin(i * 47.2) * 0.5 + 0.5
    }
    emberSeeds.current = seeds
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: '#3dba7e',
      size: 0.03,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true,
    })
    return {
      points: new THREE.Points(geometry, material),
      count,
      dispose: () => {
        geometry.dispose()
        material.dispose()
      },
    }
  }, [entrance])

  useEffect(() => {
    return () => {
      energy.dispose()
      stone.dispose()
      stoneDark.dispose()
      engraving.dispose()
      emberCloud?.dispose()
      glyphMaterials.forEach((material) => {
        material.map?.dispose()
        material.dispose()
      })
    }
  }, [emberCloud, energy, engraving, glyphMaterials, stone, stoneDark])

  useFrame(({ clock }) => {
    const current = pose.current
    const power = energy.uniforms.uPower
    const time = energy.uniforms.uTime
    if (!current || !power || !time) return
    power.value = current.portal
    time.value = preferences.reduce ? 2.4 : clock.elapsedTime
    if (leftLeaf.current) leftLeaf.current.position.x = GATE.x - 0.46 - current.portal * leafTravel
    if (rightLeaf.current) rightLeaf.current.position.x = GATE.x + 0.46 + current.portal * leafTravel
    if (seamMat.current) {
      // Thin dormant seam → fades as the aperture becomes a real opening
      const seamIdle = entrance ? 0.28 : 0.05
      const seamGain = wideEnergy ? 0.35 : entrance ? 0.85 : 1.2
      seamMat.current.emissiveIntensity = seamIdle + current.portal * seamGain
      seamMat.current.opacity = wideEnergy ? Math.max(0, 0.9 - current.portal * 1.35) : 1
      seamMat.current.transparent = wideEnergy
    }
    if (seam.current) {
      seam.current.visible = !wideEnergy || current.portal < 0.72
      seam.current.scale.x = wideEnergy ? Math.max(0.35, 1 - current.portal * 0.85) : 1
    }
    if (energyMesh.current && wideEnergy) {
      // Seam → wide portal corridor fill
      energyMesh.current.scale.x = 0.12 + current.portal * 1.55
      energyMesh.current.scale.y = 1
    } else if (energyMesh.current) {
      energyMesh.current.scale.set(1, 1, 1)
    }
    if (beam.current) beam.current.visible = current.beam > 0.03
    if (beamCore.current) beamCore.current.opacity = current.beam * 0.16
    if (beamHalo.current) beamHalo.current.opacity = current.beam * 0.04
    if (glow.current) {
      const peak = wideEnergy ? 3.6 : entrance ? 2.2 : 2.8
      const hold = entrance ? 0.35 + current.portal * peak * (1 - current.interior * 0.55) : current.portal * peak
      glow.current.intensity = hold
      if (entrance) glow.current.distance = 6.2
    }
    if (frameSpill.current) {
      frameSpill.current.intensity = entrance
        ? 0.45 + current.portal * 0.55 * (1 - current.interior * 0.4)
        : 0
    }

    if (entrance) {
      const t = clock.elapsedTime
      if (mistMat.current) {
        mistMat.current.opacity = preferences.reduce
          ? 0.1
          : 0.08 + Math.sin(t * 0.55) * 0.03 + current.portal * 0.06
      }
      if (rippleMat.current) {
        if (preferences.reduce) {
          rippleMat.current.opacity = 0.04
        } else {
          const period = 4.6
          const local = t % period
          const active = local < 1.15
          const u = active ? local / 1.15 : 0
          rippleMat.current.opacity = active ? Math.sin(u * Math.PI) * 0.22 : 0
          if (rippleMesh.current) rippleMesh.current.scale.set(1 + u * 2.4, 1 + u * 1.6, 1)
        }
      }
      if (embers.current && emberCloud && !preferences.reduce) {
        const pos = embers.current.geometry.getAttribute('position') as THREE.BufferAttribute
        const seeds = emberSeeds.current
        for (let i = 0; i < emberCloud.count; i += 1) {
          const seed = seeds?.[i] ?? 0.5
          let y = pos.getY(i) + 0.008 + seed * 0.01
          let x = Math.sin(t * 0.8 + seed * 8) * (0.05 + seed * 0.08)
          let z = 0.05 + seed * 0.12
          if (y > 3.8) y = 0.35 + seed * 0.4
          pos.setXYZ(i, x, y, z)
        }
        pos.needsUpdate = true
        const mat = embers.current.material
        if (!Array.isArray(mat)) mat.opacity = 0.2 + current.portal * 0.25
      }
    }

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
      {entrance ? (
        <>
          {/* Dim engraved panel markings on outer pillars */}
          <mesh position={[GATE.x - 1.28, 3.1, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.42, 0.03, 0.02]} />
          </mesh>
          <mesh position={[GATE.x - 1.28, 2.55, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.28, 0.03, 0.02]} />
          </mesh>
          <mesh position={[GATE.x - 1.28, 1.9, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.36, 0.03, 0.02]} />
          </mesh>
          <mesh position={[GATE.x - 1.48, 2.7, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.03, 1.4, 0.02]} />
          </mesh>
          <mesh position={[GATE.x + 1.28, 3.25, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.38, 0.03, 0.02]} />
          </mesh>
          <mesh position={[GATE.x + 1.28, 2.4, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.3, 0.03, 0.02]} />
          </mesh>
          <mesh position={[GATE.x + 1.48, 2.55, GATE.z + 0.46]} material={engraving}>
            <boxGeometry args={[0.03, 1.55, 0.02]} />
          </mesh>
        </>
      ) : null}
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

      <mesh ref={seam} position={[GATE.x, 2.28, GATE.z + 0.34]} renderOrder={3}>
        <planeGeometry args={[entrance ? 0.09 : 0.045, 3.55]} />
        <meshStandardMaterial
          ref={seamMat}
          color="#0e2418"
          emissive="#39d98a"
          emissiveIntensity={entrance ? 0.28 : 0.05}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={1}
        />
      </mesh>

      <mesh ref={energyMesh} position={[GATE.x, 2.25, GATE.z - 0.08]} material={energy} renderOrder={2}>
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
      {entrance ? (
        <>
          <pointLight
            ref={frameSpill}
            position={[GATE.x, 2.4, GATE.z + 0.55]}
            color="#2a8f62"
            intensity={0.45}
            distance={3.4}
            decay={2}
          />
          {/* Thin mist leaking from the lower threshold */}
          <mesh position={[GATE.x, 0.28, GATE.z + 0.55]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[1.55, 0.55]} />
            <meshBasicMaterial
              ref={mistMat}
              color="#1a4a34"
              transparent
              opacity={0.1}
              depthWrite={false}
            />
          </mesh>
          {/* Soft energy ripple into nearby floor tiles */}
          <mesh ref={rippleMesh} position={[GATE.x, 0.03, GATE.z + 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 0.45]} />
            <meshBasicMaterial
              ref={rippleMat}
              color="#2a8f62"
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
          {emberCloud ? (
            <group position={[GATE.x, 0.35, GATE.z + 0.38]}>
              <primitive object={emberCloud.points} ref={embers} />
            </group>
          ) : null}
        </>
      ) : null}
    </group>
  )
}
