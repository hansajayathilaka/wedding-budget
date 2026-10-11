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

/** Single source of truth for owner colors (tokens defined in globals.css). */
export const ownerStyles: Record<Owner, OwnerStyle> = {
  GROOM: {
    label: 'Groom',
    border: 'border-l-groom',
    badge: 'bg-groom-soft text-groom-ink',
    bar: 'bg-groom',
    text: 'text-groom-ink',
    selected: 'bg-groom text-white',
  },
  BRIDE: {
    label: 'Bride',
    border: 'border-l-bride',
    badge: 'bg-bride-soft text-bride-ink',
    bar: 'bg-bride',
    text: 'text-bride-ink',
    selected: 'bg-bride text-white',
  },
  SHARED: {
    label: 'Shared',
    border: 'border-l-shared',
    badge: 'bg-shared-soft text-shared-ink',
    bar: 'bg-shared',
    text: 'text-shared-ink',
    selected: 'bg-shared text-white',
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
