import { useEffect, useRef, useState } from 'react'
import { Opening } from './cinematic/Opening.tsx'
import { CountdownTelemetry } from './countdown/CountdownTelemetry.tsx'

type View = 'intro' | 'enter' | 'command'

const ENTRY_MS = 800

export default function App() {
  const [view, setView] = useState<View>('intro')
  const locked = useRef(false)

  const continueIn = () => {
    if (locked.current) return
    locked.current = true
    setView('enter')
    window.setTimeout(() => setView('command'), ENTRY_MS)
  }

  // The intro locks body scroll for its fixed stage; the command page is a
  // normal vertically scrolling document.
  useEffect(() => {
    if (view !== 'command') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = previous
    }
  }, [view])

  if (view === 'command') {
    return (
      <main className="command-page">
        <CountdownTelemetry />
      </main>
    )
  }

  return (
    <>
      <Opening onContinue={continueIn} continuing={view === 'enter'} />
      <div className={view === 'enter' ? 'entry is-on' : 'entry'} aria-hidden="true" />
      <p className="sr" aria-live="polite">
        {view === 'enter' ? 'Entering the command center.' : ''}
      </p>
    </>
  )
}
