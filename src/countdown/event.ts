/**
 * Single source of truth for the qualifier brief.
 * No event data existed in the codebase before this section, so every
 * displayed detail is driven from here and can be corrected in one place.
 */
export const EVENT = {
  // Online qualifier opens 20 February 2027, 09:00 UTC.
  targetIso: '2027-02-20T09:00:00.000Z',
  details: [
    { label: 'Qualifier dates', value: '20–21 February 2027' },
    { label: 'Duration', value: '24 hours' },
    { label: 'Format', value: 'Remote · Online' },
    { label: 'Finals', value: 'On-site · Location TBA' },
    { label: 'Team size', value: '1–4 operators' },
  ],
} as const
