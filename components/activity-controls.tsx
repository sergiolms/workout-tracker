'use client';
import { useId, useState } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Bike, Footprints, Wind, ChevronDown } from 'lucide-react';
import { Stepper } from '@/components/number-stepper';
import { AnimatedDisclosure } from '@/components/motion-surface';

const mainTypes = [{ name: 'Caminata', icon: Footprints }, { name: 'Bici', icon: Bike }, { name: 'Elíptica', icon: Wind }];
const classes = ['Pilates', 'Spinning', 'Body Pump', 'Total Training'];
export function ActivityTypePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [expanded, setExpanded] = useState(!mainTypes.some(item => item.name === value));
  const id = useId();
  return <div className="space-y-2"><p id={`${id}-label`} className="control-label">Actividad</p><RadioGroup value={value} onValueChange={onChange} aria-labelledby={`${id}-label`} className="space-y-2" data-feedback="selection"><div className="grid grid-cols-3 gap-2">{mainTypes.map(({ name, icon: Icon }) => <Radio.Root key={name} value={name} className="activity-choice"><Icon className="size-5" /><span>{name}</span></Radio.Root>)}</div><button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(old => !old)} className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm text-muted-foreground">{mainTypes.some(item => item.name === value) ? 'Clases y otras actividades' : value}<ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button><AnimatedDisclosure id={id} open={expanded}><div className="grid grid-cols-2 gap-2">{[...new Set([...classes, ...(!mainTypes.some(item => item.name === value) ? [value] : [])])].map(name => <Radio.Root key={name} value={name} className="activity-choice min-h-11">{name}</Radio.Root>)}</div></AnimatedDisclosure></RadioGroup></div>;
}

export function DurationPicker({ value, onChange, label = 'Minutos' }: { value: number; onChange: (value: number) => void; label?: string }) {
  return <div className="space-y-3"><p className="control-label">¿Cuánto tiempo?</p><Stepper label={label} value={value} onChange={onChange} step={5} min={1} suffix="min" /><div className="grid grid-cols-4 gap-2">{[15, 30, 45, 60].map(minutes => <button key={minutes} type="button" aria-pressed={value === minutes} className="duration-choice" onClick={() => onChange(minutes)}>{minutes} min</button>)}</div></div>;
}
