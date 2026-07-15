module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/test/mocks/async-storage.js',
    '^@react-native-clipboard/clipboard$': '<rootDir>/test/mocks/clipboard.js',
    '^react-native-document-picker$': '<rootDir>/test/mocks/document-picker.js',
    '^@react-navigation/native$': '<rootDir>/test/mocks/navigation-native.js',
    '^@react-navigation/native-stack$':
      '<rootDir>/test/mocks/navigation-native-stack.js',
    '^@react-navigation/bottom-tabs$':
      '<rootDir>/test/mocks/navigation-bottom-tabs.js',
    '^react-native-linear-gradient$':
      '<rootDir>/test/mocks/react-native-linear-gradient.js',
    '^react-native-vision-camera$':
      '<rootDir>/test/mocks/react-native-vision-camera.js',
    '^react-native-webview$': '<rootDir>/test/mocks/react-native-webview.js',
    '^react-native-blob-util$':
      '<rootDir>/test/mocks/react-native-blob-util.js',
  },
};
