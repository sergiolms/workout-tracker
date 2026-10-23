import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dumbbell, CalendarDays, Timer, BarChart3, Footprints } from 'lucide-react';
import { LiquidNavigation } from '@/components/liquid-navigation';
import { MotionSurface, AnimatedDisclosure } from '@/components/motion-surface';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';

const items = [{ id: 'plan', label: 'Plan', icon: CalendarDays }, { id: 'progress', label: 'Progreso', icon: BarChart3 }, { id: 'today', label: 'Hoy', icon: Dumbbell, featured: true }, { id: 'timers', label: 'Timer', icon: Timer }, { id: 'mobility', label: 'Movilidad', icon: Footprints }];
const meta = { title: 'Navegación/Movimiento', parameters: { docs: { description: { component: 'Menú con indicador elástico, paneles y navegación táctil. Los gestos no actúan sobre controles ni sobre los bordes del navegador.' } } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const MenuFluido: Story = { render: function Menu() {
  const [active, setActive] = useState('today');
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const swipe = useSwipeNavigation({ views: items.map(item => item.id), active, onNavigate: (id, side) => { setDirection(side); setActive(id); } });
  return <div className="mx-auto flex h-[min(640px,85dvh)] max-w-lg flex-col overflow-hidden rounded-2xl border border-border"><div {...swipe} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6"><MotionSurface motionKey={active} direction={direction}><p className="eyebrow">Vista de prueba</p><h1 className="text-2xl font-bold">{items.find(item => item.id === active)?.label}</h1><p className="mt-4 text-sm text-muted-foreground">Toca las pestañas o desliza horizontalmente sobre este contenido desde un dispositivo táctil.</p></MotionSurface></div><div className="bottom-nav"><LiquidNavigation items={items} active={active} onSelect={id => { setDirection(0); setActive(id); }} /></div></div>;
} };
export const Desplegable: Story = { render: function Disclosure() {
  const [open, setOpen] = useState(false);
  return <div className="max-w-md overflow-hidden rounded-2xl border border-border"><button type="button" aria-expanded={open} aria-controls="story-disclosure" className="flex min-h-14 w-full items-center justify-between px-5 text-left font-bold" onClick={() => setOpen(!open)}>Calentamiento<span aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span></button><AnimatedDisclosure id="story-disclosure" open={open}><div className="space-y-3 border-t border-border p-5"><p>Movilidad y activación antes de entrenar.</p><input aria-label="Nota de prueba" placeholder="Escribe y cierra: se conserva" className="h-12 w-full min-w-0 rounded-xl border border-border px-3" /></div></AnimatedDisclosure></div>;
} };
