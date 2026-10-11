import { ownerStyles } from '@/lib/owner-styles';

/** Two-tone bar showing how a shared item is split between groom and bride. */
export function SplitBar({ groomShareBp }: { groomShareBp: number }) {
  const groom = groomShareBp / 100;
  return (
    <div
      role="img"
      aria-label={`Groom ${groom}%, bride ${100 - groom}%`}
      className="flex h-1.5 w-full max-w-24 overflow-hidden rounded-full"
    >
      <div className={ownerStyles.GROOM.bar} style={{ width: `${groom}%` }} />
      <div className={`${ownerStyles.BRIDE.bar} flex-1`} />
    </div>
  );
}

export function ratioLabel(groomShareBp: number) {
  return `${Math.round(groomShareBp / 100)}:${Math.round((10000 - groomShareBp) / 100)}`;
}
