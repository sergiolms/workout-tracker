import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Stepper } from '@/components/number-stepper';
import { PainSlider } from '@/components/pain-slider';
import { PreferenceSwitch } from '@/components/preference-switch';
import { ExerciseSetEditor } from '@/components/exercise-set-editor';
import { SaveStatus } from '@/components/workout-feedback';
import { LiquidNavigation } from '@/components/liquid-navigation';
import { navItems, type Tab } from '@/components/navigation-items';
import { defaultState, type AppState, type SetLog } from '@/lib/storage';
import { MeasurementTracker } from '@/components/measurement-tracker';
import { ActivityCalendar } from '@/components/activity-calendar';

const meta = {
  title: 'Guía/Revisión de temas',
  parameters: { controls: { disable: true } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ThemeReview() {
  const [done, setDone] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [weight, setWeight] = useState(20);
  const [pain, setPain] = useState(3);
  const [tab, setTab] = useState<Tab>('today');
  const [sets, setSets] = useState<SetLog[]>([
    { reps: 12, load: 20, done: true },
    { reps: 10, load: 20, done: false },
  ]);
  const [state, setState] = useState<AppState>(() => ({
    ...defaultState,
    measurements: [72, 72.5, 73].map((weight, index) => ({
      id: String(index),
      date: new Date(Date.now() - index * 86400000).toISOString(),
      weight,
    })),
  }));
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">
          Demostración · datos en memoria
        </p>
        <h1 className="mt-2 text-3xl font-bold">Zero to Hero</h1>
      </header>
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-bold">Botones y estados</h2>
        <div className="flex flex-wrap gap-3">
          <Button className="min-h-11">Guardar</Button>
          <Button variant="outline" className="min-h-11">
            Cancelar
          </Button>
          <Button variant="secondary" className="min-h-11">
            Secundario
          </Button>
          <Button variant="ghost" className="min-h-11">
            Detalles
          </Button>
          <Button variant="destructive" className="min-h-11">
            Eliminar
          </Button>
          <Button disabled className="min-h-11">
            Deshabilitado
          </Button>
        </div>
        <div className="flex gap-4">
          <SaveStatus
            status={{
              local: 'saved',
              cloud: 'synced',
              canEdit: true,
              error: '',
            }}
          />
          <SaveStatus
            status={{
              local: 'saving',
              cloud: 'pending',
              canEdit: true,
              error: '',
            }}
          />
          <SaveStatus
            status={{
              local: 'saved',
              cloud: 'error',
              canEdit: true,
              error: 'Sin conexión',
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Texto secundario sobre superficie.
        </p>
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Texto secundario sobre un control.
        </p>
        <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          Aviso secundario
        </p>
      </section>
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-bold">Campos y selección</h2>
        <Input
          aria-label="Nombre del ejercicio"
          placeholder="Nombre del ejercicio"
        />
        <Input
          aria-label="Campo inválido"
          aria-invalid
          defaultValue="Valor inválido"
        />
        <Input
          aria-label="Campo deshabilitado"
          disabled
          defaultValue="No editable"
        />
        <label
          htmlFor="theme-review-completed"
          className="flex min-h-11 items-center gap-3"
        >
          <Checkbox
            id="theme-review-completed"
            checked={done}
            onCheckedChange={(value) => setDone(Boolean(value))}
          />
          Serie realizada
        </label>
        <PreferenceSwitch
          label="Descanso automático"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <Stepper
          label="Peso de demostración"
          value={weight}
          onChange={setWeight}
          suffix="kg"
          step={0.5}
        />
        <PainSlider value={pain} onChange={setPain} />
        <Select defaultValue="a">
          <SelectTrigger aria-label="Rutina">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Rutina A</SelectItem>
            <SelectItem value="b">Rutina B</SelectItem>
            <SelectItem value="c" disabled>
              No disponible
            </SelectItem>
          </SelectContent>
        </Select>
      </section>
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="font-bold">Paneles flotantes</h2>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger
              render={<Button variant="outline" className="min-h-11" />}
            >
              Abrir modal
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Editar ejercicio</DialogTitle>
              <DialogDescription>Objetivos del ejercicio</DialogDescription>
              <Input
                aria-label="Nombre dentro del modal"
                defaultValue="Press de banca"
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" className="min-h-11" />}
                >
                  Opciones dentro del modal
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Duplicar</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button>Guardar cambios</Button>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="min-h-11" />}
            >
              Opciones
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem disabled>No disponible</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Más acciones</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Duplicar</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem variant="destructive">
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" className="min-h-11" />}
            >
              Abrir panel
            </PopoverTrigger>
            <PopoverContent>
              <p className="font-semibold">Descanso</p>
              <p className="text-muted-foreground">90 segundos entre series</p>
            </PopoverContent>
          </Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline" className="min-h-11" />}
              >
                Ayuda
              </TooltipTrigger>
              <TooltipContent>Información del ejercicio</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ExerciseSetEditor
          name="Press de banca"
          load={20}
          sets={sets}
          onChange={setSets}
        />
      </section>
      <MeasurementTracker state={state} updateState={setState} />
      <ActivityCalendar
        workouts={[]}
        activities={[
          {
            id: 'activity',
            date: new Date().toISOString(),
            type: 'Caminata',
            minutes: 30,
          },
        ]}
      />
      <div className="bottom-nav">
        <LiquidNavigation items={navItems} active={tab} onSelect={setTab} />
      </div>
    </div>
  );
}

export const Claro: Story = {
  globals: { theme: 'light' },
  render: () => <ThemeReview />,
};
export const Oscuro: Story = {
  globals: { theme: 'dark' },
  render: () => <ThemeReview />,
};
