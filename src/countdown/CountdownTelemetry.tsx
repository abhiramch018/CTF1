import { useEffect, useRef, useState } from 'react'
import { SignalTower } from './SignalTower.tsx'
import './countdown.css'

/*
 * Event facts live in one place so organisers can correct them without touching
 * the telemetry behaviour. The countdown target is the qualifier start below.
 */
const QUALIFIER = {
  start: new Date('2026-11-27T18:00:00+05:30'),
  details: [
    { label: 'Dates', value: '27 — 29 Nov 2026' },
    { label: 'Duration', value: '36 hours' },
    { label: 'Format', value: 'Online · Remote' },
    { label: 'Finals', value: 'On-site · Bengaluru, IN' },
    { label: 'Team size', value: '1 — 4 members' },
  ],
} as const

const GLYPHS = 'ABCDEF0123456789#%&<>/=+*'
const DECRYPT_MS = 760
const DECRYPT_STEP_MS = 36

type Parts = { days: number; hours: number; minutes: number; seconds: number; live: boolean }

function parts(now: number): Parts {
  const diff = QUALIFIER.start.getTime() - now
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, live: true }
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
    live: false,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** True once, the first time the element enters the viewport. */
function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const node = ref.current
    if (!node || inView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView])
  return { ref, inView }
}

/**
 * Resolves encrypted glyphs into the real value exactly once, when `active`
 * first turns on. After settling it is a plain pass-through, so the seconds
 * card can tick every second without ever re-scrambling.
 */
function DecryptValue({
  value,
  active,
  reduced,
  delay,
}: {
  value: string
  active: boolean
  reduced: boolean
  delay: number
}) {
  const [display, setDisplay] = useState(value)
  const settled = useRef(false)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
    if (settled.current) setDisplay(value)
  }, [value])

  useEffect(() => {
    if (!active || settled.current) return
    if (reduced) {
      settled.current = true
      setDisplay(valueRef.current)
      return
    }
    let interval = 0
    const timeout = window.setTimeout(() => {
      const startedAt = performance.now()
      interval = window.setInterval(() => {
        const progress = (performance.now() - startedAt) / DECRYPT_MS
        const current = valueRef.current
        if (progress >= 1) {
          window.clearInterval(interval)
          settled.current = true
          setDisplay(current)
          return
        }
        const resolved = Math.floor(progress * current.length)
        let next = current.slice(0, resolved)
        for (let i = resolved; i < current.length; i += 1) {
          next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
        setDisplay(next)
      }, DECRYPT_STEP_MS)
    }, delay)
    return () => {
      window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
    }
  }, [active, reduced, delay])

  return <>{display}</>
}

export function CountdownTelemetry() {
  const reduced = useReducedMotion()
  const { ref: sectionRef, inView } = useInViewOnce<HTMLElement>()
  const bridgeRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())
  const [extend, setExtend] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  // The signal drop grows as the bridge between this section and Mission scrolls
  // through the viewport, then fades out. Scroll is never locked or redirected.
  useEffect(() => {
    if (reduced) return
    let frame = 0
    const update = () => {
      frame = 0
      const bridge = bridgeRef.current
      if (!bridge) return
      const rect = bridge.getBoundingClientRect()
      const progress = (window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.35)
      setExtend(Math.min(1, Math.max(0, progress)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduced])

  const time = parts(now)
  const units = [
    { label: 'Days', value: pad(time.days) },
    { label: 'Hours', value: pad(time.hours) },
    { label: 'Minutes', value: pad(time.minutes) },
    { label: 'Seconds', value: pad(time.seconds) },
  ]

  return (
    <section
      ref={sectionRef}
      className={inView ? 'ct is-on' : 'ct'}
      aria-labelledby="ct-title"
      style={{ '--ct-extend': reduced ? 0.55 : extend } as React.CSSProperties}
    >
      <SignalTower />

      <div className="ct-inner">
        <div className="ct-status" aria-hidden="true">
          <span className="ct-live">
            <span className="ct-dot" />
            {time.live ? 'Qualifier live' : 'Signal live'}
          </span>
          <span className="ct-uplink">Uplink 0xA91 · Encrypted</span>
        </div>

        <h1 id="ct-title" className="ct-title">
          Until the online qualifier
        </h1>
        <p className="ct-sub">
          {time.live
            ? 'The qualifier window is open. The countdown has reached zero.'
            : 'Telemetry is locked on the qualifier window. Stand by for transmission.'}
        </p>

        <p className="sr" role="timer" aria-label={
          time.live
            ? 'The online qualifier is now live.'
            : `${time.days} days, ${time.hours} hours, ${time.minutes} minutes until the online qualifier.`
        } />

        <div className="ct-cards" aria-hidden="true">
          {units.map((unit, index) => (
            <div
              key={unit.label}
              className="ct-card"
              style={{ '--ct-i': index } as React.CSSProperties}
            >
              <span className="ct-card-top">
                <span>{unit.label}</span>
                <span className="ct-card-index">T-0{index + 1}</span>
              </span>
              <span className="ct-digits">
                <DecryptValue value={unit.value} active={inView} reduced={reduced} delay={index * 110} />
              </span>
            </div>
          ))}
        </div>

        <dl className="ct-details">
          {QUALIFIER.details.map((item) => (
            <div key={item.label} className="ct-detail">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="ct-signal" aria-hidden="true">
          <span className="ct-signal-pulse" />
        </div>

        <div ref={bridgeRef} className="ct-bridge" aria-hidden="true">
          <span className="ct-drop" />
          <span className="ct-drop-node" />
        </div>
      </div>
    </section>
  )
}
