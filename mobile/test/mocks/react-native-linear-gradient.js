const React = require('react');
const { View } = require('react-native');

module.exports = ({ children, ...props }) =>
  React.createElement(View, props, children);
