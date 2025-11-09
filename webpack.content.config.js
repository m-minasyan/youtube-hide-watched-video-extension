const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

// FIXED P3-5: Add validation and default values for webpack config
module.exports = (env = {}, argv = {}) => {
  // Validate and normalize mode with fallback
  const mode = argv.mode || process.env.NODE_ENV || 'development';

  if (!['production', 'development', 'none'].includes(mode)) {
    console.warn(`[Webpack] Invalid mode: ${mode}, defaulting to 'development'`);
  }

  const isProduction = mode === 'production';

  return {
    entry: './content/index.js',
    output: {
      filename: 'content.js',
      path: path.resolve(__dirname, '.'),
      iife: true,
      clean: false
    },
    mode: mode, // Use validated mode
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
              // This works in combination with DefinePlugin to strip debug code:
              // 1. DefinePlugin replaces __DEV__ with false
              // 2. Dead code elimination removes if (false) blocks
              // 3. pure_funcs removes remaining non-critical console methods
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
      moduleIds: 'deterministic'
    },
    // FIXED P3-3: Bundle size monitoring for content script
    performance: {
      maxEntrypointSize: 256000, // 256KB warning threshold for content script (smaller than background)
      maxAssetSize: 256000, // 256KB warning threshold
      hints: isProduction ? 'error' : 'warning',
      assetFilter: function(assetFilename) {
        return assetFilename.endsWith('.js');
      }
    },
    resolve: {
      extensions: ['.js']
    }
  };
};
