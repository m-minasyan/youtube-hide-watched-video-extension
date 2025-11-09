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
    entry: './background.js',
    output: {
      filename: 'background.bundle.js',
      path: path.resolve(__dirname, '.'),
      iife: false, // Keep as module for service worker
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
      // FIXED P3-3: Service Workers require self-contained bundles, no runtime chunk splitting
      moduleIds: 'deterministic'
    },
    // FIXED P3-3: Bundle size monitoring
    performance: {
      maxEntrypointSize: 512000, // 512KB warning threshold for background script
      maxAssetSize: 512000, // 512KB warning threshold for individual assets
      hints: isProduction ? 'error' : 'warning', // Error in production, warning in dev
      // Filter to only warn about JavaScript bundles
      assetFilter: function(assetFilename) {
        return assetFilename.endsWith('.js');
      }
    },
    resolve: {
      extensions: ['.js']
    }
  };
};
