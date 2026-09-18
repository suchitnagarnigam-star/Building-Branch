import type { ReactNode } from "react";

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons: Record<string, (className: string) => ReactNode> = {
  dashboard: (className) => (
    <svg {...commonProps} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="12" width="7" height="9" rx="1.5" />
    </svg>
  ),
  new: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M12 5v14M5 12h14" />
      <path d="M7 7h10v10H7z" opacity="0.2" />
    </svg>
  ),
  list: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
  folder: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  user: (className) => (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </svg>
  ),
  clock: (className) => (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  chart: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M4 18h16" />
      <path d="M8 15V9" />
      <path d="M12 15V5" />
      <path d="M16 15v-6" />
    </svg>
  ),
  users: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="7" r="3" />
      <path d="M16 8a3 3 0 1 1 0 6M20 19v-1a4 4 0 0 0-3-3.87" />
    </svg>
  ),
  settings: (className) => (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15.13 20a1.7 1.7 0 0 0-1 .61L13.8 21a2 2 0 0 1-3.4 0l-.1-.18a1.7 1.7 0 0 0-1-.61 1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4 15.13a1.7 1.7 0 0 0-.61-1L3.2 13.8a2 2 0 0 1 0-3.4l.18-.1a1.7 1.7 0 0 0 .61-1A1.7 1.7 0 0 0 3.38 8.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.87 4a1.7 1.7 0 0 0 1-.61L10.2 3.2a2 2 0 0 1 3.4 0l.1.18c.2.28.45.5.73.61.38.16.78.2 1.17.13l.12-.02c.42-.08.8-.27 1.13-.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 20 8.87c.2.29.4.55.6.82.3.4.5.83.6 1.3.1.33.1.67 0 1l-.02.12a1.7 1.7 0 0 0-.13 1.17c.12.35.4.63.69.82l.18.1a2 2 0 0 1 0 3.4l-.18.1a1.7 1.7 0 0 0-.69.82z" />
    </svg>
  ),
  search: (className) => (
    <svg {...commonProps} className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  ),
  bell: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h11" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  download: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M12 4v10" />
      <path d="m7 19 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  ),
  eye: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  upload: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  ),
  map: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Z" />
      <path d="M9 6v12M15 4v12" />
    </svg>
  ),
  edit: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  ),
  file: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
    </svg>
  ),
  menu: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  arrow: (className) => (
    <svg {...commonProps} className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  check: (className) => (
    <svg {...commonProps} className={className}>
      <path d="m5 13 4 4L19 3" />
    </svg>
  ),
  "check-circle": (className) => (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  close: (className) => (
    <svg {...commonProps} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ),
  sparkles: (className) => (
    <svg {...commonProps} className={className}>
      <path d="m12 2 1.7 4.3L18 8l-4.3 1.7L12 14l-1.7-4.3L6 8l4.3-1.7L12 2Z" />
      <path d="m18 14 1 2.5L21.5 18 19 19l-1 2.5L17 19l-2.5-1 2.5-1 1-2.5Z" />
    </svg>
  ),
  info: (className) => (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>
  ),
  alert: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  ),
  logout: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  calendar: (className) => (
    <svg {...commonProps} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  pin: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  "arrow-right": (className) => (
    <svg {...commonProps} className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  camera: (className) => (
    <svg {...commonProps} className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
};

type IconProps = {
  name: string;
  className?: string;
};

function Icon({ name, className = "" }: IconProps) {
  const render = icons[name] ?? icons.dashboard;
  return <>{render(className)}</>;
}

export default Icon;
