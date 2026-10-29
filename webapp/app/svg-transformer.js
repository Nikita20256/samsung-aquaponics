const { getDefaultConfig } = require('expo/metro-config');

const upstream = require(
  getDefaultConfig(__dirname).transformer.babelTransformerPath,
);

module.exports = {
  ...upstream,
  transform(params) {
    return upstream.transform({
      ...params,
      src: params.filename.endsWith('.svg')
        ? `export default ${JSON.stringify(params.src)};`
        : params.src,
    });
  },
};
