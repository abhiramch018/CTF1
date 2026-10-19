import { CountdownSection } from './sections/CountdownSection.tsx'
import { MissionSection } from './sections/MissionSection.tsx'

import './sections/countdown.css'
import './sections/mission.css'

export function CommandCenter() {
  return (
    <div className="command-center">
      <CountdownSection />
      <MissionSection />
    </div>
  )
}
