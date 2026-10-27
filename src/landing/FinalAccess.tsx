import { useEffect, useRef, useState } from 'react'
import { registrationUrl } from './content.ts'
import { createArenaExtras, type ArenaExtras } from './arenaAccess.ts'
import { ArenaVista } from './ArenaVista.tsx'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isMobileLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches
}

/** Same CTA contract: swap only destination/state when registration goes live. */
function FinalCta({ onPulse }: { onPulse?: () => void }) {
  const className = `cta final-cta is-revealed${registrationUrl ? '' : ' is-pending'}`

  if (registrationUrl) {
    return (
      <a className={className} href={registrationUrl} onMouseEnter={onPulse} onFocus={onPulse}>
        ENTER THE ARENA
      </a>
    )
  }

  return (
    <button
      type="button"
      className={className}
      disabled
      aria-disabled="true"
      onMouseEnter={onPulse}
      onFocus={onPulse}
    >
      REGISTRATION OPENS SOON
    </button>
  )
}

function ArenaCopy({ onPulse }: { onPulse?: () => void }) {
  return (
    <div className="arena-copy is-on is-solid">
      <p className="eyebrow">Final access</p>
      <h2 id="arena-title">ENTER THE ARENA</h2>
      <p>The public registration link has not been published yet.</p>
      <div className="final-unlock is-on">
        <FinalCta onPulse={onPulse} />
      </div>
    </div>
  )
}

export function FinalAccess() {
  const extras = useRef<ArenaExtras>(createArenaExtras())
  const [reduced] = useState(() => prefersReducedMotion())
  const [mobile, setMobile] = useState(() => isMobileLayout())

  const triggerHoverPulse = () => {
    if (reduced) return
    extras.current.hover = 1
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <section
      id="arena"
      className={`arena-final arena-rift${mobile || reduced ? ' is-static' : ''}`}
      aria-labelledby="arena-title"
    >
      <div className="arena-stage">
        <div className="arena-stage-inner">
          <ArenaVista extras={extras} reduced={reduced} compact={mobile} />
          <ArenaCopy onPulse={triggerHoverPulse} />
        </div>
      </div>
    </section>
  )
}
