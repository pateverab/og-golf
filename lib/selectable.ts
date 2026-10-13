/**
 * Shared look for selectable options (course / player pickers, 9 vs 18,
 * front / back nine, starting hole, hole count, tabs, toggles, chips).
 *
 * Selected = the whole control filled with the Start New Round gold
 * (`og-accent`) with its text-on-gold (`og-on-accent`). Pressed (:active) =
 * a darker gold (`og-accent-pressed`) with the same text, whether or not the
 * option is already selected. Theme tokens only; values live in app/globals.css.
 */

const PRESSED =
  "active:bg-og-accent-pressed active:text-og-on-accent active:border-og-accent-pressed";

/** Card-style option tile (border width / radius / padding stay with the caller). */
export function optionTileClass(selected: boolean): string {
  return selected
    ? `group bg-og-accent text-og-on-accent border-og-chip-selected-border ${PRESSED}`
    : `group bg-og-surface text-og-text border-og-border ${PRESSED}`;
}

/** Secondary line inside an option tile (stays AA on gold when selected). */
export function optionSubtextClass(selected: boolean): string {
  // group-active: the tile is being pressed (pressed gold fill), so switch to text-on-gold too.
  return selected ? "text-og-on-accent" : "text-og-muted group-active:text-og-on-accent";
}

/** Pill / segment option (tabs, theme toggle, stats player picker). */
export function optionPillClass(selected: boolean): string {
  return selected
    ? `bg-og-accent text-og-on-accent ${PRESSED}`
    : `text-og-accent-text hover:bg-og-raised ${PRESSED}`;
}

/** The pressed-state classes alone, for gold controls styled elsewhere. */
export const OPTION_PRESSED_CLASS = PRESSED;
