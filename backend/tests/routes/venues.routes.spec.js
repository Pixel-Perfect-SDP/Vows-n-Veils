const request = require('supertest');
const app = require('../../app');
const admin = require('firebase-admin');

const {
  createCollection,
  createDocSnapshot,
  createDocRef,
  createQuerySnapshot,
  createFile
} = admin.__factories;

describe('venues routes', () => {
  let firestore;
  let bucket;
  let collections;

  const getCollection = (name) => {
    if (!collections[name]) {
      collections[name] = createCollection();
    }
    return collections[name];
  };

  beforeEach(() => {
    if (typeof admin.__resetMocks === 'function') {
      admin.__resetMocks();
    }
    firestore = admin.__getFirestore();
    bucket = admin.__getBucket();
    collections = {};

    admin.firestore.mockClear();
    admin.firestore.mockReturnValue(firestore);

    firestore.collection.mockReset();
    bucket.getFiles.mockReset();
    bucket.file.mockReset();

    firestore.collection.mockImplementation((name) => getCollection(name));
  });

  it('lists all venues with their image urls', async () => {
    const venueDoc = createDocSnapshot({
      id: 'venue-1',
      data: () => ({
        venuename: 'Elegant Hall',
        capacity: 120
      })
    });
    getCollection('Venues').__setDocs([venueDoc]);

    const imageFile = createFile();
    imageFile.name = 'venues/venue-1/photo.jpg';
    imageFile.getSignedUrl.mockResolvedValue(['https://cdn/venue-1/photo.jpg']);

    bucket.getFiles.mockResolvedValue([[imageFile]]);

    const response = await request(app).get('/venues');

    expect(response.status).toBe(200);
    expect(bucket.getFiles).toHaveBeenCalledWith({ prefix: 'venues/venue-1/' });
    expect(response.body).toEqual([
      {
        id: 'venue-1',
        venuename: 'Elegant Hall',
        capacity: 120,
        images: [{ url: 'https://cdn/venue-1/photo.jpg', name: 'venues/venue-1/photo.jpg' }]
      }
    ]);
  });

  it('returns venue details by id', async () => {
    const venueData = {
      venuename: 'Sunset Gardens',
      price: 5000
    };
    const docRef = createDocRef({
      id: 'venue-1',
      data: () => venueData,
      exists: true
    });
    getCollection('Venues').doc.mockReturnValue(docRef);

    const imageFile = createFile();
    imageFile.name = 'venues/venue-1/hero.jpg';
    imageFile.getSignedUrl.mockResolvedValue(['https://cdn/venue-1/hero.jpg']);
    bucket.getFiles.mockResolvedValue([[imageFile]]);

    const response = await request(app).get('/venues/venue-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'venue-1',
      ...venueData,
      images: [{ url: 'https://cdn/venue-1/hero.jpg', name: 'venues/venue-1/hero.jpg' }]
    });
  });

  it('returns 404 when venue id is not found', async () => {
    const docRef = createDocRef({ id: 'missing', exists: false });
    getCollection('Venues').doc.mockReturnValue(docRef);

    const response = await request(app).get('/venues/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('lists venues filtered by company id', async () => {
    const venueDoc = createDocSnapshot({
      id: 'venue-1',
      data: () => ({
        venuename: 'Elegant Hall',
        companyID: 'co-123'
      })
    });
    const query = {
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([venueDoc])))
    };
    const venuesCollection = getCollection('Venues');
    venuesCollection.where.mockReturnValue(query);

    const imageFile = createFile();
    imageFile.name = 'venues/venue-1/gallery.jpg';
    imageFile.getSignedUrl.mockResolvedValue(['https://cdn/venue-1/gallery.jpg']);
    bucket.getFiles.mockResolvedValue([[imageFile]]);

    const response = await request(app).get('/venues/company/co-123');

    expect(response.status).toBe(200);
    expect(query.get).toHaveBeenCalled();
    expect(response.body).toEqual([
      {
        id: 'venue-1',
        venuename: 'Elegant Hall',
        companyID: 'co-123',
        images: [
          {
            url: 'https://cdn/venue-1/gallery.jpg',
            name: 'venues/venue-1/gallery.jpg'
          }
        ]
      }
    ]);
  });

  it('returns 404 when no venues are found for a company', async () => {
    const venuesCollection = getCollection('Venues');
    venuesCollection.where.mockReturnValue({
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([])))
    });

    const response = await request(app).get('/venues/company/co-999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No venues found for this companyID' });
  });

  it('rejects venue order requests with missing fields', async () => {
    const response = await request(app).post('/venues/confirm-order').send({
      customerID: 'cust-1'
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing required fields' });
  });

  it('rejects venue order when date conflicts with existing booking', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    const existingOrder = createDocSnapshot({
      id: 'order-1',
      data: () => ({
        startAt: new Date('2024-06-10T12:00:00Z'),
        endAt: new Date('2024-06-11T12:00:00Z')
      })
    });

    ordersCollection.where.mockReturnValue({
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([existingOrder])))
    });

    const response = await request(app).post('/venues/confirm-order').send({
      customerID: 'cust-1',
      venueID: 'venue-1',
      companyID: 'co-1',
      startAt: '2024-06-10T10:00:00Z',
      endAt: '2024-06-11T10:00:00Z',
      eventID: 'event-1'
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('not available');
  });

  it('confirms venue order when no conflict exists', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    ordersCollection.where.mockReturnValue({
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([])))
    });

    const addSpy = jest.fn(() => Promise.resolve({ id: 'order-99' }));
    ordersCollection.add = addSpy;

    const response = await request(app).post('/venues/confirm-order').send({
      customerID: 'cust-1',
      venueID: 'venue-1',
      companyID: 'co-1',
      startAt: '2024-07-10T10:00:00Z',
      endAt: '2024-07-11T10:00:00Z',
      eventID: 'event-1',
      note: 'Please confirm'
    });

    expect(response.status).toBe(200);
    expect(addSpy).toHaveBeenCalled();
    expect(response.body).toEqual({ ok: true, orderID: 'order-99' });
  });

  it('returns sorted orders for a company', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    const docs = [
      createDocSnapshot({
        id: 'order-accepted',
        data: () => ({ status: 'accepted' })
      }),
      createDocSnapshot({
        id: 'order-pending',
        data: () => ({ status: 'pending' })
      }),
      createDocSnapshot({
        id: 'order-rejected',
        data: () => ({ status: 'rejected' })
      })
    ];
    const query = {
      get: jest.fn(() => Promise.resolve(createQuerySnapshot(docs)))
    };
    ordersCollection.where.mockReturnValue(query);

    const response = await request(app).get('/venues/orders/company/co-1');

    expect(response.status).toBe(200);
    expect(response.body.map((order) => order.id)).toEqual([
      'order-pending',
      'order-accepted',
      'order-rejected'
    ]);
  });

  it('returns 404 when no orders exist for a company', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    ordersCollection.where.mockReturnValue({
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([])))
    });

    const response = await request(app).get('/venues/orders/company/none');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No orders found' });
  });

  it('validates order status payload', async () => {
    const response = await request(app)
      .put('/venues/orders/order-1/status')
      .send({ status: 'maybe' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid status' });
  });

  it('returns 404 when updating status for missing order', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    const orderRef = createDocRef({ id: 'order-1', exists: false });
    orderRef.get = jest.fn(() =>
      Promise.resolve(createDocSnapshot({ id: 'order-1', exists: false }))
    );
    ordersCollection.doc.mockReturnValue(orderRef);

    const response = await request(app)
      .put('/venues/orders/order-1/status')
      .send({ status: 'accepted' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Order not found' });
  });

  it('updates order status to accepted and notifies customer', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    const orderData = { customerID: 'cust-1', status: 'pending' };
    const orderRef = createDocRef({
      id: 'order-1',
      data: () => orderData,
      exists: true
    });
    orderRef.get = jest.fn(() =>
      Promise.resolve(createDocSnapshot({ id: 'order-1', data: () => orderData, exists: true }))
    );
    orderRef.update = jest.fn(() => Promise.resolve());
    orderRef.delete = jest.fn(() => Promise.resolve());
    ordersCollection.doc.mockReturnValue(orderRef);

    const notificationsCollection = getCollection('Notifications');
    const addSpy = jest.fn(() => Promise.resolve({ id: 'notif-1' }));
    notificationsCollection.add = addSpy;

    const response = await request(app)
      .put('/venues/orders/order-1/status')
      .send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(orderRef.update).toHaveBeenCalledWith({ status: 'accepted' });
    expect(orderRef.delete).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cust-1',
        message: expect.stringContaining('accepted')
      })
    );
    expect(response.body).toEqual({
      ok: true,
      orderID: 'order-1',
      status: 'accepted',
      to: 'cust-1'
    });
  });

  it('deletes order when status is rejected and notifies customer', async () => {
    const ordersCollection = getCollection('VenuesOrders');
    const orderData = { customerID: 'cust-1', status: 'pending' };
    const orderRef = createDocRef({
      id: 'order-1',
      data: () => orderData,
      exists: true
    });
    orderRef.get = jest.fn(() =>
      Promise.resolve(createDocSnapshot({ id: 'order-1', data: () => orderData, exists: true }))
    );
    orderRef.update = jest.fn(() => Promise.resolve());
    orderRef.delete = jest.fn(() => Promise.resolve());
    ordersCollection.doc.mockReturnValue(orderRef);

    const notificationsCollection = getCollection('Notifications');
    const addSpy = jest.fn(() => Promise.resolve({ id: 'notif-1' }));
    notificationsCollection.add = addSpy;

    const response = await request(app)
      .put('/venues/orders/order-1/status')
      .send({ status: 'rejected' });

    expect(response.status).toBe(200);
    expect(orderRef.delete).toHaveBeenCalled();
    expect(orderRef.update).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cust-1',
        message: expect.stringContaining('rejected')
      })
    );
    expect(response.body).toEqual({
      ok: true,
      orderID: 'order-1',
      status: 'rejected',
      to: 'cust-1'
    });
  });

  it('returns notifications for a user and normalises dates', async () => {
    const notificationsCollection = getCollection('Notifications');
    const toDate = jest.fn(() => new Date('2024-05-17T12:00:00Z'));
    const doc = createDocSnapshot({
      id: 'notif-1',
      data: () => ({
        from: 'Management',
        message: 'Hello',
        date: { toDate },
        read: false,
        to: 'user-1'
      })
    });
    notificationsCollection.where.mockReturnValue({
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([doc])))
    });

    const response = await request(app).get('/venues/notifications/user-1');

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(1);
    expect(new Date(response.body.notifications[0].date).toISOString()).toBe(
      '2024-05-17T12:00:00.000Z'
    );
  });

  it('returns 404 when no notifications exist for user', async () => {
    const notificationsCollection = getCollection('Notifications');
    notificationsCollection.where.mockReturnValue({
      get: jest.fn(() => Promise.resolve(createQuerySnapshot([])))
    });

    const response = await request(app).get('/venues/notifications/none');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No notifications found' });
  });

  it('marks notification as read', async () => {
    const notificationsCollection = getCollection('Notifications');
    const notifRef = createDocRef({ id: 'notif-1', exists: true });
    notifRef.get = jest.fn(() =>
      Promise.resolve(createDocSnapshot({ id: 'notif-1', exists: true }))
    );
    notifRef.update = jest.fn(() => Promise.resolve());
    notificationsCollection.doc.mockReturnValue(notifRef);

    const response = await request(app).put('/venues/notifications/notif-1/read');

    expect(response.status).toBe(200);
    expect(notifRef.update).toHaveBeenCalledWith({ read: true });
    expect(response.body).toEqual({
      ok: true,
      id: 'notif-1',
      message: 'Notification marked as read'
    });
  });

  it('returns 404 when notification does not exist', async () => {
    const notificationsCollection = getCollection('Notifications');
    const notifRef = createDocRef({ id: 'notif-1', exists: false });
    notifRef.get = jest.fn(() =>
      Promise.resolve(createDocSnapshot({ id: 'notif-1', exists: false }))
    );
    notificationsCollection.doc.mockReturnValue(notifRef);

    const response = await request(app).put('/venues/notifications/notif-1/read');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Notification not found' });
  });
});
