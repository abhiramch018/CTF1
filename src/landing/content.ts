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

export const sectors = [
  { id: 'web', name: 'Web Security', summary: 'Application flaws inside organiser-controlled ranges.' },
  { id: 'crypto', name: 'Cryptography', summary: 'Ciphers, encodings, and cryptographic problem-solving.' },
  { id: 'pwn', name: 'Pwn', summary: 'Binary exploitation in isolated challenge environments.' },
  { id: 'rev', name: 'Reverse Engineering', summary: 'Take apart binaries and explain how they behave.' },
  { id: 'forensics', name: 'Digital Forensics', summary: 'Files, artifacts, metadata, and incident evidence.' },
  { id: 'osint', name: 'OSINT', summary: 'Investigation that uses public information only.' },
  { id: 'physical', name: 'Physical OSINT', summary: 'Hands-on, real-world OSINT tasks in the field.' },
  { id: 'misc', name: 'Miscellaneous', summary: 'Logic, scripting, and cross-disciplinary puzzles.' },
  { id: 'ai', name: 'LLM / AI', summary: 'AI security and reasoning, kept inside a controlled scope.' },
  { id: 'stego', name: 'Steganography', summary: 'Hidden data and media analysis.' },
] as const

export const QUALIFIER_AT = Date.parse('2026-12-06T03:30:00.000Z')
