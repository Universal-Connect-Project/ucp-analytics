require('dotenv').config({override: true});
const config = require("./config.js");
const express = require("express");
const cors = require("cors");
const api = require('./api.js');
const logger = require('./infra/logger');
require('express-async-errors');

process.on('unhandledRejection', (error) => {
  logger.error(`unhandledRejection: ${error.message}`, error);
});
const app = express();

app.get('/ping', function (req, res) {
  res.send('ok');
});

app.use(express.json({ limit: '50mb' }));

app.use(cors())

api(app);

app.use(function (err, req, res, next) {
  logger.error(`Unhandled error on ${req.method} ${req.path}: `, err);
  res.status(500);
  res.send(err.message);
});

app.get('*', function (req, res) {
  res.sendStatus(404);
});

app.listen(config.Port, () => {
  var message = `Server is running on port ${config.Port}, env: ${config.Env}`;
  logger.info(message);
});