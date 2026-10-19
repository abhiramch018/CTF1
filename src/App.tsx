import { useRef, useState } from 'react'
import { CountdownTelemetry } from './CountdownTelemetry.tsx'
import { Opening } from './cinematic/Opening.tsx'

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

  if (view === 'command') {
    return <main className="command-center"><CountdownTelemetry /></main>
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
