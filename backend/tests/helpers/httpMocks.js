const createRes = () => {
  const res = {
    statusCode: 200,
    headers: {}
  };

  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  res.send = jest.fn((body) => {
    res.body = body;
    return res;
  });
  res.setHeader = jest.fn((key, value) => {
    res.headers[key] = value;
  });

  return res;
};

module.exports = {
  createRes
};
