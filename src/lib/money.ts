/**
 * Money helpers. Rule (see CLAUDE.md / docs/PROMPT.md): never do money
 * arithmetic with JS floats. Totals are computed in SQL; on the client we
 * only format for display and convert to/from integer minor units when a
 * value must cross a boundary that could introduce float error.
 */

export const DEFAULT_CURRENCY = "KES";
export const DEFAULT_LOCALE = "en-KE";

/** Format a decimal amount as currency for display. */
export function formatMoney(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Convert a decimal amount to integer minor units (e.g. 12.34 -> 1234). */
export function toMinorUnits(amount: number, fractionDigits = 2): number {
  return Math.round(amount * 10 ** fractionDigits);
}

/** Convert integer minor units back to a decimal amount (e.g. 1234 -> 12.34). */
export function fromMinorUnits(minor: number, fractionDigits = 2): number {
  return minor / 10 ** fractionDigits;
}
