import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import i18n from '../src/i18n/index.ts';
import '../src/index.css';

const preview: Preview = {
  globalTypes: {
    locale: {
      description: 'Interface Language',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'uk', title: 'Українська' },
          { value: 'en', title: 'English' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'uk' },
  decorators: [
    (Story, context) => {
      const locale = context.globals['locale'] as string;
      if (i18n.language !== locale) void i18n.changeLanguage(locale);
      return (
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      );
    },
  ],
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
