process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '0';
process.env.PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://localhost/api-docs';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_PRIVATE_KEY ||
  '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n';
process.env.FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'test-bucket';
process.env.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || 'test-hf-key';

jest.mock('firebase-admin', () => {
  return require('../__mocks__/firebase-admin');
});
