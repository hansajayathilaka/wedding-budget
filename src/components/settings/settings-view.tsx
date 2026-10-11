'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useUser } from '@/components/auth/auth-provider';
import { ShareRatioInput } from '@/components/items/share-ratio-input';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { approveRequest, denyRequest, removeMember, useAccessRequests } from '@/data/access';
import { deleteWedding, updateWedding } from '@/data/weddings';
import { fromDateTimeInput, toDateTimeInput } from '@/lib/countdown';
import { CURRENCIES, minorToInput, parseMoney } from '@/lib/money';
import { notifyOnError } from '@/lib/notify';
import { weddingInputSchema } from '@/lib/validation';

export function SettingsView() {
  const { wedding } = useWorkspace();
  const user = useUser();
  const isOwner = wedding.ownerId === user.uid;

  return (
    <div className="space-y-4">
      <DetailsCard />
      <MembersCard isOwner={isOwner} />
      {isOwner && <DangerZone />}
    </div>
  );
}

interface DetailsValues {
  name: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  currency: string;
  defaultGroomShareBp: number;
  target: string;
}

function DetailsCard() {
  const { wedding } = useWorkspace();
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DetailsValues>({
    values: {
      name: wedding.name,
      groomName: wedding.groomName,
      brideName: wedding.brideName,
      weddingDate: toDateTimeInput(wedding.weddingDate),
      currency: wedding.currency,
      defaultGroomShareBp: wedding.defaultGroomShareBp,
      target:
        wedding.targetBudgetMinor == null
          ? ''
          : minorToInput(wedding.targetBudgetMinor, wedding.currency),
    },
  });
  const [groomName, brideName] = watch(['groomName', 'brideName']);

  async function onSubmit(v: DetailsValues) {
    const date = fromDateTimeInput(v.weddingDate);
    const target = v.target.trim() === '' ? null : parseMoney(v.target, v.currency);
    if (v.target.trim() !== '' && target == null) {
      toast.error('Target budget must be an amount like 1500000.00');
      return;
    }
    const parsed = weddingInputSchema.safeParse({
      name: v.name,
      groomName: v.groomName,
      brideName: v.brideName,
      weddingDate: date,
      currency: v.currency,
      defaultGroomShareBp: v.defaultGroomShareBp,
      targetBudgetMinor: target,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }
    try {
      await updateWedding(wedding.id, parsed.data);
      toast.success('Saved');
      reset(v);
    } catch {
      toast.error('Could not save the changes.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wedding details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="s-name">Wedding name</Label>
            <Input
              id="s-name"
              aria-invalid={!!errors.name}
              {...register('name', { required: 'Required', maxLength: 100 })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="s-groom">Groom</Label>
              <Input
                id="s-groom"
                {...register('groomName', { required: 'Required', maxLength: 60 })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-bride">Bride</Label>
              <Input
                id="s-bride"
                {...register('brideName', { required: 'Required', maxLength: 60 })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-1">
              <Label htmlFor="s-date">Date & time</Label>
              <Input
                id="s-date"
                type="datetime-local"
                {...register('weddingDate', { required: true })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-currency">Currency</Label>
              <Select id="s-currency" {...register('currency')}>
                {[...new Set([wedding.currency, ...CURRENCIES])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-target">Target budget (optional)</Label>
              <Input id="s-target" inputMode="decimal" placeholder="—" {...register('target')} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Changing the currency only changes how amounts are shown; it does not convert them.
          </p>
          <div className="grid gap-1.5">
            <Label>Default split for shared items</Label>
            <Controller
              control={control}
              name="defaultGroomShareBp"
              render={({ field }) => (
                <ShareRatioInput
                  idPrefix="s-ratio"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  groomName={groomName}
                  brideName={brideName}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Used when you add a new shared item. Existing items keep their own split.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MembersCard({ isOwner }: { isOwner: boolean }) {
  const { wedding } = useWorkspace();
  const user = useUser();
  const { data: requests } = useAccessRequests(wedding.id, isOwner);

  const label = (uid: string) => {
    const p = wedding.memberProfiles[uid];
    return p?.displayName || p?.email || `Member ${uid.slice(0, 6)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y" aria-label="Members">
          {wedding.memberIds.map((uid) => (
            <li key={uid} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {label(uid)}
                {uid === user.uid && <span className="text-muted-foreground"> (you)</span>}
                {uid === wedding.ownerId && (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">Owner</span>
                )}
              </span>
              {isOwner && uid !== wedding.ownerId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => notifyOnError(removeMember(wedding.id, wedding.memberIds, uid))}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>

        {isOwner ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Access requests</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending requests. Share this page’s link with your partner; when they open it
                they can ask to join, and you approve them here.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="access-requests">
                {requests.map((r) => (
                  <li
                    key={r.uid}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <span className="min-w-0 truncate">{r.displayName || r.email || r.uid}</span>
                    <span className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          notifyOnError(approveRequest(wedding.id, r), 'Could not approve.')
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          notifyOnError(denyRequest(wedding.id, r.uid), 'Could not deny.')
                        }
                      >
                        Deny
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Only the owner can manage members.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const { wedding } = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await deleteWedding(wedding.id);
      // deleting is the one action that sends you back to the list
      router.replace('/');
    } catch {
      toast.error('Could not delete the wedding.');
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Permanently delete this wedding and all of its budget items.
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete wedding
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (busy) return;
          setOpen(o);
          setConfirm('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this wedding?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type <strong>{wedding.name}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Type the wedding name to confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirm !== wedding.name || busy}
              onClick={remove}
            >
              {busy ? 'Deleting…' : 'Delete forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
