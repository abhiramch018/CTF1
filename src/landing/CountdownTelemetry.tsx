import { useEffect, useRef, useState } from 'react'
import { SignalTower } from './SignalTower.tsx'
import './telemetry.css'

export type Clock = { days: string; hours: string; minutes: string; seconds: string; open: boolean }

type Phase = 'pending' | 'run' | 'done'

const GLYPHS = '01ABCDEF#<>/+=%$'
const FRAME_MS = 60
const CARD_STAGGER_MS = 110
const DIGIT_STAGGER_MS = 130
const FIRST_RESOLVE_MS = 180
const RUN_MS = 960
const DROP_EXTENSION_PX = 96

function glyph(seed: number): string {
  const hash = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)
  return GLYPHS[(hash >>> 11) % GLYPHS.length]
}

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initialPhase(): Phase {
  if (prefersReduced() || typeof IntersectionObserver === 'undefined') return 'done'
  return 'pending'
}

function smooth(value: number): number {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

export function CountdownTelemetry({ clock }: { clock: Clock }) {
  const sectionRef = useRef<HTMLElement>(null)
  const traceRef = useRef<HTMLDivElement>(null)
  const stemRef = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [tick, setTick] = useState(0)
  const phaseRef = useRef(phase)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (typeof IntersectionObserver === 'undefined') {
      section.classList.add('is-live')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          section.classList.toggle('is-live', entry.isIntersecting)
          const enough =
            entry.intersectionRatio >= 0.25 || entry.intersectionRect.height >= window.innerHeight * 0.5
          if (entry.isIntersecting && enough && phaseRef.current === 'pending') {
            phaseRef.current = 'run'
            setPhase('run')
          }
        }
      },
      { threshold: [0, 0.25, 0.5] },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (phase !== 'run') return
    const start = performance.now()
    let frame = 0
    let last = -1
    const step = (now: number) => {
      const elapsed = now - start
      const index = Math.floor(elapsed / FRAME_MS)
      if (index !== last) {
        last = index
        setTick(index)
      }
      if (elapsed >= RUN_MS) {
        setPhase('done')
        return
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => {
    const trace = traceRef.current
    const stem = stemRef.current
    if (!trace || !stem) return
    const reduced = prefersReduced()
    let raf = 0
    let length = -1

    const update = () => {
      raf = 0
      const mission = document.getElementById('mission')
      if (!mission) return
      const traceTop = trace.getBoundingClientRect().top
      const missionTop = mission.getBoundingClientRect().top
      const full = Math.max(0, missionTop - traceTop + DROP_EXTENSION_PX)
      if (Math.abs(full - length) > 0.5) {
        length = full
        stem.style.height = `${full}px`
      }
      const viewport = window.innerHeight
      const progress = reduced ? 1 : smooth((viewport * 0.92 - missionTop) / (viewport * 0.5))
      stem.style.transform = `scaleY(${progress.toFixed(3)})`
    }

    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
    }
  }, [])

  const units = [
    ['Days', clock.days],
    ['Hours', clock.hours],
    ['Minutes', clock.minutes],
    ['Seconds', clock.seconds],
  ] as const

  const elapsed = phase === 'done' ? Infinity : phase === 'run' ? tick * FRAME_MS : -1

  return (
    <section
      id="countdown"
      ref={sectionRef}
      className={`band telemetry is-${phase}`}
      aria-labelledby="countdown-title"
    >
      <div className="tele-bg" aria-hidden="true">
        <SignalTower />
      </div>

      <div className="tele-body">
        <div className="band-head">
          <p className="eyebrow">Countdown</p>
          <h2 id="countdown-title">{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
        </div>

        <div className="count" role="timer" aria-label="Time until the online qualifier">
          {units.map(([label, value], unit) => {
            const active = elapsed >= unit * CARD_STAGGER_MS
            return (
              <div key={label} className={active ? 'unit is-active' : 'unit'}>
                <strong aria-hidden="true">
                  {value.split('').map((digit, index) => {
                    const resolveAt = FIRST_RESOLVE_MS + unit * CARD_STAGGER_MS + index * DIGIT_STAGGER_MS
                    const resolved = elapsed >= resolveAt
                    const seed = Math.max(0, Math.floor(elapsed / FRAME_MS)) * 31 + unit * 7 + index
                    return (
                      <span key={index} className={resolved ? 'd' : 'd is-enc'}>
                        {resolved ? digit : glyph(seed)}
                      </span>
                    )
                  })}
                </strong>
                <span className="sr">{value}</span>
                <span className="unit-label">{label}</span>
              </div>
            )
          })}
        </div>

        <div className="tele-trace" ref={traceRef} aria-hidden="true">
          <span className="tele-line" />
          <span className="tele-stem" ref={stemRef} />
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
