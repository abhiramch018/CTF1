import { useEffect, useRef, useState } from 'react'
import { QUALIFIER_AT } from './content.ts'
import { SignalTower } from './SignalTower.tsx'
import './telemetry.css'

const GLYPHS = '0123456789ABCDEF#$%&*+/<=>?'
const STEP_MS = 50
const UNIT_STAGGER_MS = 110
const CHAR_SETTLE_MS = 380
const CHAR_STAGGER_MS = 90
const DECRYPT_MS = 3 * UNIT_STAGGER_MS + CHAR_SETTLE_MS + 2 * CHAR_STAGGER_MS + STEP_MS
const LIVE = Number.POSITIVE_INFINITY

type Clock = { days: string; hours: string; minutes: string; seconds: string; open: boolean }

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function remaining(now: number): Clock {
  const delta = Math.max(0, QUALIFIER_AT - now)
  const total = Math.floor(delta / 1000)
  return {
    days: pad(Math.floor(total / 86400)),
    hours: pad(Math.floor((total % 86400) / 3600)),
    minutes: pad(Math.floor((total % 3600) / 60)),
    seconds: pad(total % 60),
    open: delta === 0,
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function glyph(tick: number, unit: number, index: number): string {
  const hash = Math.imul(tick + 1, 2654435761) ^ Math.imul(unit * 8 + index + 1, 40503)
  return GLYPHS[(hash >>> 0) % GLYPHS.length]
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

type Props = { handoffId: string }

export function CountdownTelemetry({ handoffId }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const [reduced, setReduced] = useState(prefersReducedMotion)
  // null: dormant (never seen). LIVE: settled. Otherwise ms into the decrypt.
  const [elapsed, setElapsed] = useState<number | null>(() => (reduced ? LIVE : null))
  const [awake, setAwake] = useState(false)
  const started = useRef(reduced)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(remaining(Date.now())), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      setReduced(media.matches)
      if (!media.matches) return
      started.current = true
      setElapsed(LIVE)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => setAwake(entry.isIntersecting), {
      rootMargin: '120px 0px',
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const deck = deckRef.current
    if (!deck || reduced || started.current) return
    let frame = 0
    let start = 0
    let lastTick = -1
    const run = (now: number) => {
      if (!start) start = now
      const t = now - start
      if (t >= DECRYPT_MS) {
        setElapsed(LIVE)
        return
      }
      const tick = Math.floor(t / STEP_MS)
      if (tick !== lastTick) {
        lastTick = tick
        setElapsed(t)
      }
      frame = requestAnimationFrame(run)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        started.current = true
        observer.disconnect()
        frame = requestAnimationFrame(run)
      },
      { threshold: 0.6 },
    )
    observer.observe(deck)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [reduced])

  useEffect(() => {
    const drop = dropRef.current
    const next = document.getElementById(handoffId)
    if (!drop || !next || !awake) return
    let frame = 0
    let length = -1
    const paint = () => {
      frame = 0
      const view = window.innerHeight
      const from = drop.getBoundingClientRect().top
      const to = next.getBoundingClientRect().top
      const target = Math.max(0, Math.round(to - from + Math.min(160, view * 0.2)))
      if (target !== length) {
        length = target
        drop.style.height = `${target}px`
      }
      const progress = reduced ? 1 : smoothstep((view * 0.92 - to) / (view * 0.5))
      drop.style.setProperty('--drop', progress.toFixed(3))
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    paint()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      cancelAnimationFrame(frame)
    }
  }, [awake, handoffId, reduced])

  const tick = elapsed === null ? 0 : Math.floor(elapsed / STEP_MS)
  const units = [
    ['Days', clock.days],
    ['Hours', clock.hours],
    ['Minutes', clock.minutes],
    ['Seconds', clock.seconds],
  ] as const
  const state = elapsed === null ? 'dormant' : elapsed === LIVE ? 'live' : 'decrypting'

  return (
    <section
      id="countdown"
      className="band telemetry"
      ref={sectionRef}
      data-awake={awake ? 'on' : 'off'}
      data-motion={reduced ? 'reduce' : 'full'}
    >
      <div className="telemetry-ambient" aria-hidden="true">
        <SignalTower />
      </div>
      <div className="band-head">
        <p className="eyebrow">Countdown</p>
        <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
      </div>
      <div className="telemetry-deck" ref={deckRef}>
        <div className="count" role="timer" aria-label="Time until the online qualifier" data-state={state}>
          {units.map(([label, value], unit) => {
            const armed = elapsed !== null && elapsed >= unit * UNIT_STAGGER_MS
            const settleAt = unit * UNIT_STAGGER_MS + CHAR_SETTLE_MS
            return (
              <div key={label} className={armed ? 'unit is-armed' : 'unit'}>
                <strong>
                  <span className="sr">{value}</span>
                  <span className="digits" aria-hidden="true">
                    {[...value].map((char, index) => (
                      <span key={index}>
                        {elapsed !== null && elapsed >= settleAt + index * CHAR_STAGGER_MS
                          ? char
                          : glyph(tick, unit, index)}
                      </span>
                    ))}
                  </span>
                </strong>
                <span className="unit-label">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="signal-rail" aria-hidden="true" />
        <div className="signal-drop" ref={dropRef} aria-hidden="true" />
      </div>
      <ul className="fact-row">
        <li>06 Dec 2026, 09:00–21:00 IST</li>
        <li>12 hours, remote, jeopardy-style</li>
        <li>Finals at KLEF, Vaddeswaram</li>
        <li>Teams of up to 3</li>
      </ul>
    </section>
  )
}
