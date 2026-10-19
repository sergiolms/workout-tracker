import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Save } from 'lucide-react';
import { RirSelector } from '@/components/segmented-control';
import { PainSlider } from '@/components/pain-slider';
import { PreferenceSwitch } from '@/components/preference-switch';
import { Stepper } from '@/components/number-stepper';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/progress-ring';

const meta = { title: 'Guía/Componentes en acción', parameters: { controls: { disable: true } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Galeria: Story = { render: function Gallery() {
  const [rir, setRir] = useState(2), [pain, setPain] = useState(0), [load, setLoad] = useState(12.5), [done, setDone] = useState(false), [automatic, setAutomatic] = useState(true), [message, setMessage] = useState('');
  return <div className="mx-auto max-w-4xl space-y-6"><header><p className="eyebrow">Base · Componentes</p><h1 className="text-3xl font-bold tracking-tight">Cada interacción, su movimiento</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">Prueba los controles reales de la app. Los valores solo viven en esta historia; no se conecta a Firebase. Cambia el tema desde la barra superior de Storybook.</p></header><div className="grid gap-5 md:grid-cols-2"><section className="space-y-5 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">Entrenamiento</h2><p className="mt-1 text-xs text-muted-foreground">Edición directa y pasos de 0,5 kg</p></div><ProgressRing value={done ? 100 : 0} label={done ? '1/1' : '0/1'} description="Series completadas" /></div><Stepper label="Carga de prueba" value={load} onChange={setLoad} step={.5} suffix="kg" /><label htmlFor="gallery-set" className="completion-row flex min-h-14 items-center gap-3 rounded-xl p-3" data-complete={done}><Checkbox id="gallery-set" checked={done} onCheckedChange={checked => setDone(Boolean(checked))} /><span className="flex-1 text-sm font-semibold">Serie completada</span>{done ? <Check className="size-4 text-primary" /> : null}</label><RirSelector value={rir} onChange={setRir} /><Button className="h-12 w-full rounded-xl" data-haptic="success" onClick={() => setMessage('Guardado de prueba confirmado')}><Save />Guardar ejercicio</Button><output className="block text-xs text-muted-foreground">{message}</output></section><div className="space-y-5"><section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-5 font-bold">Sensaciones</h2><PainSlider value={pain} onChange={setPain} /></section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-3 font-bold">Preferencias</h2><PreferenceSwitch label="Seguir el tema del sistema" description="Ejemplo de un interruptor con transición deslizante." checked={automatic} onCheckedChange={setAutomatic} /></section><section className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Usa el menú lateral para probar estados desactivados, valores altos, navegación fluida y desplegables. Las animaciones respetan «Reducir movimiento» del sistema.</section></div></div></div>;
} };
