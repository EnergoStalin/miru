const { join, resolve } = require('path')

/**
 * @type {any}
 */
const mode = process.env.NODE_ENV?.trim() || 'development'
const isDev = mode === 'development'
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const sveltePreprocess = require('svelte-preprocess')

/**
 *
 * @param {*} parentDir
 * @param {*} alias
 * @param {*} aliasFields
 * @param {*} filename
 * @returns {import('webpack').Configuration}
 */
module.exports = (parentDir, alias = {}, aliasFields = 'browser', filename = 'app') => ({
  devtool: 'source-map',
  entry: [join(__dirname, 'main.js')],
  output: {
    path: join(parentDir, 'build'),
    filename: 'renderer.js'
  },
  mode,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader'
        }
      },
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          options: {
            preprocess: sveltePreprocess(),
            compilerOptions: {
              dev: isDev
            },
            emitCss: !isDev,
            hotReload: isDev
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        // required to prevent errors from Svelte on Webpack 5+
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      }
    ]
  },
  resolve: {
    aliasFields: [aliasFields],
    alias: {
      ...alias,
      '@': __dirname,
      module: false,
      url: false,
      'bittorrent-tracker/lib/client/websocket-tracker.js': resolve('../node_modules/bittorrent-tracker/lib/client/websocket-tracker.js')
    },
    extensions: ['.mjs', '.js', '.svelte', '.ts']
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: join(__dirname, 'public') }
      ]
    }),
    new HtmlWebpackPlugin({
      filename: filename + '.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset='utf-8'>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#17191C">
<title>Miru</title>

<!-- <link rel="preconnect" href="https://www.youtube-nocookie.com"> -->
<link rel="preconnect" href="https://graphql.anilist.co">
<link rel='icon' href='/logo.ico'>
${htmlWebpackPlugin.tags.headTags}
</head>

<body class="dark-mode with-custom-webkit-scrollbars with-custom-css-scrollbars">
${htmlWebpackPlugin.tags.bodyTags}
</body>

</html> `
    })],
  target: 'web'
})
