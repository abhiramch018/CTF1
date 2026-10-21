import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { operationRoute, protocolDates, protocolRules } from './content.ts'

type StageState = {
  visible: boolean
  typed: boolean
  typedLen: number
  pulsed: boolean
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canTilt(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion()
}

export function OperationRoute() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const typedOnce = useRef(new Set<string>())
  const timers = useRef(new Map<string, number>())

  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [states, setStates] = useState<StageState[]>(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) typedOnce.current = new Set(operationRoute.map((s) => s.id))
    return operationRoute.map((stage) =>
      reduce
        ? { visible: true, typed: true, typedLen: stage.body.length, pulsed: false }
        : { visible: false, typed: false, typedLen: 0, pulsed: false },
    )
  })
  const [progress, setProgress] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1
      : 0,
  )
  const [activeIndex, setActiveIndex] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? operationRoute.length - 1
      : 0,
  )

  const startTyping = useCallback((index: number) => {
    const stage = operationRoute[index]
    if (!stage || typedOnce.current.has(stage.id)) return
    typedOnce.current.add(stage.id)

    if (prefersReducedMotion()) {
      setStates((prev) => {
        const next = [...prev]
        next[index] = {
          ...next[index]!,
          visible: true,
          typed: true,
          typedLen: stage.body.length,
        }
        return next
      })
      return
    }

    const existing = timers.current.get(stage.id)
    if (existing) window.clearInterval(existing)

    let len = 0
    const body = stage.body
    const id = window.setInterval(() => {
      len = Math.min(body.length, len + 2)
      setStates((prev) => {
        const next = [...prev]
        next[index] = {
          ...next[index]!,
          typed: len >= body.length,
          typedLen: len,
        }
        return next
      })
      if (len >= body.length) {
        window.clearInterval(id)
        timers.current.delete(stage.id)
      }
    }, 18)
    timers.current.set(stage.id, id)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduced) return

    const nodes = cardRefs.current.filter(Boolean) as HTMLElement[]
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.routeIndex)
          if (!Number.isFinite(index)) continue
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            setStates((prev) => {
              if (prev[index]?.visible) return prev
              const next = [...prev]
              next[index] = { ...next[index]!, visible: true, pulsed: true }
              return next
            })
            window.setTimeout(() => {
              setStates((prev) => {
                const next = [...prev]
                if (!next[index]) return prev
                next[index] = { ...next[index], pulsed: false }
                return next
              })
            }, 520)
            window.setTimeout(() => startTyping(index), 520)
          }
        }
      },
      { threshold: [0.35, 0.55], rootMargin: '0px 0px -10% 0px' },
    )

    nodes.forEach((node) => observer.observe(node))
    const activeTimers = timers.current
    return () => {
      observer.disconnect()
      activeTimers.forEach((id) => window.clearInterval(id))
      activeTimers.clear()
    }
  }, [reduced, startTyping])

  useEffect(() => {
    if (reduced) return

    const onScroll = () => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const view = window.innerHeight
      const start = view * 0.55
      const end = view * 0.28
      const raw = (start - rect.top) / (rect.height + start - end)
      const clamped = Math.max(0, Math.min(1, raw))
      setProgress(clamped)

      let nearest = 0
      let best = Number.POSITIVE_INFINITY
      cardRefs.current.forEach((node, index) => {
        if (!node) return
        const mid = node.getBoundingClientRect().top + node.offsetHeight * 0.35
        const dist = Math.abs(mid - view * 0.42)
        if (dist < best) {
          best = dist
          nearest = index
        }
      })
      setActiveIndex(nearest)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduced])

  const onCardPointerMove = (event: ReactPointerEvent<HTMLElement>, index: number) => {
    if (!canTilt()) return
    const card = event.currentTarget
    const rect = card.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const rotY = (px - 0.5) * 5
    const rotX = (0.5 - py) * 4
    const edgeX = px < 0.5 ? 'left' : 'right'
    card.style.setProperty('--route-tilt-x', `${rotX.toFixed(2)}deg`)
    card.style.setProperty('--route-tilt-y', `${rotY.toFixed(2)}deg`)
    card.style.setProperty('--route-lift', '-4px')
    card.dataset.edge = edgeX
    card.dataset.pointerX = `${Math.round(px * 100)}%`
    card.dataset.pointerY = `${Math.round(py * 100)}%`
    void index
  }

  const onCardPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    const card = event.currentTarget
    card.style.setProperty('--route-tilt-x', '0deg')
    card.style.setProperty('--route-tilt-y', '0deg')
    card.style.setProperty('--route-lift', '0px')
    delete card.dataset.edge
  }

  return (
    <section id="format" ref={sectionRef} className="band route-band" aria-labelledby="route-title">
      <div className="route-terrain" aria-hidden="true" />
      <div className="band-head">
        <p className="eyebrow">Protocol</p>
        <h2 id="route-title">Format, rules, rewards, dates</h2>
      </div>

      <div className="route-track" ref={trackRef}>
        <div className="route-spine" aria-hidden="true">
          <div className="route-spine-base" />
          <div className="route-spine-progress" style={{ height: `${progress * 100}%` }} />
          <div
            className={states[activeIndex]?.pulsed ? 'route-signal is-pulse' : 'route-signal'}
            style={{ top: `${progress * 100}%` }}
          />
        </div>

        <ol className="route-list">
          {operationRoute.map((stage, index) => {
            const state = states[index]!
            const side = index % 2 === 0 ? 'left' : 'right'
            const body =
              reduced || state.typed
                ? stage.body
                : stage.body.slice(0, state.typedLen)
            const showMeta = reduced || state.visible
            const showType = reduced || state.visible

            return (
              <li
                key={stage.id}
                className={[
                  'route-stop',
                  `route-stop--${side}`,
                  state.visible || reduced ? 'is-in' : '',
                  index <= activeIndex ? 'is-reached' : '',
                  index === activeIndex ? 'is-active' : '',
                  state.pulsed ? 'is-pulse' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-route-index={index}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
              >
                <span className="route-dot" aria-hidden="true" />
                <article
                  className="route-card"
                  onPointerMove={(event) => onCardPointerMove(event, index)}
                  onPointerLeave={onCardPointerLeave}
                >
                  <header className={showMeta ? 'route-card-head is-shown' : 'route-card-head'}>
                    <p className="route-code">
                      {stage.code} / {stage.label}
                    </p>
                    <h3>{stage.title}</h3>
                  </header>
                  <p className={showType ? 'route-card-body is-shown' : 'route-card-body'} aria-live="polite">
                    {body}
                    {!reduced && state.visible && !state.typed ? (
                      <span className="route-caret" aria-hidden="true" />
                    ) : null}
                  </p>
                </article>
              </li>
            )
          })}
        </ol>
      </div>

      <ul className="rules route-rules">
        {protocolRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      <dl className="dates route-dates">
        {protocolDates.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
