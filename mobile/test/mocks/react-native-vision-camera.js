/* eslint-env jest */
const React = require('react');
const { View } = require('react-native');

module.exports = {
  Camera: React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  ),
  useCameraDevice: jest.fn(() => ({
    id: 'mock-camera',
    position: 'back',
  })),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn(async () => true),
  })),
  usePhotoOutput: jest.fn(() => ({
    capturePhotoToFile: jest.fn(async () => ({
      filePath: '/tmp/mock-photo.jpg',
    })),
  })),
};
