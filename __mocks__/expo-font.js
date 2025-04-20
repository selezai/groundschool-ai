// Mock for expo-font
module.exports = {
  loadAsync: jest.fn().mockResolvedValue(true),
  isLoaded: jest.fn().mockReturnValue(true),
  useFonts: jest.fn().mockReturnValue([true, null]),
  FontDisplay: {
    AUTO: 'auto',
    BLOCK: 'block',
    SWAP: 'swap',
    FALLBACK: 'fallback',
    OPTIONAL: 'optional'
  }
};
