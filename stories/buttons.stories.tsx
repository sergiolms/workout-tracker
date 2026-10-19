import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Save, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const meta = { title: 'Interacción/Botones', component: Button, tags: ['autodocs'], args: { children: 'Botón', disabled: false }, render: args => <Button {...args} className="min-h-12 rounded-xl px-5" /> } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Secundario: Story = { args: { variant: 'outline' } };
export const Desactivado: Story = { args: { disabled: true } };
export const Respuestas: Story = { render: function Responses() {
  const [message, setMessage] = useState('Toca una acción para comparar su respuesta.');
  return <div className="max-w-md space-y-5"><div className="flex flex-wrap gap-3"><Button className="min-h-12 rounded-xl" data-haptic="success" onClick={() => setMessage('Guardado de prueba confirmado')}><Save />Guardar</Button><Button className="min-h-12 rounded-xl" data-haptic="warning" variant="outline" onClick={() => setMessage('Revisa las series')}><AlertTriangle />Aviso</Button><Button className="min-h-12 rounded-xl" variant="outline" onClick={() => setMessage('Listo')}><Check />Continuar</Button></div><output className="block text-sm text-muted-foreground">{message}</output></div>;
} };
