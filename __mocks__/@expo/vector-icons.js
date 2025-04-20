// Mock for @expo/vector-icons
const React = require('react');
const { Text } = require('react-native');

// Create a mock component for each icon set
const createIconSetMock = (name) => {
  const IconComponent = ({ name, size, color, style, ...props }) => {
    return React.createElement(Text, {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `${name}-icon`,
    }, `[${name} Icon]`);
  };
  
  return IconComponent;
};

// Export mock components for each icon set
module.exports = {
  Ionicons: createIconSetMock('Ionicons'),
  MaterialIcons: createIconSetMock('MaterialIcons'),
  FontAwesome: createIconSetMock('FontAwesome'),
  FontAwesome5: createIconSetMock('FontAwesome5'),
  MaterialCommunityIcons: createIconSetMock('MaterialCommunityIcons'),
  Entypo: createIconSetMock('Entypo'),
  Feather: createIconSetMock('Feather'),
  AntDesign: createIconSetMock('AntDesign'),
  SimpleLineIcons: createIconSetMock('SimpleLineIcons'),
  Octicons: createIconSetMock('Octicons'),
  Foundation: createIconSetMock('Foundation'),
  EvilIcons: createIconSetMock('EvilIcons'),
  Fontisto: createIconSetMock('Fontisto'),
  createIconSet: () => createIconSetMock('CustomIcon'),
};
