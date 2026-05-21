type IconProps = React.SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...props,
});

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="6" height="8" rx="1.5" />
      <rect x="3" y="13" width="6" height="4" rx="1.5" />
      <rect x="11" y="3" width="6" height="4" rx="1.5" />
      <rect x="11" y="9" width="6" height="8" rx="1.5" />
    </svg>
  );
}

export function IconAccounts(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 16.5c1.2-2.6 3.5-4 6-4s4.8 1.4 6 4" />
    </svg>
  );
}

export function IconReports(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="12" height="14" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="2.4" />
      <path d="M16 10a6 6 0 0 0-.08-1l1.4-1.1-1.5-2.6-1.7.6a6 6 0 0 0-1.7-1l-.3-1.8h-3l-.3 1.8a6 6 0 0 0-1.7 1l-1.7-.6L3.7 7.9 5.1 9c-.06.3-.1.6-.1 1s.04.7.1 1l-1.4 1.1 1.5 2.6 1.7-.6c.5.4 1.1.8 1.7 1l.3 1.8h3l.3-1.8c.6-.2 1.2-.6 1.7-1l1.7.6 1.5-2.6L15.92 11c.05-.3.08-.6.08-1Z" />
    </svg>
  );
}

export function IconHamburger(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 14c0-3 .5-4 1.5-5 0-2 1-4 3.5-4s3.5 2 3.5 4c1 1 1.5 2 1.5 5H5Z" />
      <path d="M8.5 16.5c.3.6.9 1 1.5 1s1.2-.4 1.5-1" />
    </svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M12 4l-6 6 6 6" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function IconSidebar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <path d="M8 3v14" />
    </svg>
  );
}

export function IconTeam(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="13" cy="8" r="2" />
      <path d="M2.5 16c.9-2 2.5-3 4.5-3s3.6 1 4.5 3" />
      <path d="M11.5 14c.6-.8 1.4-1.3 2.5-1.3 1.6 0 2.8.9 3.5 2.3" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="9" r="5" />
      <path d="M13 13l3.5 3.5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M8 4l6 6-6 6" />
    </svg>
  );
}

export function IconArrowUp(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M10 16V4M5 9l5-5 5 5" />
    </svg>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M10 4v12M5 11l5 5 5-5" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

export function IconSignOut(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4" />
      <path d="M13 6l4 4-4 4" />
      <path d="M17 10H8" />
    </svg>
  );
}

// "Open in new window" / external link glyph — box with an arrow
// pointing up-right out of the top-right corner. Used on account
// tiles for the "View on TikTok" shortcut (desktop only).
export function IconExternalLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5H4v11h11v-5" />
      <path d="M11 4h5v5" />
      <path d="M16 4l-7 7" />
    </svg>
  );
}
