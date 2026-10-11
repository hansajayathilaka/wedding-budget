'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { useUser } from '@/components/auth/auth-provider';
import { ShareRatioInput } from '@/components/items/share-ratio-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createWedding } from '@/data/weddings';
import { fromDateTimeInput, toDateTimeInput } from '@/lib/countdown';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/money';
import { weddingInputSchema } from '@/lib/validation';

interface FormValues {
  name: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  currency: string;
  defaultGroomShareBp: number;
}

function defaultDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1, d.getMonth(), d.getDate());
  d.setHours(10, 0, 0, 0);
  return toDateTimeInput(d);
}

export function CreateWeddingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useUser();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      groomName: '',
      brideName: '',
      weddingDate: defaultDate(),
      currency: DEFAULT_CURRENCY,
      defaultGroomShareBp: 5000,
    },
  });
  const [groomName, brideName] = watch(['groomName', 'brideName']);

  async function onSubmit(values: FormValues) {
    const date = fromDateTimeInput(values.weddingDate);
    const parsed = weddingInputSchema.safeParse({
      ...values,
      weddingDate: date,
      targetBudgetMinor: null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }
    setSubmitting(true);
    try {
      const { id, written } = createWedding(parsed.data, user);
      await written;
      // replace, not push: the list must not be reachable through the browser Back button (D1)
      router.replace(`/w/${id}`);
    } catch {
      toast.error('Could not create the wedding. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New wedding</DialogTitle>
          <DialogDescription>You can change all of this later in Settings.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="cw-name">Wedding name</Label>
            <Input
              id="cw-name"
              placeholder="Hansa & Nimali's Wedding"
              aria-invalid={!!errors.name}
              {...register('name', { required: 'Give the wedding a name', maxLength: 100 })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cw-groom">Groom</Label>
              <Input
                id="cw-groom"
                aria-invalid={!!errors.groomName}
                {...register('groomName', { required: 'Required', maxLength: 60 })}
              />
              {errors.groomName && (
                <p className="text-xs text-destructive">{errors.groomName.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cw-bride">Bride</Label>
              <Input
                id="cw-bride"
                aria-invalid={!!errors.brideName}
                {...register('brideName', { required: 'Required', maxLength: 60 })}
              />
              {errors.brideName && (
                <p className="text-xs text-destructive">{errors.brideName.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cw-date">Wedding date</Label>
              <Input
                id="cw-date"
                type="datetime-local"
                {...register('weddingDate', { required: 'Required' })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cw-currency">Currency</Label>
              <Select id="cw-currency" {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Default split for shared items</Label>
            <Controller
              control={control}
              name="defaultGroomShareBp"
              render={({ field }) => (
                <ShareRatioInput
                  idPrefix="cw-ratio"
                  value={field.value}
                  onChange={field.onChange}
                  groomName={groomName || 'Groom'}
                  brideName={brideName || 'Bride'}
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create wedding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
