jest.mock('../../controllers/guests.controller', () => ({
  listGuestsByEvent: jest.fn(),
  getGuestFilterOptions: jest.fn(),
  createGuestForEvent: jest.fn(),
  deleteGuestForEvent: jest.fn(),
  exportGuestsCsv: jest.fn(),
  exportGuestsPdf: jest.fn()
}));

const guestsController = require('../../controllers/guests.controller');
const request = require('supertest');
const app = require('../../app');

describe('events routes', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('delegates GET /events/:eventId/guests to listGuestsByEvent', async () => {
    guestsController.listGuestsByEvent.mockImplementation((req, res) => res.json([{ id: 'g1' }]));

    const response = await request(app).get('/events/event-1/guests');

    expect(guestsController.listGuestsByEvent).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'g1' }]);
  });

  it('delegates GET /events/:eventId/guest-filters to getGuestFilterOptions', async () => {
    guestsController.getGuestFilterOptions.mockImplementation((req, res) => res.json({ dietary: [], allergies: [] }));

    const response = await request(app).get('/events/event-1/guest-filters');

    expect(guestsController.getGuestFilterOptions).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ dietary: [], allergies: [] });
  });

  it('delegates POST /events/:eventId/guests to createGuestForEvent', async () => {
    guestsController.createGuestForEvent.mockImplementation((req, res) => res.status(201).json({ id: 'g2' }));

    const response = await request(app)
      .post('/events/event-1/guests')
      .send({ Name: 'Amy', Email: 'amy@example.com' });

    expect(guestsController.createGuestForEvent).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 'g2' });
  });

  it('delegates DELETE /events/:eventId/guests/:guestId to deleteGuestForEvent', async () => {
    guestsController.deleteGuestForEvent.mockImplementation((req, res) => res.json({ ok: true }));

    const response = await request(app).delete('/events/event-1/guests/guest-1');

    expect(guestsController.deleteGuestForEvent).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('delegates GET /events/:eventId/guests/export.csv to exportGuestsCsv', async () => {
    guestsController.exportGuestsCsv.mockImplementation((req, res) => res.send('csv'));

    const response = await request(app).get('/events/event-1/guests/export.csv');

    expect(guestsController.exportGuestsCsv).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.text).toBe('csv');
  });

  it('delegates GET /events/:eventId/guests/export.pdf to exportGuestsPdf', async () => {
    guestsController.exportGuestsPdf.mockImplementation((req, res) => res.send('pdf'));

    const response = await request(app).get('/events/event-1/guests/export.pdf');

    expect(guestsController.exportGuestsPdf).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.text).toBe('pdf');
  });
});
