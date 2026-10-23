'use client';

export function ViewTabs<T extends string>({ label, items, value, onChange }: { label: string; items: Array<{ id: T; label: string }>; value: T; onChange: (value: T) => void }) {
  return <fieldset className="view-tabs" data-swipe-ignore><legend className="sr-only">{label}</legend>{items.map(item => <button key={item.id} type="button" aria-pressed={item.id === value} onClick={() => onChange(item.id)}>{item.label}</button>)}</fieldset>;
}
