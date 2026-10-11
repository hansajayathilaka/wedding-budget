'use client';

import { useEffect, useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatMoney, minorToInput, parseMoney } from '@/lib/money';
import { CATEGORY_SUGGESTIONS, ownerStyles } from '@/lib/owner-styles';
import { OWNERS, type Item, type ItemInput, type Owner } from '@/lib/types';
import { itemInputSchema } from '@/lib/validation';
import { splitItem } from '@/lib/budget';
import { cn } from '@/lib/utils';
import { ShareRatioInput } from './share-ratio-input';

interface FormValues {
  name: string;
  category: string;
  cost: string;
  owner: Owner;
  groomShareBp: number;
  notes: string;
  isPaid: boolean;
  isEnabled: boolean;
}

export function ItemFormSheet({
  open,
  item,
  currency,
  defaultGroomShareBp,
  groomName,
  brideName,
  usedCategories,
  onOpenChange,
  onSubmit,
}: {
  /** `item` null while open means "add" */
  open: boolean;
  item: Item | null;
  currency: string;
  defaultGroomShareBp: number;
  groomName: string;
  brideName: string;
  usedCategories: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<ItemInput, 'sortOrder'>, existing: Item | null) => void;
}) {
  const listId = useId();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  // reset whenever the sheet opens, so "add" starts blank and "edit" starts with the item
  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            name: item.name,
            category: item.category ?? '',
            cost: minorToInput(item.costMinor, currency),
            owner: item.owner,
            groomShareBp: item.groomShareBp,
            notes: item.notes ?? '',
            isPaid: item.isPaid,
            isEnabled: item.isEnabled,
          }
        : {
            name: '',
            category: '',
            cost: '',
            owner: 'SHARED',
            groomShareBp: defaultGroomShareBp,
            notes: '',
            isPaid: false,
            isEnabled: true,
          },
    );
  }, [open, item, currency, defaultGroomShareBp, reset]);

  const [owner, groomShareBp, cost] = watch(['owner', 'groomShareBp', 'cost']);
  const costMinor = parseMoney(cost ?? '', currency);
  const preview =
    owner === 'SHARED' && costMinor != null ? splitItem({ owner, groomShareBp, costMinor }) : null;

  const suggestions = [...new Set([...usedCategories, ...CATEGORY_SUGGESTIONS])];

  function submit(values: FormValues) {
    const minor = parseMoney(values.cost, currency);
    if (minor == null) return; // guarded by field validation below
    const parsed = itemInputSchema.safeParse({
      name: values.name,
      category: values.category || null,
      owner: values.owner,
      groomShareBp: values.groomShareBp,
      costMinor: minor,
      isPaid: values.isPaid,
      isEnabled: values.isEnabled,
      notes: values.notes || null,
      sortOrder: item?.sortOrder ?? 0,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }
    const { sortOrder: _ignored, ...input } = parsed.data;
    void _ignored;
    onSubmit(input, item);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit item' : 'Add item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Changes are saved straight away.' : 'Add something to the budget.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="if-name">Name</Label>
            <Input
              id="if-name"
              placeholder="e.g. Reception hall"
              aria-invalid={!!errors.name}
              {...register('name', {
                validate: (v) => v.trim().length > 0 || 'Give the item a name',
                maxLength: { value: 120, message: 'Too long' },
              })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="if-cost">Cost ({currency})</Label>
              <Input
                id="if-cost"
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={!!errors.cost}
                {...register('cost', {
                  validate: (v) =>
                    parseMoney(v, currency) != null || 'Enter an amount like 1250.50',
                })}
              />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="if-category">Category</Label>
              <Input
                id="if-category"
                list={listId}
                placeholder="Venue, Catering…"
                autoComplete="off"
                {...register('category', { maxLength: 60 })}
              />
              <datalist id={listId}>
                {suggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label id="if-owner-label">Who pays</Label>
            <Controller
              control={control}
              name="owner"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-labelledby="if-owner-label"
                  className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
                >
                  {OWNERS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={field.value === o}
                      onClick={() => field.onChange(o)}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        field.value === o ? ownerStyles[o].selected : 'hover:bg-background',
                      )}
                    >
                      {o === 'GROOM' ? groomName : o === 'BRIDE' ? brideName : 'Shared'}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {owner === 'SHARED' && (
            <div className="grid gap-2 rounded-lg border p-3" data-testid="ratio-section">
              <Label>Split</Label>
              <Controller
                control={control}
                name="groomShareBp"
                render={({ field }) => (
                  <ShareRatioInput
                    idPrefix="if-ratio"
                    value={field.value}
                    onChange={field.onChange}
                    groomName={groomName}
                    brideName={brideName}
                  />
                )}
              />
              {preview && (
                <p className="text-xs text-muted-foreground" data-testid="split-preview">
                  {groomName} pays {formatMoney(preview.groom, currency)} · {brideName} pays{' '}
                  {formatMoney(preview.bride, currency)}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="if-notes">Notes</Label>
            <Textarea id="if-notes" rows={2} {...register('notes', { maxLength: 2000 })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              Already paid
              <Controller
                control={control}
                name="isPaid"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Paid"
                  />
                )}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              Include in budget
              <Controller
                control={control}
                name="isEnabled"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Enabled"
                  />
                )}
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? 'Save changes' : 'Add item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
