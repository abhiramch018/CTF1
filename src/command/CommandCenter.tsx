import { useState, useEffect, useRef } from 'react'
import { CountdownTelemetry } from '../countdown/CountdownTelemetry.tsx'

export function CommandCenter() {
  const [signalExtension, setSignalExtension] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(media.matches)
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.body.style.overflow = ''
    document.body.style.overflowY = 'auto'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="cmd-center" ref={containerRef}>
      <div className="cmd-scroll-container">
        <CountdownTelemetry onSignalExtend={setSignalExtension} />

        <div
          className={`cmd-signal-bridge ${signalExtension > 0 ? 'is-extending' : ''}`}
          aria-hidden="true"
          style={{
            '--extend-progress': reducedMotion ? 0 : signalExtension,
          } as React.CSSProperties}
        >
          <div className="cmd-signal-stem" />
        </div>

        <section className="cmd-mission" aria-labelledby="mission-heading">
          <div className="cmd-mission-content">
            <h2 id="mission-heading" className="cmd-section-heading">
              <span className="cmd-section-tag">// 01</span>
              Mission
            </h2>
            <p className="cmd-mission-text">
              Dead Noctis is an elite cybersecurity competition that challenges
              the world's best security researchers, reverse engineers, and
              exploit developers. Breach the encrypted vaults. Uncover the
              hidden data streams. Prove your skills in the shadows.
            </p>
          </div>
        </section>

        <div className="cmd-spacer" aria-hidden="true" />
      </div>
    </div>
  )
}
