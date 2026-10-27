import { useEffect, useRef, useState, type RefObject } from 'react'
import { prefersReducedMotion } from './scrollDrive.ts'

function isInView(node: HTMLElement, threshold = 0.12): boolean {
  const rect = node.getBoundingClientRect()
  const view = window.innerHeight || 1
  if (rect.height <= 0 || rect.width <= 0) return false
  const visible = Math.min(rect.bottom, view) - Math.max(rect.top, 0)
  return visible / rect.height >= threshold || (rect.top < view * 0.88 && rect.bottom > view * 0.1)
}

/**
 * One-shot viewport reveal. Disconnects after first entry so animations
 * do not replay when scrolling back.
 *
 * Uses IntersectionObserver when available, with a cheap geometry poll so
 * reveals still work if scroll/IO events are delayed or coalesced.
 */
export function useSectionReveal<T extends HTMLElement = HTMLElement>(
  threshold = 0.14,
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (shown) return

    if (prefersReducedMotion()) {
      setShown(true)
      return
    }

    let observer: IntersectionObserver | null = null
    let cancelled = false
    let tries = 0
    let retryId = 0
    let pollId = 0

    const reveal = () => {
      if (cancelled) return
      setShown(true)
      observer?.disconnect()
      observer = null
      window.clearInterval(pollId)
      window.clearTimeout(retryId)
    }

    const check = () => {
      const node = ref.current
      if (!node || cancelled) return
      if (isInView(node, Math.min(0.2, threshold))) reveal()
    }

    const bind = () => {
      if (cancelled) return
      const node = ref.current
      if (!node) {
        if (tries < 24) {
          tries += 1
          retryId = window.setTimeout(bind, 50)
        }
        return
      }

      if (typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) reveal()
          },
          { threshold, rootMargin: '0px 0px -6% 0px' },
        )
        observer.observe(node)
      }

      check()
      pollId = window.setInterval(check, 180)
      window.addEventListener('scroll', check, { passive: true })
      window.addEventListener('resize', check)
    }

    bind()
    return () => {
      cancelled = true
      window.clearTimeout(retryId)
      window.clearInterval(pollId)
      observer?.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [shown, threshold])

  return [ref, shown]
}
