const { createRes } = require('../helpers/httpMocks');
const { MockPDFDocument } = require('../helpers/mockPdfDocument');

const mockCollection = {
  where: jest.fn(),
  add: jest.fn(),
  doc: jest.fn()
};

const mockDb = {
  collection: jest.fn(() => mockCollection)
};

jest.mock('../../firebase', () => ({
  db: mockDb
}));

jest.mock('pdfkit', () => jest.fn(() => new MockPDFDocument()));

const guestsController = require('../../controllers/guests.controller');

describe('guests.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.where.mockReset();
    mockCollection.add.mockReset();
    mockCollection.doc.mockReset();
    mockDb.collection.mockImplementation(() => mockCollection);
  });

  describe('listGuestsByEvent', () => {
    it('returns guests filtered by query parameters', async () => {
      const req = {
        params: { eventId: 'event-1' },
        query: { dietary: 'Vegetarian', allergy: 'Peanuts', rsvp: 'true' }
      };
      const guests = [
        {
          id: '1',
          data: () => ({
            Name: 'Amy',
            Dietary: 'Vegetarian',
            Allergies: 'Peanuts',
            RSVPstatus: true
          })
        },
        {
          id: '2',
          data: () => ({
            Name: 'Bob',
            Dietary: 'Vegan',
            Allergies: 'None',
            RSVPstatus: false
          })
        }
      ];
      mockCollection.where.mockReturnValue({
        get: jest.fn(() => Promise.resolve({ docs: guests }))
      });

      const res = createRes();
      await guestsController.listGuestsByEvent(req, res);

      expect(mockCollection.where).toHaveBeenCalledWith('EventID', '==', 'event-1');
      expect(res.json).toHaveBeenCalledWith([
        {
          id: '1',
          Name: 'Amy',
          Dietary: 'Vegetarian',
          Allergies: 'Peanuts',
          RSVPstatus: true
        }
      ]);
    });
  });

  describe('getGuestFilterOptions', () => {
    it('returns sorted unique dietary and allergy options', async () => {
      const guests = [
        {
          data: () => ({ Dietary: 'Vegan', Allergies: 'Pollen' })
        },
        {
          data: () => ({ Dietary: 'Vegetarian', Allergies: 'Pollen' })
        },
        {
          data: () => ({ Dietary: 'Vegan', Allergies: '' })
        }
      ];
      mockCollection.where.mockReturnValue({
        get: jest.fn(() => Promise.resolve({
          forEach: (cb) => guests.forEach(cb)
        }))
      });

      const req = { params: { eventId: 'event-2' } };
      const res = createRes();

      await guestsController.getGuestFilterOptions(req, res);

      expect(res.json).toHaveBeenCalledWith({
        dietary: ['Vegan', 'Vegetarian'],
        allergies: ['Pollen']
      });
    });
  });

  describe('createGuestForEvent', () => {
    it('rejects missing required fields', async () => {
      const req = { params: { eventId: 'evt' }, body: { Email: 'a@example.com' } };
      const res = createRes();

      await guestsController.createGuestForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Name and Email are required.' });
    });

    it('creates guest with normalized payload', async () => {
      const mockAdd = jest.fn();
      const savedData = {
        Name: 'Amy',
        Email: 'amy@example.com',
        Dietary: 'Vegetarian',
        Allergies: '',
        RSVPstatus: true,
        Song: 'Song',
        EventID: 'evt'
      };
      const savedSnap = { data: () => savedData };
      const ref = { id: 'new-guest', get: jest.fn(() => Promise.resolve(savedSnap)) };
      mockAdd.mockResolvedValue(ref);

      mockDb.collection.mockImplementation(() => ({
        add: mockAdd
      }));

      const req = {
        params: { eventId: 'evt' },
        body: {
          Name: ' Amy ',
          Email: 'amy@example.com',
          Dietary: 'Vegetarian',
          RSVPstatus: 'true',
          Song: 'Song'
        }
      };
      const res = createRes();

      await guestsController.createGuestForEvent(req, res);

      expect(mockAdd).toHaveBeenCalledWith({
        Name: 'Amy',
        Email: 'amy@example.com',
        Dietary: 'Vegetarian',
        Allergies: '',
        RSVPstatus: true,
        Song: 'Song',
        EventID: 'evt'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'new-guest', ...savedData });
    });
  });

  describe('deleteGuestForEvent', () => {
    it('returns 404 when guest not found', async () => {
      const docRef = {
        get: jest.fn(() => Promise.resolve({ exists: false }))
      };
      mockDb.collection.mockImplementation(() => ({
        doc: jest.fn(() => docRef)
      }));

      const req = { params: { eventId: 'evt', guestId: 'guest' } };
      const res = createRes();

      await guestsController.deleteGuestForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Guest not found' });
    });

    it('returns 403 when guest belongs to different event', async () => {
      const docRef = {
        get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ EventID: 'other' }) }))
      };
      mockDb.collection.mockImplementation(() => ({
        doc: jest.fn(() => docRef)
      }));

      const req = { params: { eventId: 'evt', guestId: 'guest' } };
      const res = createRes();

      await guestsController.deleteGuestForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Guest does not belong to this event' });
    });

    it('deletes guest successfully', async () => {
      const docRef = {
        get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ EventID: 'evt' }) })),
        delete: jest.fn(() => Promise.resolve())
      };
      mockDb.collection.mockImplementation(() => ({
        doc: jest.fn(() => docRef)
      }));

      const req = { params: { eventId: 'evt', guestId: 'guest' } };
      const res = createRes();

      await guestsController.deleteGuestForEvent(req, res);

      expect(docRef.delete).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ message: 'Guest deleted', id: 'guest' });
    });
  });

  describe('exportGuestsCsv', () => {
    it('returns CSV with headers and guest rows', async () => {
      const docs = [
        {
          id: '1',
          data: () => ({
            Name: 'Amy',
            Email: 'amy@example.com',
            Dietary: 'Vegetarian',
            Allergies: 'Pollen',
            RSVPstatus: true,
            Song: 'Song'
          })
        }
      ];
      mockCollection.where.mockReturnValue({
        get: jest.fn(() => Promise.resolve({ docs }))
      });

      const req = { params: { eventId: 'evt' }, query: {} };
      const res = createRes();
      await guestsController.exportGuestsCsv(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toContain('Name,Email,Dietary,Allergies,RSVPstatus,Song');
      expect(res.body).toContain('"Amy","amy@example.com","Vegetarian","Pollen","true","Song"');
    });
  });

  describe('exportGuestsPdf', () => {
    it('streams pdf with filename encoding filters', async () => {
      const docs = [
        {
          id: '1',
          data: () => ({
            Name: 'Amy',
            Email: 'amy@example.com',
            Dietary: 'Vegetarian',
            Allergies: 'Pollen',
            RSVPstatus: true,
            Song: 'Song'
          })
        }
      ];
      mockCollection.where.mockReturnValue({
        get: jest.fn(() => Promise.resolve({ docs }))
      });

      const req = {
        params: { eventId: 'evt' },
        query: { dietary: 'Vegan', allergy: 'Pollen', rsvp: 'true' }
      };
      const res = createRes();

      await guestsController.exportGuestsPdf(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="guest-list-diet_Vegan-allergy_Pollen-rsvp_true.pdf"'
      );
    });
  });
});
