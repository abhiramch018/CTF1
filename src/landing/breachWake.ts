import { WALK_DOOR } from '../cinematic/layout.ts'
import type { Vec3 } from '../cinematic/layout.ts'
import { createPose } from '../cinematic/pose.ts'
import type { Pose } from '../cinematic/pose.ts'

/** Total Breach Wake duration once the hero is actually on-screen. */
export const WAKE_DURATION = 2.05

/** Shadow hold beside the gate before the restrained arrival. */
export const OPERATIVE_SHADOW: Vec3 = [4.15, 0, 1.45]

/** Hero-stable portal energy — doors stay clearly parted. */
export const STABLE_PORTAL = 0.82

/** Peak opening during unlock so the seam visibly splits. */
export const PEAK_PORTAL = 1

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

export type WakeExtras = {
  /** 0–1 construction of layered gate frame */
  construct: number
  /** 0–1 tunnel / corridor visibility */
  tunnel: number
  /** 0–1 edge scan intensity */
  edgeScan: number
  /** One-shot chest device pulse 0–1 */
  chestPulse: number
  /** Floor sweep reflection 0–1 */
  floorSweep: number
}

export function createWakeExtras(): WakeExtras {
  return { construct: 0, tunnel: 0, edgeScan: 0, chestPulse: 0, floorSweep: 0 }
}

/**
 * Drive Pose + hero-only extras for the Breach Wake Sequence.
 * Independent of the cinematic Opening timeline.
 */
export function sampleBreachWake(
  time: number,
  out: Pose = createPose(),
  extras: WakeExtras = createWakeExtras(),
  reduced = false,
): Pose {
  const t = reduced ? WAKE_DURATION : Math.max(0, time)

  out.t = t
  out.beam = 0
  out.shards = 0
  out.showTitle = false
  out.done = t >= WAKE_DURATION

  if (reduced) {
    out.portal = STABLE_PORTAL
    out.operativeOpacity = 1
    writeLerp(out.operativePos, WALK_DOOR, WALK_DOOR, 0)
    out.operativeYaw = 0.32
    out.walkWeight = 0
    out.walkPhase = 0
    extras.construct = 1
    extras.tunnel = 0.85
    extras.edgeScan = 0.15
    extras.chestPulse = 0
    extras.floorSweep = 0.2
    return out
  }

  // —— 0.0–0.5s gate construction ——
  extras.construct = smooth(t, 0.02, 0.48)
  extras.edgeScan = smooth(t, 0.08, 0.45) * (1 - smooth(t, 0.55, 0.95) * 0.35)

  // —— 0.5–1.3s portal unlock (doors visibly open) ——
  const unlock = smooth(t, 0.42, 1.2)
  const settle = smooth(t, 1.5, 2.0)
  const open = unlock * PEAK_PORTAL
  out.portal = open + (STABLE_PORTAL - open) * settle
  extras.tunnel = smooth(t, 0.5, 1.15) * (0.82 + (1 - settle) * 0.18)

  // —— 1.0–1.8s operative arrival from shadow ——
  const arrive = smooth(t, 0.95, 1.75)
  writeLerp(out.operativePos, OPERATIVE_SHADOW, WALK_DOOR, arrive)
  out.operativeOpacity = 0.22 + arrive * 0.78
  out.operativeYaw = lerp(0.62, 0.32, arrive)
  // One restrained step during arrival
  const stepWindow = smooth(t, 1.0, 1.28) * (1 - smooth(t, 1.5, 1.72))
  out.walkWeight = stepWindow * 0.95
  out.walkPhase = arrive * Math.PI * 1.2

  // Chest device pulse once near arrival settle
  const pulsePeak = Math.exp(-Math.pow((t - 1.52) * 6.8, 2))
  extras.chestPulse = t > 1.3 && t < 1.9 ? pulsePeak : 0

  // Continuous floor sweep after wake
  if (t >= WAKE_DURATION) {
    const local = (t - WAKE_DURATION) % 8.5
    extras.floorSweep = Math.exp(-Math.pow((local - 2.2) * 2.4, 2)) * 0.6
    extras.edgeScan = 0.14 + Math.sin(t * 0.55) * 0.05
    extras.tunnel = 0.78 + Math.sin(t * 0.4) * 0.04
    out.operativeOpacity = 1
    out.walkWeight = 0
    writeLerp(out.operativePos, WALK_DOOR, WALK_DOOR, 0)
    // Soft idle stance shift
    out.operativeYaw = 0.32 + Math.sin(t * 0.32) * 0.035
    out.operativePos[2] = WALK_DOOR[2] + Math.sin(t * 0.55) * 0.028
  } else {
    extras.floorSweep = unlock * 0.28
  }

  // Pre-arrival: keep operative mostly hidden in shadow
  if (t < 0.95) {
    writeLerp(out.operativePos, OPERATIVE_SHADOW, OPERATIVE_SHADOW, 0)
    out.operativeOpacity = 0.12 * extras.construct
    out.walkWeight = 0
    out.walkPhase = 0
  }

  return out
}

/** Residual portal energy scan after wake. */
export function scanBoost(elapsed: number): number {
  if (elapsed < WAKE_DURATION) return 0
  const local = (elapsed - WAKE_DURATION) % 6.8
  const pulse = Math.exp(-Math.pow((local - 2.8) * 3.2, 2))
  return pulse * 0.1
}
