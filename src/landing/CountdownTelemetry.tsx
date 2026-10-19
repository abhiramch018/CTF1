import { useEffect, useRef, useState } from 'react'
import { QUALIFIER_AT } from './content.ts'

const UNITS = [
  ['Days', 'days'],
  ['Hours', 'hours'],
  ['Minutes', 'minutes'],
  ['Seconds', 'seconds'],
] as const

type UnitKey = (typeof UNITS)[number][1]

type Clock = Record<UnitKey, string> & { open: boolean }

const GLYPHS = '0123456789ABCDEF'
const STAGGER_MS = 70
const STEP_MS = 32
const CYCLES = 9

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

function glyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '0'
}

function encryptedFace(): Record<UnitKey, string> {
  return {
    days: glyph() + glyph(),
    hours: glyph() + glyph(),
    minutes: glyph() + glyph(),
    seconds: glyph() + glyph(),
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function SignalTower() {
  return (
    <svg className="signal-tower" viewBox="0 0 180 260" fill="none" aria-hidden="true">
      <path
        className="tower-rail"
        d="M18 214h86l22-12"
        stroke="rgba(31,154,98,0.16)"
        strokeWidth="1"
      />
      <path
        d="M24 214l18-10h70l-18 10z"
        fill="rgba(12,18,15,0.9)"
        stroke="rgba(31,154,98,0.14)"
      />
      <path d="M24 214v10l18 8v-10z" fill="rgba(8,12,10,0.95)" stroke="rgba(31,154,98,0.1)" />
      <path d="M42 222v10l70-8v-10z" fill="rgba(11,16,13,0.92)" stroke="rgba(31,154,98,0.1)" />

      <path d="M48 176l22-12h44l-22 12z" fill="rgba(14,22,18,0.88)" stroke="rgba(31,154,98,0.16)" />
      <path d="M48 176v28l22 12v-28z" fill="rgba(9,13,11,0.95)" stroke="rgba(31,154,98,0.12)" />
      <path d="M70 188v28l44-12v-28z" fill="rgba(12,20,16,0.9)" stroke="rgba(31,154,98,0.14)" />

      <path d="M62 142l18-10h32l-18 10z" fill="rgba(16,26,21,0.86)" stroke="rgba(31,154,98,0.18)" />
      <path d="M62 142v28l18 10v-28z" fill="rgba(9,14,12,0.95)" stroke="rgba(31,154,98,0.12)" />
      <path d="M80 152v28l32-10v-28z" fill="rgba(13,22,18,0.9)" stroke="rgba(31,154,98,0.15)" />

      <path d="M74 116l12-7h20l-12 7z" fill="rgba(18,30,24,0.82)" stroke="rgba(31,154,98,0.2)" />
      <path d="M74 116v20l12 7v-20z" fill="rgba(10,15,13,0.95)" stroke="rgba(31,154,98,0.12)" />
      <path d="M86 123v20l20-7v-20z" fill="rgba(14,24,19,0.9)" stroke="rgba(31,154,98,0.16)" />

      <path d="M90 58v52" stroke="rgba(31,154,98,0.2)" strokeWidth="2" />
      <path d="M94 62v48" stroke="rgba(12,18,15,0.9)" strokeWidth="3" />
      <path d="M86 108h16l-4 8h-8z" fill="rgba(13,22,18,0.95)" stroke="rgba(31,154,98,0.2)" />

      <g className="tower-beacon">
        <path d="M90 44l8 4-8 4-8-4z" fill="rgba(31,154,98,0.28)" stroke="rgba(110,196,154,0.28)" />
        <path d="M82 48l8 4v8l-8-4z" fill="rgba(12,28,20,0.85)" />
        <path d="M90 52l8-4v8l-8 4z" fill="rgba(16,36,26,0.8)" />
      </g>
    </svg>
  )
}

export function CountdownTelemetry() {
  const rootRef = useRef<HTMLElement>(null)
  const signalRef = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const [face, setFace] = useState<Record<UnitKey, string>>(() =>
    prefersReducedMotion() ? remaining(Date.now()) : encryptedFace(),
  )
  const [live, setLive] = useState<Partial<Record<UnitKey, boolean>>>(() =>
    prefersReducedMotion()
      ? { days: true, hours: true, minutes: true, seconds: true }
      : {},
  )
  const [active, setActive] = useState(() => prefersReducedMotion())
  const settled = useRef(prefersReducedMotion())

  useEffect(() => {
    const tick = () => {
      const next = remaining(Date.now())
      setClock(next)
      if (settled.current) setFace(next)
    }
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const quiet = () => {
      if (!media.matches) return
      const next = remaining(Date.now())
      settled.current = true
      setClock(next)
      setFace(next)
      setLive({ days: true, hours: true, minutes: true, seconds: true })
      setActive(true)
    }
    media.addEventListener('change', quiet)
    return () => media.removeEventListener('change', quiet)
  }, [])

  useEffect(() => {
    if (settled.current) return
    const node = rootRef.current
    if (!node) return

    const timers: number[] = []
    const reveal = () => {
      if (settled.current) return
      const target = remaining(Date.now())
      setClock(target)
      setActive(true)

      UNITS.forEach(([, key], unitIndex) => {
        const chars = target[key].split('')
        chars.forEach((final, digit) => {
          for (let cycle = 0; cycle < CYCLES; cycle += 1) {
            timers.push(
              window.setTimeout(() => {
                setFace((current) => {
                  const next = current[key].split('')
                  next[digit] = glyph()
                  return { ...current, [key]: next.join('') }
                })
              }, unitIndex * STAGGER_MS + digit * 22 + cycle * STEP_MS),
            )
          }
          timers.push(
            window.setTimeout(() => {
              setFace((current) => {
                const next = current[key].split('')
                next[digit] = final
                return { ...current, [key]: next.join('') }
              })
              if (digit === chars.length - 1) {
                setLive((current) => ({ ...current, [key]: true }))
              }
            }, unitIndex * STAGGER_MS + digit * 22 + CYCLES * STEP_MS),
          )
        })
      })

      const doneAt = (UNITS.length - 1) * STAGGER_MS + 22 + CYCLES * STEP_MS + 16
      timers.push(
        window.setTimeout(() => {
          const next = remaining(Date.now())
          settled.current = true
          setClock(next)
          setFace(next)
          setLive({ days: true, hours: true, minutes: true, seconds: true })
        }, doneAt),
      )
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        reveal()
      },
      { threshold: 0.28, rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const mission = document.getElementById('mission')
    const signal = signalRef.current
    if (!mission || !signal) return

    let frame = 0
    const update = () => {
      frame = 0
      const origin = signal.getBoundingClientRect().top
      const missionTop = mission.getBoundingClientRect().top
      const view = window.innerHeight
      const progress = Math.min(1, Math.max(0, (view * 0.92 - missionTop) / (view * 0.48)))
      const reach = Math.max(0, missionTop - origin + 56)
      const drop = progress * Math.min(reach, view * 0.38)
      signal.style.setProperty('--signal-drop', `${drop}px`)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section id="countdown" className={active ? 'band telemetry is-live' : 'band telemetry'} ref={rootRef}>
      <div className="telemetry-ambient" aria-hidden="true">
        <SignalTower />
      </div>
      <div className="band-head">
        <p className="eyebrow">Countdown</p>
        <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
      </div>
      <div className="count-wrap">
        <div className="count" role="timer" aria-label="Time until the online qualifier">
          {UNITS.map(([label, key]) => (
            <div key={key} className={live[key] ? 'count-card is-live' : 'count-card'}>
              <strong>
                <span className="count-face" aria-hidden="true">
                  {face[key]}
                </span>
                <span className="sr">{clock[key]}</span>
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="signal" ref={signalRef} aria-hidden="true">
          <div className="signal-h">
            <span className="signal-carrier" />
          </div>
          <div className="signal-v" />
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
