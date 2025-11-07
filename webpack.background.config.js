const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './background.js',
    output: {
      filename: 'background.bundle.js',
      path: path.resolve(__dirname, '.'),
      iife: false, // Keep as module for service worker
      clean: false
    },
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',
    externals: {
      chrome: 'chrome'
    },
    plugins: [
      // Define global constants replaced at build time
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProduction),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // Remove debugger statements in production
              drop_debugger: isProduction,
              // Remove only non-critical console methods in production
              // Keep console.error and console.warn for production debugging
              pure_funcs: isProduction ? [
                'console.log',
                'console.info',
                'console.debug'
              ] : []
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    resolve: {
      extensions: ['.js']
    }
  };
};
