import { useEffect, useState } from 'react'
import { HeroVista } from './HeroVista.tsx'
import { nav, partners, QUALIFIER_AT, registrationUrl, sectors } from './content.ts'
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
  const [sector, setSector] = useState<(typeof sectors)[number]>(sectors[0])

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

        <section id="mission" className="band">
          <div className="band-head">
            <p className="eyebrow">Mission</p>
            <h2>What is DEAD NOCTIS</h2>
          </div>
          <div className="split">
            <p>
              Season 01 is a national capture-the-flag run with KL University, Google Developer Groups, and White Hat
              Hackers. Every flag is scored in jeopardy style. The online qualifier names the finalists. The offline
              finals are held on campus.
            </p>
            <ul>
              <li>Open across India, ages 16–28.</li>
              <li>Any branch, any year. Cross-college teams are welcome.</li>
              <li>Solo or duo may play the qualifier. Finals teams are up to three.</li>
              <li>Finalists present a valid college ID at check-in.</li>
            </ul>
          </div>
        </section>

        <section id="sectors" className="band">
          <div className="band-head">
            <p className="eyebrow">Sectors</p>
            <h2>Ten disciplines, one range</h2>
          </div>
          <div className="sector-board">
            <div className="sector-list" role="group" aria-label="Challenge sectors">
              {sectors.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={sector.id === item.id}
                  className={sector.id === item.id ? 'is-on' : undefined}
                  onClick={() => setSector(item)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <article className="sector-detail" aria-live="polite">
              <p className="eyebrow">{String(sectors.findIndex((item) => item.id === sector.id) + 1).padStart(2, '0')}</p>
              <h3>{sector.name}</h3>
              <p>{sector.summary}</p>
            </article>
          </div>
        </section>

        <section id="format" className="band">
          <div className="band-head">
            <p className="eyebrow">Protocol</p>
            <h2>Format, rules, rewards, dates</h2>
          </div>
          <div className="protocol">
            <article>
              <h3>Online qualifier</h3>
              <p>06 Dec 2026, 09:00–21:00 IST. Twelve hours, remote. Submit flags and a writeup so the run can be verified.</p>
            </article>
            <article>
              <h3>Offline finals</h3>
              <p>26–27 Dec 2026, 10:00 on the 26th through 16:00 on the 27th. KLEF campus, Vaddeswaram. Up to 40 teams.</p>
            </article>
            <article>
              <h3>Advancement</h3>
              <p>Up to 35 teams from the leaderboard and up to 5 wildcards. Finalists are named on 08 Dec 2026.</p>
            </article>
            <article>
              <h3>Rewards</h3>
              <p>₹1,00,000 for the top three: ₹50,000, ₹30,000, and ₹20,000, plus certificates and event marks. Ranks 4–10 and all finalists receive certificates. Online players receive e-certificates.</p>
            </article>
          </div>
          <ul className="rules">
            <li>Attack only the systems the organisers provide.</li>
            <li>Flag format is DNCTF{'{...}'}. Scoring is dynamic.</li>
            <li>Hints may cost points. The full rulebook comes from the organisers.</li>
            <li>Registration is ₹200 per player. The public link is not published yet.</li>
          </ul>
          <dl className="dates">
            <div>
              <dt>Qualifier</dt>
              <dd>06 Dec 2026</dd>
            </div>
            <div>
              <dt>Finalists named</dt>
              <dd>08 Dec 2026</dd>
            </div>
            <div>
              <dt>Finals</dt>
              <dd>26–27 Dec 2026</dd>
            </div>
          </dl>
        </section>

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

        <section id="arena" className="band arena">
          <p className="eyebrow">Final access</p>
          <h2>ENTER THE ARENA</h2>
          <p>The public registration link has not been published yet.</p>
          <ArenaStatus linked={false} />
        </section>
      </main>
    </div>
  )
}
