module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: { jasmine: {} },
    jasmineHtmlReporter: { suppressAll: true },

    // ✅ write coverage to "frontend/coverage/lcov.info"
    coverageReporter: {
      dir: require('path').join(__dirname, 'coverage'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'lcovonly' }, { type: 'text-summary' }]
    },

    reporters: ['progress', 'kjhtml', 'coverage'],

    // ✅ Use a CI-friendly, sandboxless Chrome
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    },

    singleRun: true,          // CI mode
    restartOnFileChange: false
  });
};
