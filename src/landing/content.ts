export const registrationUrl: string | null = null

export const partners = [
  { src: '/brands/kl.png', name: 'KL University' },
  { src: '/brands/gdev.png', name: 'Google Developer Groups' },
  { src: '/brands/whh.png', name: 'White Hat Hackers' },
] as const

export const nav = [
  { href: '#countdown', label: 'Countdown' },
  { href: '#mission', label: 'Mission' },
  { href: '#sectors', label: 'Sectors' },
  { href: '#format', label: 'Format' },
  { href: '#partners', label: 'Partners' },
  { href: '#arena', label: 'Arena' },
] as const

export type SectorVisual = 'terminal' | 'cipher' | 'binary' | 'wireframe' | 'signal' | 'grid' | 'lens' | 'cross' | 'node' | 'media'

export const sectors = [
  {
    id: 'web',
    name: 'Web Security',
    summary: 'Find and exploit weaknesses in organiser-controlled web applications.',
    encounter: 'What you may encounter',
    details: ['Injection and auth flaws', 'Session and access control gaps', 'Misconfigured app surfaces'],
    visual: 'terminal' as SectorVisual,
  },
  {
    id: 'crypto',
    name: 'Cryptography',
    summary: 'Decode ciphers, encodings, keys, and cryptographic puzzles.',
    encounter: 'Core skills',
    details: ['Classic and modern ciphers', 'Encoding and key recovery', 'Protocol and padding logic'],
    visual: 'cipher' as SectorVisual,
  },
  {
    id: 'pwn',
    name: 'Pwn',
    summary: 'Analyse binaries and solve controlled exploitation challenges.',
    encounter: 'What you may encounter',
    details: ['Memory corruption patterns', 'Binary protection analysis', 'Controlled shellcode paths'],
    visual: 'binary' as SectorVisual,
  },
  {
    id: 'rev',
    name: 'Reverse Engineering',
    summary: 'Take apart programs to understand logic and hidden behaviour.',
    encounter: 'Core skills',
    details: ['Static and dynamic analysis', 'Control-flow recovery', 'Obfuscation and packing'],
    visual: 'wireframe' as SectorVisual,
  },
  {
    id: 'forensics',
    name: 'Digital Forensics',
    summary: 'Investigate files, artifacts, metadata, and incident evidence.',
    encounter: 'What you may encounter',
    details: ['Disk and memory artifacts', 'Timeline reconstruction', 'File and metadata recovery'],
    visual: 'signal' as SectorVisual,
  },
  {
    id: 'osint',
    name: 'OSINT',
    summary: 'Use publicly available information to uncover the required answer.',
    encounter: 'Core skills',
    details: ['Open-source research', 'Source cross-checking', 'Public footprint mapping'],
    visual: 'grid' as SectorVisual,
  },
  {
    id: 'physical',
    name: 'Physical OSINT',
    summary: 'Solve real-world research and observation challenges responsibly.',
    encounter: 'What you may encounter',
    details: ['Field observation tasks', 'Physical-world clues', 'Responsible on-site research'],
    visual: 'lens' as SectorVisual,
  },
  {
    id: 'misc',
    name: 'Miscellaneous',
    summary: 'Tackle unconventional puzzles that cross multiple skill areas.',
    encounter: 'Core skills',
    details: ['Cross-discipline puzzles', 'Scripting and logic', 'Unconventional problem paths'],
    visual: 'cross' as SectorVisual,
  },
  {
    id: 'ai',
    name: 'LLM / AI',
    summary: 'Analyse responsible AI-oriented security and reasoning challenges.',
    encounter: 'What you may encounter',
    details: ['Prompt and model behaviour', 'AI safety reasoning', 'Controlled evaluation tasks'],
    visual: 'node' as SectorVisual,
  },
  {
    id: 'stego',
    name: 'Steganography',
    summary: 'Locate and recover information hidden within media or data.',
    encounter: 'Core skills',
    details: ['Hidden payloads in media', 'Bit-level and metadata hides', 'Signal and format analysis'],
    visual: 'media' as SectorVisual,
  },
] as const

export type Sector = (typeof sectors)[number]

export const missionBrief = {
  heading: 'What is DEAD NOCTIS',
  blocks: {
    brief: {
      label: 'Mission Brief',
      rows: [
        {
          marker: '01',
          title: 'Operation',
          body: 'Season 01 is a national capture-the-flag run in jeopardy style. Every flag is scored. Investigate, decode, and exploit only inside organiser-provided ranges.',
        },
        {
          marker: '02',
          title: 'Command',
          body: 'Organised with KL University, Google Developer Groups, and White Hat Hackers.',
        },
        {
          marker: '03',
          title: 'Pipeline',
          body: 'The online qualifier names the finalists. Offline finals are held on campus at KLEF, Vaddeswaram.',
        },
      ],
    },
    field: {
      label: 'Eligibility & Field Rules',
      rows: [
        { marker: '01', title: 'Theatre', body: 'Open across India.' },
        { marker: '02', title: 'Age band', body: 'Ages 16–28.' },
        { marker: '03', title: 'Formation', body: 'Any branch, any year. Cross-college teams are welcome.' },
        { marker: '04', title: 'Unit size', body: 'Solo or duo may play the qualifier. Finals teams are up to three.' },
        { marker: '05', title: 'Clearance', body: 'Finalists present a valid college ID at check-in.' },
      ],
    },
  },
} as const

export const QUALIFIER_AT = Date.parse('2026-12-06T03:30:00.000Z')
