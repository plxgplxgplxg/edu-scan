const React = require('react');

module.exports = {
  createNativeStackNavigator: () => {
    const Navigator = ({ children }) =>
      React.createElement(React.Fragment, null, children);
    const Screen = ({ component: Component }) =>
      Component ? React.createElement(Component) : null;
    return { Navigator, Screen };
  },
};
