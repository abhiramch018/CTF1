import { memo } from 'react'

const DX = 14
const DY = 8
const DZ = 16

type Pt = [number, number]
type Cube = { x: number; y: number; z: number; s: number; lv: number; win: boolean }

const project = (x: number, y: number, z: number): Pt => [(x - z) * DX, (x + z) * DY - y * DZ]

const pts = (list: Pt[]) => list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')

function topFace(c: Cube): Pt[] {
  const { x, y, z, s } = c
  return [project(x, y + s, z), project(x + s, y + s, z), project(x + s, y + s, z + s), project(x, y + s, z + s)]
}

function leftFace(c: Cube): Pt[] {
  const { x, y, z, s } = c
  return [project(x, y, z + s), project(x + s, y, z + s), project(x + s, y + s, z + s), project(x, y + s, z + s)]
}

function rightFace(c: Cube): Pt[] {
  const { x, y, z, s } = c
  return [project(x + s, y, z), project(x + s, y, z + s), project(x + s, y + s, z + s), project(x + s, y + s, z)]
}

function leftWindow(c: Cube): Pt[] {
  const { x, y, z, s } = c
  const z1 = z + s
  return [
    project(x + s * 0.3, y + s * 0.46, z1),
    project(x + s * 0.7, y + s * 0.46, z1),
    project(x + s * 0.7, y + s * 0.6, z1),
    project(x + s * 0.3, y + s * 0.6, z1),
  ]
}

function rightWindow(c: Cube): Pt[] {
  const { x, y, z, s } = c
  const x1 = x + s
  return [
    project(x1, y + s * 0.46, z + s * 0.3),
    project(x1, y + s * 0.46, z + s * 0.7),
    project(x1, y + s * 0.6, z + s * 0.7),
    project(x1, y + s * 0.6, z + s * 0.3),
  ]
}

function build(): { cubes: Cube[]; mast: { line: [Pt, Pt]; arms: [Pt, Pt][]; beacon: Cube } } {
  const cubes: Cube[] = []
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, win = false) => {
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        for (let z = z0; z < z1; z++) {
          cubes.push({ x, y, z, s: 1, lv: y, win })
        }
      }
    }
  }

  box(0, 3, 0, 2, 0, 3)
  box(1, 2, 2, 10, 1, 2, true)
  box(2, 3, 4, 5, 1, 2)
  box(1, 2, 4, 5, 2, 3)
  box(0, 1, 6, 7, 1, 2)
  box(1, 2, 6, 7, 0, 1)
  box(0, 3, 10, 11, 0, 3)

  box(3, 6, 0, 1, -3, 0)
  box(4, 5, 1, 6, -2, -1, true)
  box(5, 6, 3, 4, -2, -1)

  box(-2, 0, 0, 1, 2, 4)
  box(-2, -1, 1, 2, 2, 3)

  cubes.sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.y - b.y)

  const base = project(1.5, 11, 1.5)
  const tip = project(1.5, 17, 1.5)
  const arm = (y: number, span: number): [Pt, Pt] => [project(1.5 - span, y, 1.5 + span), project(1.5 + span, y, 1.5 - span)]

  return {
    cubes,
    mast: {
      line: [base, tip],
      arms: [arm(13, 0.9), arm(15, 0.55)],
      beacon: { x: 1.2, y: 17, z: 1.2, s: 0.6, lv: 17, win: false },
    },
  }
}

const model = build()

const bounds = (() => {
  const all: Pt[] = []
  for (const cube of [...model.cubes, model.mast.beacon]) {
    all.push(...topFace(cube), ...leftFace(cube), ...rightFace(cube))
  }
  for (const [a, b] of model.mast.arms) all.push(a, b)
  all.push(...model.mast.line)
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const pad = 6
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  return { minX, minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY }
})()

const LEVEL_DELAY = 0.09

function delayOf(lv: number) {
  return { animationDelay: `${(lv * LEVEL_DELAY).toFixed(2)}s` }
}

export const SignalTower = memo(function SignalTower() {
  const { cubes, mast } = model
  return (
    <svg
      className="signal-tower"
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      {cubes.map((cube, index) => {
        const top = pts(topFace(cube))
        const left = pts(leftFace(cube))
        const right = pts(rightFace(cube))
        return (
          <g key={index}>
            <polygon className="face-top" points={top} />
            <polygon className="face-left" points={left} />
            <polygon className="face-right" points={right} />
            <g className="edge" style={delayOf(cube.lv)}>
              <polygon points={top} />
              <polygon points={left} />
              <polygon points={right} />
            </g>
            {cube.win ? (
              <>
                <polygon className="win" points={pts(leftWindow(cube))} style={delayOf(cube.lv)} />
                <polygon className="win" points={pts(rightWindow(cube))} style={delayOf(cube.lv)} />
              </>
            ) : null}
          </g>
        )
      })}
      <g className="mast">
        <line x1={mast.line[0][0]} y1={mast.line[0][1]} x2={mast.line[1][0]} y2={mast.line[1][1]} />
        {mast.arms.map(([a, b], index) => (
          <line key={index} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
        ))}
      </g>
      <polygon className="beacon" points={pts(topFace(mast.beacon))} style={delayOf(mast.beacon.lv)} />
      <polygon className="beacon" points={pts(leftFace(mast.beacon))} style={delayOf(mast.beacon.lv)} />
      <polygon className="beacon" points={pts(rightFace(mast.beacon))} style={delayOf(mast.beacon.lv)} />
    </svg>
  )
})
