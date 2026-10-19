const UNIT = 22
const COS = UNIT * 0.866
const SIN = UNIT * 0.5
const ORIGIN_X = 190
const ORIGIN_Y = 500

type Point = [number, number, number]

function project([x, y, z]: Point): string {
  const sx = ORIGIN_X + (x - y) * COS
  const sy = ORIGIN_Y + (x + y) * SIN - z * UNIT
  return `${sx.toFixed(1)},${sy.toFixed(1)}`
}

function poly(points: Point[]): string {
  return points.map(project).join(' ')
}

type Box = { x: number; y: number; z: number; w: number; d: number; h: number }

function faces({ x, y, z, w, d, h }: Box) {
  const x1 = x + w
  const y1 = y + d
  const z1 = z + h
  return {
    top: poly([
      [x, y, z1],
      [x1, y, z1],
      [x1, y1, z1],
      [x, y1, z1],
    ]),
    left: poly([
      [x, y1, z],
      [x1, y1, z],
      [x1, y1, z1],
      [x, y1, z1],
    ]),
    right: poly([
      [x1, y, z],
      [x1, y1, z],
      [x1, y1, z1],
      [x1, y, z1],
    ]),
    edge: `${project([x1, y1, z])} ${project([x1, y1, z1])}`,
  }
}

const LAYERS: ReadonlyArray<readonly [number, number]> = [
  [3, 1.2],
  [2, 0.6],
  [1.6, 2],
  [1.2, 0.5],
  [1.6, 1.4],
  [1.2, 2.4],
  [2, 0.6],
  [1.2, 2],
  [1.6, 0.8],
  [0.8, 2.6],
  [0.5, 2],
  [0.2, 2],
]

function buildTower(): Box[] {
  const boxes: Box[] = [{ x: -3.5, y: -3.5, z: 0, w: 7, d: 7, h: 0.5 }]
  let z = 0.5
  for (const [size, height] of LAYERS) {
    boxes.push({ x: -size / 2, y: -size / 2, z, w: size, d: size, h: height })
    z += height
  }
  return boxes
}

const TOWER = buildTower()

const NODES: Box[] = [6, 9.5, 13].map((y) => ({ x: -0.35, y, z: 0, w: 0.7, d: 0.7, h: 0.5 }))
const RAIL = `${project([0, 3.5, 0])} ${project([0, 15, 0])}`

export function VoxelTower() {
  return (
    <svg
      className="tele-tower"
      viewBox="0 0 380 540"
      preserveAspectRatio="xMidYMax meet"
      focusable="false"
      aria-hidden="true"
    >
      <polyline className="vx-rail" points={RAIL} />
      {NODES.map((box, index) => {
        const f = faces(box)
        return (
          <g key={`n${index}`}>
            <polygon className="vx-left" points={f.left} />
            <polygon className="vx-right" points={f.right} />
            <polygon className="vx-top" points={f.top} />
            <polygon
              className="vx-pulse vx-pulse-rail"
              points={f.top}
              style={{ animationDelay: `${(NODES.length - 1 - index) * 0.32}s` }}
            />
          </g>
        )
      })}
      {TOWER.map((box, index) => {
        const f = faces(box)
        const delay = `${(1 + index * 0.17).toFixed(2)}s`
        return (
          <g key={`t${index}`}>
            <polygon className="vx-left" points={f.left} />
            <polygon className="vx-right" points={f.right} />
            <polygon className="vx-top" points={f.top} />
            <polyline className="vx-pulse vx-pulse-edge" points={f.edge} style={{ animationDelay: delay }} />
            <polygon className="vx-pulse" points={f.top} style={{ animationDelay: delay }} />
          </g>
        )
      })}
    </svg>
  )
}
