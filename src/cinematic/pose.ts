import { OPERATIVE_YAW, WALK_INSIDE, WALK_START, WALK_THRESHOLD } from './layout.ts'
import type { Vec3 } from './layout.ts'

export const DURATION = 7.55
export const TITLE_AT = 6.7

export type Pose = {
  t: number
  camPos: Vec3
  camLook: Vec3
  operativeOpacity: number
  operativePos: Vec3
  operativeYaw: number
  walkWeight: number
  walkPhase: number
  portal: number
  beam: number
  shards: number
  /** 0–1 walk-up to the door threshold. */
  approach: number
  /** 0–1 pass through the doorway (~0.6–1.2s). */
  crossing: number
  /** 0–1 settle into the interior command space. */
  interior: number
  showTitle: boolean
  done: boolean
}

type CamKey = { t: number; pos: Vec3; look: Vec3 }

const CAMERA: CamKey[] = [
  { t: 0, pos: [-2.6, 2.55, 8.2], look: [2.1, 1.45, -0.4] },
  { t: 2.2, pos: [-1.7, 2.1, 6.5], look: [2.2, 1.35, -0.55] },
  { t: 4.4, pos: [-1.05, 1.88, 5.35], look: [2.4, 1.3, -1.4] },
  { t: 5.55, pos: [-0.55, 1.72, 3.85], look: [2.5, 1.35, -3.4] },
  { t: DURATION, pos: [-0.95, 1.82, 4.55], look: [2.45, 1.28, -3.1] },
]

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smooth(t: number, start: number, end: number): number {
  const amount = clamp01((t - start) / (end - start))
  return amount * amount * (3 - 2 * amount)
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount
}

function writeLerp(out: Vec3, a: Vec3, b: Vec3, amount: number): void {
  out[0] = lerp(a[0], b[0], amount)
  out[1] = lerp(a[1], b[1], amount)
  out[2] = lerp(a[2], b[2], amount)
}

function writeCamera(t: number, pos: Vec3, look: Vec3): void {
  const last = CAMERA.length - 1
  if (t <= CAMERA[0].t) {
    writeLerp(pos, CAMERA[0].pos, CAMERA[0].pos, 0)
    writeLerp(look, CAMERA[0].look, CAMERA[0].look, 0)
    return
  }
  if (t >= CAMERA[last].t) {
    writeLerp(pos, CAMERA[last].pos, CAMERA[last].pos, 0)
    writeLerp(look, CAMERA[last].look, CAMERA[last].look, 0)
    return
  }
  let index = 0
  while (index < last - 1 && t >= CAMERA[index + 1].t) index += 1
  const from = CAMERA[index]
  const to = CAMERA[index + 1]
  const amount = clamp01((t - from.t) / (to.t - from.t))
  writeLerp(pos, from.pos, to.pos, amount)
  writeLerp(look, from.look, to.look, amount)
}

export function createPose(): Pose {
  return {
    t: 0,
    camPos: [0, 0, 0],
    camLook: [0, 0, 0],
    operativeOpacity: 0,
    operativePos: [0, 0, 0],
    operativeYaw: OPERATIVE_YAW,
    walkWeight: 0,
    walkPhase: 0,
    portal: 0,
    beam: 0,
    shards: 0,
    approach: 0,
    crossing: 0,
    interior: 0,
    showTitle: false,
    done: false,
  }
}

const _threshold: Vec3 = [0, 0, 0]

export function samplePose(time: number, out: Pose): Pose {
  const t = Math.max(0, time)
  out.t = t
  writeCamera(t, out.camPos, out.camLook)

  // Approach door (~2.75→4.55), then cross in ~1.0s, then settle interior.
  out.approach = smooth(t, 2.75, 4.55)
  out.crossing = smooth(t, 4.55, 5.55)
  out.interior = smooth(t, 5.45, 6.45)

  writeLerp(_threshold, WALK_START, WALK_THRESHOLD, out.approach)
  writeLerp(out.operativePos, _threshold, WALK_INSIDE, out.crossing)

  const fadeIn = smooth(t, 1.45, 1.95)
  // Soft fade as the figure settles deeper into the corridor.
  const fadeDeep = 1 - out.interior * 0.18
  out.operativeOpacity = fadeIn * fadeDeep
  out.operativeYaw = lerp(OPERATIVE_YAW, 0.12, out.crossing)
  out.walkWeight =
    smooth(t, 2.75, 3.05) * (1 - smooth(t, 5.45, 5.85))
  out.walkPhase = (out.approach + out.crossing) * Math.PI * 2 * 2.15

  const hint = smooth(t, 2.4, 3.55) * 0.08
  const rise = smooth(t, 4.15, 4.95)
  const settle = out.interior
  const risen = hint + (1 - hint) * rise
  // Peak open during crossing, then ease down while keeping frame readable.
  out.portal = risen * (1 - settle * 0.38) + 0.28 * settle
  out.beam = smooth(t, 4.45, 5.05) * (1 - smooth(t, 5.55, 6.15))
  out.shards = smooth(t, 4.3, 4.95) * (1 - smooth(t, 5.5, 6.1))
  out.showTitle = t >= TITLE_AT
  out.done = t >= DURATION
  return out
}
