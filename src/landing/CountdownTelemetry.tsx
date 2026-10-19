import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { QUALIFIER_AT } from './content.ts'

const GLYPHS = 'ABCDEF0123456789'
const UNITS = ['Days', 'Hours', 'Minutes', 'Seconds'] as const

type Clock = {
  days: string
  hours: string
  minutes: string
  seconds: string
  open: boolean
}

type Frame = {
  chars: string[]
  locked: boolean[]
}

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

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

const STANDBY = ['BF', 'EA', 'DC', 'CE']

function encrypted(length: number, salt: number): Frame {
  const seed = STANDBY[Math.min(STANDBY.length - 1, Math.round(salt / 110))] ?? 'BF'
  return {
    chars: Array.from({ length }, (_, index) => seed[index] ?? 'A'),
    locked: Array.from({ length }, () => false),
  }
}

function resolved(value: string): Frame {
  return {
    chars: Array.from(value),
    locked: Array.from(value, () => true),
  }
}

function useDecrypt(value: string, play: boolean, reduced: boolean, delay: number): Frame {
  const valueRef = useRef(value)
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (reduced || !play) return

    const started = performance.now()
    let raf = 0
    let cancelled = false

    const step = (now: number) => {
      if (cancelled) return
      const elapsed = now - started
      const target = valueRef.current
      const chars: string[] = []
      const locked: boolean[] = []
      let done = true

      for (let index = 0; index < target.length; index += 1) {
        const lockAt = delay + 380 + index * 170
        if (elapsed >= lockAt) {
          chars.push(target[index] ?? '0')
          locked.push(true)
        } else {
          done = false
          const tick = Math.floor(elapsed / 55)
          chars.push(GLYPHS[(tick + index * 4 + delay) % GLYPHS.length] ?? 'A')
          locked.push(false)
        }
      }

      if (done) {
        setPhase('done')
        setFrame(null)
        return
      }
      setPhase('run')
      setFrame({ chars, locked })
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [delay, play, reduced])

  if (reduced || phase === 'done') return resolved(value)
  if (phase === 'run' && frame) return frame
  return encrypted(value.length, delay)
}

function timerLabel(clock: Clock): string {
  if (clock.open) return 'The online qualifier window is open'
  return `${Number(clock.days)} days, ${Number(clock.hours)} hours, ${Number(clock.minutes)} minutes, ${Number(clock.seconds)} seconds until the online qualifier`
}

function UnitCard({
  label,
  value,
  play,
  reduced,
  index,
}: {
  label: string
  value: string
  play: boolean
  reduced: boolean
  index: number
}) {
  const frame = useDecrypt(value, play, reduced, index * 110)

  return (
    <div className="count-card" style={{ '--i': index } as CSSProperties}>
      <strong aria-hidden="true">
        {frame.chars.map((char, charIndex) => (
          <span key={charIndex} className={frame.locked[charIndex] ? 'digit is-set' : 'digit'}>
            {char}
          </span>
        ))}
      </strong>
      <span>{label}</span>
    </div>
  )
}

const TILE_W = 20
const TILE_H = 10
const TILE_LIFT = 18
const ORIGIN_X = 108
const ORIGIN_Y = 248

function project(x: number, y: number, z: number): string {
  const sx = ORIGIN_X + (x - z) * TILE_W
  const sy = ORIGIN_Y + (x + z) * TILE_H - y * TILE_LIFT
  return `${sx},${sy}`
}

type Block = { x: number; y: number; z: number; tip?: boolean }

function towerBlocks(): Block[] {
  const blocks: Block[] = []
  for (let x = -2; x <= 3; x += 1) blocks.push({ x, y: 0, z: 0 })
  for (let x = -1; x <= 2; x += 1) blocks.push({ x, y: 0, z: 1 })
  for (let x = -1; x <= 2; x += 1) blocks.push({ x, y: 1, z: 0 })
  blocks.push({ x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })
  blocks.push({ x: 0, y: 2, z: 0 }, { x: 1, y: 2, z: 0 })
  for (let y = 3; y <= 7; y += 1) blocks.push({ x: 0, y, z: 0 })
  blocks.push({ x: -1, y: 6, z: 0 }, { x: 1, y: 6, z: 0 })
  blocks.push({ x: 0, y: 8, z: 0, tip: true }, { x: 0, y: 9, z: 0, tip: true })
  return blocks
}

function SignalTower() {
  const blocks = towerBlocks().sort((a, b) => a.y - b.y || a.x + a.z - (b.x + b.z))

  return (
      <svg className="signal-tower" viewBox="36 36 168 268" focusable="false">
      {blocks.map((block) => {
        const { x, y, z, tip } = block
        const top = [
          project(x, y + 1, z),
          project(x + 1, y + 1, z),
          project(x + 1, y + 1, z + 1),
          project(x, y + 1, z + 1),
        ].join(' ')
        const south = [
          project(x, y, z + 1),
          project(x + 1, y, z + 1),
          project(x + 1, y + 1, z + 1),
          project(x, y + 1, z + 1),
        ].join(' ')
        const east = [
          project(x + 1, y, z),
          project(x + 1, y, z + 1),
          project(x + 1, y + 1, z + 1),
          project(x + 1, y + 1, z),
        ].join(' ')
        const key = `${x}:${y}:${z}`
        return (
          <g key={key}>
            <polygon className={tip ? 'south is-tip' : 'south'} points={south} />
            <polygon className={tip ? 'east is-tip' : 'east'} points={east} />
            <polygon className={tip ? 'top is-tip' : 'top'} points={top} />
          </g>
        )
      })}
    </svg>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function CountdownTelemetry() {
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const countRef = useRef<HTMLDivElement>(null)
  const signalRef = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const [seen, setSeen] = useState(false)
  const hot = reduced || seen

  useEffect(() => {
    const tick = () => setClock(remaining(Date.now()))
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (hot) return
    const node = countRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setSeen(true)
        observer.disconnect()
      },
      { threshold: 0.62, rootMargin: '0px 0px -20% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hot])

  useEffect(() => {
    if (reduced) return
    const signal = signalRef.current
    if (!signal) return

    let frame = 0
    const update = () => {
      frame = 0
      const mission = document.getElementById('mission')
      const heading = mission?.querySelector('h2')
      if (!mission || !heading) return
      const signalRect = signal.getBoundingClientRect()
      const missionTop = mission.getBoundingClientRect().top
      const targetTop = heading.getBoundingClientRect().top - 36
      const span = Math.max(0, targetTop - signalRect.top)
      const viewH = window.innerHeight
      const progress = clamp((viewH * 0.9 - missionTop) / (viewH * 0.48), 0, 1)
      const eased = progress * progress * (3 - 2 * progress)
      signal.style.setProperty('--drop-px', `${Math.round(span * eased)}px`)
      signal.style.setProperty('--drop-fade', eased.toFixed(3))
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.body.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.body.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduced])

  const values = [clock.days, clock.hours, clock.minutes, clock.seconds]

  return (
    <section
      id="countdown"
      ref={sectionRef}
      className={hot ? 'band telemetry is-hot' : 'band telemetry'}
      aria-labelledby="countdown-title"
      data-telemetry={hot ? 'live' : 'idle'}
    >
      <div className="telemetry-field" aria-hidden="true">
        <SignalTower />
      </div>
      <div className="telemetry-copy">
        <div className="band-head">
          <p className="eyebrow">Countdown</p>
          <h2 id="countdown-title">Until the online qualifier</h2>
        </div>
        <div className="count" ref={countRef} role="timer" aria-label={timerLabel(clock)}>
          {UNITS.map((label, index) => (
            <UnitCard
              key={label}
              label={label}
              value={values[index] ?? '00'}
              play={hot}
              reduced={reduced}
              index={index}
            />
          ))}
        </div>
        <div className="signal" ref={signalRef} aria-hidden="true">
          <div className="signal-track">
            <span className="signal-scan" />
          </div>
          <span className="signal-drop" />
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
