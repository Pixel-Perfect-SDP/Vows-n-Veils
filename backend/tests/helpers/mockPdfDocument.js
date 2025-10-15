class MockPDFDocument {
  constructor() {
    this.calls = [];
    this.piped = false;
    this.ended = false;
    this.page = {
      width: 842,
      height: 595,
      margins: { left: 36, right: 36, top: 36, bottom: 36 }
    };
    this.options = { margin: 36 };
    this.y = 0;

    const chainableMethods = [
      'pipe',
      'font',
      'fontSize',
      'fillColor',
      'text',
      'moveDown',
      'moveTo',
      'lineTo',
      'strokeColor',
      'lineWidth',
      'stroke',
      'save',
      'restore',
      'rect',
      'addPage',
      'fill',
      'fillOpacity',
      'strokeOpacity',
      'translate',
      'rotate',
      'image'
    ];

    chainableMethods.forEach((method) => {
      this[method] = jest.fn(() => {
        if (method === 'pipe') this.piped = true;
        return this;
      });
    });

    this.heightOfString = jest.fn(() => 12);
    this.end = jest.fn(() => {
      this.ended = true;
      return this;
    });
  }
}

module.exports = {
  MockPDFDocument
};
