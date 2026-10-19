import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

const ENCRYPT_CHARS = '▓░▒█▀▄◢◣◤◥■□▪▫●○◆◇※'
const DECRYPT_DURATION_MS = 1200
const DECRYPT_INTERVAL_MS = 50

type TimeUnit = {
  value: number
  label: string
}

type CountdownCardProps = {
  unit: TimeUnit
  isActivated: boolean
  decryptProgress: number
  reducedMotion: boolean
}

function getEncryptedDigit(char: string, progress: number): string {
  if (progress >= 1) return char
  const seed = char.charCodeAt(0) + Math.floor(Date.now() / DECRYPT_INTERVAL_MS)
  const index = seed % ENCRYPT_CHARS.length
  return ENCRYPT_CHARS[index]
}

function formatNumber(num: number): string {
  return num.toString().padStart(2, '0')
}

function CountdownCard({ unit, isActivated, decryptProgress, reducedMotion }: CountdownCardProps) {
  const displayValue = formatNumber(unit.value)
  const displayChars = reducedMotion || decryptProgress >= 1
    ? displayValue.split('')
    : displayValue.split('').map((char, i) => {
        const charProgress = Math.max(0, Math.min(1, (decryptProgress * 1.5) - (i * 0.2)))
        return charProgress >= 0.8 ? char : getEncryptedDigit(char, charProgress)
      })

  return (
    <div className={`cd-card ${isActivated ? 'is-activated' : ''}`}>
      <div className="cd-card-inner">
        <span className="cd-digits" aria-hidden="true">
          {displayChars.map((char, i) => (
            <span
              key={i}
              className={`cd-digit ${decryptProgress < 1 && !reducedMotion ? 'is-decrypting' : ''}`}
            >
              {char}
            </span>
          ))}
        </span>
        <span className="sr">{unit.value}</span>
        <span className="cd-label">{unit.label}</span>
      </div>
    </div>
  )
}

function calculateTimeLeft(targetDate: Date): TimeUnit[] {
  const now = new Date()
  const diff = Math.max(0, targetDate.getTime() - now.getTime())

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return [
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
    { value: minutes, label: 'MINS' },
    { value: seconds, label: 'SECS' },
  ]
}

type CountdownTelemetryProps = {
  onSignalExtend?: (progress: number) => void
}

export function CountdownTelemetry({ onSignalExtend }: CountdownTelemetryProps) {
  const targetDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 47)
    date.setHours(14, 0, 0, 0)
    return date
  }, [])

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate))
  const [isInView, setIsInView] = useState(false)
  const [decryptProgress, setDecryptProgress] = useState(0)
  const [isActivated, setIsActivated] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [signalPosition, setSignalPosition] = useState(0)

  const sectionRef = useRef<HTMLElement>(null)
  const hasAnimated = useRef(false)
  const decryptStartTime = useRef(0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(media.matches)
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsInView(true)
          hasAnimated.current = true
          if (!reducedMotion) {
            decryptStartTime.current = performance.now()
          } else {
            setDecryptProgress(1)
            setIsActivated(true)
          }
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [reducedMotion])

  useEffect(() => {
    if (!isInView || reducedMotion || decryptProgress >= 1) return

    let animationFrame: number
    const animate = () => {
      const elapsed = performance.now() - decryptStartTime.current
      const progress = Math.min(1, elapsed / DECRYPT_DURATION_MS)
      setDecryptProgress(progress)

      if (progress >= 0.6 && !isActivated) {
        setIsActivated(true)
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [isInView, reducedMotion, isActivated, decryptProgress])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  useEffect(() => {
    if (!isActivated || reducedMotion) return

    let animationFrame: number
    const startTime = performance.now()

    const animateSignal = () => {
      const elapsed = performance.now() - startTime
      const cycleTime = 4000
      const position = (elapsed % cycleTime) / cycleTime
      setSignalPosition(position)
      animationFrame = requestAnimationFrame(animateSignal)
    }

    animationFrame = requestAnimationFrame(animateSignal)
    return () => cancelAnimationFrame(animationFrame)
  }, [isActivated, reducedMotion])

  useEffect(() => {
    if (!onSignalExtend || !sectionRef.current) return

    const handleScroll = () => {
      const section = sectionRef.current
      if (!section) return

      const rect = section.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const sectionBottom = rect.bottom
      const triggerStart = viewportHeight * 0.6
      const triggerEnd = viewportHeight * 0.2

      if (sectionBottom <= triggerStart && sectionBottom >= triggerEnd) {
        const progress = 1 - (sectionBottom - triggerEnd) / (triggerStart - triggerEnd)
        onSignalExtend(Math.min(1, Math.max(0, progress)))
      } else if (sectionBottom < triggerEnd) {
        onSignalExtend(1)
      } else {
        onSignalExtend(0)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [onSignalExtend])

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }, [])

  return (
    <section className="cd-section" ref={sectionRef} aria-labelledby="cd-heading">
      <div className="cd-bg-ambient" aria-hidden="true">
        <SignalTower isActive={isActivated && !reducedMotion} />
      </div>

      <div className="cd-content">
        <h2 id="cd-heading" className="cd-heading">
          Until the online qualifier
        </h2>

        <div className="cd-cards" role="timer" aria-live="polite" aria-atomic="true">
          {timeLeft.map((unit, index) => (
            <CountdownCard
              key={unit.label}
              unit={unit}
              isActivated={isActivated}
              decryptProgress={
                reducedMotion ? 1 : Math.max(0, decryptProgress - index * 0.08)
              }
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        <div
          className={`cd-signal-line ${isActivated ? 'is-active' : ''}`}
          aria-hidden="true"
          style={{ '--signal-pos': signalPosition } as React.CSSProperties}
        />

        <div className="cd-meta">
          <div className="cd-meta-item">
            <span className="cd-meta-label">Qualifier</span>
            <span className="cd-meta-value">{formatDate(targetDate)}</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Duration</span>
            <span className="cd-meta-value">48 Hours</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Format</span>
            <span className="cd-meta-value">Remote</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Finals</span>
            <span className="cd-meta-value">Berlin, Germany</span>
          </div>
          <div className="cd-meta-item">
            <span className="cd-meta-label">Team Size</span>
            <span className="cd-meta-value">2–4 Players</span>
          </div>
        </div>
      </div>
    </section>
  )
}

type SignalTowerProps = {
  isActive: boolean
}

function SignalTower({ isActive }: SignalTowerProps) {
  const [pulsePhase, setPulsePhase] = useState(0)

  useEffect(() => {
    if (!isActive) return

    let animationFrame: number
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const phase = (elapsed % 3000) / 3000
      setPulsePhase(phase)
      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [isActive])

  const pulseIntensity = Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5

  return (
    <div className="cd-tower" style={{ '--pulse': pulseIntensity } as React.CSSProperties}>
      <div className="cd-tower-base" />
      <div className="cd-tower-shaft" />
      <div className="cd-tower-mid" />
      <div className="cd-tower-top" />
      <div className="cd-tower-beacon" />
      <div className="cd-tower-pulse" />
      <div className="cd-tower-rays">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="cd-tower-ray" style={{ '--ray-index': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="cd-data-rails">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="cd-data-rail" style={{ '--rail-index': i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  )
}
