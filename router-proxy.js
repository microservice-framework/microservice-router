/**
 * Github Status microservice
 */
'use strict';

import Cluster from '@microservice-framework/microservice-cluster';
import { updateRouteTable } from './includes/Routes.js';
import get from './includes/proxy/get.js';
import options from './includes/proxy/options.js';
import post from './includes/proxy/post.js';
import put from './includes/proxy/put.js';
import search from './includes/proxy/search.js';
import del from './includes/proxy/delete.js';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

var MongoURL = '';
if (process.env.MONGO_URL) {
  MongoURL = MongoURL + process.env.MONGO_URL;
}

if (process.env.MONGO_DB) {
  MongoURL = MongoURL + process.env.MONGO_DB;
}

if (process.env.MONGO_OPTIONS) {
  MongoURL = MongoURL + process.env.MONGO_OPTIONS;
}
process.env.MONGO_URL = MongoURL;

// Replace ports for proxy
process.env.PIDFILE = process.env.PROXYPIDFILE;
process.env.LOGFILE = process.env.PROXYLOGFILE;
process.env.PORT = process.env.PROXY_PORT;

new Cluster({
  init: function (callback) {
    let settings = {};
    let interval = 6000;
    if (process.env.INTERVAL) {
      interval = process.env.INTERVAL;
    }
    settings.interval = setInterval(updateRouteTable, interval);
    callback(settings);
    console.log('init');
  },
  shutdown: function (init) {
    clearInterval(init.interval);
    console.log('shutdown');
  },
  methods: {
    POST: post,
    GET: get,
    PUT: put,
    DELETE: del,
    SEARCH: search,
    OPTIONS: options,
  },
});
