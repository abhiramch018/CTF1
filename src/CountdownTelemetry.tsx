import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

const QUALIFIER_START = new Date('2026-11-14T18:00:00Z')
const CIPHER = '01AF7X#'
const UNITS = ['days', 'hours', 'minutes', 'seconds'] as const

type Unit = (typeof UNITS)[number]
type Countdown = Record<Unit, string>

function getRemaining(now = Date.now()): Countdown {
  const totalSeconds = Math.max(0, Math.floor((QUALIFIER_START.getTime() - now) / 1000))

  return {
    days: String(Math.floor(totalSeconds / 86_400)).padStart(2, '0'),
    hours: String(Math.floor((totalSeconds % 86_400) / 3_600)).padStart(2, '0'),
    minutes: String(Math.floor((totalSeconds % 3_600) / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  }
}

function scramble(value: string, progress: number): string {
  const resolved = Math.floor(value.length * progress)
  return value
    .split('')
    .map((character, index) => {
      if (index < resolved || progress >= 1) return character
      return CIPHER[Math.floor(Math.random() * CIPHER.length)]
    })
    .join('')
}

export function CountdownTelemetry() {
  const sectionRef = useRef<HTMLElement>(null)
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [remaining, setRemaining] = useState(getRemaining)
  const [decryptProgress, setDecryptProgress] = useState(reducedMotion ? 1 : 0)
  const [activated, setActivated] = useState(reducedMotion)

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const section = sectionRef.current
    if (!section) return

    let animationFrame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        setActivated(true)
        const startedAt = performance.now()

        const animate = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / 680)
          setDecryptProgress(progress)
          if (progress < 1) animationFrame = requestAnimationFrame(animate)
        }

        animationFrame = requestAnimationFrame(animate)
      },
      { threshold: 0.32 },
    )

    observer.observe(section)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  }, [reducedMotion])

  return (
    <>
      <section
        className={`telemetry ${activated ? 'is-active' : ''}`}
        ref={sectionRef}
        aria-labelledby="countdown-title"
      >
        <AmbientTower />
        <div className="telemetry-shell">
          <header className="telemetry-header">
            <p className="telemetry-kicker">
              <span className="status-dot" aria-hidden="true" />
              Qualifier uplink
            </p>
            <h1 id="countdown-title">Until the online qualifier</h1>
            <p className="telemetry-date">
              14–15 NOV 2026 <span aria-hidden="true">/</span> 18:00 UTC
            </p>
          </header>

          <div className="countdown-grid" role="timer" aria-label="Time until the online qualifier">
            {UNITS.map((unit, index) => {
              const value = remaining[unit]
              const display = decryptProgress < 1 ? scramble(value, decryptProgress) : value

              return (
                <div
                  className="countdown-unit"
                  key={unit}
                  style={{ '--unit-delay': `${index * 85}ms` } as CSSProperties}
                >
                  <span className="countdown-value" aria-hidden="true">
                    {display}
                  </span>
                  <span className="sr">
                    {value} {unit}
                  </span>
                  <span className="countdown-label">{unit}</span>
                  <span className="unit-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="signal-track" aria-hidden="true">
            <span className="signal-packet" />
          </div>

          <dl className="event-facts">
            <div>
              <dt>Duration</dt>
              <dd>24 hours</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>Remote</dd>
            </div>
            <div>
              <dt>Finals</dt>
              <dd>Berlin, Germany</dd>
            </div>
            <div>
              <dt>Team size</dt>
              <dd>1–4 operators</dd>
            </div>
          </dl>
        </div>
        <div className="signal-downlink" aria-hidden="true" />
      </section>

      <section className="mission" aria-labelledby="mission-title">
        <div className="mission-copy">
          <p className="section-index">02 / Mission</p>
          <h2 id="mission-title">Mission</h2>
          <p>
            Read the system. Find the fault. Leave no trace but the proof.
          </p>
        </div>
      </section>
    </>
  )
}

function AmbientTower() {
  return (
    <div className="ambient-tower" aria-hidden="true">
      <div className="tower-cap" />
      <div className="tower-mast">
        <i />
        <i />
        <i />
      </div>
      <div className="tower-base">
        <i />
        <i />
        <i />
      </div>
      <div className="tower-rail rail-one" />
      <div className="tower-rail rail-two" />
    </div>
  )
}
