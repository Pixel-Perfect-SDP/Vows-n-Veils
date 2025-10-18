const { createRes } = require('../helpers/httpMocks');

jest.mock('axios');
const axios = require('axios');

global.weatherCrossings = [];
const controller = require('../../controllers/weather-crossing.controller');

describe('weather-crossing.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.weatherCrossings.length = 0;
  });

  afterAll(() => {
    delete global.weatherCrossings;
  });

  describe('getAllWeatherCrossings', () => {
    it('returns weather data from Visual Crossing', async () => {
      axios.get.mockResolvedValue({ data: { temp: 20 } });
      const req = { query: { location: 'Cape Town', date: '2024-10-01' } };
      const res = createRes();

      await controller.getAllWeatherCrossings(req, res);

      expect(axios.get).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ temp: 20 });
    });

    it('handles API errors', async () => {
      axios.get.mockRejectedValue(new Error('API error'));
      const req = { query: { location: 'Cape Town' } };
      const res = createRes();

      await controller.getAllWeatherCrossings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching weather data',
        error: 'API error'
      });
    });
  });

  describe('in-memory CRUD helpers', () => {
    it('returns a weather crossing by id', () => {
      global.weatherCrossings.push({ id: '1', label: 'Existing' });
      const req = { params: { id: '1' } };
      const res = createRes();

      controller.getWeatherCrossingById(req, res);

      expect(res.json).toHaveBeenCalledWith({ id: '1', label: 'Existing' });
    });

    it('returns 404 when weather crossing is missing', () => {
      const req = { params: { id: 'missing' } };
      const res = createRes();

      controller.getWeatherCrossingById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Weather Crossing not found' });
    });

    it('creates a new weather crossing', () => {
      const req = { body: { label: 'New' } };
      const res = createRes();

      controller.createWeatherCrossing(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      expect(global.weatherCrossings).toHaveLength(1);
    });

    it('updates an existing weather crossing', () => {
      const existing = { id: '42', label: 'Before' };
      global.weatherCrossings.push(existing);
      const req = { params: { id: '42' }, body: { label: 'After' } };
      const res = createRes();

      controller.updateWeatherCrossing(req, res);

      expect(res.json).toHaveBeenCalledWith({ id: '42', label: 'After' });
    });

    it('returns 404 on update when crossing missing', () => {
      const req = { params: { id: 'missing' }, body: { label: 'After' } };
      const res = createRes();

      controller.updateWeatherCrossing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Weather Crossing not found' });
    });

    it('deletes an existing weather crossing', () => {
      const existing = { id: '1', label: 'Delete me' };
      global.weatherCrossings.push(existing);
      const req = { params: { id: '1' } };
      const res = createRes();

      controller.deleteWeatherCrossing(req, res);

      expect(res.json).toHaveBeenCalledWith(existing);
      expect(global.weatherCrossings).toHaveLength(0);
    });

    it('returns 404 when deleting a missing crossing', () => {
      const req = { params: { id: 'missing' } };
      const res = createRes();

      controller.deleteWeatherCrossing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Weather Crossing not found' });
    });
  });
});
