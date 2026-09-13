import React from "react";

/**
 * Brand glyphs for the footer's social links. lucide-react 1.x dropped its
 * brand icons, so these are drawn here in the same 24px stroke style.
 */
type IconProps = { className?: string };

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const InstagramIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

export const FacebookIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const TikTokIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M15.5 3c.3 2.6 2.1 4.4 4.5 4.6" />
    <path d="M15.5 3v11.5a4.5 4.5 0 1 1-4.5-4.5" />
  </svg>
);

export const YoutubeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

export const XIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 4l11.7 16H20L8.3 4z" />
    <path d="M4 20l6.8-6.8M20 4l-6.8 6.8" />
  </svg>
);
