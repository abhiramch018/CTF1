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

/** Monumental gate, facing the camera along +Z. The operative stands in front of it, on the right. */
export const GATE = { x: 2.55, z: -3.05 }

export const WALK_START: Vec3 = [2.15, 0, 1.35]
/** Landing / hero stand point in front of the gate. */
export const WALK_DOOR: Vec3 = [2.72, 0, -0.15]
/** Opening cinematic: threshold just ahead of the portal leaves. */
export const WALK_THRESHOLD: Vec3 = [2.55, 0, -1.55]
/** Opening cinematic: past the doorway into the command corridor. */
export const WALK_INSIDE: Vec3 = [2.55, 0, -4.35]

export const OPERATIVE_YAW = Math.atan2(
  WALK_DOOR[0] - WALK_START[0],
  WALK_DOOR[2] - WALK_START[2],
)
