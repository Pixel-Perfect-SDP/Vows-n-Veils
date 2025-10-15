const { createRes } = require('../helpers/httpMocks');

jest.mock('axios');
const axios = require('axios');

const controller = require('../../controllers/weather-crossing.controller');

describe('weather-crossing.controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

  it('currently throws because weatherCrossings is undefined', () => {
    const req = { params: { id: '1' }, body: {} };
    const res = createRes();

    expect(() => controller.getWeatherCrossingById(req, res)).toThrow(ReferenceError);
    expect(() => controller.createWeatherCrossing(req, res)).toThrow(ReferenceError);
    expect(() => controller.updateWeatherCrossing(req, res)).toThrow(ReferenceError);
    expect(() => controller.deleteWeatherCrossing(req, res)).toThrow(ReferenceError);
  });
});
