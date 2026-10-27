import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOORS, MASSES } from './terrain.ts'
import type { Stone } from './layout.ts'
import { preferences } from './runtime.ts'

function useInstances(stones: Stone[], material: THREE.Material, shadows: boolean): THREE.InstancedMesh {
  const mesh = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const instanced = new THREE.InstancedMesh(geometry, material, stones.length)
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    stones.forEach((stone, index) => {
      dummy.position.set(stone.x, stone.y, stone.z)
      dummy.rotation.set(0, stone.rotY ?? 0, 0)
      dummy.scale.set(stone.sx, stone.sy, stone.sz)
      dummy.updateMatrix()
      instanced.setMatrixAt(index, dummy.matrix)
      color.set(stone.color)
      instanced.setColorAt(index, color)
    })
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
    instanced.computeBoundingSphere()
    instanced.receiveShadow = shadows
    return instanced
  }, [material, shadows, stones])

  useEffect(() => {
    return () => {
      mesh.geometry.dispose()
    }
  }, [mesh])

  return mesh
}

function Motes() {
  const points = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const count = 8
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const seed = Math.sin((index + 1) * 91.7) * 43758.5453
      const unit = seed - Math.floor(seed)
      const seedB = Math.sin((index + 3) * 43.2) * 24634.6345
      const unitB = seedB - Math.floor(seedB)
      positions[index * 3] = 0.6 + unit * 3.8
      positions[index * 3 + 1] = 1.4 + unitB * 2.8
      positions[index * 3 + 2] = -6.2 + ((index * 0.41) % 1) * 3.2
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: '#1f8a56',
      size: 0.028,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      sizeAttenuation: true,
    })
    return new THREE.Points(geometry, material)
  }, [])

  useEffect(() => {
    return () => {
      points.geometry.dispose()
      const material = points.material
      if (!Array.isArray(material)) material.dispose()
    }
  }, [points])

  useFrame(({ clock }) => {
    if (preferences.reduce) return
    points.rotation.y = clock.elapsedTime * 0.006
  })

  return <primitive object={points} />
}

export function Landscape({ shadows, entrance = false }: { shadows: boolean; entrance?: boolean }) {
  const massMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.9,
        metalness: 0.08,
        flatShading: true,
      }),
    [],
  )
  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.46,
        metalness: 0.52,
        flatShading: true,
      }),
    [],
  )
  const masses = useInstances(MASSES, massMaterial, shadows)
  const floors = useInstances(FLOORS, floorMaterial, shadows)

  useEffect(() => {
    return () => {
      massMaterial.dispose()
      floorMaterial.dispose()
    }
  }, [floorMaterial, massMaterial])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[1.2, 0, -1]} receiveShadow={shadows}>
        <circleGeometry args={[36, 48]} />
        <meshPhysicalMaterial
          color={entrance ? '#15201b' : '#0c110f'}
          roughness={entrance ? 0.4 : 0.48}
          metalness={entrance ? 0.52 : 0.46}
          clearcoat={0.12}
          clearcoatRoughness={0.4}
        />
      </mesh>
      <primitive object={masses} />
      <primitive object={floors} />
      {!entrance ? <Motes /> : null}
    </group>
  )
}
