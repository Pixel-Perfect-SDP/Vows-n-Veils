const { createRes } = require('../helpers/httpMocks');
const { MockPDFDocument } = require('../helpers/mockPdfDocument');

const mockDocRef = {
  get: jest.fn()
};

const mockCollection = {
  doc: jest.fn(() => mockDocRef)
};

const mockDb = {
  collection: jest.fn(() => mockCollection)
};

jest.mock('../../firebase', () => ({
  db: mockDb
}));

jest.mock('axios');
const axios = require('axios');

const mockPdfKit = jest.fn(() => new MockPDFDocument());
jest.mock('pdfkit', () => mockPdfKit);

const storyController = require('../../controllers/story.controller');

describe('story.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockReset();
    mockCollection.doc.mockImplementation(() => mockDocRef);
  });

  it('returns 404 when story not found', async () => {
    mockDocRef.get.mockResolvedValue({ exists: false });
    const req = { params: { userId: 'user-1' } };
    const res = createRes();

    await storyController.exportStoryPdf(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Story not found');
  });

  it('streams pdf when story exists (without photo)', async () => {
    const storyData = {
      howWeMet: 'At university',
      proposal: 'On the beach'
    };
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => storyData
    });

    const req = { params: { userId: 'user-1' } };
    const res = createRes();

    await storyController.exportStoryPdf(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=story.pdf');

    const createdDoc = mockPdfKit.mock.results[0].value;
    expect(createdDoc.pipe).toHaveBeenCalledWith(res);
    expect(createdDoc.end).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('includes photo when photoURL present', async () => {
    const buffer = Buffer.from('image');
    axios.get.mockResolvedValue({ data: buffer });

    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        howWeMet: 'Somewhere',
        proposal: 'Somehow',
        photoURL: 'https://example.com/photo.jpg',
        timeline: []
      })
    });

    const req = { params: { userId: 'user-2' } };
    const res = createRes();

    await storyController.exportStoryPdf(req, res);

    const createdDoc = mockPdfKit.mock.results[0].value;
    expect(axios.get).toHaveBeenCalledWith('https://example.com/photo.jpg', { responseType: 'arraybuffer' });
    expect(createdDoc.image).toHaveBeenCalled();
  });
});
