import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

addons.setConfig({
  theme: create({ base: 'light', brandTitle: 'Base · Componentes', colorPrimary: '#007b37', colorSecondary: '#007b37' }),
  showPanel: false,
  sidebar: { showRoots: true },
});
