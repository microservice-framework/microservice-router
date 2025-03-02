/**
 * Github Status microservice
 */
'use strict';

import { ClientRegister } from '@microservice-framework/microservice-router-register';
import Microservice from '@microservice-framework/microservice';
import Cluster from '@microservice-framework/microservice-cluster';
import debugF from 'debug';

const debug = {
  log: debugF('router:log'),
  debug: debugF('router:debug'),
};

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Create a new microservice
let mservice = new Microservice({
  mongoUrl: process.env.MONGO_URL,
  mongoDB: process.env.MONGO_DB,
  schema: process.env.SCHEMA,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY,
});

const cluster = new Cluster({
  singleton: function (isStart, variables) {
    if (isStart) {
      let interval = 6000;
      if (process.env.INTERVAL) {
        interval = process.env.INTERVAL;
      }
      let cleanup = setInterval(() => {
        cleanupExpired();
      }, interval);
      return variables({ interval: cleanup });
    }
    debug.debug('stop cleaner');
    clearInterval(variables.interval);
  },
  validate: mservice.validate.bind(mservice),
  methods: {
    IPM: function (type, message) {
      debug.debug('message', type, message);
    },
    POST: async function (data, request) {
      if (!data.online) {
        data.online = true;
      }
      if (!data.type) {
        data.type = 'handler';
      }
      return mservice.post(data, request);
    },
    GET: mservice.get.bind(mservice),
    PUT: mservice.put.bind(mservice),
    DELETE: mservice.delete.bind(mservice),
    SEARCH: async function (data, request) {
      let response = await mservice.search(data, request);
      if (response.error) {
        return response;
      }
      if (request.credentials) {
        if (Array.isArray(response.answer)) {
          response.answer.forEach((element) => {
            delete element.secureKey;
          });
        }
      }
      return response;
    },
    OPTIONS: mservice.options.bind(mservice),
  },
});

const cleanupExpired = async function () {
  debug.debug('cleanup routes');
  let searchToken = {
    changed: { $lt: Date.now() - 60 * 1000 },
  };
  let request = {
    headers: {},
  };
  let response = await mservice.search(searchToken, request);
  if (response.code != 404) {
    for (let route of response.answer) {
      debug.debug('found route %O', route);
      let deleteResponse = await mservice.delete(route.id, request);
      debug.debug('deleted route %O', deleteResponse);
    }
  }
};

new ClientRegister({
  route: {
    path: ['register'],
    url: process.env.SELF_URL,
    secureKey: process.env.SECURE_KEY,
  },
  cluster: cluster.cluster,
});
