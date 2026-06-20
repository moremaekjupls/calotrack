/**
 * Liquid-glass utility classes.
 * Built from plain Tailwind utilities (not a custom CSS class) so they
 * compose correctly with twMerge — a custom class can't reliably win a
 * background/border fight against a component's own `bg-card` etc. across
 * Tailwind's layer order, but a later `bg-[oklch(0.97_0.012_70)]/45` utility always does.
 *
 * Three tiers, by how much legibility the surface needs:
 *  - GLASS_CARD: stat tiles, meal entries — content is short, decorative.
 *  - GLASS_SURFACE: dialogs/forms — inputs need stronger contrast underneath.
 *  - GLASS_BAR: header/bottom nav — thin strips, always-visible chrome.
 */

const SHINE = "shadow-[inset_0_1px_0_0_rgba(255, 248, 238,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)]";

export const GLASS_CARD =
  `bg-[oklch(0.97_0.012_70)]/22 backdrop-blur-xl backdrop-saturate-200 border-[oklch(0.97_0.012_70)]/35 ${SHINE}`;

export const GLASS_SURFACE =
  `bg-[oklch(0.97_0.012_70)]/62 backdrop-blur-xl backdrop-saturate-200 border-[oklch(0.97_0.012_70)]/45 ${SHINE}`;

export const GLASS_BAR =
  "bg-[oklch(0.97_0.012_70)]/32 backdrop-blur-xl backdrop-saturate-200 border-[oklch(0.97_0.012_70)]/25";
