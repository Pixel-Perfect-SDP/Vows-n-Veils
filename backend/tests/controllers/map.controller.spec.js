const { createRes } = require('../helpers/httpMocks');

jest.mock('axios');
const axios = require('axios');

const mapController = require('../../controllers/map.controller');

describe('map.controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getMapData', () => {
    it('geocodes address and returns first result', async () => {
      axios.get.mockResolvedValue({
        data: [{ lat: '10.1', lon: '20.2', display_name: 'Somewhere', address: { city: 'X' } }]
      });
      const req = { query: { address: '123 Main St' } };
      const res = createRes();

      await mapController.getMapData(req, res);

      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('123%20Main%20St'), expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        lat: 10.1,
        lon: 20.2,
        display_name: 'Somewhere',
        address: { city: 'X' }
      });
    });

    it('reverse geocodes coordinates', async () => {
      axios.get.mockResolvedValue({
        data: { display_name: 'Reverse', address: { city: 'Y' } }
      });
      const req = { query: { lat: '1', lon: '2' } };
      const res = createRes();

      await mapController.getMapData(req, res);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('lat=1&lon=2'),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        lat: 1,
        lon: 2,
        display_name: 'Reverse',
        address: { city: 'Y' }
      });
    });

    it('returns 404 when address not found', async () => {
      axios.get.mockResolvedValue({ data: [] });
      const req = { query: { address: 'Unknown' } };
      const res = createRes();

      await mapController.getMapData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Address not found' });
    });

    it('requires address or coordinates', async () => {
      const req = { query: {} };
      const res = createRes();

      await mapController.getMapData(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Either address or lat/lon parameters are required' });
    });

    it('handles API errors', async () => {
      axios.get.mockRejectedValue(new Error('boom'));
      const req = { query: { address: 'X' } };
      const res = createRes();

      await mapController.getMapData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching map data',
        error: 'boom'
      });
    });
  });

  describe('getNearbyPlaces', () => {
    it('requires coordinates', async () => {
      const req = { query: {} };
      const res = createRes();

      await mapController.getNearbyPlaces(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'lat and lon parameters are required' });
    });

    it('returns formatted venues from Overpass API', async () => {
      axios.post.mockResolvedValue({
        data: {
          elements: [
            {
              id: 1,
              lat: 10,
              lon: 20,
              tags: { name: 'Venue', amenity: 'events_venue' }
            },
            {
              id: 2,
              center: { lat: 11, lon: 21 },
              tags: { tourism: 'hotel', name: 'Hotel' }
            },
            {
              id: 3,
              tags: { name: 'No coordinates' }
            }
          ]
        }
      });
      const req = { query: { lat: '1', lon: '2', radius: '500' } };
      const res = createRes();

      await mapController.getNearbyPlaces(req, res);

      expect(axios.post).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([
        {
          id: 1,
          name: 'Venue',
          venueType: 'event_space',
          lat: 10,
          lon: 20,
          address: '',
          phone: null,
          website: null
        },
        {
          id: 2,
          name: 'Hotel',
          venueType: 'hotel',
          lat: 11,
          lon: 21,
          address: '',
          phone: null,
          website: null
        }
      ]);
    });

    it('handles API errors gracefully', async () => {
      axios.post.mockRejectedValue(new Error('fails'));
      const req = { query: { lat: '1', lon: '2' } };
      const res = createRes();

      await mapController.getNearbyPlaces(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching nearby venues',
        error: 'fails'
      });
    });
  });
});
