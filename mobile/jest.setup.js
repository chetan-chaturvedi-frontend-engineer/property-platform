/* eslint-env jest */
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@react-native-vector-icons/ionicons', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ name }) => <Text>{name}</Text> };
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return <View testID="map-view">{props.children}</View>;
  });
  return {
    __esModule: true,
    default: MapView,
    Marker: ({ children }) => <View>{children}</View>,
    PROVIDER_DEFAULT: null,
    PROVIDER_GOOGLE: 'google',
  };
});
