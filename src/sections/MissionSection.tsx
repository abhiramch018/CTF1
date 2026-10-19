import { useEffect, useRef, useState } from 'react'

export function MissionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`mission-section ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="mission-heading"
    >
      <div className="mission-signal-receiver" aria-hidden="true" />

      <div className="mission-content">
        <h2 id="mission-heading" className="mission-heading">
          Mission
        </h2>
        <p className="mission-text">
          DEAD NOCTIS is an elite capture-the-flag competition designed to test the limits of 
          offensive security skills. Teams will face challenges spanning cryptography, 
          reverse engineering, web exploitation, binary exploitation, and forensics.
        </p>
        <p className="mission-text">
          The top qualifying teams advance to the finals in Berlin for the ultimate showdown.
        </p>
      </div>
    </section>
  )
}
