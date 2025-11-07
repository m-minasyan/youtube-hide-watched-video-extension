const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './content/index.js',
    output: {
      filename: 'content.js',
      path: path.resolve(__dirname, '.'),
      iife: true,
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
              // Remove all console.* calls in production
              // This works in combination with DefinePlugin to strip debug code:
              // 1. DefinePlugin replaces __DEV__ with false
              // 2. Dead code elimination removes if (false) blocks
              // 3. drop_console removes any remaining console statements
              drop_console: isProduction,
              // Remove debugger statements in production
              drop_debugger: isProduction,
              // Additional optimizations for production
              pure_funcs: isProduction ? [
                'console.log',
                'console.info',
                'console.debug',
                'console.warn'
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
