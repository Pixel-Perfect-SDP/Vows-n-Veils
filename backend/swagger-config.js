const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vows-n-Veils API',
      version: '1.0.0',
      description: 'API docs for venues/events/guests',
    },
    servers: [
      { url: process.env.PUBLIC_API_URL || 'https://site--vowsandveils--5dl8fyl4jyqm.code.run/api-docs/', description: 'default' },
    ],
  },
apis: [__dirname + '/routes/*.js']
};

const specs = swaggerJsdoc(options);
module.exports = { specs };
