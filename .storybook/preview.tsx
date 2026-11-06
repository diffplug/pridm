import type { Preview } from '@storybook/react-vite';
import '../src/ui/theme.css';

// Light/dark from the toolbar, applied the same way the app does: Primer's
// data-color-mode attribute on <html>.
const preview: Preview = {
  globalTypes: {
    colorMode: {
      description: 'Light or dark',
      toolbar: { title: 'Color mode', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { colorMode: 'light' },
  decorators: [
    (Story, context) => {
      const html = document.documentElement;
      html.setAttribute('data-color-mode', context.globals.colorMode);
      html.setAttribute('data-light-theme', 'light');
      html.setAttribute('data-dark-theme', 'dark');
      return <Story />;
    },
  ],
  parameters: { layout: 'padded' },
};
export default preview;
