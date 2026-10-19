import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { RirSelector } from '@/components/segmented-control';

const meta = {
  title: 'Entrenamiento/RIR', component: RirSelector, tags: ['autodocs'],
  args: { onChange: () => {}, value: 2, disabled: false },
  argTypes: { value: { control: { type: 'range', min: 0, max: 4, step: 1 } }, onChange: { control: false } },
  render: function Interactive(args) {
    const [{ value }, updateArgs] = useArgs<{ value: number }>();
    return <div className="max-w-sm"><RirSelector {...args} value={value} onChange={value => updateArgs({ value })} /></div>;
  },
} satisfies Meta<typeof RirSelector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivo: Story = {};
export const SinRepeticionesEnReserva: Story = { args: { value: 0 } };
export const Desactivado: Story = { args: { disabled: true } };
