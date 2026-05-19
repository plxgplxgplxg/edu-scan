module.exports = {
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
};
