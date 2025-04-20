// Mock for React Native assets registry
module.exports = {
  registerAsset: jest.fn((asset) => asset),
  getAssetByID: jest.fn(() => ({
    scales: [1],
    hash: [],
    name: 'test',
    type: 'png',
  })),
  getAssetByURL: jest.fn(() => ({
    scales: [1],
    hash: [],
    name: 'test',
    type: 'png',
  })),
};
