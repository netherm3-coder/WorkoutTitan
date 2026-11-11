import 'i18next';

import type uk from './locales/uk.json';

// Makes `t('some.key')` a compile error when the key is not in the Ukrainian catalogue.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof uk;
    };
  }
}
