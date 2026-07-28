/**
 * Inline SVG icon set.
 *
 * Hand-drawn on a 24px grid rather than pulled from an icon library: the set is
 * small, it keeps the bundle free of a dependency, and every glyph can be matched
 * to Typeform's weight (1.6px strokes, round caps) instead of inheriting a
 * library's house style.
 */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** The Typeform wordmark's "T" block. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Typeform" role="img">
      <rect width="32" height="32" rx="9" fill="#262627" />
      <path
        d="M9 11.2h14M16 11.2V21.5"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Svg>
);

export const ChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 14.5l6-6 6 6" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </Svg>
);

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.25" />
    <path d="M15.6 15.6L20 20" />
  </Svg>
);

/** Four squares with a plus — Integrations, and the per-row integrations button. */
export const Puzzle = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.75" y="3.75" width="6.5" height="6.5" rx="1.4" />
    <rect x="3.75" y="13.75" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1.4" />
    <path d="M17 13.75v6.5M13.75 17h6.5" />
  </Svg>
);

/** Brand kit. */
export const Palette = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.75a8.25 8.25 0 000 16.5c1.24 0 1.9-.86 1.9-1.86 0-1.1-.8-1.64-.8-2.5 0-.86.7-1.39 1.6-1.39h1.55a3.75 3.75 0 003.75-3.75C20 6.6 16.42 3.75 12 3.75z" />
    <circle cx="8.4" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.9" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="15.7" cy="9.9" r="1.05" fill="currentColor" stroke="none" />
  </Svg>
);

export const HelpCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M9.6 9.4a2.45 2.45 0 014.75.8c0 1.63-2.35 1.96-2.35 3.4" />
    <circle cx="12" cy="17" r="0.85" fill="currentColor" stroke="none" />
  </Svg>
);

/** Workspaces — a 2x2 grid of squares. */
export const Grid2 = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.6" height="6.6" rx="1.4" />
    <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.4" />
    <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.4" />
    <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.4" />
  </Svg>
);

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 7h2M4.5 12h2M4.5 17h2M9.75 7h9.75M9.75 12h9.75M9.75 17h9.75" />
  </Svg>
);

export const Users = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.4" cy="8.4" r="3.15" />
    <path d="M3.9 19.4a5.6 5.6 0 0111 0" />
    <path d="M16.2 6.1a3.15 3.15 0 010 6.1M17.6 14.7a5.6 5.6 0 013.1 4.7" />
  </Svg>
);

export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.9" y="5.4" width="16.2" height="14.7" rx="2.2" />
    <path d="M3.9 9.6h16.2M8.4 3.9v3M15.6 3.9v3" />
  </Svg>
);

export const Dots = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.6" cy="12" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="18.4" cy="12" r="1.35" fill="currentColor" stroke="none" />
  </Svg>
);

export const Forms = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4" />
    <path d="M9.1 4.6v14.8M12.4 9.4h5.3M12.4 13.1h3.4" />
  </Svg>
);

export const Contacts = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.6" r="3.35" />
    <path d="M5.6 19.6a6.4 6.4 0 0112.8 0" />
  </Svg>
);

export const Automations = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.4" cy="6.9" r="2.4" />
    <circle cx="17.6" cy="17.1" r="2.4" />
    <path d="M8.8 6.9h5.1a3.7 3.7 0 010 7.4h-4a3.7 3.7 0 00-3.5 2.8" />
  </Svg>
);

export const ResearchFlow = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="4.4" width="12.2" height="15.2" rx="2.2" />
    <path d="M6.9 9h5.6M6.9 12.6h3.4" />
    <path d="M17.4 6.6v5.2M14.8 9.2h5.2" />
  </Svg>
);

export const Mic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9.4" y="3.4" width="5.2" height="10.2" rx="2.6" />
    <path d="M6.4 11.6a5.6 5.6 0 0011.2 0M12 17.2v3.4" />
  </Svg>
);

export const Send = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.6 6.4l7.6 5.6-7.6 5.6V6.4z" />
  </Svg>
);

/**
 * The outlined right-pointing triangle on the Share button.
 *
 * Drawn open (no enclosing box) so it reads as "send" rather than "play".
 */
export const ShareArrow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.6 4.2l13.6 7.8-13.6 7.8V4.2z" />
  </Svg>
);

export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16.2 4.6l3.2 3.2-10 10-4.2 1 1-4.2 10-10z" />
  </Svg>
);

export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.6" y="8.6" width="11" height="11" rx="2.2" />
    <path d="M15.4 5.4H6.6a2.2 2.2 0 00-2.2 2.2v8.8" />
  </Svg>
);

export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.8 7.4h14.4M9.4 7.4V5.6a1.4 1.4 0 011.4-1.4h2.4a1.4 1.4 0 011.4 1.4v1.8" />
    <path d="M6.6 7.4l.9 11.2a1.8 1.8 0 001.8 1.6h5.4a1.8 1.8 0 001.8-1.6l.9-11.2" />
  </Svg>
);

export const Link = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.4 13.6a3.6 3.6 0 010-5.1l2.4-2.4a3.6 3.6 0 015.1 5.1l-1.1 1.1" />
    <path d="M13.6 10.4a3.6 3.6 0 010 5.1l-2.4 2.4a3.6 3.6 0 01-5.1-5.1l1.1-1.1" />
  </Svg>
);

export const ExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.2 4.6h5.2v5.2M19.4 4.6l-7.6 7.6" />
    <path d="M17 14v3.8a1.8 1.8 0 01-1.8 1.8H6.4a1.8 1.8 0 01-1.8-1.8V9a1.8 1.8 0 011.8-1.8H10" />
  </Svg>
);

export const Globe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M3.8 12h16.4M12 3.8a13 13 0 010 16.4M12 3.8a13 13 0 000 16.4" />
  </Svg>
);

export const EyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.2 4.2l15.6 15.6" />
    <path d="M9.6 5.2A8.6 8.6 0 0112 5c5 0 8.4 4.6 8.4 7 0 .8-.5 1.9-1.4 3M6.4 7.3C4.5 8.8 3.6 10.7 3.6 12c0 2.4 3.4 7 8.4 7 1.2 0 2.3-.3 3.3-.7" />
    <path d="M10.2 10.4a2.4 2.4 0 003.4 3.4" />
  </Svg>
);

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 12.6l4.2 4.2 9-9.6" />
  </Svg>
);

export const AlertCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 8v4.6" />
    <circle cx="12" cy="16.2" r="0.85" fill="currentColor" stroke="none" />
  </Svg>
);

export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />
  </Svg>
);

export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.2l1.8 4.6 4.6 1.8-4.6 1.8L12 17l-1.8-4.6L5.6 10.6l4.6-1.8L12 4.2z" />
  </Svg>
);

export const BarChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 19.2V13M12 19.2V5.4M18.6 19.2v-8.4" />
  </Svg>
);
