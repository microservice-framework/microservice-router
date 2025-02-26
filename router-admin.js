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
  debug: debugF('router:debug')
};

let interval = 6000;
if (process.env.INTERVAL) {
  interval = process.env.INTERVAL;
}

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Create a new microservice
let mservice = new Microservice({
  mongoUrl: process.env.MONGO_URL,
  mongoDB: process.env.MONGO_DB,
  schema: process.env.SCHEMA,
  mongoTable: process.env.MONGO_TABLE,
  secureKey: process.env.SECURE_KEY
});

new Cluster({
  singleton: RegisterLoader,
  validate: mservice.validate.bind(mservice),
  methods: {
    POST: async function (data, request) {
      if (!data.online) {
        data.online = true
      }
      return mservice.post(data, request)
    },
    GET: mservice.get.bind(mservice),
    PUT: mservice.put.bind(mservice),
    DELETE: mservice.delete.bind(mservice),
    SEARCH: mservice.search.bind(mservice),
    OPTIONS: mservice.options.bind(mservice),
  },
});


const cleanupExpired = async function () {
  debug.debug('cleanup tokens');
  let searchToken = {
    expireAt: { $lt: Date.now() },
  };
  let request = {
    headers: {},
  };
  let response = await mservice.search(searchToken, request);
  if (response.code != 404) {
    for (let token of response.answer) {
      debug.debug('found token %O', token);
      let deleteResponse = await mservice.delete(token.accessToken, request);
      debug.debug('deleted token %O', deleteResponse);
    }
  }
};

function RegisterLoader(isStart, variables) {
  let cluster = this;
  debug.debug('RegisterLoader');
  if (isStart) {
    let register = new ClientRegister({
      route: {
        path: ['register'],
        url: process.env.SELF_URL,
        secureKey: process.env.SECURE_KEY,
      },
      cluster: cluster.cluster,
    });
    let interval = setInterval(() => {
      cleanupExpired();
    }, process.env.ROUTER_PERIOD);
    variables({ register: register, interval: interval });
  } else {
    debug.debug('stop cleaner');
    clearInterval(variables.interval);
    variables.register.shutdown();
  }
}


var mserviceRegister = new MicroserviceRouterRegister({
  server: {
    url: 'http://' + process.env.HOSTNAME + ':' + process.env.PORT,
    secureKey: process.env.SECURE_KEY,
    period: interval,
  },
  route: {
    path: ['register'],
    url: 'http://' + process.env.HOSTNAME + ':' + process.env.PORT + '/',
    secureKey: process.env.SECURE_KEY,
    online: true,
    scope: 'admin'
  },
  cluster: mControlCluster
});


/**
 * Init Handler.
 */
function adminInit(callback) {
  let interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  let cleanRouteTableInerval = setInterval(cleanRouteTable , interval);
  debug.log('init executed %s', process.pid)
  callback(cleanRouteTableInerval)
  
}

/**
 * clear interval on shutdown.
 */
function adminShutdown(cleanRouteTableInerval){
  debug.log('shutdown executed %s', process.pid)
  if (cleanRouteTableInerval) {
    clearInterval(cleanRouteTableInerval)
  }
}


/**
 * Update route infor each 10 sec.
 */
function cleanRouteTable() {
  debug.log('Clean routes');
  MongoClient.connect(MongoURL, function(err, db) {
    if (err) {
      // If error, do nothing.
      debug.debug('Error %s', err.message);

      return;
    }

    var collection = db.collection(process.env.MONGO_TABLE);
    var query = {
      changed: {
        $lt: Date.now() - 60 * 1000
      }
    };
    collection.deleteMany(query, function(err, results) {
      db.close();
      if (err) {
        // If error, do nothing.
        debug.debug('Error %s', err.message);
        return;
      }
      debug.log('Deleted %s routes', results.deletedCount);
    });
  });
}
