process.env.NODE_ENV = 'development';

const path = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const baseConfig = require('./webpack.config.cjs');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'),
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
      'Content-Security-Policy': "default-src 'self' http://localhost:7070; connect-src 'self' ws://localhost:7070 http://localhost:7070; worker-src 'self' blob: 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
    },
    proxy: [{
      context: ['/ws'],
      target: 'http://localhost:7070',
      ws: true,
      secure: false,
      changeOrigin: true
    }],
    compress: true,
    port: 8080,
    open: true,
    hot: true,
    historyApiFallback: true,
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
});