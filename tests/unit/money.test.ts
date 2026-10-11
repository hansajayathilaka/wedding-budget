import { describe, expect, it } from 'vitest';
import { formatMoney, minorDigits, minorToInput, parseMoney } from '@/lib/money';

describe('parseMoney', () => {
  it('parses grouped decimals', () => expect(parseMoney('1,250.50')).toBe(125050));
  it('parses integers', () => expect(parseMoney('1250')).toBe(125000));
  it('pads a single decimal', () => expect(parseMoney('12.5')).toBe(1250));
  it('accepts a trailing dot', () => expect(parseMoney('12.')).toBe(1200));
  it('ignores spaces', () => expect(parseMoney(' 1 000 ')).toBe(100000));
  it('has no float drift', () => expect(parseMoney('0.29')).toBe(29));
  it('rejects too many decimals', () => expect(parseMoney('1.234')).toBeNull());
  it('rejects negatives and junk', () => {
    expect(parseMoney('-5')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
  it('rejects unsafe integers', () => expect(parseMoney('99999999999999999999')).toBeNull());
  it('respects zero-decimal currencies', () => {
    expect(minorDigits('JPY')).toBe(0);
    expect(parseMoney('1500', 'JPY')).toBe(1500);
    expect(parseMoney('1500.5', 'JPY')).toBeNull();
  });
  it('falls back to 2 digits for unknown currency codes', () => {
    expect(minorDigits('???')).toBe(2);
  });
});

describe('minorToInput', () => {
  it('round-trips', () => {
    expect(minorToInput(125050)).toBe('1250.50');
    expect(minorToInput(5)).toBe('0.05');
    expect(minorToInput(0)).toBe('0.00');
    expect(parseMoney(minorToInput(98765))).toBe(98765);
  });
  it('handles zero-decimal currencies', () => expect(minorToInput(1500, 'JPY')).toBe('1500'));
});

describe('formatMoney', () => {
  it('formats with the currency', () => {
    expect(formatMoney(125050, 'USD', 'en-US')).toBe('$1,250.50');
  });
  it('formats zero-decimal currencies', () => {
    expect(formatMoney(1500, 'JPY', 'en-US')).toContain('1,500');
  });
  it('falls back for invalid currency codes', () => {
    expect(formatMoney(1050, 'not-a-code')).toBe('not-a-code 10.50');
  });
});
