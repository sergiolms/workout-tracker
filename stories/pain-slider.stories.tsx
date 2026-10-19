import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { PainSlider } from '@/components/pain-slider';

const meta = {
  title: 'Entrenamiento/Molestias', component: PainSlider, tags: ['autodocs'],
  args: { onChange: () => {}, value: 0, disabled: false },
  argTypes: { value: { control: { type: 'range', min: 0, max: 10, step: 1 } }, onChange: { control: false } },
  render: function Interactive(args) {
    const [{ value }, updateArgs] = useArgs<{ value: number }>();
    return <div className="max-w-sm"><PainSlider {...args} value={value} onChange={value => updateArgs({ value })} /></div>;
  },
} satisfies Meta<typeof PainSlider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivo: Story = {};
export const MolestiaLeve: Story = { args: { value: 2 } };
export const ValorAlto: Story = { args: { value: 6 } };
export const Desactivado: Story = { args: { value: 3, disabled: true } };
