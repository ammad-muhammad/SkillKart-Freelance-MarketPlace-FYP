const js = require('@eslint/js');
const globals = require('globals');

/**
 * Backend ESLint config — flat config, matching Front-end/eslint.config.js.
 *
 * Before this existed, `npm run lint` failed outright with "couldn't find a
 * configuration file", so the backend has never actually been linted. The
 * `lint` script also used an unquoted `src/**\/*.js` glob, which the shell
 * expanded to `src/*\/*.js` (bash has globstar off by default) and silently
 * skipped 34 files — everything at the top level (app.js, server.js) and
 * everything nested 2+ deep (services/ai/*, services/email/*,
 * controllers/adminPanel/*). The script now passes the `src` directory and
 * lets ESLint walk it.
 */
module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Express error handlers must declare all four params `(err, req, res,
      // next)` to be recognised as error middleware, so a trailing unused
      // `next` is structural, not dead code — hence `args: 'none'`. Unused
      // *variables* are still errors.
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
