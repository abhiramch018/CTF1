import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { QUALIFIER_AT } from './content.ts'

const GLYPHS = '0123456789ABCDEF'
const UNITS = [
  ['Days', 'days'],
  ['Hours', 'hours'],
  ['Minutes', 'minutes'],
  ['Seconds', 'seconds'],
] as const

type UnitKey = (typeof UNITS)[number][1]

type Clock = Record<UnitKey, string> & { open: boolean }

const CIPHER: Clock = {
  days: '4B',
  hours: '0E',
  minutes: 'A9',
  seconds: '71',
  open: false,
}

const VOXELS: Array<[number, number, number]> = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [1, 0, 1],
  [-1, 0, -1],
  [0, 1, 0],
  [0, 2, 0],
  [0, 3, 0],
  [0, 4, 0],
  [0, 5, 0],
  [0, 6, 0],
  [-2, 6, 0],
  [-1, 6, 0],
  [1, 6, 0],
  [2, 6, 0],
  [0, 6, 1],
  [0, 7, 0],
]

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

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function glyph(): string {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0] ?? '0'
}

function timerLabel(clock: Clock): string {
  if (clock.open) return 'The online qualifier window is open'
  return `${Number(clock.days)} days, ${clock.hours} hours, ${clock.minutes} minutes, ${clock.seconds} seconds until the online qualifier`
}

function SignalTower() {
  return (
    <div className="signal-tower" aria-hidden="true">
      <div className="signal-tower-rig">
        {VOXELS.map(([x, y, z]) => (
          <span key={`${x}:${y}:${z}`} className="vox" style={{ '--x': x, '--y': y, '--z': z } as CSSProperties}>
            <i />
            <i />
            <i />
          </span>
        ))}
        <span className="vox vox-beacon" style={{ '--x': 0, '--y': 8, '--z': 0 } as CSSProperties}>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}

export function CountdownTelemetry() {
  const sectionRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const [shown, setShown] = useState<Clock>(() => (reducedMotion() ? remaining(Date.now()) : CIPHER))
  const [armed, setArmed] = useState(() => reducedMotion())
  const [decoded, setDecoded] = useState(() => reducedMotion())
  const [liveCount, setLiveCount] = useState(() => (reducedMotion() ? 4 : 0))

  useEffect(() => {
    const tick = () => setClock(remaining(Date.now()))
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const hush = () => {
      if (!media.matches) return
      setArmed(true)
      setDecoded(true)
      setLiveCount(4)
      setShown(remaining(Date.now()))
    }
    media.addEventListener('change', hush)
    return () => media.removeEventListener('change', hush)
  }, [])

  useEffect(() => {
    const node = sectionRef.current
    if (!node || reducedMotion()) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        setArmed(true)
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!armed || decoded || reducedMotion()) return
    const target = remaining(Date.now())
    const source = `${target.days}${target.hours}${target.minutes}${target.seconds}`
    let frame = 0
    const timer = window.setInterval(() => {
      frame += 1
      const locked = Math.min(8, Math.floor(frame / 2))
      let mixed = ''
      for (let index = 0; index < 8; index += 1) {
        mixed += index < locked ? source[index] : glyph()
      }
      setShown({
        ...target,
        days: mixed.slice(0, 2),
        hours: mixed.slice(2, 4),
        minutes: mixed.slice(4, 6),
        seconds: mixed.slice(6, 8),
      })
      setLiveCount(Math.floor(locked / 2))
      if (locked >= 8) {
        window.clearInterval(timer)
        setDecoded(true)
      }
    }, 32)
    return () => window.clearInterval(timer)
  }, [armed, decoded])

  useEffect(() => {
    const root = sectionRef.current
    const rail = railRef.current
    if (!root || !rail) return

    if (reducedMotion()) {
      root.style.setProperty('--signal-drop', '5.25rem')
      root.style.setProperty('--signal-drop-opacity', '0.3')
      return
    }

    let frame = 0
    const measure = () => {
      const mission = document.getElementById('mission')
      if (!mission) return
      const railBox = rail.getBoundingClientRect()
      const missionBox = mission.getBoundingClientRect()
      const start = window.innerHeight * 0.9
      const progress = Math.min(1, Math.max(0, (start - missionBox.top) / 240))
      const span = Math.max(0, missionBox.top - railBox.bottom) + Math.min(168, missionBox.height * 0.28)
      root.style.setProperty('--signal-drop', `${progress * span}px`)
      root.style.setProperty('--signal-drop-opacity', (0.62 * (1 - progress * 0.72)).toFixed(3))
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const display = decoded ? clock : shown
  const resolved = decoded ? 4 : liveCount

  return (
    <section
      id="countdown"
      ref={sectionRef}
      className={`band telemetry${armed ? ' is-armed' : ''}${decoded ? ' is-live' : ''}`}
    >
      <SignalTower />
      <div className="band-head">
        <p className="eyebrow">Countdown</p>
        <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
      </div>
      <div className="count-stage">
        <div className="count" role="timer" aria-label={timerLabel(clock)}>
          {UNITS.map(([label, key], index) => (
            <div key={label} className={index < resolved ? 'unit is-live' : 'unit'} aria-hidden="true">
              <strong>{display[key]}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="signal-rail" ref={railRef} aria-hidden="true">
          <span className="signal-tick" />
          <span className="signal-drop" />
        </div>
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
