import { useEffect, useState } from 'react'
import { FinalAccess } from './FinalAccess.tsx'
import { HeroVista } from './HeroVista.tsx'
import { MissionBriefing } from './MissionBriefing.tsx'
import { OperationRoute } from './OperationRoute.tsx'
import { SectorRange } from './SectorRange.tsx'
import { nav, partners, QUALIFIER_AT, registrationUrl } from './content.ts'
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

export function LandingPage() {
  const [clock, setClock] = useState(() => remaining(Date.now()))

  useEffect(() => {
    const tick = () => setClock(remaining(Date.now()))
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
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
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
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
            <HeroVista />
          </div>
        </section>

        <section id="countdown" className="band">
          <div className="band-head">
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
            ).map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <ul className="fact-row">
            <li>06 Dec 2026, 09:00–21:00 IST</li>
            <li>12 hours, remote, jeopardy-style</li>
            <li>Finals at KLEF, Vaddeswaram</li>
            <li>Teams of up to 3</li>
          </ul>
        </section>

        <MissionBriefing />
        <SectorRange />
        <OperationRoute />

        <section id="partners" className="band">
          <div className="band-head">
            <p className="eyebrow">Partners</p>
            <h2>The organisers</h2>
          </div>
          <ul className="partner-grid">
            {partners.map((partner) => (
              <li key={partner.name}>
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
