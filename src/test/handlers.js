const { http, HttpResponse } = require('msw')
const { GraphiteEndpoint } = require("../config");
const { providersData } = require('./testData/providers');

module.exports.handlers = [
    http.get(`${GraphiteEndpoint}/tags/provider`, () => HttpResponse.json(providersData))
] 