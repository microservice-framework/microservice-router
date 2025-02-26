/**
 * Process before Hooks.
 */
import debug from './debug.js';
import findHookTarget from './findHookTarget.js';
import signature from './signature.js';
import getMinLoadedRouter from './getMinLoadedRouter.js';

let getHeaders = function (router, hookType, phase, options) {
  let headers = {};
  // TODO verify date,content-type, transfer-encoding headers
  let skipHeaders = [
    'host', // issue to properly connect
    'connection', // if it is closed, behavior is unexpected
    'transfer-encoding', //we need to ignore that one.
    'content-length', //issue with recounting length of the package
  ];
  for (var i in options.request.headers) {
    if (skipHeaders.indexOf(i) != -1) {
      continue;
    }
    headers[i] = options.request.headers[i];
  }
  for (var i in router.matchVariables) {
    headers['mfw-' + i] = router.matchVariables[i];
  }
  headers['x-origin-url'] = options.route;
  headers['x-origin-method'] = options.method;
  headers['x-hook-phase'] = phase;
  headers['x-hook-type'] = hookType;
  headers['x-endpoint-scope'] = options.endpoint.scope;
  debug.debug('%s headers %O', options.route, headers);
  return headers;
};

export default async function (options, phase) {
  // send Broadcast
  let broadcastTargets = findHookTarget(options, phase, 'broadcast');
  debug.debug('Bradcast: Phase %s for %s result: %O', phase, options.route, broadcastTargets);
  if (broadcastTargets instanceof Array) {
    let getBroadcastRequest = function () {
      if (broadcastTargets instanceof Error) {
        return broadcastTargets;
      }
      if (!broadcastTargets.length) {
        return false;
      }
      let router = broadcastTargets.pop();
      debug.log('Notify route %s result %O', options.route, router);
      let headers = getHeaders(router, 'broadcast', phase, options);
      // Sign request for hook
      headers['x-hook-signature'] = 'sha256=' + signature('sha256', options.request._buffer, router.secureKey);
      return {
        uri: router.url + options.path,
        method: 'NOTIFY',
        headers: headers,
        body: options.request._buffer,
      };
    };
    let callbackBroadcastRequest = function (err, response, body) {
      // No action on broadcast hook.
      if (err) {
        debug.log('broadcast failed %O', err);
      }
      debug.log('broadcast sent');
      // If more in queue left - send more
      if (broadcastTargets.length) {
        _request(getBroadcastRequest, callbackBroadcastRequest, options);
      }
    };
    _request(getBroadcastRequest, callbackBroadcastRequest, options);
  }

  // send Notify
  let notifyTargets = findHookTarget(options, phase, 'notify');
  debug.debug('Notify: Phase %s for %s result: %O', phase, options.route, notifyTargets);
  if (notifyTargets instanceof Array) {
    let notifyGroups = [];
    for (let target of notifyTargets) {
      if (target.group) {
        if (notifyGroups.indexOf(target.group) == -1) {
          notifyGroups.push(target.group);
        }
      }
    }
    notifyGroups.sort();
    debug.debug('notify Groups %O', notifyGroups);
    if (notifyGroups.length) {
      let currentNotifyGroup = notifyGroups.shift();
      let getNotifyRequest = function () {
        debug.debug('notify Groups %s %O', currentNotifyGroup, notifyGroups);
        if (!currentNotifyGroup) {
          return false;
        }
        let notifyGroupTargets = findHookTarget(options, phase, 'notify', currentNotifyGroup);
        debug.debug('Notify: Phase %s result: %O', phase, notifyGroupTargets);
        if (notifyGroupTargets instanceof Error) {
          return notifyGroupTargets;
        }
        if (!notifyGroupTargets.length) {
          return false;
        }
        let router = false;
        if (notifyGroupTargets.length == 1) {
          router = notifyGroupTargets.pop();
        } else {
          // TODO: add diferent strategy to choose one of the routes
          router = getMinLoadedRouter(notifyGroupTargets);
        }
        debug.log('Notify route %s result %O', options.route, router);
        let headers = getHeaders(router, 'notify', phase, options);
        headers['x-hook-group'] = currentNotifyGroup;
        // Sign request for hook
        headers['x-hook-signature'] = 'sha256=' + signature('sha256', options.request._buffer, router.secureKey);
        return {
          uri: router.url + options.path,
          method: 'NOTIFY',
          headers: headers,
          body: options.request._buffer,
        };
      };
      let callbackNotifyRequest = function (err, response, body) {
        if (err) {
          debug.log('notify failed %O', err);
        }
        debug.log('notify sent');
        // If more groups left - send more
        if (notifyGroups.length) {
          currentNotifyGroup = notifyGroups.shift();
          _request(getNotifyRequest, callbackNotifyRequest, options);
        }
      };
      _request(getNotifyRequest, callbackNotifyRequest, options);
    }
  }

  // send adapter
  let adapterTargets = findHookTarget(options, phase, 'adapter');
  debug.debug('Adapter: Phase %s for %s result: %O', phase, options.route, adapterTargets);
  if (adapterTargets instanceof Error) {
    // No adapters found. return true, no error but nothing to process.
    debug.debug('No adapter groups found');
    return callback(true);
  }

  let adapterGroups = [];
  for (let target of adapterTargets) {
    if (target.group) {
      if (adapterGroups.indexOf(target.group) == -1) {
        adapterGroups.push(target.group);
      }
    }
  }
  adapterGroups.sort();
  debug.debug('adapter Groups %O', adapterGroups);
  if (!adapterGroups.length) {
    // No adapters found. return true, no error but nothing to process.
    debug.debug('No adapter groups found');
    return callback(true);
  }
  let currentAdapterGroup = adapterGroups.shift();
  let getAdapterRequest = function () {
    if (!currentAdapterGroup) {
      return false;
    }
    let adapterGroupTargets = findHookTarget(options, phase, 'adapter', currentAdapterGroup);
    if (adapterGroupTargets instanceof Error) {
      return adapterGroupTargets;
    }
    if (!adapterGroupTargets.length) {
      return false;
    }
    let router = false;
    if (adapterGroupTargets.length == 1) {
      router = adapterGroupTargets.pop();
    } else {
      // TODO: add diferent strategy to choose one of the routes
      router = getMinLoadedRouter(adapterGroupTargets);
    }
    debug.log('Notify route %s result %O', options.route, router);
    let headers = getHeaders(router, 'adapter', phase, options);
    headers['x-hook-group'] = currentAdapterGroup;
    // Sign request for hook
    headers['x-hook-signature'] = 'sha256=' + signature('sha256', options.request._buffer, router.secureKey);
    return {
      uri: router.url + options.path,
      method: 'NOTIFY',
      headers: headers,
      body: options.request._buffer,
    };
  };
  let callbackAdapterRequest = function (err, response, body) {
    let headerStatusName = 'x-hook-adapter-status-' + currentAdapterGroup + '-' + phase;
    if (err || response.statusCode != 200) {
      if (err) {
        debug.log('adapter failed %O', err);
        // TODO status header for adapter
        options.request.headers[headerStatusName] = 'error: ' + err.message;
      } else {
        debug.log('Adapter failed with code: %s body: %s', response.statusCode, body);
        for (var i in response.headers) {
          if (i.substring(0, 6) == 'x-set-') {
            let headerName = i.substr(6);
            options.request.headers[headerName] = response.headers[i];
          }
        }
      }
    } else {
      debug.log('adapter processed');
      options.request._buffer = body;
      // need to set headers x-set-XXXXX
      debug.debug('Adapter Headers received: %O code: %s', response.headers, response.statusCode);
      for (var i in response.headers) {
        if (i.substring(0, 6) == 'x-set-') {
          let headerName = i.substr(6);
          options.request.headers[headerName] = response.headers[i];
        }
      }
      delete options.request.headers['content-length'];
      if (phase == 'before') {
        // resign it
        if (options.request.headers.signature) {
          options.request.headers.signature = 'sha256=' + signature('sha256', options.request._buffer, options.endpoint.secureKey);
        }
      }
    }

    // If more groups left - send more
    if (adapterGroups.length) {
      currentAdapterGroup = adapterGroups.shift();
      return _request(getAdapterRequest, callbackAdapterRequest, options);
    }
    // return back via callback
    callback();
  };
  _request(getAdapterRequest, callbackAdapterRequest, options);
}
