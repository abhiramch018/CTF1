export type Vec3 = [number, number, number]

export type Stone = {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rotY?: number
  color: string
}

/** Monumental gate, facing the camera along +Z. */
export const GATE = { x: 2.35, z: -2.85 }

/**
 * Opening hero stand — right of the portal, in front, large in frame.
 * Portal stays behind / slightly left of the figure.
 */
export const WALK_HERO: Vec3 = [3.55, 0, 1.45]

export const WALK_START: Vec3 = WALK_HERO
/** Landing / hero stand point in front of the gate. */
export const WALK_DOOR: Vec3 = [2.72, 0, -0.15]
/** Opening cinematic: threshold just ahead of the portal leaves. */
export const WALK_THRESHOLD: Vec3 = [2.55, 0, -1.35]
/** Opening cinematic: past the doorway into the command corridor. */
export const WALK_INSIDE: Vec3 = [2.4, 0, -4.15]

export const OPERATIVE_YAW = -0.22
