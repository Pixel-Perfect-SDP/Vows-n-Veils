const request = require('supertest');
const app = require('../../app');

describe('chatbot routes', () => {
  let originalFetch;
  let originalApiKey;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalApiKey = process.env.HUGGINGFACE_API_KEY;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.HUGGINGFACE_API_KEY = originalApiKey;
  });

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('validates request payload', async () => {
    const response = await request(app).post('/chatbot/answer').send({ question: 'Hi' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing question or faqQuestions array' });
  });

  it('returns 500 when API key missing', async () => {
    process.env.HUGGINGFACE_API_KEY = '';

    const response = await request(app)
      .post('/chatbot/answer')
      .send({ question: 'Hello', faqQuestions: ['Hi'] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Hugging Face API key not configured' });
  });

  it('returns scores from Hugging Face', async () => {
    process.env.HUGGINGFACE_API_KEY = 'test-key';
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn(() => Promise.resolve([0.1, 0.2])),
      status: 200
    });

    const response = await request(app)
      .post('/chatbot/answer')
      .send({ question: 'Hello', faqQuestions: ['Hi', 'How are you?'] });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' })
      })
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ scores: [0.1, 0.2] });
  });

  it('forwards Hugging Face errors', async () => {
    process.env.HUGGINGFACE_API_KEY = 'test-key';
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn(() => Promise.resolve('Service unavailable'))
    });

    const response = await request(app)
      .post('/chatbot/answer')
      .send({ question: 'Hello', faqQuestions: ['Hi'] });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Hugging Face API error',
      details: 'Service unavailable'
    });
  });
});
