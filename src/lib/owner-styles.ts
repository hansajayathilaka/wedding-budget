import type { Owner } from './types';

export interface OwnerStyle {
  label: string;
  /** 4px left border on a row */
  border: string;
  badge: string;
  /** solid fill for bars / chart segments */
  bar: string;
  text: string;
  selected: string;
}

/** Single source of truth for owner colors (groom = sky, bride = rose, shared = violet). */
export const ownerStyles: Record<Owner, OwnerStyle> = {
  GROOM: {
    label: 'Groom',
    border: 'border-l-sky-600',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    bar: 'bg-sky-600',
    text: 'text-sky-600 dark:text-sky-400',
    selected: 'bg-sky-600 text-white',
  },
  BRIDE: {
    label: 'Bride',
    border: 'border-l-rose-600',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    bar: 'bg-rose-600',
    text: 'text-rose-600 dark:text-rose-400',
    selected: 'bg-rose-600 text-white',
  },
  SHARED: {
    label: 'Shared',
    border: 'border-l-violet-600',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    bar: 'bg-violet-600',
    text: 'text-violet-600 dark:text-violet-400',
    selected: 'bg-violet-600 text-white',
  },
};

export const CATEGORY_SUGGESTIONS = [
  'Venue',
  'Catering',
  'Attire',
  'Photography',
  'Decoration',
  'Music & Entertainment',
  'Transport',
  'Rings & Jewelry',
  'Invitations',
  'Flowers',
  'Honeymoon',
  'Other',
] as const;
