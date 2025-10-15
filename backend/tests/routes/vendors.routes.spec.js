const request = require('supertest');
const app = require('../../app');
const admin = require('firebase-admin');

const {
  createCollection,
  createDocSnapshot,
  createDocRef,
  createQuerySnapshot,
  createFile,
  createBatch
} = admin.__factories;

describe('vendors routes', () => {
  let firestore;
  let storageBucket;
  let collections;

  const getCollection = (name) => {
    if (!collections[name]) {
      collections[name] = createCollection();
    }
    return collections[name];
  };

  beforeEach(() => {
    firestore = admin.__getFirestore();
    storageBucket = admin.__getBucket();
    collections = {};

    firestore.collection.mockImplementation((name) => getCollection(name));
  });

  const seedVendors = (docs) => {
    const collection = getCollection('Vendors');
    collection.__setDocs(docs);
    return collection;
  };

  it('lists all vendors with image urls', async () => {
    const docs = [
      createDocSnapshot({
        id: 'vendor-1',
        data: () => ({ name: 'Vendor One', companyID: 'co-1' })
      })
    ];
    seedVendors(docs);

    const file = createFile();
    file.getSignedUrl.mockResolvedValue(['https://cdn/image.jpg']);
    storageBucket.getFiles.mockResolvedValue([[file]]);

    const response = await request(app).get('/vendors');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 'vendor-1', name: 'Vendor One', companyID: 'co-1', images: ['https://cdn/image.jpg'] }
    ]);
  });

  it('filters vendors by company id', async () => {
    const docs = [
      createDocSnapshot({
        id: 'vendor-1',
        data: () => ({ name: 'Vendor One', companyID: 'co-1' })
      }),
      createDocSnapshot({
        id: 'vendor-2',
        data: () => ({ name: 'Vendor Two', companyID: 'co-2' })
      })
    ];
    const collection = seedVendors(docs);
    collection.where.mockReturnValue(collection);
    collection.get.mockImplementation(() =>
      Promise.resolve(createQuerySnapshot([docs[0]]))
    );

    storageBucket.getFiles.mockResolvedValue([[createFile()]]);

    const response = await request(app).get('/vendors/company/co-1');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(collection.where).toHaveBeenCalledWith('companyID', '==', 'co-1');
  });

  it('returns 404 when vendor not found by id', async () => {
    const docRef = createDocRef({ id: 'vendor-1', exists: false });
    const collection = getCollection('Vendors');
    collection.doc.mockReturnValue(docRef);

    const response = await request(app).get('/vendors/vendor-1');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('returns vendor details by id', async () => {
    const vendorData = { name: 'Vendor', companyID: 'co-1' };
    const docRef = createDocRef({ id: 'vendor-1', data: () => vendorData, exists: true });
    const collection = getCollection('Vendors');
    collection.doc.mockReturnValue(docRef);

    storageBucket.getFiles.mockResolvedValue([[createFile()]]);

    const response = await request(app).get('/vendors/vendor-1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'vendor-1', ...vendorData });
  });

  it('validates vendor creation payload', async () => {
    const response = await request(app).post('/vendors').send({ type: 'music' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('rejects invalid phone numbers on create', async () => {
    const payload = {
      name: 'Test',
      type: 'music',
      companyID: 'co-1',
      email: 'test@example.com',
      phonenumber: 'abc'
    };

    const response = await request(app).post('/vendors').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual('Invalid phone number format');
  });

  it('creates vendor successfully', async () => {
    const collection = getCollection('Vendors');
    const addMock = jest.fn(() => Promise.resolve({ id: 'new-id' }));
    collection.add = addMock;

    admin.firestore.FieldValue.serverTimestamp.mockReturnValue('timestamp');

    const payload = {
      name: 'Vendor',
      type: 'music',
      companyID: 'co-1',
      email: 'vendor@example.com',
      phonenumber: '+27123456789',
      price: '100'
    };

    const response = await request(app).post('/vendors').send(payload);

    expect(response.status).toBe(201);
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Vendor',
        serviceName: 'Vendor',
        price: 100,
        createdAt: 'timestamp'
      })
    );
  });

  it('rejects invalid phone number on update', async () => {
    const response = await request(app)
      .put('/vendors/vendor-1')
      .send({ phonenumber: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid phone number format');
  });

  it('updates vendor fields', async () => {
    const docRef = {
      update: jest.fn(() => Promise.resolve())
    };
    const collection = getCollection('Vendors');
    collection.doc.mockReturnValue(docRef);
    admin.firestore.FieldValue.serverTimestamp.mockReturnValue('ts');

    const response = await request(app)
      .put('/vendors/vendor-1')
      .send({ name: 'Updated', phonenumber: '+2712345678' });

    expect(response.status).toBe(200);
    expect(docRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated',
        serviceName: 'Updated',
        phonenumber: '+2712345678',
        updatedAt: 'ts'
      })
    );
  });

  it('patches vendor phone after validation', async () => {
    const docRef = {
      get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
      update: jest.fn(() => Promise.resolve())
    };
    const collection = getCollection('Vendors');
    collection.doc.mockReturnValue(docRef);
    admin.firestore.FieldValue.serverTimestamp.mockReturnValue('ts');

    const response = await request(app)
      .patch('/vendors/vendor-1/phone')
      .send({ phonenumber: '+2712345678' });

    expect(response.status).toBe(200);
    expect(docRef.update).toHaveBeenCalledWith({
      phonenumber: '+2712345678',
      updatedAt: 'ts'
    });
  });

  it('bulk updates phone numbers by company', async () => {
    const docs = [
      {
        ref: { update: jest.fn() }
      },
      {
        ref: { update: jest.fn() }
      }
    ];
    const collection = getCollection('Vendors');
    collection.where.mockReturnValue(collection);
    collection.get.mockResolvedValue({
      empty: false,
      docs,
      size: docs.length
    });

    const batch = createBatch();
    firestore.batch.mockReturnValueOnce(batch);
    admin.firestore.FieldValue.serverTimestamp.mockReturnValue('ts');

    const response = await request(app)
      .patch('/vendors/company/co-1/phone')
      .send({ phonenumber: '+2712345678' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, updated: 2 });
    expect(batch.update).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when deleting missing vendor', async () => {
    const docRef = createDocRef({ id: 'vendor-1', exists: false });
    const collection = getCollection('Vendors');
    collection.doc.mockReturnValue(docRef);

    const response = await request(app).delete('/vendors/vendor-1');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Vendor not found' });
  });

  it('deletes vendor and clears images', async () => {
    const file = createFile();
    const docRef = createDocRef({
      id: 'vendor-1',
      exists: true,
      data: () => ({ name: 'Vendor' })
    });
    docRef.delete = jest.fn(() => Promise.resolve());

    const collection = getCollection('Vendors');
    collection.doc.mockReturnValue(docRef);

    storageBucket.getFiles.mockResolvedValue([[file]]);

    const response = await request(app).delete('/vendors/vendor-1');

    expect(response.status).toBe(200);
    expect(docRef.delete).toHaveBeenCalled();
    expect(file.delete).toHaveBeenCalled();
  });
});
