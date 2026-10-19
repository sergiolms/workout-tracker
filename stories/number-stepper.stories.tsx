import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Stepper } from '@/components/number-stepper';

const meta = {
  title: 'Entrenamiento/Carga y repeticiones', component: Stepper, tags: ['autodocs'],
  args: { onChange: () => {}, label: 'Carga', value: 12.5, step: .5, min: 0, suffix: 'kg' },
  argTypes: { onChange: { control: false } },
  render: function Interactive(args) {
    const [{ value }, updateArgs] = useArgs<{ value: number }>();
    return <div className="max-w-sm"><Stepper {...args} optional={false} value={value} onChange={value => updateArgs({ value })} /></div>;
  },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Carga: Story = {};
export const Repeticiones: Story = { args: { label: 'Repeticiones', value: 12, step: 1, suffix: undefined } };

export const Opcional: Story = { render: function OptionalExample() { const [value, setValue] = useState<number | null>(null); return <div className="max-w-sm"><Stepper optional label="Pasos opcionales" value={value} onChange={setValue} step={100} /></div>; } };
