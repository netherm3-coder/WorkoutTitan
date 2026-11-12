// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // legacy/ holds sources that are not part of the app: WorkoutTitan files kept for the cosmetics
  // stage and a copy of Record's calculations that tests compare against. See legacy/README.md.
  globalIgnores(['dist/*', 'dist-web/*', '.expo/*', 'coverage/*', 'android/*', 'ios/*', 'legacy/*']),
  expoConfig,
  {
    rules: {
      // sql.js is only used by the browser preview (src/db/open.web.ts) and, like the other
      // packages the preview needs, is installed by hand when someone wants it. See the README.
      'import/no-unresolved': ['error', { ignore: ['^sql\\.js/'] }],
    },
  },
]);
