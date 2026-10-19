import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityTypePicker, DurationPicker } from '@/components/activity-controls';
import { OptionalSection } from '@/components/optional-section';
import { EffortSelector } from '@/components/effort-selector';
import { RestSettings } from '@/components/rest-settings';
import { RirSelector } from '@/components/segmented-control';
import { PainSlider } from '@/components/pain-slider';
import { Stepper } from '@/components/number-stepper';
import { ActivityEstimates } from '@/components/activity-estimates';

const meta = { title: 'Guía/Interacciones y formularios' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Galeria: Story = { render: function Patterns() {
  const [view, setView] = useState('Entrenamiento');
  const [load, setLoad] = useState(20);
  const [rir, setRir] = useState(2);
  const [pain, setPain] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [seconds, setSeconds] = useState(90);
  const [type, setType] = useState('Caminata');
  const [minutes, setMinutes] = useState(30);
  const [distance, setDistance] = useState<number | null>(null);
  const [effort, setEffort] = useState(0);
  const [stepLength, setStepLength] = useState(70);
  const [steps, setSteps] = useState<number | null>(null);
  return <div className="mx-auto max-w-lg space-y-5 rounded-3xl border border-border bg-card p-5"><div><p className="eyebrow">Componentes compartidos</p><h1 className="text-xl font-bold">Lo esencial, a mano</h1><p className="mt-2 text-sm text-muted-foreground">Entrenamiento, actividad y perfil usan los mismos patrones. Los datos de esta demo no salen del navegador.</p></div><div className="grid grid-cols-3 gap-2">{['Entrenamiento', 'Actividad', 'Perfil'].map(item => <button type="button" className="duration-choice px-1" key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}</div>
    {view === 'Entrenamiento' ? <><div><p className="control-label">Carga</p><Stepper label="Carga de demostración" step={0.5} suffix="kg" value={load} onChange={setLoad} /></div><OptionalSection title="Sensaciones del ejercicio" summary={`RIR ${rir} · ${pain ? `molestias ${pain}/10` : 'sin molestias'}`}><RirSelector value={rir} onChange={setRir} /><PainSlider value={pain} onChange={setPain} /></OptionalSection><RestSettings enabled={enabled} seconds={seconds} onEnabledChange={setEnabled} onSecondsChange={setSeconds} /></> : view === 'Perfil' ? <RestSettings enabled={enabled} seconds={seconds} onEnabledChange={setEnabled} onSecondsChange={setSeconds} /> : <><ActivityTypePicker value={type} onChange={setType} /><DurationPicker value={minutes} onChange={setMinutes} /><OptionalSection title="Distancia y pasos" summary={distance === null ? 'Añadir datos de la cinta o del reloj' : `${distance} km${steps === null ? '' : ` · ${steps} pasos estimados`}`}><div><p className="control-label">Distancia</p><Stepper optional label="Distancia de demostración" value={distance} step={0.5} suffix="km" onChange={setDistance} /></div><ActivityEstimates minutes={minutes} distance={distance ?? 0} walking={type === 'Caminata'} stepLength={stepLength} onStepLengthChange={setStepLength} onUseSteps={setSteps} estimated={steps !== null} /></OptionalSection><OptionalSection title="Sensaciones" summary={effort ? `Esfuerzo ${effort}/10` : '¿Cómo te has sentido? · opcional'}><EffortSelector value={effort} onChange={setEffort} /></OptionalSection></>}
  </div>;
} };
