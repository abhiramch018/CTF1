import { useEffect, useRef } from 'react'
import { missionBrief } from './content.ts'
import { prefersReducedMotion, sectionLocalProgress } from './scrollDrive.ts'
import { useSectionReveal } from './useSectionReveal.ts'

export function MissionBriefing() {
  const [sectionRef, entered] = useSectionReveal<HTMLElement>(0.2)
  const terrainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const node = sectionRef.current
    const terrain = terrainRef.current
    if (!node || !terrain) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const p = sectionLocalProgress(node)
        terrain.style.setProperty('--band-depth', p.toFixed(3))
        terrain.style.setProperty('--band-scan', entered && p > 0.12 && p < 0.88 ? '1' : '0')
      })
    }
    onScroll()
    const safety = window.setInterval(onScroll, 360)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(safety)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [entered, sectionRef])

  const { brief, field } = missionBrief.blocks

  return (
    <section
      id="mission"
      ref={sectionRef}
      className={entered ? 'band mission-band reveal-section is-in is-shown' : 'band mission-band reveal-section'}
      aria-labelledby="mission-title"
    >
      <div className="mission-terrain band-depth" ref={terrainRef} aria-hidden="true">
        <span className="band-depth-layer band-depth-layer--a" />
        <span className="band-depth-layer band-depth-layer--b" />
        <span className="band-depth-scan" />
      </div>
      <div className="band-head reveal-item" style={{ ['--reveal-delay' as string]: '0ms' }}>
        <p className="eyebrow">Mission</p>
        <h2 id="mission-title">{missionBrief.heading}</h2>
      </div>

      <div className="mission-grid">
        <article
          className="brief-block brief-block--primary"
          style={{ ['--reveal-delay' as string]: '90ms' }}
        >
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

        <article
          className="brief-block brief-block--field"
          style={{ ['--reveal-delay' as string]: '200ms' }}
        >
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
