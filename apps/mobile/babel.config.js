module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Enable expo-router babel plugin since we have expo-router in local node_modules
          'router': {
            root: './app',
          },
        },
      ],
    ],
  };
};
