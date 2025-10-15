const request = require('supertest');
const app = require('../../app');
const guestsController = require('../../controllers/guests.controller');

describe('events routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates GET /events/:eventId/guests to listGuestsByEvent', async () => {
    const spy = jest
      .spyOn(guestsController, 'listGuestsByEvent')
      .mockImplementation((req, res) => res.json([{ id: 'g1' }]));

    const response = await request(app).get('/events/event-1/guests');

    expect(spy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'g1' }]);
  });

  it('delegates GET /events/:eventId/guest-filters to getGuestFilterOptions', async () => {
    const spy = jest
      .spyOn(guestsController, 'getGuestFilterOptions')
      .mockImplementation((req, res) => res.json({ dietary: [], allergies: [] }));

    const response = await request(app).get('/events/event-1/guest-filters');

    expect(spy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ dietary: [], allergies: [] });
  });

  it('delegates POST /events/:eventId/guests to createGuestForEvent', async () => {
    const spy = jest
      .spyOn(guestsController, 'createGuestForEvent')
      .mockImplementation((req, res) => res.status(201).json({ id: 'g2' }));

    const response = await request(app)
      .post('/events/event-1/guests')
      .send({ Name: 'Amy', Email: 'amy@example.com' });

    expect(spy).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 'g2' });
  });

  it('delegates DELETE /events/:eventId/guests/:guestId to deleteGuestForEvent', async () => {
    const spy = jest
      .spyOn(guestsController, 'deleteGuestForEvent')
      .mockImplementation((req, res) => res.json({ ok: true }));

    const response = await request(app).delete('/events/event-1/guests/guest-1');

    expect(spy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
