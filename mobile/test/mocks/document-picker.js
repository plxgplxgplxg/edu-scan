const types = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  images: 'image/*',
  plainText: 'text/plain',
};

module.exports = {
  types,
  pickSingle: jest.fn(() => Promise.resolve(null)),
  pick: jest.fn(() => Promise.resolve([])),
  isCancel: jest.fn(() => false),
};
