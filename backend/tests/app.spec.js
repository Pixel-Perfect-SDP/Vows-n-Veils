const request = require('supertest');
const app = require('../app');

describe('App basic routes', () => {
  it('responds to GET / with the health message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Backend is up');
  });

  it('allows configured origins through CORS', async () => {
    const response = await request(app).get('/').set('Origin', 'http://localhost:4200');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('rejects unknown origins via CORS', async () => {
    const response = await request(app).get('/').set('Origin', 'https://malicious.example');

    expect(response.status).toBe(500);
    expect(response.text).toContain('Not allowed by CORS');
  });
});
