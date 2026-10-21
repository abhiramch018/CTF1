import { useEffect, useId, useRef, useState } from 'react'
import { readSfxEnabled, writeSfxEnabled } from './gateThunder.ts'

const LOG_LINES = [
  'GATE_SIG_MISMATCH // RETRYING',
  'BREACH_ROUTE // SEALED',
  'PACKET_LOSS: 02%',
  'ORIGIN_NODE // UNKNOWN',
] as const

type GateAtmosphereProps = {
  locked: boolean
  signal: boolean
}

export function GateAtmosphere({ locked, signal }: GateAtmosphereProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [lineIndex, setLineIndex] = useState(0)
  const [lineOn, setLineOn] = useState(true)
  const [sfxOn, setSfxOn] = useState(() => readSfxEnabled())
  const sfxId = useId()
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced) return
    const onPointer = (event: PointerEvent) => {
      const frame = frameRef.current
      if (!frame) return
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      const max = 5
      frame.style.setProperty('--gate-px', `${(-nx * max).toFixed(2)}px`)
      frame.style.setProperty('--gate-py', `${(-ny * max).toFixed(2)}px`)
      frame.style.setProperty('--gate-px-far', `${(-nx * max * 0.55).toFixed(2)}px`)
      frame.style.setProperty('--gate-py-far', `${(-ny * max * 0.55).toFixed(2)}px`)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => window.removeEventListener('pointermove', onPointer)
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    let fadeTimer = 0
    const cycle = window.setInterval(() => {
      setLineOn(false)
      fadeTimer = window.setTimeout(() => {
        setLineIndex((index) => (index + 1) % LOG_LINES.length)
        setLineOn(true)
      }, 420)
    }, 3200)
    return () => {
      window.clearInterval(cycle)
      window.clearTimeout(fadeTimer)
    }
  }, [reduced])

  const toggleSfx = () => {
    const next = !sfxOn
    setSfxOn(next)
    writeSfxEnabled(next)
  }

  return (
    <>
      <div
        className={
          [
            'gate-atmosphere',
            locked ? 'is-locked' : '',
            signal ? 'is-signal' : '',
            reduced ? 'is-reduced' : '',
          ]
            .filter(Boolean)
            .join(' ')
        }
        aria-hidden="true"
      >
        <div className="gate-corners" ref={frameRef}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <div key={corner} className={`gate-bracket gate-bracket--${corner}`}>
              <svg viewBox="0 0 96 96" className="gate-bracket-svg" focusable="false">
                {corner === 'tl' ? <path d="M8 54V22h8M8 22h34M42 22v6M18 34h16M8 42h10" /> : null}
                {corner === 'tr' ? <path d="M88 54V22h-8M88 22H54M54 22v6M78 34H62M88 42H78" /> : null}
                {corner === 'bl' ? <path d="M8 42v32h8M8 74h34M42 74v-6M18 62h16M8 54h10" /> : null}
                {corner === 'br' ? <path d="M88 42v32h-8M88 74H54M54 74v-6M78 62H62M88 54H78" /> : null}
                <path className="gate-arc" d={arcPath(corner)} />
              </svg>
              <span className="gate-bracket-noise" />
            </div>
          ))}
        </div>
        <div className="gate-signal-rays" />
        <div className="gate-log">
          <div className="gate-log-scan" />
          <p className={lineOn ? 'gate-log-line is-on' : 'gate-log-line'}>{LOG_LINES[lineIndex]}</p>
          <div className="gate-log-noise" />
        </div>
      </div>

      <div className="gate-sfx">
        <button
          type="button"
          id={sfxId}
          className="gate-sfx-toggle"
          aria-pressed={sfxOn}
          aria-label={sfxOn ? 'Sound effects on' : 'Sound effects off'}
          onClick={toggleSfx}
        >
          SFX: {sfxOn ? 'ON' : 'OFF'}
        </button>
      </div>
    </>
  )
}

function arcPath(corner: 'tl' | 'tr' | 'bl' | 'br'): string {
  switch (corner) {
    case 'tl':
      return 'M12 48V28h20'
    case 'tr':
      return 'M84 48V28H64'
    case 'bl':
      return 'M12 48v20h20'
    case 'br':
      return 'M84 48v20H64'
  }
}
