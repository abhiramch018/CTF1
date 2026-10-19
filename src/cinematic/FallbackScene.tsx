import type { RefObject } from 'react'
import { FinalLockup } from './FinalLockup.tsx'

type FallbackProps = {
  onContinue: () => void
  continuing: boolean
  titleRef: RefObject<HTMLHeadingElement | null>
}

export function FallbackWorld() {
  return (
    <div className="fallback" aria-hidden="true">
      <div className="fb-ridge fb-ridge-a" />
      <div className="fb-ridge fb-ridge-b" />
      <div className="fb-tower fb-tower-a" />
      <div className="fb-tower fb-tower-b" />
      <div className="fb-ruin" />
      <div className="fb-gate">
        <span className="fb-jamb" />
        <span className="fb-energy" />
        <span className="fb-jamb" />
        <span className="fb-lintel" />
        <span className="fb-beam" />
      </div>
      <div className="fb-ground" />
    </div>
  )
}

export function FallbackScene({ onContinue, continuing, titleRef }: FallbackProps) {
  return (
    <>
      <FallbackWorld />
      <p className="sr">Animated scene unavailable. The final title is shown.</p>
      <FinalLockup onContinue={onContinue} continuing={continuing} titleRef={titleRef} />
    </>
  )
}
