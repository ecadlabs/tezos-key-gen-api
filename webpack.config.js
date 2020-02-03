const path = require('path')

module.exports = {
  mode: 'production',
  target: 'node',
  entry: "./dist/lib/key-gen-api/index.js",
  output: {
    library: 'taquito',
    libraryTarget: 'commonjs',
    path: __dirname,
    filename: 'dist/api.js'
  },
  resolve: {
    alias: {
      'hiredis': path.join(__dirname, 'aliases/hiredis.js')
    }
  }
}
