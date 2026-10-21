import type { ReactElement } from 'react'
import type { SectorVisual as VisualKind } from './content.ts'

const paths: Record<VisualKind, ReactElement> = {
  terminal: (
    <>
      <rect x="18" y="28" width="92" height="64" rx="2" />
      <path d="M28 42h28M28 52h44M28 62h36" />
      <path d="M86 70h16v10H86z" />
    </>
  ),
  cipher: (
    <>
      <rect x="24" y="24" width="80" height="80" />
      <path d="M40 40h16v16H40zm24 0h16v16H64zm24 0h16v16H88zM40 64h16v16H40zm24 0h16v16H64zm24 0h16v16H88zM40 88h16v16H40zm24 0h16v16H64z" />
    </>
  ),
  binary: (
    <>
      <path d="M32 30v68M52 38v52M72 26v76M92 44v40" />
      <circle cx="32" cy="48" r="3" />
      <circle cx="52" cy="62" r="3" />
      <circle cx="72" cy="54" r="3" />
      <circle cx="92" cy="70" r="3" />
      <text x="28" y="96" className="sector-viz-bits">
        01 10
      </text>
    </>
  ),
  wireframe: (
    <>
      <path d="M64 22l40 24v36L64 106 24 82V46z" />
      <path d="M64 22v84M24 46l40 24 40-24M24 82l40-24 40 24" />
    </>
  ),
  signal: (
    <>
      <path d="M20 72h18l10-28 12 48 14-56 12 36h22" />
      <path d="M20 96h88" />
    </>
  ),
  grid: (
    <>
      <path d="M28 28h72v72H28z" />
      <path d="M52 28v72M76 28v72M28 52h72M28 76h72" />
      <circle cx="52" cy="52" r="4" />
      <circle cx="76" cy="76" r="4" />
    </>
  ),
  lens: (
    <>
      <circle cx="64" cy="64" r="34" />
      <circle cx="64" cy="64" r="18" />
      <path d="M64 30v8M64 90v8M30 64h8M90 64h8" />
    </>
  ),
  cross: (
    <>
      <path d="M64 24v80M24 64h80" />
      <rect x="44" y="44" width="40" height="40" />
      <path d="M36 36l16 16M92 36L76 52M36 92l16-16M92 92L76 76" />
    </>
  ),
  node: (
    <>
      <circle cx="64" cy="36" r="10" />
      <circle cx="36" cy="84" r="10" />
      <circle cx="92" cy="84" r="10" />
      <path d="M64 46L42 76M64 46l22 30M46 84h36" />
    </>
  ),
  media: (
    <>
      <rect x="26" y="34" width="76" height="60" rx="2" />
      <path d="M38 78l18-22 14 16 12-10 16 16" />
      <circle cx="48" cy="50" r="6" />
    </>
  ),
}

export function SectorVisualMark({ kind, label }: { kind: VisualKind; label: string }) {
  return (
    <svg className="sector-viz" viewBox="0 0 128 128" aria-hidden="true" focusable="false">
      <title>{label}</title>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        {paths[kind]}
      </g>
    </svg>
  )
}
