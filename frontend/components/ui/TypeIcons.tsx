/**
 * Icons for question types and the element picker.
 *
 * Kept apart from the general `Icons.tsx` set because these are addressed by
 * name from the type registry rather than imported individually, and because
 * they share a heavier 1.7px stroke to read correctly at 18px inside a tinted tile.
 */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---- The eight question types, plus the two screen glyphs and Video ---- */

export const IconShortText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8.5h16M4 14h9" />
  </Svg>
);

export const IconLongText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5h16M4 11h16M4 15.5h16M4 20h9" />
  </Svg>
);

export const IconMultipleChoice = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.2 7.8h2.6M4.2 12h2.6M4.2 16.2h2.6" strokeWidth={2.2} />
    <path d="M10.4 7.8h9.4M10.4 12h9.4M10.4 16.2h6" />
  </Svg>
);

export const IconDropdown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 10l5 5 5-5" strokeWidth={2} />
  </Svg>
);

export const IconEmail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.4" />
    <path d="M3.6 8l7.3 5.1a2 2 0 002.2 0L20.4 8" />
  </Svg>
);

export const IconNumber = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.4 3.8L7.6 20.2M16.4 3.8l-1.8 16.4M4.2 8.8h16M3.4 15.2h16" />
  </Svg>
);

export const IconYesNo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.3" />
    <path d="M6.2 17.8L17.8 6.2" />
  </Svg>
);

export const IconRating = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.1l2.42 4.9 5.41.79-3.92 3.82.93 5.39L12 16.45l-4.84 2.55.93-5.39L4.17 9.79l5.41-.79L12 4.1z" />
  </Svg>
);

export const IconVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.4" />
    <path d="M10.4 9.6l4.4 2.4-4.4 2.4V9.6z" />
  </Svg>
);

export const IconWelcomeScreen = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="4.4" width="6.2" height="15.2" rx="1.8" />
    <rect x="12.4" y="4.4" width="8" height="15.2" rx="1.8" />
  </Svg>
);

export const IconEndScreen = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="4.4" width="8" height="15.2" rx="1.8" />
    <rect x="14.2" y="4.4" width="6.2" height="15.2" rx="1.8" />
  </Svg>
);
