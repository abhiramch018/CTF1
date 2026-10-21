import { useEffect, useRef, useState } from 'react'
import { missionBrief } from './content.ts'

export function MissionBriefing() {
  const sectionRef = useRef<HTMLElement>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEntered(true)
          observer.disconnect()
        }
      },
      { threshold: 0.22, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const { brief, field } = missionBrief.blocks

  return (
    <section
      id="mission"
      ref={sectionRef}
      className={entered ? 'band mission-band is-in' : 'band mission-band'}
      aria-labelledby="mission-title"
    >
      <div className="mission-terrain" aria-hidden="true" />
      <div className="band-head">
        <p className="eyebrow">Mission</p>
        <h2 id="mission-title">{missionBrief.heading}</h2>
      </div>

      <div className="mission-grid">
        <article className="brief-block brief-block--primary">
          <div className="brief-scan" aria-hidden="true" />
          <header className="brief-head">
            <span className="sector-label">Sector // A</span>
            <h3>{brief.label}</h3>
          </header>
          <div className="brief-divider" aria-hidden="true" />
          <ol className="brief-rows">
            {brief.rows.map((row) => (
              <li key={row.marker}>
                <span className="brief-marker" aria-hidden="true">
                  {row.marker}
                </span>
                <div>
                  <p className="brief-row-title">{row.title}</p>
                  <p className="brief-row-body">{row.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="brief-block brief-block--field">
          <div className="brief-scan" aria-hidden="true" />
          <header className="brief-head">
            <span className="sector-label">Sector // B</span>
            <h3>{field.label}</h3>
          </header>
          <div className="brief-divider" aria-hidden="true" />
          <ol className="brief-rows brief-rows--compact">
            {field.rows.map((row) => (
              <li key={row.marker}>
                <span className="brief-marker" aria-hidden="true">
                  {row.marker}
                </span>
                <div className="brief-data">
                  <p className="brief-row-title">{row.title}</p>
                  <p className="brief-row-body">{row.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  )
}
