'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Item } from '@/lib/types';

export function DeleteItemDialog({
  item,
  onCancel,
  onConfirm,
}: {
  item: Item | null;
  onCancel: () => void;
  onConfirm: (item: Item) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{item?.name}”?</DialogTitle>
          <DialogDescription>
            This removes the item for good. If you only want it out of the totals for now, switch it
            off instead — you can bring it back any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => item && onConfirm(item)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
