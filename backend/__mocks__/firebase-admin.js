const apps = [];

const makeDocSnapshot = ({ id = 'mock-doc-id', exists = false, data = () => ({}) } = {}) => ({
  id,
  exists,
  data
});

const makeDocRef = (overrides = {}) => ({
  id: 'mock-doc-id',
  get: jest.fn(() => Promise.resolve(makeDocSnapshot())),
  set: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve()),
  ...overrides
});

const makeQuerySnapshot = (docs = []) => ({
  empty: docs.length === 0,
  docs,
  forEach: jest.fn((cb) => docs.forEach(cb))
});

const createCollection = () => {
  const collection = {};

  collection.doc = jest.fn(() => makeDocRef());
  collection.add = jest.fn(() => Promise.resolve(makeDocRef()));
  collection.where = jest.fn(() => collection);
  collection.get = jest.fn(() => Promise.resolve(makeQuerySnapshot()));

  return collection;
};

const firestoreInstance = {
  collection: jest.fn(() => createCollection())
};

const makeFile = () => ({
  getSignedUrl: jest.fn(() => Promise.resolve(['https://example.com/mock-file.jpg']))
});

const storageBucket = {
  getFiles: jest.fn(() => Promise.resolve([[makeFile()]]))
};

const storageInstance = {
  bucket: jest.fn(() => storageBucket)
};

const initializeApp = jest.fn(() => {
  const app = { name: `mock-app-${apps.length}` };
  apps.push(app);
  return app;
});

const credential = {
  applicationDefault: jest.fn(() => ({ mock: 'applicationDefault' })),
  cert: jest.fn(() => ({ mock: 'cert' }))
};

const firestore = jest.fn(() => firestoreInstance);
const storage = jest.fn(() => storageInstance);

const resetMocks = () => {
  apps.length = 0;
  initializeApp.mockClear();
  credential.applicationDefault.mockClear();
  credential.cert.mockClear();
  firestore.mockClear();
  firestoreInstance.collection.mockClear();
  storage.mockClear();
  storageInstance.bucket.mockClear();
  storageBucket.getFiles.mockClear();
};

module.exports = {
  apps,
  initializeApp,
  credential,
  firestore,
  storage,
  __resetMocks: resetMocks,
  __factories: {
    makeDocSnapshot,
    makeDocRef,
    makeQuerySnapshot,
    createCollection,
    makeFile
  }
};
