import type { ReactNode, SVGProps } from "react";

export type Icon = (props: SVGProps<SVGSVGElement>) => ReactNode;

/** A 24px outline icon; decorative, so hidden from screen readers. */
function outline(paths: ReactNode): Icon {
  return function OutlineIcon(props) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const DashboardIcon = outline(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>,
);

export const ShieldIcon = outline(
  <>
    <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z" />
    <path d="M12 8v4.5M12 15.5h.01" />
  </>,
);

export const SettingsIcon = outline(
  <>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </>,
);

export const AlertIcon = outline(
  <>
    <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </>,
);

export const MenuIcon = outline(<path d="M4 7h16M4 12h16M4 17h16" />);

export const CloseIcon = outline(<path d="M6 6l12 12M18 6 6 18" />);

export const CollapseIcon = outline(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9 4.5v15M15.5 10 13.5 12l2 2" />
  </>,
);

export const ExpandIcon = outline(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9 4.5v15M13.5 10l2 2-2 2" />
  </>,
);

export const SignOutIcon = outline(
  <>
    <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
    <path d="M10 8.5 6.5 12l3.5 3.5M6.5 12H15" />
  </>,
);

export const ChevronLeftIcon = outline(<path d="M14.5 6 8.5 12l6 6" />);

export const ChevronRightIcon = outline(<path d="M9.5 6l6 6-6 6" />);

export const MembersIcon = outline(
  <>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.3A5.5 5.5 0 0 1 20.5 19" />
  </>,
);

export const SessionsIcon = outline(
  <>
    <rect x="3.5" y="4.5" width="17" height="11" rx="1.5" />
    <path d="M9 19.5h6M12 15.5v4" />
  </>,
);
