/** Scroll progress helpers for the Final Access closing sequence. */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function smooth(t: number, start: number, end: number): number {
  const amount = clamp01((t - start) / Math.max(0.0001, end - start))
  return amount * amount * (3 - 2 * amount)
}

export function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount
}

/** Map sticky-section scroll into 0–1 choreography progress. */
export function sectionProgress(section: HTMLElement): number {
  const rect = section.getBoundingClientRect()
  const travel = Math.max(1, rect.height - window.innerHeight)
  return clamp01(-rect.top / travel)
}

export type ArenaExtras = {
  /** System label visibility */
  label: number
  /** Dormant route line */
  route: number
  /** Floor panel assembly 0–1 */
  path: number
  /** Gate pylon rise 0–1 */
  pylons: number
  /** Portal activation 0–1 */
  portal: number
  /** Flag core presence */
  core: number
  /** Path reflection sweep */
  sweep: number
  /** Final copy / CTA unlock */
  finale: number
}

export function createArenaExtras(): ArenaExtras {
  return {
    label: 0,
    route: 0,
    path: 0,
    pylons: 0,
    portal: 0,
    core: 0,
    sweep: 0,
    finale: 0,
  }
}

/** Drive arena extras from scroll progress (0–1). */
export function sampleArenaAccess(progress: number, out: ArenaExtras = createArenaExtras(), reduced = false): ArenaExtras {
  const p = reduced ? 1 : clamp01(progress)

  if (reduced) {
    out.label = 0.35
    out.route = 0.55
    out.path = 1
    out.pylons = 1
    out.portal = 0.72
    out.core = 0.85
    out.sweep = 0.2
    out.finale = 1
    return out
  }

  // Stage 1 — 0–25%
  out.label = smooth(p, 0.02, 0.18) * (1 - smooth(p, 0.78, 0.95) * 0.85)
  out.route = smooth(p, 0.04, 0.22)

  // Stage 2 — 25–60%
  out.path = smooth(p, 0.22, 0.52)
  out.pylons = smooth(p, 0.3, 0.56)

  // Stage 3 — 60–85%
  out.portal = smooth(p, 0.56, 0.76)
  out.core = smooth(p, 0.62, 0.8)
  out.sweep = smooth(p, 0.6, 0.7) * (1 - smooth(p, 0.7, 0.88) * 0.4)

  // Stage 4 — 85–100%
  out.finale = smooth(p, 0.82, 0.96)

  return out
}
