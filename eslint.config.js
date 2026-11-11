// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // legacy/ holds untouched WorkoutTitan sources kept for the cosmetics stage; see legacy/README.md.
  globalIgnores(['dist/*', '.expo/*', 'coverage/*', 'android/*', 'ios/*', 'legacy/*']),
  expoConfig,
]);
