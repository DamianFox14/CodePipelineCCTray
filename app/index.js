const restify = require('restify');
const creator = require('./ccTrayCreator');
const server = restify.createServer();
const config = require('../config');

async function startServer() {
  await creator.initialize(config);
  creator.startThread();
  server.get('/cc.xml', creator.getCCxml);
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}

startServer();
