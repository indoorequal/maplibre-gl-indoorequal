import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json' assert { type: 'json' };

const input = 'src/index.js';

export default [
  {
    input,
    output: {
      name: 'IndoorEqual',
      file: pkg.browser,
      format: 'umd',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      terser(),
      babel({ babelHelpers: 'bundled' }),
    ]
  },

  {
    input,
    external: ['debounce', 'array-equal'],
    output: [
      { file: pkg.main, format: 'cjs', exports: 'default', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true }
    ]
  }
];
