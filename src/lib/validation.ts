import { z } from 'zod';
import { BP_TOTAL } from './budget';

const bp = z.number().int().min(0).max(BP_TOTAL);
const minor = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const weddingInputSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(100),
  groomName: z.string().trim().min(1, 'Required').max(60),
  brideName: z.string().trim().min(1, 'Required').max(60),
  weddingDate: z.date(),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code'),
  defaultGroomShareBp: bp,
  targetBudgetMinor: minor.nullable().default(null),
});
export type WeddingInput = z.infer<typeof weddingInputSchema>;

export const itemInputSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(120),
  category: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .transform((v) => (v ? v : null)),
  owner: z.enum(['GROOM', 'BRIDE', 'SHARED']),
  groomShareBp: bp,
  costMinor: minor,
  isPaid: z.boolean(),
  isEnabled: z.boolean(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((v) => (v ? v : null)),
  sortOrder: z.number().int(),
});
