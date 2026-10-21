import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { sectors, type Sector } from './content.ts'
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
  const cardW = card?.width ?? Math.min(440, vw * 0.92)
  const cardH = card?.height ?? Math.min(520, vh * 0.82)
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
  const tagRefs = useRef(new Map<string, HTMLButtonElement>())
  const cardRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const scrollY = useRef(0)
  const origin = useRef<Origin | null>(null)
  const activeId = useRef<string | null>(null)

  const [active, setActive] = useState<Sector | null>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [scanId, setScanId] = useState<string | null>(null)
  const [cardStyle, setCardStyle] = useState<CSSProperties>({})
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const lockScroll = useCallback(() => {
    scrollY.current = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY.current}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
  }, [])

  const unlockScroll = useCallback(() => {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    window.scrollTo(0, scrollY.current)
  }, [])

  const settleOpen = useCallback(() => {
    setCardStyle({
      transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)',
      opacity: 1,
    })
    setPhase('open')
    window.setTimeout(() => closeBtnRef.current?.focus(), 40)
  }, [])

  const openSector = useCallback(
    (sector: Sector) => {
      if (phase !== 'closed') return
      const button = tagRefs.current.get(sector.id)
      if (!button) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const mobile = window.matchMedia('(max-width: 720px)').matches
      const rect = button.getBoundingClientRect()
      origin.current = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      activeId.current = sector.id

      setScanId(sector.id)
      window.setTimeout(() => setScanId(null), 420)

      lockScroll()
      setActive(sector)
      setTilt({ x: 0, y: 0 })
      setPhase('opening')

      if (reduce) {
        setCardStyle({ transform: 'none', opacity: 1 })
        setPhase('open')
        window.setTimeout(() => closeBtnRef.current?.focus(), 40)
        return
      }

      setCardStyle({
        transform: originTransform(origin.current, null, mobile),
        opacity: 0.35,
        transition: 'none',
      })

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const cardRect = cardRef.current?.getBoundingClientRect() ?? null
          setCardStyle({
            transform: originTransform(origin.current!, cardRect, mobile),
            opacity: 0.55,
            transition: 'none',
          })
          requestAnimationFrame(() => {
            setCardStyle({
              transform: 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)',
              opacity: 1,
              transition: 'transform 520ms cubic-bezier(0.16, 0.84, 0.22, 1), opacity 420ms ease',
            })
            window.setTimeout(settleOpen, 520)
          })
        })
      })
    },
    [lockScroll, phase, settleOpen],
  )

  const closeSector = useCallback(() => {
    if (phase !== 'open' && phase !== 'opening') return
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
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    setTilt({ x: py * -5, y: px * 5 }) // max ~2.5deg at card edges
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

  return (
    <section id="sectors" className="band sectors-band" aria-labelledby={titleId}>
      <div className="band-head">
        <p className="eyebrow">Sectors</p>
        <h2 id={titleId}>Ten disciplines, one range</h2>
      </div>

      <div className="sector-range">
        <p className="sector-range-note">Select a sector tag to open its briefing.</p>
        <div className="sector-list" role="group" aria-label="Challenge sectors">
          {sectors.map((item) => (
            <button
              key={item.id}
              type="button"
              ref={(node) => {
                if (node) tagRefs.current.set(item.id, node)
                else tagRefs.current.delete(item.id)
              }}
              className={
                scanId === item.id
                  ? 'sector-tag is-scanning'
                  : active?.id === item.id
                    ? 'sector-tag is-active'
                    : 'sector-tag'
              }
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

      {portalOpen ? (
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

                <button ref={closeBtnRef} type="button" className="sector-return" onClick={closeSector}>
                  RETURN TO RANGE
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
