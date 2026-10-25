// Small monochrome glyphs (1.5–2 px strokes, per DESIGN.md → Imagery). They
// inherit `currentColor` and are always decorative: the text next to them
// carries the meaning.

type IconoProps = { className?: string };

export function IconoCheckCirculo({ className }: IconoProps) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoCirculo({ className }: IconoProps) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconoCheck({ className }: IconoProps) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className={className}>
      <path d="M3 8.5l3 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoAlerta({ className }: IconoProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="8.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="14.25" r="1.1" fill="currentColor" />
    </svg>
  );
}

/** Nivela glyph: four ascending bars, one per behavior level. Original mark. */
export function MarcaNivela({ className }: IconoProps) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className={className}>
      <rect x="1" y="13" width="3.5" height="6" rx="1.75" fill="currentColor" opacity="0.35" />
      <rect x="5.83" y="9" width="3.5" height="10" rx="1.75" fill="currentColor" opacity="0.55" />
      <rect x="10.66" y="5" width="3.5" height="14" rx="1.75" fill="currentColor" opacity="0.75" />
      <rect x="15.5" y="1" width="3.5" height="18" rx="1.75" fill="currentColor" />
    </svg>
  );
}

/** Trailing ">" on rows that open another screen. */
export function IconoChevron({ className }: IconoProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
      <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
