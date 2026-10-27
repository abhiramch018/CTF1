import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { FinalAccess } from './FinalAccess.tsx'
import { HeroVista } from './HeroVista.tsx'
import { MissionBriefing } from './MissionBriefing.tsx'
import { OperationRoute } from './OperationRoute.tsx'
import { SectorRange } from './SectorRange.tsx'
import { nav, partners, QUALIFIER_AT, registrationUrl } from './content.ts'
import { heroApproachProgress, prefersReducedMotion, sectionLocalProgress } from './scrollDrive.ts'
import { useSectionReveal } from './useSectionReveal.ts'
import './landing.css'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function remaining(now: number): { days: string; hours: string; minutes: string; seconds: string; open: boolean } {
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

function ArenaStatus({ linked }: { linked: boolean }) {
  if (registrationUrl) {
    return (
      <a className="cta" href={registrationUrl}>
        ENTER THE ARENA
      </a>
    )
  }
  if (linked) {
    return (
      <a className="cta" href="#arena">
        REGISTRATION OPENS SOON
      </a>
    )
  }
  return <p className="cta is-pending">REGISTRATION OPENS SOON</p>
}

function useBandDepth(ref: RefObject<HTMLElement | null>, active: boolean) {
  const depthRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const node = ref.current
    const depth = depthRef.current
    if (!node || !depth) return

    let raf = 0
    const paint = () => {
      const p = sectionLocalProgress(node)
      depth.style.setProperty('--band-depth', p.toFixed(3))
      depth.style.setProperty('--band-scan', active && p > 0.12 && p < 0.88 ? '1' : '0')
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(paint)
    }
    paint()
    const safety = window.setInterval(paint, 360)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(safety)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, active])

  return depthRef
}

function BandDepth({ depthRef }: { depthRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="band-depth" ref={depthRef} aria-hidden="true">
      <span className="band-depth-layer band-depth-layer--a" />
      <span className="band-depth-layer band-depth-layer--b" />
      <span className="band-depth-scan" />
    </div>
  )
}

function delayStyle(ms: number): CSSProperties {
  return { ['--reveal-delay' as string]: `${ms}ms` }
}

export function LandingPage() {
  const [clock, setClock] = useState(() => remaining(Date.now()))
  const heroRef = useRef<HTMLElement>(null)
  const heroCopyRef = useRef<HTMLDivElement>(null)
  const scrollProgress = useRef(0)
  const [countdownRef, countdownShown] = useSectionReveal<HTMLElement>()
  const [partnersRef, partnersShown] = useSectionReveal<HTMLElement>()
  const countdownDepth = useBandDepth(countdownRef, countdownShown)
  const partnersDepth = useBandDepth(partnersRef, partnersShown)

  useEffect(() => {
    const tick = () => setClock(remaining(Date.now()))
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const reduced = prefersReducedMotion()
    let raf = 0
    let pumping = false
    let lastFade = -1

    const update = () => {
      const hero = heroRef.current
      const copy = heroCopyRef.current
      if (!hero) return false
      const progress = reduced ? 0 : heroApproachProgress(hero)
      scrollProgress.current = progress
      const fade = reduced ? 0 : Math.max(0, (progress - 0.72) / 0.28)
      if (copy && Math.abs(lastFade - fade) >= 0.008) {
        lastFade = fade
        copy.style.setProperty('--hero-fade', fade.toFixed(3))
      }
      const rect = hero.getBoundingClientRect()
      const near = rect.bottom > -48 && rect.top < window.innerHeight + 48
      return near || (progress > 0.02 && progress < 0.98)
    }

    const pump = () => {
      const keep = update()
      if (keep) {
        raf = requestAnimationFrame(pump)
      } else {
        pumping = false
      }
    }

    const arm = () => {
      if (pumping) return
      pumping = true
      raf = requestAnimationFrame(pump)
    }

    arm()
    // Safety wake: catches scroll without a scroll event (trackpad coalescing / some webviews).
    const safety = window.setInterval(arm, 320)
    window.addEventListener('scroll', arm, { passive: true })
    document.addEventListener('scroll', arm, { passive: true, capture: true })
    window.addEventListener('resize', arm)
    return () => {
      pumping = false
      cancelAnimationFrame(raf)
      window.clearInterval(safety)
      window.removeEventListener('scroll', arm)
      document.removeEventListener('scroll', arm, true)
      window.removeEventListener('resize', arm)
    }
  }, [])

  return (
    <div className="site">
      <header className="mast">
        <ul className="brand-row">
          {partners.map((partner) => (
            <li key={partner.name}>
              <img src={partner.src} alt={partner.name} />
            </li>
          ))}
        </ul>
        <nav className="mast-nav" aria-label="Event">
          {nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section className="hero" ref={heroRef} aria-labelledby="hero-title">
          <div ref={heroCopyRef} className="hero-copy">
            <p className="eyebrow">Season 01</p>
            <h1 id="hero-title">DEAD NOCTIS</h1>
            <p className="hero-kicker">National-level cybersecurity capture the flag</p>
            <p className="lede">
              A two-stage jeopardy CTF for students across India. Investigate, decode, and exploit only inside the
              ranges the organisers provide, from a remote qualifier to offline finals.
            </p>
            <dl className="date-row">
              <div>
                <dt>Online Qualifier</dt>
                <dd>06 DEC 2026</dd>
              </div>
              <div>
                <dt>Offline Finals</dt>
                <dd>26–27 DEC 2026</dd>
              </div>
            </dl>
            <ArenaStatus linked />
          </div>
          <div className="hero-stage" aria-hidden="true">
            <HeroVista scrollProgress={scrollProgress} heroNode={heroRef} copyNode={heroCopyRef} />
          </div>
        </section>

        <section
          id="countdown"
          ref={countdownRef}
          className={`band reveal-section${countdownShown ? ' is-shown' : ''}`}
        >
          <BandDepth depthRef={countdownDepth} />
          <div className="band-head reveal-item" style={delayStyle(0)}>
            <p className="eyebrow">Countdown</p>
            <h2>{clock.open ? 'Qualifier window' : 'Until the online qualifier'}</h2>
          </div>
          <div className="count" role="timer" aria-label="Time until the online qualifier">
            {(
              [
                ['Days', clock.days],
                ['Hours', clock.hours],
                ['Minutes', clock.minutes],
                ['Seconds', clock.seconds],
              ] as const
            ).map(([label, value], index) => (
              <div key={label} className="reveal-item" style={delayStyle(90 + index * 90)}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <ul className="fact-row reveal-item" style={delayStyle(180)}>
            <li>06 Dec 2026, 09:00–21:00 IST</li>
            <li>12 hours, remote, jeopardy-style</li>
            <li>Finals at KLEF, Vaddeswaram</li>
            <li>Teams of up to 3</li>
          </ul>
        </section>

        <MissionBriefing />
        <SectorRange />
        <OperationRoute />

        <section
          id="partners"
          ref={partnersRef}
          className={`band reveal-section${partnersShown ? ' is-shown' : ''}`}
        >
          <BandDepth depthRef={partnersDepth} />
          <div className="band-head reveal-item" style={delayStyle(0)}>
            <p className="eyebrow">Partners</p>
            <h2>The organisers</h2>
          </div>
          <ul className="partner-grid">
            {partners.map((partner, index) => (
              <li key={partner.name} className="reveal-item" style={delayStyle(80 + index * 100)}>
                <img src={partner.src} alt="" />
                <span>{partner.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <FinalAccess />
      </main>
    </div>
  )
}
