const createDocSnapshot = ({
  id = 'mock-doc-id',
  exists = true,
  data = () => ({}),
  ref = null
} = {}) => ({
  id,
  exists,
  data: typeof data === 'function' ? data : () => data,
  ref
});

const createDocRef = ({
  id = 'mock-doc-id',
  data = () => ({}),
  exists = true
} = {}) => {
  const docSnapshot = createDocSnapshot({
    id,
    exists,
    data
  });

  const ref = {
    id,
    get: jest.fn(() => Promise.resolve(docSnapshot)),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve())
  };

  docSnapshot.ref = ref;
  return ref;
};

const createQuerySnapshot = (docs = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs,
  forEach: jest.fn((callback) => docs.forEach((doc) => callback(doc)))
});

const createCollection = () => {
  let currentDocs = createQuerySnapshot();

  const collection = {
    __setDocs: (docs) => {
      currentDocs = createQuerySnapshot(docs);
      return collection;
    },
    doc: jest.fn((id) => createDocRef({ id })),
    add: jest.fn((payload) =>
      Promise.resolve(
        createDocRef({
          id: 'new-doc-id',
          data: () => payload,
          exists: true
        })
      )
    ),
    where: jest.fn(() => collection),
    get: jest.fn(() => Promise.resolve(currentDocs))
  };

  return collection;
};

const createBatch = () => ({
  set: jest.fn(() => {}),
  update: jest.fn(() => {}),
  delete: jest.fn(() => {}),
  commit: jest.fn(() => Promise.resolve())
});

const createFile = () => ({
  getSignedUrl: jest.fn(() => Promise.resolve(['https://example.com/mock-file.jpg'])),
  delete: jest.fn(() => Promise.resolve())
});

const createBucket = () => {
  let files = [[createFile()]];
  return {
    __setFiles: (newFiles) => {
      files = [newFiles];
    },
    getFiles: jest.fn(() => Promise.resolve(files)),
    file: jest.fn(() => createFile())
  };
};

const firestoreCollections = new Map();

const firestoreInstance = {
  collection: jest.fn((name) => {
    if (!firestoreCollections.has(name)) {
      firestoreCollections.set(name, createCollection());
    }
    return firestoreCollections.get(name);
  }),
  batch: jest.fn(() => createBatch())
};

const bucketInstance = createBucket();

const storageInstance = {
  bucket: jest.fn(() => bucketInstance)
};

const apps = [];

const initializeApp = jest.fn((config = {}) => {
  const app = { name: `mock-app-${apps.length}`, options: config };
  apps.push(app);
  return app;
});

const credential = {
  applicationDefault: jest.fn(() => ({ mock: 'applicationDefault' })),
  cert: jest.fn(() => ({ mock: 'cert' }))
};

const firestore = Object.assign(jest.fn(() => firestoreInstance), {
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date().toISOString())
  }
});

const storage = jest.fn(() => storageInstance);

const resetMocks = () => {
  apps.length = 0;
  firestoreCollections.clear();
  bucketInstance.__setFiles([createFile()]);

  initializeApp.mockClear();
  credential.applicationDefault.mockClear();
  credential.cert.mockClear();
  firestore.mockClear();
  firestoreInstance.collection.mockClear();
  firestoreInstance.batch.mockClear();
  storage.mockClear();
  storageInstance.bucket.mockClear();
};

module.exports = {
  apps,
  initializeApp,
  credential,
  firestore,
  storage,
  __resetMocks: resetMocks,
  __factories: {
    createDocSnapshot,
    createDocRef,
    createQuerySnapshot,
    createCollection,
    createBatch,
    createBucket,
    createFile
  },
  __getFirestore: () => firestoreInstance,
  __getStorage: () => storageInstance,
  __getBucket: () => bucketInstance,
  __setCollection: (name, collection) => {
    firestoreCollections.set(name, collection);
  },
  __clearCollections: () => firestoreCollections.clear()
};
