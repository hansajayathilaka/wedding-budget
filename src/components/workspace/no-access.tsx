'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/components/auth/auth-provider';
import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { requestAccess, useMyAccessRequest } from '@/data/access';

/**
 * Shown when the wedding does not exist or the user is not a member. Rules can't tell the two
 * apart, so one screen covers both. It has no link to the list (F3).
 */
export function NoAccess({ weddingId, onApproved }: { weddingId: string; onApproved: () => void }) {
  const user = useUser();
  const { data: pending } = useMyAccessRequest(weddingId, user.uid);
  const hadRequest = useRef(false);

  // The owner approving deletes the request: resubscribe to the wedding, which now lets us in.
  useEffect(() => {
    if (pending) hadRequest.current = true;
    else if (hadRequest.current) onApproved();
  }, [pending, onApproved]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="flex justify-end">
          <UserMenu />
        </div>
        <h1 className="text-2xl font-semibold">Wedding not found</h1>
        <p className="text-sm text-muted-foreground">
          This wedding doesn’t exist, or you’re not a member of it yet. If someone shared this link
          with you, you can ask the owner for access.
        </p>
        {pending ? (
          <p role="status" className="rounded-md bg-muted p-3 text-sm">
            Request sent. You’ll get in as soon as the owner approves it.
          </p>
        ) : (
          <Button
            onClick={() =>
              requestAccess(weddingId, user).catch(() =>
                toast.error('Could not send the request. Please try again.'),
              )
            }
          >
            Request access
          </Button>
        )}
      </div>
    </main>
  );
}
