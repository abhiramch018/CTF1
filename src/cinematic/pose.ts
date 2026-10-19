import { OPERATIVE_YAW, WALK_DOOR, WALK_START } from './layout.ts'
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
  showTitle: boolean
  done: boolean
}

type CamKey = { t: number; pos: Vec3; look: Vec3 }

const CAMERA: CamKey[] = [
  { t: 0, pos: [-2.6, 2.55, 8.2], look: [2.1, 1.45, -0.4] },
  { t: 2.2, pos: [-1.7, 2.1, 6.5], look: [2.2, 1.35, -0.55] },
  { t: 4.6, pos: [-1.15, 1.9, 5.55], look: [2.25, 1.25, -0.6] },
  { t: 5.9, pos: [-0.85, 1.78, 5.15], look: [2.2, 1.22, -0.5] },
  { t: DURATION, pos: [-1.85, 2.02, 6.85], look: [2.05, 1.28, -0.45] },
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
    showTitle: false,
    done: false,
  }
}

export function samplePose(time: number, out: Pose): Pose {
  const t = Math.max(0, time)
  out.t = t
  writeCamera(t, out.camPos, out.camLook)

  const approach = smooth(t, 2.75, 5.2)
  writeLerp(out.operativePos, WALK_START, WALK_DOOR, approach)

  const fadeIn = smooth(t, 1.45, 1.95)
  out.operativeOpacity = fadeIn
  const present = smooth(t, 5.15, 6.45)
  out.operativeYaw = lerp(OPERATIVE_YAW, 0.38, present)
  out.walkWeight = smooth(t, 2.75, 3.05) * (1 - smooth(t, 5.2, 5.6))
  out.walkPhase = approach * Math.PI * 2 * 2.4

  const hint = smooth(t, 2.4, 3.55) * 0.08
  const rise = smooth(t, 4.25, 5.05)
  const settle = smooth(t, 5.9, 6.65)
  const risen = hint + (1 - hint) * rise
  out.portal = risen + (0.42 - risen) * settle
  out.beam = smooth(t, 4.55, 5.15) * (1 - smooth(t, 5.75, 6.35))
  out.shards = smooth(t, 4.4, 5.05) * (1 - smooth(t, 5.7, 6.25))
  out.showTitle = t >= TITLE_AT
  out.done = t >= DURATION
  return out
}
