import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Zero to Hero · Componentes',
    colorPrimary: '#477b63',
    colorSecondary: '#477b63',
  }),
  showPanel: false,
  sidebar: { showRoots: true },
});
