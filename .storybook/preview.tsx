import type { Preview, Decorator } from '@storybook/react-vite';
import { useInteractionFeedback } from '../hooks/use-interaction-feedback';
import { DialogThemeProvider } from '../components/ui/dialog';
import '../app/globals.css';
import './preview.css';

const WithAppTheme: Decorator = (Story, context) => {
  useInteractionFeedback(false);
  return <DialogThemeProvider value={context.globals.theme === 'dark'}><div className={context.globals.theme === 'dark' ? 'dark' : ''}><div className="story-canvas min-h-screen bg-background p-5 text-foreground"><Story /></div></div></DialogThemeProvider>;
};

const preview: Preview = {
  decorators: [WithAppTheme],
  globalTypes: {
    theme: { description: 'Tema de la app', toolbar: { title: 'Tema', icon: 'paintbrush', items: [{ value: 'light', title: 'Claro' }, { value: 'dark', title: 'Oscuro' }], dynamicTitle: true } },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    options: { storySort: { order: ['Guía', 'Entrenamiento', 'Preferencias', 'Interacción', 'Navegación'] } },
  },
};
export default preview;
