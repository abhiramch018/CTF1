export type Stage = 'gate' | 'run' | 'hold'

const SEEN_KEY = 'dead-noctis-opening-seen'

export const runtime = {
  stage: 'gate' as Stage,
  startedAt: 0,
  skip: false,
}

export const preferences = {
  reduce: false,
}

export function readSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === 'seen'
  } catch {
    return false
  }
}

export function writeSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, 'seen')
  } catch {
    /* Private mode or a full quota should not block the scene. */
  }
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext
  } catch {
    return false
  }
}
