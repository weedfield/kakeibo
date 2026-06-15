interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const base = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function IconBalance({ size = 24, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="2" y="8" width="20" height="13" rx="2" />
      <path d="M2 12h20" />
      <path d="M6 12V7a6 6 0 0 1 12 0v5" />
    </svg>
  );
}

export function IconHistory({ size = 24, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 15,15" />
    </svg>
  );
}

export function IconPlus({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconAnalytics({ size = 24, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  );
}

export function IconSettings({ size = 24, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="7" cy="6" r="2" fill="white" />
      <circle cx="15" cy="12" r="2" fill="white" />
      <circle cx="9" cy="18" r="2" fill="white" />
    </svg>
  );
}

export function IconChevronDown({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconShare({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export function IconClose({ size = 24, strokeWidth = 2.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
