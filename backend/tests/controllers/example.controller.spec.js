const { createRes } = require('../helpers/httpMocks');
const controller = require('../../controllers/example.controller');

describe('example.controller', () => {
  it('returns hello message', () => {
    const req = {};
    const res = createRes();

    controller.getExample(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Hello from the backend!' });
  });
});
