import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { Checkbox } from '@/components/ui/checkbox';

const meta = {
  title: 'Interacción/Checkbox', component: Checkbox, tags: ['autodocs'],
  args: { checked: false, disabled: false, indeterminate: false },
  argTypes: { onCheckedChange: { control: false } },
  render: function Interactive(args) {
    const [{ checked }, updateArgs] = useArgs<{ checked: boolean }>();
    return <label htmlFor="story-checkbox" className="flex min-h-12 w-fit items-center gap-3"><Checkbox {...args} id="story-checkbox" checked={checked} onCheckedChange={checked => updateArgs({ checked })} />Serie completada</label>;
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactivo: Story = {};
export const Marcado: Story = { args: { checked: true } };
export const Parcial: Story = { args: { indeterminate: true } };
export const Desactivado: Story = { args: { disabled: true } };
