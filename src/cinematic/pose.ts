import { OPERATIVE_YAW, WALK_HERO, WALK_INSIDE, WALK_THRESHOLD } from './layout.ts'
import type { Vec3 } from './layout.ts'

export const DURATION = 8.2
/** Title appears early so DEAD NOCTIS shares the first readable composition. */
export const TITLE_AT = 0.55

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
  approach: number
  crossing: number
  interior: number
  showTitle: boolean
  done: boolean
}

type CamKey = { t: number; pos: Vec3; look: Vec3 }

/**
 * Hero framing: left ~38% free for title, right holds door + large operative.
 * Operative ~30%+ viewport height at fov 36 from ~7.2m.
 */
const CAMERA: CamKey[] = [
  { t: 0, pos: [-0.35, 1.95, 7.35], look: [2.95, 1.15, 0.15] },
  { t: 2.8, pos: [-0.15, 1.88, 6.95], look: [2.9, 1.12, -0.05] },
  { t: 4.2, pos: [0.35, 1.78, 5.55], look: [2.6, 1.2, -1.5] },
  { t: 5.35, pos: [0.55, 1.68, 3.65], look: [2.45, 1.25, -3.55] },
  { t: 6.6, pos: [-0.2, 1.9, 7.05], look: [2.95, 1.15, 0.05] },
  { t: DURATION, pos: [-0.35, 1.95, 7.35], look: [2.95, 1.15, 0.15] },
]

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smooth(t: number, start: number, end: number): number {
  const amount = clamp01((t - start) / Math.max(0.0001, end - start))
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
    operativeOpacity: 1,
    operativePos: [WALK_HERO[0], WALK_HERO[1], WALK_HERO[2]],
    operativeYaw: OPERATIVE_YAW,
    walkWeight: 0,
    walkPhase: 0,
    portal: 0.12,
    beam: 0,
    shards: 0,
    approach: 0,
    crossing: 0,
    interior: 0,
    showTitle: false,
    done: false,
  }
}

const _mid: Vec3 = [0, 0, 0]
const _cross: Vec3 = [0, 0, 0]

export function samplePose(time: number, out: Pose): Pose {
  const t = Math.max(0, time)
  out.t = t
  writeCamera(t, out.camPos, out.camLook)

  // Visible immediately — no delayed fade-in that hides the figure.
  out.approach = smooth(t, 3.15, 4.35)
  out.crossing = smooth(t, 4.35, 5.35)
  out.interior = smooth(t, 5.15, 5.95) * (1 - smooth(t, 6.2, 7.0))
  const home = smooth(t, 6.15, 7.05)

  writeLerp(_mid, WALK_HERO, WALK_THRESHOLD, out.approach)
  writeLerp(_cross, _mid, WALK_INSIDE, out.crossing)
  writeLerp(out.operativePos, _cross, WALK_HERO, home)

  out.operativeOpacity = 1
  out.operativeYaw = lerp(OPERATIVE_YAW, 0.08, out.crossing * (1 - home))
  out.walkWeight =
    smooth(t, 3.15, 3.4) * (1 - smooth(t, 5.25, 5.55)) +
    smooth(t, 6.15, 6.35) * (1 - smooth(t, 6.85, 7.15)) * 0.55
  out.walkPhase = (out.approach + out.crossing + home) * Math.PI * 2 * 2.05

  const hint = 0.12 + smooth(t, 2.6, 3.6) * 0.08
  const rise = smooth(t, 4.05, 4.85)
  const settle = out.interior
  const risen = hint + (1 - hint) * rise
  out.portal = risen * (1 - settle * 0.25) * (1 - home * 0.35) + 0.14 * home
  out.beam = smooth(t, 4.25, 4.85) * (1 - smooth(t, 5.45, 6.05))
  out.shards = smooth(t, 4.15, 4.75) * (1 - smooth(t, 5.4, 6.0))
  out.showTitle = t >= TITLE_AT
  out.done = t >= DURATION
  return out
}
