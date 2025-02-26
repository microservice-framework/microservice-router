/**
 * Github Status microservice
 */
'use strict';

import Cluster from '@microservice-framework/microservice-cluster';

import debug from './debug.js';
import signature from './includes/signature.js';
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

const MAX_REQUEST_COUNT = 3;

require('dotenv').config();

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

function _request(getRequest, callback, targetRequest, noMetric) {
  let requestOptions = getRequest();

  if (requestOptions instanceof Error) {
    return callback(requestOptions);
  }
  if (requestOptions === false) {
    return callback(false);
  }

  // Validate URI
  let uri = url.parse(requestOptions.uri);
  if (!(uri.host || (uri.hostname && uri.port)) && !uri.isUnix) {
    return callback(new Error('Invalid URI' + requestOptions.uri));
  }

  let getHeaders = function (router, hookType) {
    let headers = {};
    // TODO verify date,content-type, transfer-encoding headers
    let skipHeaders = ['host', 'date', 'connection', 'content-length', 'transfer-encoding'];
    for (var i in targetRequest.requestDetails.headers) {
      if (skipHeaders.indexOf(i) != -1) {
        continue;
      }
      headers[i] = targetRequest.requestDetails.headers[i];
    }
    for (var i in router.matchVariables) {
      headers['mfw-' + i] = router.matchVariables[i];
    }
    headers['x-origin-url'] = targetRequest.route;
    headers['x-origin-method'] = targetRequest.method;
    headers['x-endpoint-scope'] = targetRequest.endpoint.scope;
    debug.debug('%s headers %O', targetRequest.route, headers);
    return headers;
  };
  let startTime = Date.now();
  debug.request('requestOptions: %O', requestOptions);
  request(requestOptions, function (error, response, body) {
    debug.request('requestOptions: %O answer err %O body %s', requestOptions, error, body);
    let endTime = Date.now();
    debug.debugMetric('requestOptions: %O time: %s', requestOptions, endTime - startTime);
    if (!noMetric) {
      let metricTargets = findAllTargets(targetRequest, 'metric');
      debug.debugMetric('findHookTarget: for %s result: %O', targetRequest.route, metricTargets);

      if (metricTargets instanceof Array) {
        let getMetricRequest = function () {
          if (metricTargets instanceof Error) {
            return metricTargets;
          }
          if (!metricTargets.length) {
            return false;
          }
          let router = metricTargets.pop();
          debug.log('Metric route %s result %O', targetRequest.route, router);

          let statusCode = 0;
          if (error) {
            statusCode = error.code;
          } else {
            if (response.statusCode) {
              statusCode = response.statusCode;
            }
          }

          let metricJSON = {
            startTime: startTime,
            endTime: endTime,
            code: statusCode,
            method: requestOptions.method,
            headers: requestOptions.headers,
            uri: requestOptions.uri,
            route: targetRequest.route,
          };
          if (body && body.length) {
            metricJSON.responseLength = body.length;
          }
          if (requestOptions.body && requestOptions.body.length) {
            metricJSON.requestLength = requestOptions.body.length;
          }
          if (!router.meta) {
            metricJSON.request = targetRequest.requestDetails._buffer;
            metricJSON.response = body;
          }
          let metricBody = JSON.stringify(metricJSON);
          let headers = getHeaders(router, 'metric');
          // Sign request for hook
          headers['x-hook-signature'] = 'sha256=' + signature('sha256', metricBody, router.secureKey);
          return {
            uri: router.url + targetRequest.path,
            method: 'NOTIFY',
            headers: headers,
            body: metricBody,
            timeout: 300, // For metrics we limit to 300 ms.
          };
        };
        let callbackMetricRequest = function (err, response, body) {
          // No action on broadcast hook.
          if (err) {
            debug.log('metric failed %O', err);
          }
          debug.log('metric sent');
          debug.debugMetric('Metric targetRequest %O ', targetRequest);
          // If more in queue left - send more
          if (metricTargets.length) {
            _request(getMetricRequest, callbackMetricRequest, targetRequest, true);
          }
        };
        _request(getMetricRequest, callbackMetricRequest, targetRequest, true);
      } else {
        debug.debugMetric('no metric enpoints');
      }
    } else {
      debug.debugMetric('metric disabled');
    }

    if (error) {
      debug.debug('_request Error received: %O', error);
      debug.debug('_request Restart request: %O', requestOptions);

      // TODO add limit to re send

      // Do not try to redeliver metrics. can lock a event loop
      if (!noMetric) {
        debug.log('requets failed: %O %O %O %O', targetRequest, error, body, response);
        targetRequest.requestCount++;
        if (targetRequest.requestCount <= MAX_REQUEST_COUNT) {
          return _request(getRequest, callback, targetRequest);
        }
      }
    }

    debug.debug('%s body: %s', requestOptions.uri, body);
    return callback(null, response, body);
  });
}

/**
 * Proxy request to backend server.
 */
function proxyRequest(route, path, method, jsonData, requestDetails, callback) {
  debug.debug('Route base: %s', route);
  let targetRequest = {
    route: route,
    path: path,
    method: method,
    jsonData: jsonData,
    requestDetails: requestDetails,
    requestCount: 0,
  };
  let endpointTargets = findAllTargets(targetRequest, 'handler');
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', route, endpointTargets);
    return callback(endpointTargets, null);
  }

  targetRequest.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey,
  };

  hookCall(targetRequest, 'before', function () {
    //used later in sendBroadcastMessage
    let router = false;
    // process request to endpoint
    let getEndpointRequest = function () {
      let endpointTargets = findAllTargets(targetRequest, 'handler');
      if (endpointTargets instanceof Error) {
        return endpointTargets;
      }
      if (!endpointTargets.length) {
        return false;
      }

      if (endpointTargets.length == 1) {
        router = endpointTargets.pop();
      } else {
        // TODO: add diferent strategy to choose one of the routes
        router = getMinLoadedRouter(endpointTargets);
      }
      debug.log('Endpoint route %s result %O', route, router);
      let headers = {};
      let i;
      let skipHeaders = ['host', 'connection', 'content-length'];
      for (i in requestDetails.headers) {
        if (skipHeaders.indexOf(i) != -1) {
          continue;
        }
        headers[i] = requestDetails.headers[i];
      }

      for (i in router.matchVariables) {
        headers['mfw-' + i] = router.matchVariables[i];
      }
      return {
        uri: router.url + path,
        method: method,
        headers: headers,
        body: requestDetails._buffer,
      };
    };
    let callbackEndpointRequest = function (err, response, body) {
      if (err) {
        debug.log('endpoint failed %O', err);
        if (err !== false) {
          // TODO call after hooks
          return callback(err, null);
        }
        // TODO call after hooks
        return callback(new Error('Endpoint not found'), null);
      }
      let bodyJSON = '';
      if (response.headers && response.headers['content-type']) {
        try {
          bodyJSON = decodeData(response.headers['content-type'], body);
        } catch (e) {
          debug.debug('decodeData Error received: %O', e);
          return callback(e);
        }
      }

      if (!response.headers) {
        response.headers = {};
      }
      debug.debug('%s body: %O', route, body);

      // process after hooks
      // hookCall requestDetails.headers and _buffer should contain response data.
      let answerDetails = {
        headers: response.headers,
        _buffer: body,
        method: method,
      };
      let targetAnswer = {
        route: route,
        path: path,
        method: method,
        jsonData: bodyJSON,
        requestDetails: answerDetails,
        endpoint: targetRequest.endpoint,
      };
      hookCall(targetAnswer, 'after', function () {
        // Double check updated _buffer after proxy.
        let body = false;
        try {
          body = decodeData(answerDetails.headers['content-type'], answerDetails._buffer);
        } catch (e) {
          debug.debug('decodeData Error received: %O', e);
          return callback(e);
        }
        if (typeof body == 'object') {
          // prefix with base_URL all urls
          if (method != 'OPTIONS') {
            if (body.url) {
              // Make sure that url is not absolute
              if (body.url.indexOf('http://') == -1 && body.url.indexOf('https://') == -1) {
                body.url = process.env.BASE_URL + body.url;
              }
            } else if (body.id) {
              body.url = process.env.BASE_URL + route + '/' + body.id;
            }
          }
        }
        if (body instanceof Array) {
          for (var i in body) {
            if (body[i].url) {
              // Make sure that url is not absolute
              if (body[i].url.indexOf('http://') == -1 && body[i].url.indexOf('https://') == -1) {
                body[i].url = process.env.BASE_URL + body[i].url;
              }
            } else if (body[i].id) {
              body[i].url = process.env.BASE_URL + route + '/' + body[i].id;
            }
          }
        }

        let responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
          'Access-Control-Allow-Headers': 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope',
          'Access-Control-Expose-Headers': 'x-total-count',
        };
        for (var i in answerDetails.headers) {
          if (i.substring(0, 1) == 'x') {
            responseHeaders[i] = answerDetails.headers[i];
          }
        }
        // deprecated. websoket need to be rewriten as a hook broadcast
        if (response.statusCode == 200) {
          sendBroadcastMessage(router, method, requestDetails.url, body);
        }
        callback(null, {
          code: response.statusCode,
          answer: body,
          headers: responseHeaders,
        });
      });
    };
    _request(getEndpointRequest, callbackEndpointRequest, targetRequest);
  });
}
