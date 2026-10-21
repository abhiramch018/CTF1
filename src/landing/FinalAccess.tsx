import { useEffect, useRef, useState } from 'react'
import { registrationUrl } from './content.ts'
import {
  createArenaExtras,
  sampleArenaAccess,
  sectionProgress,
  type ArenaExtras,
} from './arenaAccess.ts'
import { ArenaVista } from './ArenaVista.tsx'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isMobileLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches
}

/** Same CTA component contract: swap only destination/state when registration goes live. */
function FinalCta({ revealed }: { revealed: boolean }) {
  const className = `cta final-cta${revealed ? ' is-revealed' : ''}${registrationUrl ? '' : ' is-pending'}`

  if (registrationUrl) {
    return (
      <a className={className} href={registrationUrl}>
        ENTER THE ARENA
      </a>
    )
  }

  return (
    <button type="button" className={className} disabled aria-disabled="true">
      REGISTRATION OPENS SOON
    </button>
  )
}

function MobileFinale() {
  return (
    <div className="arena-mobile">
      <div className="arena-mobile-visual" aria-hidden="true">
        <div className="arena-mobile-path" />
        <div className="arena-mobile-portal">
          <span className="arena-mobile-core" />
        </div>
      </div>
      <div className="arena-copy is-solid">
        <p className="eyebrow">Final access</p>
        <h2 id="arena-title">ENTER THE ARENA</h2>
        <p>The public registration link has not been published yet.</p>
        <FinalCta revealed />
      </div>
    </div>
  )
}

function initialExtras(): ArenaExtras {
  const reduce = prefersReducedMotion()
  return sampleArenaAccess(reduce ? 1 : 0, createArenaExtras(), reduce)
}

export function FinalAccess() {
  const sectionRef = useRef<HTMLElement>(null)
  const extras = useRef<ArenaExtras>(initialExtras())
  const [reduced] = useState(() => prefersReducedMotion())
  const [mobile, setMobile] = useState(() => isMobileLayout())
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0))
  const [labelOn, setLabelOn] = useState(false)
  const [finaleOn, setFinaleOn] = useState(() => prefersReducedMotion())

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduced || mobile) {
      sampleArenaAccess(1, extras.current, true)
      setProgress(1)
      setFinaleOn(true)
      setLabelOn(false)
      return
    }

    const section = sectionRef.current
    if (!section) return

    let frame = 0
    const update = () => {
      frame = 0
      const next = sectionProgress(section)
      sampleArenaAccess(next, extras.current, false)
      setProgress(next)
      setLabelOn(extras.current.label > 0.12 && extras.current.finale < 0.55)
      setFinaleOn(extras.current.finale > 0.2)
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [reduced, mobile])

  if (mobile) {
    return (
      <section id="arena" className="arena-final is-static" aria-labelledby="arena-title">
        <MobileFinale />
      </section>
    )
  }

  if (reduced) {
    return (
      <section id="arena" className="arena-final is-static" aria-labelledby="arena-title">
        <div className="arena-stage">
          <div className="arena-stage-inner">
            <ArenaVista extras={extras} reduced />
            <div className="arena-copy is-solid">
              <p className="eyebrow">Final access</p>
              <h2 id="arena-title">ENTER THE ARENA</h2>
              <p>The public registration link has not been published yet.</p>
              <FinalCta revealed />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="arena"
      ref={sectionRef}
      className="arena-final"
      aria-labelledby="arena-title"
      data-progress={progress.toFixed(2)}
    >
      <div className="arena-stage">
        <div className="arena-stage-inner">
          <ArenaVista extras={extras} reduced={false} />

          <p className={`arena-signal${labelOn ? ' is-on' : ''}`} aria-hidden={!labelOn}>
            FINAL ACCESS // ARENA LINK
          </p>

          <div className={`arena-copy${finaleOn ? ' is-on' : ''}`}>
            <p className="eyebrow">Final access</p>
            <h2 id="arena-title">ENTER THE ARENA</h2>
            <p>The public registration link has not been published yet.</p>
            <div className={`final-unlock${finaleOn ? ' is-on' : ''}`}>
              <FinalCta revealed={finaleOn} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
