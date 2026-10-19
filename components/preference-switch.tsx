'use client';

import { useId } from 'react';
import { Switch } from '@/components/ui/switch';

export function PreferenceSwitch({ label, description, checked, onCheckedChange, disabled = false }: { label: string; description?: string; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return <label htmlFor={id} className="flex min-h-14 cursor-pointer items-center justify-between gap-4">
    <span className="min-w-0"><strong className="block">{label}</strong>{description ? <span id={`${id}-description`} className="mt-1 block text-sm text-muted-foreground">{description}</span> : null}</span>
    <Switch id={id} aria-label={label} aria-describedby={description ? `${id}-description` : undefined} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </label>;
}
