const request = require('supertest');
const app = require('../app');

describe('App basic routes', () => {
  it('responds to GET / with the health message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Backend is up');
  });
});
