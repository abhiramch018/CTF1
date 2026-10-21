import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { attention, resetAttention } from './attention.ts'
import { FallbackScene, FallbackWorld } from './FallbackScene.tsx'
import { FinalLockup } from './FinalLockup.tsx'
import { GateAtmosphere } from './GateAtmosphere.tsx'
import { playGateThunder } from './gateThunder.ts'
import { NoctisScene } from './NoctisScene.tsx'
import { preferences, readSeen, reducedMotion, runtime, webglAvailable, writeSeen } from './runtime.ts'
import type { Stage } from './runtime.ts'
import { SceneBoundary } from './SceneBoundary.tsx'

type OpeningProps = {
  onContinue: () => void
  continuing: boolean
}

function boot(glOk: boolean): Stage {
  preferences.reduce = reducedMotion()
  if (!glOk || preferences.reduce || readSeen()) {
    runtime.stage = 'hold'
    runtime.skip = true
    return 'hold'
  }
  runtime.stage = 'gate'
  runtime.skip = false
  runtime.startedAt = 0
  return 'gate'
}

export function Opening({ onContinue, continuing }: OpeningProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const beginRef = useRef<HTMLButtonElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const [glOk] = useState(() => webglAvailable())
  const [stage, setStage] = useState<Stage>(() => boot(glOk))
  const [titleOn, setTitleOn] = useState(stage === 'hold')
  const [ready, setReady] = useState(stage !== 'run')
  const [status, setStatus] = useState('')
  const [sceneFailed, setSceneFailed] = useState(false)
  const [mountScene, setMountScene] = useState(false)
  const [gateSignal, setGateSignal] = useState(false)
  const [gateLocked, setGateLocked] = useState(false)

  const finish = useCallback(() => {
    runtime.skip = true
    runtime.stage = 'hold'
    setTitleOn(true)
    setStage('hold')
  }, [])

  const failScene = useCallback(() => {
    setSceneFailed(true)
    finish()
  }, [finish])

  useEffect(() => {
    if (stage === 'gate') beginRef.current?.focus()
  }, [stage])

  useEffect(() => {
    if (titleOn) titleRef.current?.focus()
  }, [titleOn])

  useEffect(() => {
    if (stage === 'hold') writeSeen()
  }, [stage])

  useEffect(() => {
    if (stage === 'gate' || sceneFailed) return
    let active = true
    const frame = requestAnimationFrame(() => {
      if (active) setMountScene(true)
    })
    return () => {
      active = false
      cancelAnimationFrame(frame)
    }
  }, [sceneFailed, stage])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      if (!media.matches) return
      preferences.reduce = true
      finish()
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [finish])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      attention.targetX = (event.clientX / window.innerWidth) * 2 - 1
      attention.targetY = (event.clientY / window.innerHeight) * 2 - 1
    }
    const paint = () => {
      const world = worldRef.current
      if (world) world.style.opacity = String(1 - attention.scroll * 0.58)
    }
    const nudge = (delta: number) => {
      if (runtime.stage !== 'hold' || preferences.reduce) return
      attention.scroll = Math.min(1, Math.max(0, attention.scroll + delta))
      paint()
    }
    const onWheel = (event: WheelEvent) => {
      if (runtime.stage !== 'hold' || preferences.reduce) return
      if (event.target instanceof Element && event.target.closest('button, a')) return
      event.preventDefault()
      nudge(event.deltaY * 0.00055)
    }
    let lastTouch = 0
    const onTouchStart = (event: TouchEvent) => {
      lastTouch = event.touches[0]?.clientY ?? lastTouch
    }
    const onTouchMove = (event: TouchEvent) => {
      const next = event.touches[0]?.clientY
      if (next == null || runtime.stage !== 'hold' || preferences.reduce) return
      if (event.target instanceof Element && event.target.closest('button, a')) return
      nudge((lastTouch - next) * 0.0022)
      lastTouch = next
    }
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const begin = () => {
    if (runtime.stage !== 'gate') return
    runtime.skip = false
    runtime.stage = 'run'
    runtime.startedAt = performance.now()
    playGateThunder()
    setGateLocked(true)
    setGateSignal(false)
    resetAttention()
    if (worldRef.current) worldRef.current.style.opacity = '1'
    setReady(false)
    setStatus('Cinematic playing. Skip intro is available.')
    window.setTimeout(() => {
      setStage('run')
      setGateLocked(false)
    }, 260)
  }

  const lockup = (
    <div aria-live="polite">
      {titleOn ? (
        <FinalLockup onContinue={onContinue} continuing={continuing} titleRef={titleRef} />
      ) : null}
    </div>
  )

  if (!glOk) {
    return (
      <main className="stage" data-stage="hold">
        <FallbackScene onContinue={onContinue} continuing={continuing} titleRef={titleRef} />
      </main>
    )
  }

  return (
    <main className="stage" data-stage={stage} data-title={titleOn ? 'on' : 'off'}>
      <p className="sr" aria-live="polite">
        {status}
      </p>
      {stage !== 'gate' ? (
        <div className="world" ref={worldRef}>
          {sceneFailed ? <FallbackWorld /> : null}
          {mountScene && !sceneFailed ? (
            <SceneBoundary
              fallback={
                <CrashNotice onFail={failScene}>
                  <FallbackWorld />
                </CrashNotice>
              }
            >
              <NoctisScene
                onReady={() => setReady(true)}
                onTitle={() => setTitleOn(true)}
                onHold={finish}
                onFail={failScene}
              />
            </SceneBoundary>
          ) : null}
          <div className="vignette" />
        </div>
      ) : null}
      {stage === 'run' ? <div className={ready ? 'veil is-clear' : 'veil'} /> : null}
      {stage === 'run' && !titleOn ? (
        <button type="button" className="skip" onClick={finish}>
          SKIP INTRO
        </button>
      ) : null}
      {lockup}
      {stage === 'gate' || gateLocked ? (
        <div className={gateLocked ? 'gate is-locking' : 'gate'}>
          <GateAtmosphere locked={gateLocked} signal={gateSignal} />
          <p className="gate-note">Sealed transmission</p>
          <button
            type="button"
            className="begin"
            ref={beginRef}
            onClick={begin}
            onPointerEnter={() => setGateSignal(true)}
            onPointerLeave={() => setGateSignal(false)}
            onFocus={() => setGateSignal(true)}
            onBlur={() => setGateSignal(false)}
            aria-label="Begin the opening cinematic"
          >
            <span className="begin-kicker">ENTER</span>
            <span className="begin-word">BEGIN</span>
          </button>
        </div>
      ) : null}
    </main>
  )
}

function CrashNotice({ onFail, children }: { onFail: () => void; children: ReactNode }) {
  useEffect(() => {
    onFail()
  }, [onFail])
  return children
}
