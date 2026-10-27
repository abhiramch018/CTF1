/** Shared scroll helpers for landing motion — never locks or hijacks scrolling. */

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Map page scroll through the hero band into 0–1 approach progress.
 * Uses ~110vh of travel so wheel/trackpad/touch keep native scrolling.
 */
export function heroApproachProgress(hero: HTMLElement): number {
  const rect = hero.getBoundingClientRect()
  const travel = Math.max(window.innerHeight * 0.95, hero.offsetHeight - window.innerHeight * 0.28)
  return clamp01(-rect.top / travel)
}

/** Local 0–1 progress while a section crosses the viewport (for bg depth only). */
export function sectionLocalProgress(node: HTMLElement): number {
  const rect = node.getBoundingClientRect()
  const view = window.innerHeight
  const start = view * 0.85
  const end = view * 0.2
  return clamp01((start - rect.top) / (rect.height + start - end))
}
