type Voxel = readonly [number, number, number]

const EDGE = 22
const RUN = EDGE * Math.cos(Math.PI / 6)
const RISE = EDGE / 2
const BEACON: Voxel = [1, 1, 17]

function buildVoxels(): Voxel[] {
  const cells: Voxel[] = []
  for (let x = 0; x < 4; x += 1) {
    for (let y = 0; y < 4; y += 1) {
      cells.push([x, y, 0])
      const corner = (x === 0 || x === 3) && (y === 0 || y === 3)
      if (!corner) cells.push([x, y, 1])
    }
  }
  for (let z = 2; z < 9; z += 1) {
    for (let x = 1; x < 3; x += 1) {
      for (let y = 1; y < 3; y += 1) {
        if (z > 6 && x === 2 && y === 2) continue
        cells.push([x, y, z])
      }
    }
  }
  for (let z = 9; z < 17; z += 1) {
    if (z === 12) continue
    cells.push([1, 1, z])
  }
  cells.push([1, 1, 12], [0, 1, 10], [2, 1, 10], [1, 0, 13], [0, 1, 15], [2, 1, 15], BEACON)
  return cells
}

const voxels = buildVoxels()
const occupied = new Set(voxels.map((v) => v.join(',')))
const has = (x: number, y: number, z: number) => occupied.has(`${x},${y},${z}`)

function project(x: number, y: number, z: number): [number, number] {
  return [(x - y) * RUN, (x + y) * RISE - z * EDGE]
}

function face(points: [number, number, number][]): string {
  return points
    .map(([x, y, z]) => project(x, y, z).map((n) => n.toFixed(1)).join(','))
    .join(' ')
}

type Face = { key: string; points: string; tone: 'top' | 'east' | 'south'; beacon: boolean }

const faces: Face[] = [...voxels]
  .sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[2] - b[2])
  .flatMap(([x, y, z]) => {
    const beacon = x === BEACON[0] && y === BEACON[1] && z === BEACON[2]
    const out: Face[] = []
    if (!has(x, y, z + 1)) {
      out.push({
        key: `${x}${y}${z}t`,
        tone: 'top',
        beacon,
        points: face([
          [x, y, z + 1],
          [x + 1, y, z + 1],
          [x + 1, y + 1, z + 1],
          [x, y + 1, z + 1],
        ]),
      })
    }
    if (!has(x + 1, y, z)) {
      out.push({
        key: `${x}${y}${z}e`,
        tone: 'east',
        beacon,
        points: face([
          [x + 1, y, z],
          [x + 1, y + 1, z],
          [x + 1, y + 1, z + 1],
          [x + 1, y, z + 1],
        ]),
      })
    }
    if (!has(x, y + 1, z)) {
      out.push({
        key: `${x}${y}${z}s`,
        tone: 'south',
        beacon,
        points: face([
          [x, y + 1, z],
          [x + 1, y + 1, z],
          [x + 1, y + 1, z + 1],
          [x, y + 1, z + 1],
        ]),
      })
    }
    return out
  })

const [riserX, riserBottom] = project(2, 2, 9)
const [, riserTop] = project(2, 2, 17)

const bounds = (() => {
  const xs: number[] = []
  const ys: number[] = []
  for (const [x, y, z] of voxels) {
    for (const [px, py] of [project(x, y + 1, z), project(x + 1, y, z), project(x + 1, y + 1, z), project(x, y, z + 1)]) {
      xs.push(px)
      ys.push(py)
    }
  }
  const pad = 8
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  return `${minX.toFixed(1)} ${minY.toFixed(1)} ${(Math.max(...xs) - minX + pad).toFixed(1)} ${(Math.max(...ys) - minY + pad).toFixed(1)}`
})()

export function SignalTower() {
  return (
    <svg className="tower" viewBox={bounds} aria-hidden="true" focusable="false">
      <g className="tower-mass">
        {faces.map((item) => (
          <polygon
            key={item.key}
            points={item.points}
            className={item.beacon ? `tone-${item.tone} is-beacon` : `tone-${item.tone}`}
          />
        ))}
      </g>
      <line
        className="tower-riser"
        x1={riserX}
        y1={riserBottom}
        x2={riserX}
        y2={riserTop}
        pathLength={100}
      />
    </svg>
  )
}
