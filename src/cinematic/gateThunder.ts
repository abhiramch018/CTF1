const SFX_KEY = 'dn-gate-sfx'

export function readSfxEnabled(): boolean {
  try {
    const stored = sessionStorage.getItem(SFX_KEY)
    if (stored === '0') return false
    if (stored === '1') return true
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (window.matchMedia('(prefers-reduced-data: reduce)').matches) return false
  }
  return true
}

export function writeSfxEnabled(enabled: boolean): void {
  try {
    sessionStorage.setItem(SFX_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Short low rumble + filtered crackle after a user gesture. ~1.2s. */
export function playGateThunder(): void {
  if (!readSfxEnabled()) return
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return

  const ctx = new AudioCtx()
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.08)
  master.gain.exponentialRampToValueAtTime(0.12, now + 0.45)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25)
  master.connect(ctx.destination)

  // Sub-bass rumble
  const rumble = ctx.createOscillator()
  rumble.type = 'sine'
  rumble.frequency.setValueAtTime(42, now)
  rumble.frequency.exponentialRampToValueAtTime(28, now + 1.1)
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.setValueAtTime(0.55, now)
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15)
  rumble.connect(rumbleGain)
  rumbleGain.connect(master)
  rumble.start(now)
  rumble.stop(now + 1.2)

  // Filtered electric texture (noise)
  const seconds = 1.3
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) {
    const t = i / data.length
    const envelope = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.65)
    data[i] = (Math.random() * 2 - 1) * envelope * 0.35
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(280, now)
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.55)
  filter.frequency.exponentialRampToValueAtTime(220, now + 1.1)
  filter.Q.value = 1.4
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.28, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(master)
  noise.start(now)
  noise.stop(now + 1.25)

  // Short crackle burst near the end of the swell
  const crackleAt = now + 0.55
  const crackleBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate)
  const crackleData = crackleBuf.getChannelData(0)
  for (let i = 0; i < crackleData.length; i += 1) {
    const t = i / crackleData.length
    crackleData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 9) * 0.7
  }
  const crackle = ctx.createBufferSource()
  crackle.buffer = crackleBuf
  const crackleFilter = ctx.createBiquadFilter()
  crackleFilter.type = 'highpass'
  crackleFilter.frequency.value = 1400
  const crackleGain = ctx.createGain()
  crackleGain.gain.setValueAtTime(0.18, crackleAt)
  crackleGain.gain.exponentialRampToValueAtTime(0.0001, crackleAt + 0.16)
  crackle.connect(crackleFilter)
  crackleFilter.connect(crackleGain)
  crackleGain.connect(master)
  crackle.start(crackleAt)
  crackle.stop(crackleAt + 0.18)

  window.setTimeout(() => {
    void ctx.close()
  }, 1600)
}
