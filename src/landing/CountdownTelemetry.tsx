import { useEffect, useRef, useState } from 'react'
import { VoxelTower } from './VoxelTower.tsx'
import './countdown.css'

export type Clock = {
  days: string
  hours: string
  minutes: string
  seconds: string
  open: boolean
}

type Phase = 'pending' | 'decrypting' | 'live'

const GLYPHS = '0123456789ABCDEF#%&/<>'
const FRAME_MS = 45
const FIRST_RESOLVE_MS = 260
const RESOLVE_STEP_MS = 70
const DROP_TAIL_PX = 220

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initialPhase(): Phase {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return 'live'
  return 'pending'
}

function cipher(frame: number, slot: number): string {
  const mixed = Math.imul(frame + 1, 2654435761) ^ Math.imul(slot + 1, 40503)
  return GLYPHS[(mixed >>> 0) % GLYPHS.length]
}

function Digits({ value, offset, frame, phase }: { value: string; offset: number; frame: number; phase: Phase }) {
  return (
    <strong className="tele-digits" aria-hidden="true">
      {Array.from(value).map((digit, index) => {
        const slot = offset + index
        const resolved =
          phase === 'live' || (phase === 'decrypting' && frame * FRAME_MS >= FIRST_RESOLVE_MS + slot * RESOLVE_STEP_MS)
        return (
          <span key={index} className={resolved ? 'tele-ch' : 'tele-ch is-cipher'}>
            {resolved ? digit : cipher(frame, slot)}
          </span>
        )
      })}
    </strong>
  )
}

export function CountdownTelemetry({ clock }: { clock: Clock }) {
  const sectionRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [frame, setFrame] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) setPhase((current) => (current === 'pending' ? 'decrypting' : current))
      },
      { threshold: 0.35 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (phase !== 'decrypting') return
    const total = FIRST_RESOLVE_MS + 8 * RESOLVE_STEP_MS + FRAME_MS * 2
    const startedAt = performance.now()
    let raf = 0
    let last = -1
    const step = (now: number) => {
      const next = Math.floor((now - startedAt) / FRAME_MS)
      if (next !== last) {
        last = next
        setFrame(next)
      }
      if (now - startedAt >= total) {
        setPhase('live')
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    const section = sectionRef.current
    const rail = railRef.current
    const next = section?.nextElementSibling
    if (!section || !rail || !next) return
    const reduced = prefersReducedMotion()
    let raf = 0
    const paint = () => {
      raf = 0
      const view = window.innerHeight
      const railTop = rail.getBoundingClientRect().top
      const nextTop = next.getBoundingClientRect().top
      const progress = reduced ? 1 : Math.min(1, Math.max(0, (view * 0.92 - nextTop) / (view * 0.5)))
      const length = nextTop - railTop + DROP_TAIL_PX
      section.style.setProperty('--drop', progress.toFixed(3))
      section.style.setProperty('--drop-len', `${Math.max(0, length).toFixed(0)}px`)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint)
    }
    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  const units = [
    ['Days', clock.days],
    ['Hours', clock.hours],
    ['Minutes', clock.minutes],
    ['Seconds', clock.seconds],
  ] as const

  return (
    <section
      id="countdown"
      className="band tele"
      ref={sectionRef}
      data-phase={phase}
      data-visible={visible || phase === 'live' ? 'true' : 'false'}
    >
      <div className="tele-bg" aria-hidden="true">
        <VoxelTower />
      </div>
      <div className="tele-body">
        <div className="band-head">
          <p className="eyebrow">Countdown</p>
          <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
        </div>
        <div className="tele-count" role="timer" aria-label="Time until the online qualifier">
          {units.map(([label, value], index) => (
            <div className="tele-card" key={label} style={{ ['--i' as string]: index }}>
              <span className="sr">{value}</span>
              <Digits value={value} offset={index * 2} frame={frame} phase={phase} />
              <span className="tele-label" aria-hidden="true">
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="tele-rail" ref={railRef} aria-hidden="true">
          <span className="tele-node" />
          <span className="tele-line" />
          <span className="tele-drop" />
        </div>
        <ul className="fact-row">
          <li>06 Dec 2026, 09:00–21:00 IST</li>
          <li>12 hours, remote, jeopardy-style</li>
          <li>Finals at KLEF, Vaddeswaram</li>
          <li>Teams of up to 3</li>
        </ul>
      </div>
    </section>
  )
}
