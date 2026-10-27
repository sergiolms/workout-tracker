import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileAchievements } from '../components/profile-achievements';
import { HistoryProvider } from '../components/history-source';
import { gymFixture } from './virtual-gym.stories';
const meta: Meta<typeof ProfileAchievements> = {
  title: 'Perfil/Logros',
  component: ProfileAchievements,
  decorators: [
    (Story) => (
      <HistoryProvider value={null}>
        <div className="mx-auto max-w-2xl">
          <Story />
        </div>
      </HistoryProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ProfileAchievements>;
export const Progress: Story = {
  name: 'Trayectoria y premios',
  args: { state: gymFixture(), editable: false },
};
