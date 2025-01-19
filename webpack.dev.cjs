const path = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const baseConfig = require('./webpack.config.cjs');

module.exports =  merge(baseConfig, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
      publicPath: '/',
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:7070',
        ws: true
      },
      '/api': {
        target: 'http://localhost:7070',
        pathRewrite: { '^/api': '' }
      }
    },
    port: 8080,
    hot: true,
    historyApiFallback: true,
    client: {
      overlay: true,
      progress: true
    }
  },
});