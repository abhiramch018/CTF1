import { useEffect, useRef, useState } from 'react'
import { EVENT } from './event.ts'
import './countdown.css'

const TARGET = new Date(EVENT.targetIso).getTime()
const GLYPHS = 'ABCDEF0123456789#/%<+*'
const UNITS = ['days', 'hours', 'minutes', 'seconds'] as const
type Unit = (typeof UNITS)[number]
type Parts = Record<Unit, number>

function partsFrom(now: number): Parts {
  const diff = Math.max(0, TARGET - now)
  const totalSeconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function format(parts: Parts): Record<Unit, string> {
  return {
    days: String(parts.days).padStart(2, '0'),
    hours: String(parts.hours).padStart(2, '0'),
    minutes: String(parts.minutes).padStart(2, '0'),
    seconds: String(parts.seconds).padStart(2, '0'),
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

/** Fires once, the first time the section meaningfully enters the viewport. */
function useActivatedOnce(ref: React.RefObject<HTMLElement | null>) {
  const [activated, setActivated] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  useEffect(() => {
    const node = ref.current
    if (!node || activated) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActivated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, activated])
  return activated
}

type DecryptState = {
  text: Record<Unit, string> | null
  armed: boolean[]
  done: boolean
}

/**
 * One-shot decrypt reveal. Each unit resolves left-to-right over well under
 * a second, staggered slightly per card. After it finishes the component
 * renders the plain live tick — this effect never runs again.
 */
function useDecrypt(
  activated: boolean,
  reduced: boolean,
  live: Record<Unit, string>,
): DecryptState {
  const [state, setState] = useState<DecryptState>({
    text: null,
    armed: [false, false, false, false],
    done: false,
  })
  const liveRef = useRef(live)
  const startedRef = useRef(false)

  useEffect(() => {
    liveRef.current = live
  }, [live])

  useEffect(() => {
    if (!activated || reduced || startedRef.current) return
    startedRef.current = true
    const start = performance.now()
    const delay = (i: number) => i * 130
    const duration = (i: number) => 560 + i * 150

    const id = window.setInterval(() => {
      const elapsed = performance.now() - start
      const current = liveRef.current
      const text = {} as Record<Unit, string>
      const armed: boolean[] = []
      let allDone = true
      UNITS.forEach((unit, i) => {
        const real = current[unit]
        const local = elapsed - delay(i)
        armed.push(local >= 0)
        if (local < 0) {
          allDone = false
          text[unit] = real.replace(/./g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0])
          return
        }
        const progress = Math.min(1, local / duration(i))
        if (progress < 1) allDone = false
        const resolved = Math.floor(progress * real.length)
        text[unit] =
          real.slice(0, resolved) +
          real
            .slice(resolved)
            .replace(/./g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0])
      })
      setState({ text, armed, done: allDone })
      if (allDone) window.clearInterval(id)
    }, 40)
    return () => window.clearInterval(id)
  }, [activated, reduced])

  if (activated && reduced) {
    return { text: null, armed: [true, true, true, true], done: true }
  }
  return state
}

/** Dark voxel signal tower — 2.5D, far background, one faint beacon. */
function SignalTower() {
  // Isometric cube faces for a small stacked voxel column.
  const cube = (x: number, y: number, s: number, key: string, dim = false) => (
    <g key={key} className={dim ? 'vox is-dim' : 'vox'}>
      <polygon points={`${x},${y} ${x + s},${y + s * 0.5} ${x},${y + s} ${x - s},${y + s * 0.5}`} className="vox-top" />
      <polygon points={`${x - s},${y + s * 0.5} ${x},${y + s} ${x},${y + s * 2} ${x - s},${y + s * 1.5}`} className="vox-left" />
      <polygon points={`${x + s},${y + s * 0.5} ${x},${y + s} ${x},${y + s * 2} ${x + s},${y + s * 1.5}`} className="vox-right" />
    </g>
  )
  return (
    <svg className="tower" viewBox="0 0 360 460" aria-hidden="true" focusable="false">
      {/* encrypted data rail receding behind the tower */}
      <line x1="18" y1="392" x2="330" y2="300" className="rail" />
      <line x1="18" y1="404" x2="330" y2="312" className="rail is-faint" />
      {[52, 108, 164, 220, 276].map((x, i) => (
        <rect key={x} x={x} y={382 - i * 14} width="14" height="3" className="rail-tick" />
      ))}
      {/* stacked voxel column, widest at the base */}
      {cube(180, 268, 62, 'base')}
      {cube(180, 236, 52, 'b1', true)}
      {cube(180, 196, 52, 'b2')}
      {cube(180, 164, 40, 'c1', true)}
      {cube(180, 128, 40, 'c2')}
      {cube(180, 100, 28, 'd1')}
      {cube(180, 72, 28, 'd2', true)}
      {cube(180, 50, 16, 'e1')}
      {/* antenna + beacon */}
      <line x1="180" y1="52" x2="180" y2="18" className="antenna" />
      <circle cx="180" cy="14" r="4" className="beacon" />
      <circle cx="180" cy="14" r="10" className="beacon-halo" />
    </svg>
  )
}

export function CountdownTelemetry() {
  const sectionRef = useRef<HTMLElement>(null)
  const tailRef = useRef<HTMLDivElement>(null)
  const [reduced] = useState(prefersReducedMotion)
  const now = useNow()
  const parts = partsFrom(now)
  const live = format(parts)
  const activated = useActivatedOnce(sectionRef)
  const decrypt = useDecrypt(activated, reduced, live)
  const finished = now >= TARGET

  const spoken = finished
    ? 'The online qualifier window is open.'
    : `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes and ${parts.seconds} seconds until the online qualifier.`

  // Signal tail: extends downward and fades as the Mission section approaches.
  // Writes straight to the DOM node inside rAF — no re-render per scroll frame.
  useEffect(() => {
    const tail = tailRef.current
    const section = sectionRef.current
    if (!tail || !section) return
    if (reduced) {
      tail.style.height = '72px'
      tail.style.opacity = '0.55'
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const progress = Math.min(
        1,
        Math.max(0, -rect.top / Math.max(1, rect.height * 0.55)),
      )
      tail.style.height = `${28 + progress * 132}px`
      tail.style.opacity = String(0.9 - progress * 0.3)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduced])

  return (
    <>
      <section className="telemetry" ref={sectionRef} aria-labelledby="countdown-heading">
        <div className="telemetry-bg" aria-hidden="true">
          <SignalTower />
        </div>

        <div className="telemetry-inner">
          <p className="telemetry-kicker">Dead Noctis · Telemetry 01</p>
          <h1 className="telemetry-heading" id="countdown-heading">
            Until the online qualifier
          </h1>
          <p className="telemetry-sub">
            The qualifier window opens 20 February 2027 at 09:00 UTC and runs for
            24 hours, fully remote.
          </p>

          <div className="telemetry-status" aria-hidden="true">
            <span className={decrypt.done ? 'status-dot is-live' : 'status-dot'} />
            <span>{finished ? 'Qualifier window open' : decrypt.done ? 'Live telemetry' : 'Establishing signal'}</span>
            <span className="status-rule" />
            <span>UTC sync</span>
          </div>

          <div
            className={decrypt.done ? 'cards is-live' : 'cards'}
            role="timer"
            aria-label={spoken}
          >
            {UNITS.map((unit, i) => {
              const decrypting = activated && !decrypt.done
              const value = decrypting && decrypt.text ? decrypt.text[unit] : live[unit]
              return (
                <div
                  key={unit}
                  className={[
                    'card',
                    decrypt.armed[i] ? 'is-armed' : '',
                    decrypt.done ? 'is-settled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ '--d': `${i * 130}ms` } as React.CSSProperties}
                >
                  <span className="card-value" aria-hidden="true">
                    {value}
                  </span>
                  <span className="card-label">{unit}</span>
                </div>
              )
            })}
          </div>
          <p className="sr" aria-live="off">
            {spoken}
          </p>

          <dl className="telemetry-details">
            {EVENT.details.map((item) => (
              <div className="detail" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="signal" aria-hidden="true">
            <div className="signal-track">
              <span className="signal-pulse" />
            </div>
            <div className="signal-tail" ref={tailRef} />
          </div>
        </div>
      </section>

      <section className="mission" id="mission" aria-labelledby="mission-heading">
        <div className="mission-inner">
          <p className="telemetry-kicker">01 · Mission</p>
          <h2 className="mission-heading" id="mission-heading">
            Mission
          </h2>
          <p className="mission-copy">
            One remote qualifier, contested from wherever you operate. Hold your
            signal, solve under pressure, and earn a place at the on-site finals.
          </p>
        </div>
      </section>
    </>
  )
}
