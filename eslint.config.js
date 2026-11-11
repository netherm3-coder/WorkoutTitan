// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // legacy/ holds sources that are not part of the app: WorkoutTitan files kept for the cosmetics
  // stage and a copy of Record's calculations that tests compare against. See legacy/README.md.
  globalIgnores(['dist/*', '.expo/*', 'coverage/*', 'android/*', 'ios/*', 'legacy/*']),
  expoConfig,
]);
