type Voxel = [number, number, number]
type Point = [number, number]

const UNIT = 20
const COS = UNIT * 0.866
const SIN = UNIT * 0.5

function project([x, y, z]: Voxel): Point {
  return [(x - y) * COS, (x + y) * SIN - z * UNIT]
}

function polygon(points: Voxel[]): string {
  return points.map((point) => project(point).map((value) => value.toFixed(1)).join(',')).join(' ')
}

function buildVoxels(): Voxel[] {
  const voxels: Voxel[] = []
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) voxels.push([x, y, 0])
  for (let z = 1; z <= 10; z++) {
    for (let x = 1; x < 3; x++) {
      for (let y = 1; y < 3; y++) {
        if (x === 2 && y === 2 && (z === 4 || z === 8)) continue
        voxels.push([x, y, z])
      }
    }
  }
  voxels.push([3, 1, 5], [3, 1, 6], [1, 3, 7], [1, 1, 11], [2, 1, 11], [1, 2, 11])
  for (let z = 12; z <= 14; z++) voxels.push([1, 1, z])
  return voxels.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2])
}

const VOXELS = buildVoxels()
const SEAM_FROM = project([3, 3, 1])
const SEAM_TO = project([3, 3, 11])
const BEACON = polygon([
  [1, 1, 15],
  [2, 1, 15],
  [2, 2, 15],
  [1, 2, 15],
])

const corners = VOXELS.flatMap(([x, y, z]) => [project([x + 1, y, z]), project([x, y + 1, z]), project([x, y, z + 1])])
const minX = Math.min(...corners.map((point) => point[0])) - 4
const maxX = Math.max(...corners.map((point) => point[0])) + 4
const minY = Math.min(...corners.map((point) => point[1])) - 4
const maxY = Math.max(...corners.map((point) => point[1]), project([4, 4, 0])[1]) + 4
const VIEW_BOX = `${minX.toFixed(1)} ${minY.toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}`

export function SignalTower() {
  return (
    <svg className="tel-tower" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <g className="tel-tower-mass">
        {VOXELS.map(([x, y, z]) => (
          <g key={`${x}.${y}.${z}`}>
            <polygon
              className="tel-face-y"
              points={polygon([
                [x, y + 1, z],
                [x + 1, y + 1, z],
                [x + 1, y + 1, z + 1],
                [x, y + 1, z + 1],
              ])}
            />
            <polygon
              className="tel-face-x"
              points={polygon([
                [x + 1, y, z],
                [x + 1, y + 1, z],
                [x + 1, y + 1, z + 1],
                [x + 1, y, z + 1],
              ])}
            />
            <polygon
              className="tel-face-top"
              points={polygon([
                [x, y, z + 1],
                [x + 1, y, z + 1],
                [x + 1, y + 1, z + 1],
                [x, y + 1, z + 1],
              ])}
            />
          </g>
        ))}
      </g>
      <line className="tel-seam-base" x1={SEAM_FROM[0]} y1={SEAM_FROM[1]} x2={SEAM_TO[0]} y2={SEAM_TO[1]} />
      <line
        className="tel-seam-pulse"
        x1={SEAM_FROM[0]}
        y1={SEAM_FROM[1]}
        x2={SEAM_TO[0]}
        y2={SEAM_TO[1]}
        pathLength={100}
      />
      <polygon className="tel-beacon" points={BEACON} />
    </svg>
  )
}
