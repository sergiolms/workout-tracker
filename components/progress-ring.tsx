import { cn } from '@/lib/utils';

export function ProgressRing({ value, label, description, className }: { value: number; label: string; description: string; className?: string }) {
  const percent = Math.min(100, Math.max(0, value));
  return <div className={cn('relative grid size-14 shrink-0 place-items-center text-sm font-bold tabular-nums', className)}>
    <progress className="sr-only" aria-label={description} aria-valuetext={label} value={percent} max={100}>{label}</progress>
    <svg aria-hidden="true" className="absolute inset-0 size-full -rotate-90" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="24" strokeWidth="5" className="stroke-muted" />
      <circle cx="28" cy="28" r="24" pathLength="100" strokeWidth="5" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - percent} className="progress-ring-value stroke-primary" />
    </svg>
    <span aria-hidden="true" className="relative">{label}</span>
  </div>;
}
