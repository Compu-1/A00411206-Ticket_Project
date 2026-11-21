import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  // Punto de entrada de la aplicación
  entry: './src/index.js',

  // Un solo bundle con hash en el nombre, dentro de dist/
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },

  module: {
    rules: [
      // Permite importar archivos .css desde el JavaScript
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },

  plugins: [
    // Genera dist/index.html e inyecta el bundle automáticamente
    new HtmlWebpackPlugin({ template: './src/index.html' }),
  ],

  // El archivo generado por slice2js usa "require" de forma dinámica; es inofensivo
  ignoreWarnings: [{ module: /generated[\\/]BookingService\.js/ }],

  // Servidor de desarrollo en el puerto 3000
  devServer: {
    port: 3000,
    open: false,
  },
};
