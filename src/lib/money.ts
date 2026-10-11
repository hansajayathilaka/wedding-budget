/** Money is always an integer number of minor units (cents). No floating-point math. */

export const DEFAULT_CURRENCY = 'LKR';

export const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'AED', 'SGD'] as const;

/** Number of minor-unit digits for a currency (2 for LKR/USD, 0 for JPY...). */
export function minorDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    return 2;
  }
}

/**
 * Parse user input such as "1,250.50" or "1250" into minor units.
 * Returns null for anything that is not a non-negative amount.
 */
export function parseMoney(input: string, currency = DEFAULT_CURRENCY): number | null {
  const digits = minorDigits(currency);
  const cleaned = input.trim().replace(/[\s,]/g, '');
  const match = /^(\d+)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;
  const whole = match[1];
  const fraction = match[2] ?? '';
  if (fraction.length > digits) return null;
  const minor = Number(whole + fraction.padEnd(digits, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Plain editable representation, e.g. 125050 -> "1250.50". */
export function minorToInput(minor: number, currency = DEFAULT_CURRENCY): string {
  const digits = minorDigits(currency);
  if (digits === 0) return String(minor);
  const base = 10 ** digits;
  const whole = Math.trunc(minor / base);
  const frac = String(Math.abs(minor % base)).padStart(digits, '0');
  return `${whole}.${frac}`;
}

export function formatMoney(minor: number, currency = DEFAULT_CURRENCY, locale?: string): string {
  const digits = minorDigits(currency);
  const value = minor / 10 ** digits;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(digits)}`;
  }
}
