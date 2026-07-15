/* eslint-env jest */

const mockFetch = jest.fn(() => Promise.resolve({ path: () => '' }));

module.exports = {
  __esModule: true,
  default: {
    config: jest.fn(() => ({
      fetch: mockFetch,
    })),
    fs: {
      dirs: {
        DownloadDir: '/downloads',
      },
    },
  },
};
