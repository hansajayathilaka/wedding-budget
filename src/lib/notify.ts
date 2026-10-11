import { toast } from 'sonner';

/**
 * Firestore applies writes to the local cache straight away and rolls them back if the server
 * (rules/network) rejects them. Fire the write, and tell the user when that happens.
 */
export function notifyOnError(write: Promise<unknown>, message = 'That change was not saved.') {
  write.catch((err: unknown) => {
    const code = (err as { code?: string }).code;
    toast.error(code === 'permission-denied' ? `${message} You may not have permission.` : message);
  });
}
