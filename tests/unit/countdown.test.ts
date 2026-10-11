import { describe, expect, it } from 'vitest';
import { countdownLabel, fromDateTimeInput, getCountdown, toDateTimeInput } from '@/lib/countdown';

const at = (s: string) => new Date(s);

describe('getCountdown', () => {
  it('counts down in days, hours, minutes and seconds', () => {
    expect(getCountdown(at('2030-01-03T12:30:45'), at('2030-01-01T10:00:00'))).toEqual({
      phase: 'before',
      days: 2,
      hours: 2,
      minutes: 30,
      seconds: 45,
    });
  });
  it('is "today" on the day of the wedding, before and after the time', () => {
    expect(getCountdown(at('2030-01-01T15:00:00'), at('2030-01-01T08:00:00'))).toEqual({
      phase: 'today',
    });
    expect(getCountdown(at('2030-01-01T15:00:00'), at('2030-01-01T23:00:00'))).toEqual({
      phase: 'today',
    });
  });
  it('reports days since after the wedding', () => {
    expect(getCountdown(at('2030-01-01T15:00:00'), at('2030-01-11T09:00:00'))).toEqual({
      phase: 'after',
      daysAgo: 10,
    });
  });
});

describe('countdownLabel', () => {
  const target = at('2030-01-11T15:00:00');
  it('formats days to go', () => {
    expect(countdownLabel(target, at('2030-01-01T09:00:00'))).toBe('10 days to go');
    expect(countdownLabel(target, at('2030-01-10T09:00:00'))).toBe('1 day to go');
  });
  it('formats today and after', () => {
    expect(countdownLabel(target, at('2030-01-11T09:00:00'))).toContain('Today');
    expect(countdownLabel(target, at('2030-01-12T09:00:00'))).toBe('Married 1 day ago');
    expect(countdownLabel(target, at('2030-01-14T09:00:00'))).toBe('Married 3 days ago');
  });
});

describe('datetime-local helpers', () => {
  it('round-trips', () => {
    const d = at('2030-06-09T14:05:00');
    expect(toDateTimeInput(d)).toBe('2030-06-09T14:05');
    expect(fromDateTimeInput('2030-06-09T14:05')?.getTime()).toBe(d.getTime());
  });
  it('returns null for junk', () => expect(fromDateTimeInput('nope')).toBeNull());
});
