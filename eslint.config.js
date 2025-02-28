import pluginVue from 'eslint-plugin-vue';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

import vueEslintParser from 'vue-eslint-parser';

export default [
  {
    files: ['*.vue', '**/*.vue', '**/*.js', '*.js'],
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        //parser: babelEslintParser,
      },
    },
  },
  ..pluginVue.configs['flat/recommended'],
  {
    rules: {
      // override/add rules settings here, such as:
      'vue/no-unused-vars': 'error',
      'no-trailing-spaces': ['error'],
      'vue/singleline-html-element-content-newline': [
        'error',
        {
          ignores: ['span', 'FontAwesomeIcon'],
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
];
