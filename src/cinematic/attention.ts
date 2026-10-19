/** Pointer and scroll attention for the held hero. Values stay in module scope so the render loop never allocates. */
export const attention = {
  targetX: 0,
  targetY: 0,
  pointerX: 0,
  pointerY: 0,
  scroll: 0,
}

export function resetAttention(): void {
  attention.targetX = 0
  attention.targetY = 0
  attention.pointerX = 0
  attention.pointerY = 0
  attention.scroll = 0
}
