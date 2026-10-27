import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { sectors, type Sector } from './content.ts'
import { prefersReducedMotion, sectionLocalProgress } from './scrollDrive.ts'
import { useSectionReveal } from './useSectionReveal.ts'
import { SectorVisualMark } from './SectorVisual.tsx'

type Phase = 'closed' | 'opening' | 'open' | 'closing'

type Origin = {
  x: number
  y: number
  w: number
  h: number
}

function originTransform(origin: Origin, card: DOMRect | null, mobile: boolean): string {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = card?.width ?? Math.min(700, vw * 0.92)
  const cardH = card?.height ?? Math.min(560, vh * 0.86)
  const dx = origin.x + origin.w / 2 - vw / 2
  const dy = origin.y + origin.h / 2 - vh / 2
  const sx = Math.max(0.12, origin.w / cardW)
  const sy = Math.max(0.08, origin.h / cardH)
  const scale = Math.min(sx, sy)

  if (mobile) {
    return `translate3d(${dx}px, ${dy}px, 0) scale(${Math.max(scale, 0.2)})`
  }

  return `translate3d(${dx}px, ${dy}px, -220px) rotateX(9deg) rotateY(-7deg) scale(${scale})`
}

export function SectorRange() {
  const titleId = useId()
  const dialogTitleId = useId()
  const [sectionRef, sectionShown] = useSectionReveal<HTMLElement>(0.16)
  const depthRef = useRef<HTMLDivElement>(null)
  const tagRefs = useRef(new Map<string, HTMLButtonElement>())
  const cardRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const scrollY = useRef(0)
  const origin = useRef<Origin | null>(null)
  const activeId = useRef<string | null>(null)
  const openGen = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const node = sectionRef.current
    const depth = depthRef.current
    if (!node || !depth) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const p = sectionLocalProgress(node)
        depth.style.setProperty('--band-depth', p.toFixed(3))
        depth.style.setProperty('--band-scan', sectionShown && p > 0.12 && p < 0.88 ? '1' : '0')
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sectionRef, sectionShown])

  const [active, setActive] = useState<Sector | null>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [scanId, setScanId] = useState<string | null>(null)
  const [cardStyle, setCardStyle] = useState<CSSProperties>({})
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const lockScroll = useCallback(() => {
    scrollY.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
    const y = scrollY.current
    document.documentElement.classList.add('dn-modal-open')
    document.body.classList.add('dn-modal-open')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
  }, [])

  const unlockScroll = useCallback(() => {
    const y = scrollY.current
    document.documentElement.classList.remove('dn-modal-open')
    document.body.classList.remove('dn-modal-open')
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    window.scrollTo(0, y)
  }, [])

  const openSector = useCallback(
    (sector: Sector) => {
      if (phase !== 'closed') return
      const button = tagRefs.current.get(sector.id)
      if (!button) return

      const rect = button.getBoundingClientRect()
      origin.current = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      activeId.current = sector.id
      openGen.current += 1
      const gen = openGen.current

      setScanId(sector.id)
      window.setTimeout(() => setScanId(null), 420)

      lockScroll()
      setActive(sector)
      setTilt({ x: 0, y: 0 })
      setCardStyle({ opacity: 0, transform: 'none', transition: 'none' })
      setPhase('opening')

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const mobile = window.matchMedia('(max-width: 720px)').matches

      const finishOpen = () => {
        if (openGen.current !== gen) return
        setCardStyle({
          transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)',
          opacity: 1,
        })
        setPhase('open')
        window.setTimeout(() => closeBtnRef.current?.focus(), 40)
      }

      if (reduce) {
        window.setTimeout(finishOpen, 30)
        return
      }

      // Wait for portal mount, then morph from the tag into the centered card.
      window.setTimeout(() => {
        if (openGen.current !== gen) return
        const node = cardRef.current
        const natural = {
          width: Math.max(node?.offsetWidth ?? 0, mobile ? window.innerWidth - 32 : 700),
          height: Math.max(node?.offsetHeight ?? 0, 280),
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          x: 0,
          y: 0,
          toJSON() {},
        } as DOMRect
        const from = originTransform(origin.current!, natural, mobile)
        setCardStyle({
          transform: from,
          opacity: 0.45,
          transition: 'none',
        })
        window.setTimeout(() => {
          if (openGen.current !== gen) return
          setCardStyle({
            transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)',
            opacity: 1,
            transition: 'transform 520ms cubic-bezier(0.16, 0.84, 0.22, 1), opacity 420ms ease',
          })
          window.setTimeout(finishOpen, 540)
        }, 40)
      }, 40)
    },
    [lockScroll, phase],
  )

  const closeSector = useCallback(() => {
    if (phase !== 'open' && phase !== 'opening') return
    openGen.current += 1
    const sectorId = activeId.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 720px)').matches

    setTilt({ x: 0, y: 0 })
    setPhase('closing')

    if (reduce || !origin.current) {
      setActive(null)
      setPhase('closed')
      unlockScroll()
      if (sectorId) tagRefs.current.get(sectorId)?.focus()
      return
    }

    const cardRect = cardRef.current?.getBoundingClientRect() ?? null
    setCardStyle({
      transform: originTransform(origin.current, cardRect, mobile),
      opacity: 0.2,
      transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms ease',
    })

    window.setTimeout(() => {
      setActive(null)
      setPhase('closed')
      setCardStyle({})
      unlockScroll()
      if (sectorId) tagRefs.current.get(sectorId)?.focus()
    }, 400)
  }, [phase, unlockScroll])

  useEffect(() => {
    if (phase === 'closed') return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSector()
        return
      }
      // Block page scroll keys while the modal owns the view.
      const block = ['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' ', 'Spacebar']
      if (block.includes(event.key)) {
        const target = event.target as HTMLElement | null
        if (target?.closest?.('.sector-briefing-scroll')) return
        event.preventDefault()
      }
    }

    const stopScroll = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.('.sector-briefing-scroll')) return
      event.preventDefault()
    }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('wheel', stopScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', stopScroll, { passive: false, capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('wheel', stopScroll, true)
      window.removeEventListener('touchmove', stopScroll, true)
    }
  }, [closeSector, phase])

  useEffect(() => () => unlockScroll(), [unlockScroll])

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'open') return
    if (
      window.matchMedia(
        '(max-width: 720px), (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)',
      ).matches
    ) {
      return
    }
    const node = cardRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -5, y: px * 5 })
  }

  const onPointerLeave = () => {
    if (phase === 'open') setTilt({ x: 0, y: 0 })
  }

  const indexOf = (sector: Sector) => sectors.findIndex((item) => item.id === sector.id) + 1
  const portalOpen = phase !== 'closed' && active

  const liveStyle: CSSProperties =
    phase === 'open'
      ? {
          ...cardStyle,
          transform: `translate3d(0, 0, 0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1)`,
          transition:
            tilt.x === 0 && tilt.y === 0
              ? 'transform 280ms ease, opacity 280ms ease'
              : 'transform 90ms linear, opacity 280ms ease',
        }
      : cardStyle

  const modal =
    portalReady && portalOpen
      ? createPortal(
          <div
            className={
              phase === 'opening' || phase === 'open'
                ? 'sector-portal is-live'
                : 'sector-portal is-exit'
            }
            role="presentation"
          >
            <div
              className="sector-portal-backdrop"
              role="presentation"
              aria-hidden="true"
              onClick={closeSector}
            />
            <div className="sector-portal-stage" aria-hidden={false}>
              <div
                ref={cardRef}
                className="sector-briefing"
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                style={liveStyle}
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
              >
                <div className="sector-briefing-frame">
                  <header className="sector-briefing-head">
                    <p className="sector-num">
                      {String(indexOf(active)).padStart(2, '0')} / {String(sectors.length).padStart(2, '0')}
                    </p>
                    <h3 id={dialogTitleId}>{active.name}</h3>
                  </header>

                  <div className="sector-briefing-scroll">
                    <div className="sector-briefing-body">
                      <div className="sector-briefing-copy">
                        <p className="sector-briefing-summary">{active.summary}</p>
                        <div className="sector-briefing-skills">
                          <p className="sector-label">{active.encounter}</p>
                          <ul>
                            {active.details.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="sector-briefing-viz" aria-hidden="true">
                        <SectorVisualMark kind={active.visual} label={active.name} />
                      </div>
                    </div>
                  </div>

                  <button ref={closeBtnRef} type="button" className="sector-return" onClick={closeSector}>
                    RETURN TO RANGE
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <section
      id="sectors"
      ref={sectionRef}
      className={`band sectors-band reveal-section${sectionShown ? ' is-shown' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="band-depth" ref={depthRef} aria-hidden="true">
        <span className="band-depth-layer band-depth-layer--a" />
        <span className="band-depth-layer band-depth-layer--b" />
        <span className="band-depth-scan" />
      </div>
      <div className="band-head reveal-item" style={{ ['--reveal-delay' as string]: '0ms' }}>
        <p className="eyebrow">Sectors</p>
        <h2 id={titleId}>Ten disciplines, one range</h2>
      </div>

      <div className="sector-range">
        <p className="sector-range-note reveal-item" style={{ ['--reveal-delay' as string]: '80ms' }}>
          Select a sector tag to open its briefing.
        </p>
        <div className="sector-list" role="group" aria-label="Challenge sectors">
          {sectors.map((item, index) => (
            <button
              key={item.id}
              type="button"
              ref={(node) => {
                if (node) tagRefs.current.set(item.id, node)
                else tagRefs.current.delete(item.id)
              }}
              className={
                [
                  'sector-tag',
                  'reveal-item',
                  scanId === item.id ? 'is-scanning' : '',
                  active?.id === item.id ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              style={{ ['--reveal-delay' as string]: `${100 + index * 85}ms` }}
              aria-haspopup="dialog"
              aria-expanded={active?.id === item.id}
              onClick={() => openSector(item)}
            >
              <span className="sector-tag-scan" aria-hidden="true" />
              <span className="sector-tag-label">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {modal}
    </section>
  )
}
