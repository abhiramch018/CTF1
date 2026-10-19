import { GATE } from './layout.ts'
import type { Stone } from './layout.ts'

const DEEP = '#101614'
const MASS_DARK = '#171e1a'

function push(list: Stone[], stone: Stone): void {
  list.push(stone)
}

function steppedMass(
  list: Stone[],
  x: number,
  z: number,
  baseX: number,
  baseZ: number,
  height: number,
  steps: number,
): void {
  for (let step = 0; step < steps; step += 1) {
    const taper = 1 - step / steps
    const slice = height / steps
    push(list, {
      x,
      z,
      y: slice * step + slice / 2,
      sx: baseX * (0.62 + 0.38 * taper),
      sy: slice + 0.02,
      sz: baseZ * (0.62 + 0.38 * taper),
      color: step === steps - 1 ? MASS_DARK : DEEP,
    })
  }
}

export function buildMasses(): Stone[] {
  const stones: Stone[] = []
  steppedMass(stones, -5.2, -9.4, 4.8, 3.2, 3.4, 3)
  steppedMass(stones, 3.1, -11.2, 5.6, 3.6, 4.1, 3)
  steppedMass(stones, 10.2, -8.8, 4.2, 2.8, 2.8, 3)
  return stones
}

export function buildFloors(): Stone[] {
  return [
    { x: GATE.x, y: 0.03, z: GATE.z + 0.15, sx: 3.1, sy: 0.06, sz: 2.15, color: '#121916' },
  ]
}

export const MASSES = buildMasses()
export const FLOORS = buildFloors()
