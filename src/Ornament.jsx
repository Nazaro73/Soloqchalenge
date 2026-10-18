// Séparateur doré façon client LoL : trait — losange — trait
export function Divider({ className = '' }) {
  return (
    <svg className={`divider ${className}`} viewBox="0 0 240 12" aria-hidden="true" preserveAspectRatio="none">
      <line x1="0" y1="6" x2="104" y2="6" />
      <line x1="136" y1="6" x2="240" y2="6" />
      <path d="M120 0 L126 6 L120 12 L114 6 Z" className="fill" />
      <path d="M108 6 L111 3 L114 6 L111 9 Z M126 6 L129 3 L132 6 L129 9 Z" className="fill-dim" />
    </svg>
  );
}

// Losange hextech du logo
export function HexLogo() {
  return (
    <svg className="hex-logo" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 1 L31 16 L16 31 L1 16 Z" className="outer" />
      <path d="M16 7 L25 16 L16 25 L7 16 Z" className="inner" />
      <path d="M16 12 L20 16 L16 20 L12 16 Z" className="core" />
    </svg>
  );
}

// Titre de section : petit surtitre + titre + séparateur
export function SectionTitle({ eyebrow, children, as: Tag = 'h1' }) {
  return (
    <header className="section-title">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Tag>{children}</Tag>
      <Divider />
    </header>
  );
}
