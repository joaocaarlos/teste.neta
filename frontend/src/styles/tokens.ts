/**
 * Design tokens — single source of truth for all visual constants.
 * These mirror the CSS custom properties in global.ts so TypeScript
 * components can reference tokens without string literals.
 */

export const color = {
  // Backgrounds
  bg:        "var(--bg)",
  bg2:       "var(--bg2)",
  bg3:       "var(--bg3)",
  bg4:       "var(--bg4)",

  // Borders
  border:    "var(--border)",
  border2:   "var(--border2)",

  // Brand
  amber:     "var(--amber)",
  amber2:    "var(--amber2)",
  amberDim:  "var(--amber-dim)",
  amberDim2: "var(--amber-dim2)",

  // Semantic
  green:     "var(--green)",
  red:       "var(--red)",
  blue:      "var(--blue)",
  purple:    "var(--purple)",
  orange:    "var(--orange)",

  // Text
  white:     "var(--white)",
  white2:    "var(--white2)",
  white3:    "var(--white3)",
} as const;

export const font = {
  condensed: "var(--cond)",
  body:      "var(--body)",
  mono:      "var(--mono)",
} as const;

export const radius = {
  none: 0,
  sm:   2,
  md:   4,
  lg:   8,
} as const;

export const space = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  36,
  xxl: 56,
} as const;

export const fontSize = {
  label:   "10px",
  caption: "11px",
  body:    "14px",
  lg:      "16px",
  h3:      "20px",
  h2:      "clamp(24px,3vw,40px)",
  hero:    "clamp(28px,4vw,56px)",
} as const;

export const transition = {
  fast:   "all 0.15s ease",
  normal: "all 0.2s ease",
  slow:   "all 0.4s ease",
} as const;
