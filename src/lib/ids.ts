import { customAlphabet } from 'nanoid';

// No look-alike characters (0/o, 1/l/i) so URLs are easy to read out loud.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const generate = customAlphabet(ALPHABET, 10);

/** 10-char random wedding id, used as the Firestore document id and URL segment. */
export function newWeddingId(): string {
  return generate();
}

export function isWeddingId(value: string): boolean {
  return /^[2-9a-hjkmnp-z]{10}$/.test(value);
}
