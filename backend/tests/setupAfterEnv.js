const admin = require('firebase-admin');

beforeEach(() => {
  if (typeof admin.__resetMocks === 'function') {
    admin.__resetMocks();
  }
});
