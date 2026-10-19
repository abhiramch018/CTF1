import { useEffect, useRef, useState } from 'react'
import { Opening } from './cinematic/Opening.tsx'
import { LandingPage } from './landing/LandingPage.tsx'

type View = 'intro' | 'enter' | 'command' | 'reveal' | 'landing'

const ENTRY_MS = 800
const CONFIRM_MS = 1200
const REVEAL_MS = 600

export default function App() {
  const [view, setView] = useState<View>('intro')
  const locked = useRef(false)

  const continueIn = () => {
    if (locked.current) return
    locked.current = true
    setView('enter')
    window.setTimeout(() => setView('command'), ENTRY_MS)
  }

  useEffect(() => {
    if (view !== 'command') return
    const timer = window.setTimeout(() => setView('reveal'), CONFIRM_MS)
    return () => window.clearTimeout(timer)
  }, [view])

  useEffect(() => {
    if (view !== 'reveal') return
    const timer = window.setTimeout(() => setView('landing'), REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [view])

  useEffect(() => {
    const site = view === 'reveal' || view === 'landing'
    document.body.classList.toggle('is-site', site)
    return () => document.body.classList.remove('is-site')
  }, [view])

  const showLanding = view === 'command' || view === 'reveal' || view === 'landing'
  const showCommand = view === 'command' || view === 'reveal'

  return (
    <>
      {showLanding ? <LandingPage /> : null}
      {view === 'intro' || view === 'enter' ? (
        <Opening onContinue={continueIn} continuing={view === 'enter'} />
      ) : null}
      <div className={view === 'enter' ? 'entry is-on' : 'entry'} aria-hidden="true" />
      {showCommand ? (
        <main className={view === 'reveal' ? 'command is-leaving' : 'command'}>
          <h1>ACCESS GRANTED — COMMAND CENTER</h1>
        </main>
      ) : null}
      {view === 'reveal' ? <div className="scan" aria-hidden="true" /> : null}
      <p className="sr" aria-live="polite">
        {view === 'enter' ? 'Entering the command center.' : ''}
        {view === 'command' ? 'Access granted. Opening the command center.' : ''}
        {view === 'landing' ? 'Command center ready.' : ''}
      </p>
    </>
  )
}
