import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { QUALIFIER_AT } from './content.ts'

const GLYPHS = '0123456789#*+'
const UNIT_MS = 640
const STAGGER_MS = 90
const REVEAL_HOLD_MS = 420

const UNITS = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
] as const

type UnitKey = (typeof UNITS)[number][0]

type Clock = Record<UnitKey, string> & { open: boolean }

type Voxel = {
  x: number
  y: number
  z: number
  pulse?: boolean
}

const TOWER: Voxel[] = [
  { x: -4, y: 1, z: 0 },
  { x: -3, y: 1, z: 0 },
  { x: -2, y: 1, z: 0 },
  { x: -1, y: 1, z: 0 },
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 2, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 2, y: 1, z: 0 },
  { x: 1, y: 2, z: 0 },
  { x: 0, y: 1, z: 1 },
  { x: 1, y: 0, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: 2, y: 1, z: 1 },
  { x: 1, y: 1, z: 2 },
  { x: 1, y: 1, z: 3 },
  { x: 0, y: 1, z: 4 },
  { x: 1, y: 1, z: 4 },
  { x: 2, y: 1, z: 4 },
  { x: 1, y: 1, z: 5 },
  { x: 1, y: 1, z: 6 },
  { x: 1, y: 1, z: 7, pulse: true },
]

const ISO = 26

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

function motionReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function cipher(value: string, salt: string): string {
  let hash = 2166136261
  const seed = `${salt}:${value}`
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
    out += GLYPHS[(hash >>> 0) % GLYPHS.length]
  }
  if (/^\d+$/.test(out)) {
    const symbols = '#*+'
    const index = (hash >>> 0) % out.length
    out = `${out.slice(0, index)}${symbols[(hash >>> 4) % symbols.length]}${out.slice(index + 1)}`
  }
  return out
}

function mixGlyphs(value: string, revealCount: number, now: number): string {
  let hash = Math.floor(now / 36)
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    if (i < revealCount) {
      out += value[i]
      continue
    }
    hash = Math.imul(hash ^ (i + 17), 747796405) + 2891336453
    out += GLYPHS[(hash >>> 0) % GLYPHS.length]
  }
  return out
}

function project(x: number, y: number, z: number): [number, number] {
  return [(x - y) * ISO, (x + y) * ISO * 0.5 - z * ISO]
}

function points(corners: [number, number, number][]): string {
  return corners
    .map(([x, y, z]) => {
      const [sx, sy] = project(x, y, z)
      return `${sx.toFixed(1)},${sy.toFixed(1)}`
    })
    .join(' ')
}

function SignalTower() {
  const ordered = [...TOWER].sort((a, b) => a.x + a.y + a.z * 0.01 - (b.x + b.y + b.z * 0.01))
  const tip = project(1.5, 1.5, 8)
  const mast = project(1.5, 1.5, 7.15)

  return (
    <svg className="telemetry-bg" viewBox="-176 -214 300 292" aria-hidden="true" focusable="false">
      {ordered.map((voxel) => {
        const { x, y, z } = voxel
        const s = 1
        const top = points([
          [x, y, z + s],
          [x + s, y, z + s],
          [x + s, y + s, z + s],
          [x, y + s, z + s],
        ])
        const right = points([
          [x + s, y, z + s],
          [x + s, y, z],
          [x + s, y + s, z],
          [x + s, y + s, z + s],
        ])
        const left = points([
          [x, y + s, z + s],
          [x + s, y + s, z + s],
          [x + s, y + s, z],
          [x, y + s, z],
        ])
        const key = `${x}:${y}:${z}`
        return (
          <g key={key}>
            <polygon points={left} fill="#0c100e" />
            <polygon points={right} fill="#121916" />
            <polygon
              points={top}
              fill={voxel.pulse ? '#1f9a62' : '#18241e'}
              className={voxel.pulse ? 'voxel-pulse' : undefined}
            />
          </g>
        )
      })}
      <line className="voxel-pulse" x1={tip[0]} y1={tip[1]} x2={mast[0]} y2={mast[1]} stroke="#8fd8b4" strokeWidth="1.4" />
    </svg>
  )
}

function UnitDigits({ value, armed, delay }: { value: string; armed: boolean; delay: number }) {
  const settled = useRef(motionReduced())
  const valueRef = useRef(value)
  const [text, setText] = useState(() => (motionReduced() ? value : cipher(value, String(delay))))

  useLayoutEffect(() => {
    valueRef.current = value
    if (settled.current) setText(value)
  }, [value])

  useEffect(() => {
    if (!armed) return
    if (settled.current || motionReduced()) {
      settled.current = true
      setText(valueRef.current)
      return
    }

    let frame = 0
    const started = performance.now()
    const step = (now: number) => {
      const elapsed = now - started - delay - REVEAL_HOLD_MS
      const current = valueRef.current
      if (elapsed < 0) {
        frame = requestAnimationFrame(step)
        return
      }
      const progress = elapsed / UNIT_MS
      if (progress >= 1) {
        settled.current = true
        setText(current)
        return
      }
      const revealCount = Math.floor(progress * (current.length + 1))
      setText(revealCount >= current.length ? current : mixGlyphs(current, revealCount, now))
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [armed, delay])

  return (
    <strong aria-hidden={text === value ? undefined : true}>
      {Array.from(text).map((glyph, index) => (
        <span className="digit" key={index}>
          {glyph}
        </span>
      ))}
    </strong>
  )
}

export function CountdownTelemetry() {
  const sectionRef = useRef<HTMLElement>(null)
  const signalRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLSpanElement>(null)
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const [armed, setArmed] = useState(() => motionReduced())

  useEffect(() => {
    const tick = () => setClock(remaining(Date.now()))
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (armed) return
    const cards = sectionRef.current?.querySelector('.count')
    if (!cards) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        const box = entry.boundingClientRect.height
        const visible = entry.intersectionRect.height
        const ratio = box > 0 ? visible / box : 0
        const seen = ratio >= 0.72 || visible >= 150
        if (!seen) return
        setArmed(true)
        observer.disconnect()
      },
      { threshold: [0.35, 0.55, 0.8] },
    )
    observer.observe(cards)
    return () => observer.disconnect()
  }, [armed])

  useEffect(() => {
    const signal = signalRef.current
    const drop = dropRef.current
    if (!signal || !drop) return

    let frame = 0
    const paint = () => {
      frame = 0
      const mission = document.getElementById('mission')
      const heading = mission?.querySelector('h2')
      if (!mission || !heading) return
      const signalTop = signal.getBoundingClientRect().top
      const missionTop = mission.getBoundingClientRect().top
      const headingBox = heading.getBoundingClientRect()
      const reach = Math.min(420, Math.max(0, headingBox.top + headingBox.height * 0.7 - signalTop))
      const view = window.innerHeight
      const start = view * 1.02
      const end = view * 0.36
      const span = Math.max(1, start - end)
      const progress = Math.min(1, Math.max(0, (start - missionTop) / span))
      drop.style.height = `${reach * progress}px`
    }
    const requestPaint = () => {
      if (frame) return
      frame = requestAnimationFrame(paint)
    }

    paint()
    document.addEventListener('scroll', requestPaint, { passive: true, capture: true })
    window.addEventListener('resize', requestPaint)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      document.removeEventListener('scroll', requestPaint, true)
      window.removeEventListener('resize', requestPaint)
    }
  }, [])

  return (
    <section id="countdown" className="band telemetry" ref={sectionRef} data-armed={armed ? 'true' : 'false'}>
      <SignalTower />
      <div className="band-head">
        <p className="eyebrow">Countdown</p>
        <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
      </div>
      <div className="telemetry-readout">
        <div className="count" role="timer" aria-label="Time until the online qualifier">
          {UNITS.map(([key, label], index) => (
            <div
              key={label}
              className={armed ? 'count-unit is-live' : 'count-unit'}
              style={{ '--unit-delay': `${index * STAGGER_MS}ms` } as CSSProperties}
            >
              <UnitDigits value={clock[key]} armed={armed} delay={index * STAGGER_MS} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="signal" ref={signalRef} aria-hidden="true">
          <span className="signal-beam" />
          <span className="signal-drop" ref={dropRef} />
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
