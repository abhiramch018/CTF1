import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { QUALIFIER_AT } from './content.ts'
import { SignalTower } from './SignalTower.tsx'
import './telemetry.css'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
const CIPHER = '0123456789ABCDEF#$%&*+<>/'
const DECRYPT_MS = 720
const STAGGER_MS = 110
const FRAME_MS = 48
const ARM_RATIO = 0.35

type Clock = { days: string; hours: string; minutes: string; seconds: string; open: boolean }
type Cipher = { text: string; locked: number }

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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => window.matchMedia(REDUCE_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(REDUCE_QUERY)
    const onChange = () => setReduce(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reduce
}

function scramble(target: string, elapsed: number): Cipher {
  let locked = 0
  for (let index = 0; index < target.length; index++) {
    if (elapsed >= DECRYPT_MS * (0.5 + (0.5 * (index + 1)) / target.length)) locked = index + 1
  }
  let text = target.slice(0, locked)
  for (let index = locked; index < target.length; index++) {
    text += CIPHER[Math.floor(Math.random() * CIPHER.length)]
  }
  return { text, locked }
}

type UnitProps = {
  label: string
  value: string
  armed: boolean
  reduce: boolean
  delay: number
}

function Unit({ label, value, armed, reduce, delay }: UnitProps) {
  const valueRef = useRef(value)
  const [cipher, setCipher] = useState<Cipher | null>(null)
  const [resolved, setResolved] = useState(false)

  useLayoutEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (!armed || reduce || resolved) return
    const begin = performance.now() + delay
    let last = 0
    let frame = requestAnimationFrame(function step(now) {
      const elapsed = now - begin
      if (elapsed >= DECRYPT_MS) {
        setCipher(null)
        setResolved(true)
        return
      }
      if (elapsed >= 0 && now - last >= FRAME_MS) {
        last = now
        setCipher(scramble(valueRef.current, elapsed))
      }
      frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [armed, reduce, resolved, delay])

  const live = reduce || resolved
  const glyphs = live ? value : (cipher?.text ?? value.replace(/./g, '-'))
  const locked = live ? value.length : (cipher?.locked ?? 0)

  return (
    <div className="tel-unit" style={{ '--delay': `${delay}ms` } as CSSProperties}>
      <strong aria-hidden="true">
        {Array.from(glyphs, (glyph, index) => (
          <span key={index} className={index < locked ? undefined : 'is-cipher'}>
            {glyph}
          </span>
        ))}
      </strong>
      <span className="sr">{value}</span>
      <span className="tel-label">{label}</span>
    </div>
  )
}

export function CountdownTelemetry({ live }: { live: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const signalRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const [seen, setSeen] = useState(false)
  const [visible, setVisible] = useState(false)
  const armed = seen && live

  useEffect(() => {
    const timer = window.setInterval(() => setClock(remaining(Date.now())), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (entry.intersectionRatio >= ARM_RATIO || entry.intersectionRect.height >= window.innerHeight * ARM_RATIO) {
          setSeen(true)
        }
      },
      { threshold: [0, 0.15, ARM_RATIO, 0.6] },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const signal = signalRef.current
    if (!section || !signal) return
    const next = section.nextElementSibling instanceof HTMLElement ? section.nextElementSibling : null
    let frame = 0
    let near = false

    const measure = () => {
      const top = signal.getBoundingClientRect().top
      const bottom = section.getBoundingClientRect().bottom
      const lead = next ? parseFloat(getComputedStyle(next).paddingTop) || 0 : 0
      section.style.setProperty('--drop-len', `${Math.round(bottom - top + lead)}px`)
    }
    const paint = () => {
      frame = 0
      const view = window.innerHeight
      const rect = section.getBoundingClientRect()
      const anchor = next ? next.getBoundingClientRect().top : rect.bottom
      section.style.setProperty('--drift', clamp01((view - rect.top) / (view + rect.height)).toFixed(3))
      section.style.setProperty('--drop', clamp01((view * 0.8 - anchor) / (view * 0.45)).toFixed(3))
    }
    const schedule = () => {
      if (near && !frame) frame = requestAnimationFrame(paint)
    }

    const nearby = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting
        if (!frame) frame = requestAnimationFrame(paint)
      },
      { rootMargin: '0px 0px 60% 0px' },
    )
    const sizes = new ResizeObserver(() => {
      measure()
      if (!frame) frame = requestAnimationFrame(paint)
    })
    nearby.observe(section)
    sizes.observe(section)
    if (next) sizes.observe(next)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      nearby.disconnect()
      sizes.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
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
      ref={sectionRef}
      className="band telemetry"
      data-phase={reduce ? 'still' : armed ? 'armed' : 'idle'}
      data-visible={visible ? 'on' : 'off'}
    >
      <div className="tel-ambient" aria-hidden="true">
        <SignalTower />
      </div>
      <div className="band-head">
        <p className="eyebrow">Countdown</p>
        <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
      </div>
      <div className="tel-count" role="timer" aria-label="Time until the online qualifier">
        {units.map(([label, value], index) => (
          <Unit key={label} label={label} value={value} armed={armed} reduce={reduce} delay={index * STAGGER_MS} />
        ))}
      </div>
      <div className="tel-signal" ref={signalRef} aria-hidden="true">
        <span className="tel-signal-track">
          <span className="tel-signal-pulse" />
        </span>
        <span className="tel-signal-node" />
        <span className="tel-signal-drop" />
      </div>
      <ul className="fact-row tel-facts">
        <li>06 Dec 2026, 09:00–21:00 IST</li>
        <li>12 hours, remote, jeopardy-style</li>
        <li>Finals at KLEF, Vaddeswaram</li>
        <li>Teams of up to 3</li>
      </ul>
    </section>
  )
}
