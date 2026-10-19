import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { PreferenceSwitch } from '@/components/preference-switch';

const meta = {
  title: 'Preferencias/Interruptor', component: PreferenceSwitch, tags: ['autodocs'],
  args: { onCheckedChange: () => {}, label: 'Seguir el tema del sistema', description: 'Alterna entre claro y oscuro según tu dispositivo.', checked: true, disabled: false },
  argTypes: { onCheckedChange: { control: false } },
  render: function Interactive(args) {
    const [{ checked }, updateArgs] = useArgs<{ checked: boolean }>();
    return <div className="max-w-md rounded-2xl border border-border bg-card p-5"><PreferenceSwitch {...args} checked={checked} onCheckedChange={checked => updateArgs({ checked })} /></div>;
  },
} satisfies Meta<typeof PreferenceSwitch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivo: Story = {};
export const Apagado: Story = { args: { checked: false } };
export const Desactivado: Story = { args: { disabled: true } };
