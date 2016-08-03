/**
 * Github Status microservice
 */
'use strict';

const Cluster = require('zenci-manager');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const debugF = require('debug');

var debug = {
  log: debugF('proxy:log'),
  request: debugF('http:request'),
  debug: debugF('proxy:debug')
};


require('dotenv').config();

var mControlCluster = new Cluster({
  pid: process.env.PIDFILE + 'proxy',
  port: process.env.PROXY_PORT,
  count: process.env.WORKERS,
  callbacks: {
    POST: ProxyRequestPOST,
    GET: ProxyRequestGet,
    PUT: ProxyRequestPUT,
    DELETE: ProxyRequestDELETE,
    SEARCH: ProxyRequestSEARCH
  }
});

if (!mControlCluster.isMaster) {
  var routes = [];
  updateRouteVariable(routes);
  var interval = 6000;
  if (process.env.INTERVAL) {
    interval = process.env.INTERVAL;
  }
  setInterval(function() {
    debug.debug('Current routes %s', JSON.stringify(routes , null, 2));
    updateRouteVariable(routes)}, interval);
}

/**
 * Proxy GET requests.
 */
function ProxyRequestGet(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  debug.debug('Route base: %s', route);

  FindTarget(route, function(err, router) {
    if (err) {
      debug.debug('Route %s err %s', route, err.message);
      return callback(err, null);
    }

    debug.log('Route %s result %s', route, JSON.stringify(router , null, 2));

    request({
      uri: router.url + url[url.length - 1],
      method: 'GET',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Proxy POST requests.
 */
function ProxyRequestPOST(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length; i++) {
    if (i != url.length - 1) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  debug.debug('Route base: %s', route);

  FindTarget(route, function(err, router) {
    if (err) {
      debug.debug('Route %s err %s', route, err.message);
      return callback(err, null);
    }

    debug.log('Route %s result %s', route, JSON.stringify(router , null, 2));

    request({
      uri: router.url,
      method: 'POST',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Proxy PUT requests.
 */
function ProxyRequestPUT(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  debug.debug('Route base: %s', route);

  FindTarget(route, function(err, router) {
    if (err) {
      debug.debug('Route %s err %s', route, err.message);
      return callback(err, null);
    }

    debug.log('Route %s result %s', route, JSON.stringify(router , null, 2));

    request({
      uri: router.url + url[url.length - 1],
      method: 'PUT',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Proxy DELETE requests.
 */
function ProxyRequestDELETE(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length - 1; i++) {
    if (i != url.length - 2) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  debug.debug('Route base: %s', route);

  FindTarget(route, function(err, router) {
    if (err) {
      debug.debug('Route %s err %s', route, err.message);
      return callback(err, null);
    }

    debug.log('Route %s result %s', route, JSON.stringify(router , null, 2));

    request({
      uri: router.url + url[url.length - 1],
      method: 'DELETE',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}


/**
 * Proxy SEARCH requests.
 */
function ProxyRequestSEARCH(jsonData, requestDetails, callback) {
  var url = requestDetails.url.split('/');

  var route = '';
  for (var i = 0; i < url.length; i++) {
    if (i != url.length - 1) {
      route = route + url[i] + '/';
    } else {
      route = route + url[i]
    }
  }
  debug.debug('Route base: %s', route);

  FindTarget(route, function(err, router) {
    if (err) {
      debug.debug('Route %s err %s', route, err.message);
      return callback(err, null);
    }

    debug.log('Route %s result %s', route, JSON.stringify(router , null, 2));

    request({
      uri: router.url,
      method: 'SEARCH',
      headers: requestDetails.headers,
      json: true,
      body: jsonData
    }, function(error, response, body) {
      if (error) {
        return ProxyRequestGet(jsonData, requestDetails, callback);
      }
      callback(null, {
        code: response.statusCode,
        answer: body
      });
    });
  })

}

/**
 * Finx target URL.
 */
function FindTarget(route, callback) {
  debug.debug('Find route %s', route);

  var availableRoutes = [];
  for (var i in routes) {
    if (routes[i].path == route) {
      availableRoutes.push(routes[i])
    }
  }
  debug.debug('Available routes for %s %s', route, JSON.stringify(routes , null, 2));
  if (availableRoutes.length == 0) {
    debug.debug('Not found for %s', route);
    return callback(new Error('Not found'), null);
  }
  if (availableRoutes.length == 1) {
    return callback(null, availableRoutes.pop());
  }

  var random = Math.floor(Math.random() * (availableRoutes.length) + 1) - 1;
  return callback(null, availableRoutes[random]);
}

/**
 * Update route infor each 10 sec.
 */
function updateRouteVariable() {

  MongoClient.connect(process.env.MONGO_URL, function(err, db) {
    if (err) {
      // If error, do nothing.
      debug.debug('Error %s', err.message);

      return;
    }

    var collection = db.collection(process.env.MONGO_TABLE);
    var query = {
      type: 'master'
    };
    collection.find(query).toArray(function(err, results) {
      if (err) {
        // If error, do nothing.
        debug.debug('Error %s', err.message);
        return;
      }
      if (!results || results.length == 0) {
        // If there is no results, do nothing
        debug.debug('No records found');

        return;
      }
      var newRoutes = [];
      for (var i in results) {
        // get only changed in 60 sec.
        if (results[i].changed > Date.now() - 60 * 1000) {
          newRoutes.push(results[i]);
        }
      }
      routes = newRoutes;
    });
  });
}
