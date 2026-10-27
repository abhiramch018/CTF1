/** Final Access — Arena Rift ambient state (no scroll choreography). */

export type ArenaExtras = {
  /** CTA hover pulse 0–1 (decays in the vista) */
  hover: number
}

export function createArenaExtras(): ArenaExtras {
  return { hover: 0 }
}
