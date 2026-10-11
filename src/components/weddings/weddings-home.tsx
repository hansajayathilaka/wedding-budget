'use client';

import { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { UserMenu } from '@/components/auth/user-menu';
import { useUser } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { useMyWeddings } from '@/data/weddings';
import { CreateWeddingDialog } from './create-wedding-dialog';
import { WeddingCard } from './wedding-card';

export function WeddingsHome() {
  const user = useUser();
  const { data: weddings, loading, error } = useMyWeddings(user.uid);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-semibold tracking-tight">My weddings</h1>
        <div className="flex items-center gap-2">
          {weddings.length > 0 && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden /> New wedding
            </Button>
          )}
          <UserMenu />
        </div>
      </header>

      {error ? (
        <p role="alert" className="py-12 text-center text-sm text-destructive">
          Could not load your weddings. Check your connection and reload.
        </p>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : weddings.length === 0 ? (
        <div className="mx-auto mt-16 max-w-sm space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950">
            <Heart className="size-7" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold">No weddings yet</h2>
          <p className="text-sm text-muted-foreground">
            Create your first wedding to start tracking the budget.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> New wedding
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weddings.map((w) => (
            <li key={w.id}>
              <WeddingCard wedding={w} />
            </li>
          ))}
        </ul>
      )}

      <CreateWeddingDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
