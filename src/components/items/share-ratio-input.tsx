'use client';

import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

/**
 * Groom : bride split as a slider plus two linked number inputs. The value is the groom's share
 * in basis points (0..10000); the bride always gets the remainder, so the shares add up to 100%.
 */
export function ShareRatioInput({
  value,
  onChange,
  groomName = 'Groom',
  brideName = 'Bride',
  idPrefix = 'ratio',
}: {
  value: number;
  onChange: (bp: number) => void;
  groomName?: string;
  brideName?: string;
  idPrefix?: string;
}) {
  const groomPct = Math.round(value / 100);
  const set = (pct: number) => onChange(Math.min(100, Math.max(0, Math.round(pct))) * 100);

  return (
    <div className="space-y-3">
      <Slider
        min={0}
        max={100}
        step={1}
        value={[groomPct]}
        onValueChange={([v]) => set(v)}
        aria-label="Groom share"
      />
      <div className="flex items-end gap-3">
        <label className="flex-1 space-y-1 text-xs text-sky-700 dark:text-sky-300">
          <span className="block truncate">{groomName} %</span>
          <Input
            id={`${idPrefix}-groom`}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={groomPct}
            onChange={(e) => set(Number(e.target.value))}
            aria-label={`${groomName} share percent`}
          />
        </label>
        <span className="pb-2 text-lg text-muted-foreground" aria-hidden>
          :
        </span>
        <label className="flex-1 space-y-1 text-xs text-rose-700 dark:text-rose-300">
          <span className="block truncate">{brideName} %</span>
          <Input
            id={`${idPrefix}-bride`}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={100 - groomPct}
            onChange={(e) => set(100 - Number(e.target.value))}
            aria-label={`${brideName} share percent`}
          />
        </label>
      </div>
    </div>
  );
}
