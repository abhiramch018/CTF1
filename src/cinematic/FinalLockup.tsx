import type { RefObject } from 'react'

type LockupProps = {
  onContinue: () => void
  continuing: boolean
  titleRef: RefObject<HTMLHeadingElement | null>
}

export function FinalLockup({ onContinue, continuing, titleRef }: LockupProps) {
  return (
    <div className="lockup">
      <p className="kicker">Encrypted gate</p>
      <h1 id="noctis-title" className="name" tabIndex={-1} ref={titleRef}>
        <span className="line">DEAD</span>
        <span className="line line-next">NOCTIS</span>
      </h1>
      <ul className="specks" aria-hidden="true">
        <li>0xA91</li>
        <li>SEQ 07</li>
        <li>// LOCK</li>
      </ul>
      <button
        type="button"
        className="continue"
        onClick={onContinue}
        onKeyDown={(event) => {
          if (event.repeat || continuing) return
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onContinue()
        }}
        disabled={continuing}
        aria-disabled={continuing}
      >
        CONTINUE
      </button>
    </div>
  )
}
