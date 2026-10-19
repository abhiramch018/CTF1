type CubeProps = {
  x: number
  y: number
  a?: number
  b?: number
  c?: number
  tone?: number
}

/** One dark isometric voxel. Faces stay near-black; only the edges carry a trace of emerald. */
function Cube({ x, y, a = 34, b = 17, c = 30, tone = 0 }: CubeProps) {
  const tops = ['#111714', '#0e130f', '#121915']
  const lefts = ['#090d0a', '#080b09', '#0a0e0b']
  const rights = ['#0c110d', '#0a0f0c', '#0d120e']
  const t = Math.abs(tone) % 3
  return (
    <g stroke="rgba(110, 231, 183, 0.16)" strokeWidth="1" strokeLinejoin="round">
      <polygon points={`${x},${y} ${x + a},${y + b} ${x},${y + 2 * b} ${x - a},${y + b}`} fill={tops[t]} />
      <polygon
        points={`${x - a},${y + b} ${x},${y + 2 * b} ${x},${y + 2 * b + c} ${x - a},${y + b + c}`}
        fill={lefts[t]}
      />
      <polygon
        points={`${x},${y + 2 * b} ${x + a},${y + b} ${x + a},${y + b + c} ${x},${y + 2 * b + c}`}
        fill={rights[t]}
      />
    </g>
  )
}

/**
 * Distant voxel signal tower for the far background of the countdown section.
 * Pure SVG (2.5D) so it costs no extra WebGL context, canvas, or animation loop.
 */
export function SignalTower() {
  // Stacked voxels rising off a low base, slightly irregular so it reads as a structure, not a column of boxes.
  const stack: CubeProps[] = [
    { x: 188, y: 468, a: 58, b: 29, c: 22, tone: 1 },
    { x: 188, y: 424, a: 46, b: 23, c: 26, tone: 0 },
    { x: 180, y: 382, a: 40, b: 20, c: 26, tone: 2 },
    { x: 192, y: 340, a: 34, b: 17, c: 26, tone: 1 },
    { x: 184, y: 300, a: 29, b: 15, c: 25, tone: 0 },
    { x: 194, y: 262, a: 24, b: 12, c: 24, tone: 2 },
    { x: 188, y: 226, a: 19, b: 10, c: 22, tone: 1 },
    { x: 230, y: 356, a: 22, b: 11, c: 18, tone: 2 },
    { x: 148, y: 366, a: 18, b: 9, c: 15, tone: 0 },
    { x: 226, y: 292, a: 15, b: 8, c: 16, tone: 1 },
  ]

  return (
    <svg
      className="ct-tower"
      viewBox="0 0 340 560"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* encrypted data rails running behind the tower */}
      <g stroke="rgba(110, 231, 183, 0.07)" strokeWidth="1">
        <line x1="0" y1="486" x2="340" y2="486" />
        <line x1="0" y1="506" x2="340" y2="506" />
        <line x1="18" y1="526" x2="322" y2="526" />
      </g>
      <g fill="rgba(110, 231, 183, 0.13)">
        <rect x="26" y="482" width="18" height="3" />
        <rect x="58" y="482" width="7" height="3" />
        <rect x="238" y="502" width="26" height="3" />
        <rect x="282" y="502" width="8" height="3" />
        <rect x="96" y="522" width="14" height="3" />
      </g>

      {stack.map((cube, index) => (
        <Cube key={index} {...cube} />
      ))}

      {/* antenna + beacon: the only element that pulses, on a slow few-second cycle */}
      <line x1="188" y1="226" x2="188" y2="168" stroke="rgba(110, 231, 183, 0.22)" strokeWidth="1.5" />
      <line x1="188" y1="188" x2="172" y2="178" stroke="rgba(110, 231, 183, 0.12)" strokeWidth="1" />
      <line x1="188" y1="188" x2="204" y2="178" stroke="rgba(110, 231, 183, 0.12)" strokeWidth="1" />
      <circle className="ct-tower-beacon" cx="188" cy="162" r="3.5" fill="#6ee7b7" />
    </svg>
  )
}
