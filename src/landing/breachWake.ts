import { OPERATIVE_YAW, WALK_DOOR } from '../cinematic/layout.ts'
import { createPose } from '../cinematic/pose.ts'
import type { Pose } from '../cinematic/pose.ts'

/** Total first-load Breach Wake duration (seconds). */
export const WAKE_DURATION = 1.55

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

/** Hero-stable portal energy after the wake settles. */
export const STABLE_PORTAL = 0.46

/**
 * Drive the shared Pose for the landing hero Breach Wake Sequence.
 * Does not affect the cinematic Opening timeline.
 */
export function sampleBreachWake(time: number, out: Pose = createPose(), reduced = false): Pose {
  const t = reduced ? WAKE_DURATION : Math.max(0, time)

  out.t = t
  out.operativePos[0] = WALK_DOOR[0]
  out.operativePos[1] = WALK_DOOR[1]
  out.operativePos[2] = WALK_DOOR[2]
  out.operativeYaw = lerp(OPERATIVE_YAW, 0.34, 1)
  out.walkWeight = 0
  out.walkPhase = 0
  out.beam = 0
  out.shards = 0
  out.showTitle = false
  out.done = t >= WAKE_DURATION

  if (reduced || t >= WAKE_DURATION) {
    out.portal = STABLE_PORTAL
    out.operativeOpacity = 1
    return out
  }

  // 0–0.3s dormant: faint seam only
  const dormant = 1 - smooth(t, 0.22, 0.38)
  const seam = 0.04 + 0.04 * (1 - dormant)

  // 0.3–0.9s encryption unlock: portal rises
  const unlock = smooth(t, 0.3, 0.9)
  const unlockPeak = 0.08 + unlock * 0.62

  // 0.9–1.4s settle toward stable while operative reveals
  const settle = smooth(t, 1.05, 1.5)
  out.portal = lerp(seam, unlockPeak, unlock) + (STABLE_PORTAL - unlockPeak) * settle * unlock

  // Operative reveal 0.9–1.45s
  out.operativeOpacity = smooth(t, 0.9, 1.42)

  return out
}

/** Slow residual portal energy modulation after wake (seconds since wake start). */
export const scanBoost = (elapsed: number): number => {
  if (elapsed < WAKE_DURATION) return 0
  const local = elapsed - WAKE_DURATION
  const period = 6.4
  const phase = (local % period) / period
  // Brief soft scan pulse mid-cycle
  const pulse = Math.exp(-Math.pow((phase - 0.42) * 9, 2))
  return pulse * 0.07
}
