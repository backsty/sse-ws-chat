const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';
const basePath = isDevelopment ? '/' : '/sse-ws-chat/';

module.exports = {
  entry: './src/index.js',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
    publicPath: basePath,
    clean: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/js/components'),
      '@services': path.resolve(__dirname, 'src/js/services'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@fonts': path.resolve(__dirname, 'src/assets/fonts'),
      '@images': path.resolve(__dirname, 'src/assets/img')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.html$/,
        use: ['html-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]',
          publicPath: basePath
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/img/[name][ext]',
          publicPath: basePath
        }
      }
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebPackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      favicon: './src/assets/favicon.ico',
      inject: true,
      publicPath: basePath
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[id].[contenthash].css'
    }),
    new webpack.DefinePlugin({
      'process.env.ASSET_PATH': JSON.stringify(basePath),
      'process.env.WS_URL': JSON.stringify(
        isDevelopment 
          ? 'ws://localhost:3000'
          : 'wss://sse-ws-chat-4ur5.onrender.com'
      )
    })
  ]
};