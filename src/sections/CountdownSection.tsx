import { useCallback, useEffect, useRef, useState } from 'react'
import { reducedMotion } from '../cinematic/runtime.ts'

const QUALIFIER_DATE = new Date('2027-01-15T00:00:00Z')
const FINALS_LOCATION = 'Berlin, Germany'
const TEAM_SIZE = '2–4'
const DURATION = '48 hours'
const FORMAT = 'Remote'

const ENCRYPTED_CHARS = '0123456789ABCDEF#$%&@!?*'
const DECRYPT_DURATION = 1200
const DECRYPT_STEPS = 12

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(): TimeLeft {
  const diff = Math.max(0, QUALIFIER_DATE.getTime() - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function padTwo(n: number): string {
  return n.toString().padStart(2, '0')
}

type CardProps = {
  value: string
  label: string
  activated: boolean
  decrypting: boolean
  decryptStep: number
  isSeconds: boolean
}

function deriveDisplayValue(realValue: string, decrypting: boolean, step: number): string {
  if (!decrypting || step >= DECRYPT_STEPS) return realValue
  const progress = step / DECRYPT_STEPS
  const chars = realValue.split('')
  return chars
    .map((char, i) => {
      const charProgress = (progress * chars.length - i) / 1
      if (charProgress >= 1) return char
      const charIndex = (step * 7 + i * 13) % ENCRYPTED_CHARS.length
      return ENCRYPTED_CHARS[charIndex]
    })
    .join('')
}

function CountdownCard({ value, label, activated, decrypting, decryptStep, isSeconds }: CardProps) {
  const displayValue = deriveDisplayValue(value, decrypting, decryptStep)

  return (
    <div
      className={`countdown-card ${activated ? 'is-activated' : ''} ${isSeconds ? 'is-seconds' : ''}`}
      role="timer"
      aria-label={`${value} ${label}`}
    >
      <span className="countdown-value" aria-hidden="true">
        {displayValue}
      </span>
      <span className="countdown-label">{label}</span>
    </div>
  )
}

export function CountdownSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const hasAnimated = useRef(false)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft)
  const [isVisible, setIsVisible] = useState(false)
  const [activated, setActivated] = useState(false)
  const [decrypting, setDecrypting] = useState(false)
  const [decryptStep, setDecryptStep] = useState(0)
  const [signalActive, setSignalActive] = useState(false)
  const prefersReducedMotion = useRef(reducedMotion())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const runDecryptAnimation = useCallback(() => {
    if (prefersReducedMotion.current) {
      setActivated(true)
      setSignalActive(true)
      return
    }
    setDecrypting(true)
    let step = 0
    const stepInterval = setInterval(() => {
      step++
      setDecryptStep(step)
      if (step >= DECRYPT_STEPS) {
        clearInterval(stepInterval)
        setDecrypting(false)
        setActivated(true)
        setTimeout(() => setSignalActive(true), 200)
      }
    }, DECRYPT_DURATION / DECRYPT_STEPS)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          setIsVisible(true)
          runDecryptAnimation()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [runDecryptAnimation])

  useEffect(() => {
    if (prefersReducedMotion.current) {
      setActivated(true)
      setSignalActive(true)
    }
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <section
      ref={sectionRef}
      className={`countdown-section ${isVisible ? 'is-visible' : ''}`}
      aria-labelledby="countdown-heading"
    >
      <div className="countdown-ambient" aria-hidden="true">
        <SignalTower pulseActive={signalActive} />
      </div>

      <div className="countdown-content">
        <p className="countdown-kicker">TRANSMISSION ACTIVE</p>
        <h2 id="countdown-heading" className="countdown-heading">
          Until the online qualifier
        </h2>

        <div className="countdown-grid" role="group" aria-label="Countdown timer">
          <CountdownCard
            value={padTwo(timeLeft.days)}
            label="DAYS"
            activated={activated}
            decrypting={decrypting}
            decryptStep={decryptStep}
            isSeconds={false}
          />
          <CountdownCard
            value={padTwo(timeLeft.hours)}
            label="HOURS"
            activated={activated}
            decrypting={decrypting}
            decryptStep={decryptStep}
            isSeconds={false}
          />
          <CountdownCard
            value={padTwo(timeLeft.minutes)}
            label="MINUTES"
            activated={activated}
            decrypting={decrypting}
            decryptStep={decryptStep}
            isSeconds={false}
          />
          <CountdownCard
            value={padTwo(timeLeft.seconds)}
            label="SECONDS"
            activated={activated}
            decrypting={decrypting}
            decryptStep={decryptStep}
            isSeconds={true}
          />
        </div>

        <div className={`signal-line ${signalActive ? 'is-active' : ''}`} aria-hidden="true">
          <div className="signal-pulse" />
        </div>

        <div className="countdown-details">
          <div className="detail-item">
            <span className="detail-label">Date</span>
            <span className="detail-value">{formatDate(QUALIFIER_DATE)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{DURATION}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Format</span>
            <span className="detail-value">{FORMAT}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Finals</span>
            <span className="detail-value">{FINALS_LOCATION}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Team Size</span>
            <span className="detail-value">{TEAM_SIZE}</span>
          </div>
        </div>
      </div>

      <div className={`signal-extension ${signalActive ? 'is-active' : ''}`} aria-hidden="true" />
    </section>
  )
}

function SignalTower({ pulseActive }: { pulseActive: boolean }) {
  return (
    <div className={`signal-tower ${pulseActive ? 'is-pulsing' : ''}`}>
      <div className="tower-base" />
      <div className="tower-shaft" />
      <div className="tower-mid" />
      <div className="tower-top" />
      <div className="tower-antenna" />
      <div className="tower-glow" />
      <div className="data-rail data-rail-1" />
      <div className="data-rail data-rail-2" />
      <div className="data-rail data-rail-3" />
    </div>
  )
}
