import debug from './debug.js';
import findHookTarget from './findHookTarget.js';

export default async function (targetRequest, phase) {
  let getHeaders = function (router, hookType) {
    let headers = {};
    // TODO verify date,content-type, transfer-encoding headers
    let skipHeaders = [
      'host', // issue to properly connect
      'connection', // if it is closed, behavior is unexpected
      'transfer-encoding', //we need to ignore that one.
      'content-length', //issue with recounting length of the package
    ];
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
    headers['x-hook-phase'] = phase;
    headers['x-hook-type'] = hookType;
    headers['x-endpoint-scope'] = targetRequest.endpoint.scope;
    debug.debug('%s headers %O', targetRequest.route, headers);
    return headers;
  };
  // send Broadcast
  let broadcastTargets = findHookTarget(targetRequest, phase, 'broadcast');
  debug.debug('Bradcast: Phase %s for %s result: %O', phase, targetRequest.route, broadcastTargets);
  if (broadcastTargets instanceof Array) {
    let getBroadcastRequest = function () {
      if (broadcastTargets instanceof Error) {
        return broadcastTargets;
      }
      if (!broadcastTargets.length) {
        return false;
      }
      let router = broadcastTargets.pop();
      debug.log('Notify route %s result %O', targetRequest.route, router);
      let headers = getHeaders(router, 'broadcast');
      // Sign request for hook
      headers['x-hook-signature'] = 'sha256=' + signature('sha256', targetRequest.requestDetails._buffer, router.secureKey);
      return {
        uri: router.url + targetRequest.path,
        method: 'NOTIFY',
        headers: headers,
        body: targetRequest.requestDetails._buffer,
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
        _request(getBroadcastRequest, callbackBroadcastRequest, targetRequest);
      }
    };
    _request(getBroadcastRequest, callbackBroadcastRequest, targetRequest);
  }

  // send Notify
  let notifyTargets = findHookTarget(targetRequest, phase, 'notify');
  debug.debug('Notify: Phase %s for %s result: %O', phase, targetRequest.route, notifyTargets);
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
        let notifyGroupTargets = findHookTarget(targetRequest, phase, 'notify', currentNotifyGroup);
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
        debug.log('Notify route %s result %O', targetRequest.route, router);
        let headers = getHeaders(router, 'notify');
        headers['x-hook-group'] = currentNotifyGroup;
        // Sign request for hook
        headers['x-hook-signature'] = 'sha256=' + signature('sha256', targetRequest.requestDetails._buffer, router.secureKey);
        return {
          uri: router.url + targetRequest.path,
          method: 'NOTIFY',
          headers: headers,
          body: targetRequest.requestDetails._buffer,
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
          _request(getNotifyRequest, callbackNotifyRequest, targetRequest);
        }
      };
      _request(getNotifyRequest, callbackNotifyRequest, targetRequest);
    }
  }

  // send adapter
  let adapterTargets = findHookTarget(targetRequest, phase, 'adapter');
  debug.debug('Adapter: Phase %s for %s result: %O', phase, targetRequest.route, adapterTargets);
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
    let adapterGroupTargets = findHookTarget(targetRequest, phase, 'adapter', currentAdapterGroup);
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
    debug.log('Notify route %s result %O', targetRequest.route, router);
    let headers = getHeaders(router, 'adapter');
    headers['x-hook-group'] = currentAdapterGroup;
    // Sign request for hook
    headers['x-hook-signature'] = 'sha256=' + signature('sha256', targetRequest.requestDetails._buffer, router.secureKey);
    return {
      uri: router.url + targetRequest.path,
      method: 'NOTIFY',
      headers: headers,
      body: targetRequest.requestDetails._buffer,
    };
  };
  let callbackAdapterRequest = function (err, response, body) {
    let headerStatusName = 'x-hook-adapter-status-' + currentAdapterGroup + '-' + phase;
    if (err || response.statusCode != 200) {
      if (err) {
        debug.log('adapter failed %O', err);
        // TODO status header for adapter
        targetRequest.requestDetails.headers[headerStatusName] = 'error: ' + err.message;
      } else {
        debug.log('Adapter failed with code: %s body: %s', response.statusCode, body);
        for (var i in response.headers) {
          if (i.substring(0, 6) == 'x-set-') {
            let headerName = i.substr(6);
            targetRequest.requestDetails.headers[headerName] = response.headers[i];
          }
        }
      }
    } else {
      debug.log('adapter processed');
      targetRequest.requestDetails._buffer = body;
      // need to set headers x-set-XXXXX
      debug.debug('Adapter Headers received: %O code: %s', response.headers, response.statusCode);
      for (var i in response.headers) {
        if (i.substring(0, 6) == 'x-set-') {
          let headerName = i.substr(6);
          targetRequest.requestDetails.headers[headerName] = response.headers[i];
        }
      }
      delete targetRequest.requestDetails.headers['content-length'];
      if (phase == 'before') {
        // resign it
        if (targetRequest.requestDetails.headers.signature) {
          targetRequest.requestDetails.headers.signature =
            'sha256=' + signature('sha256', targetRequest.requestDetails._buffer, targetRequest.endpoint.secureKey);
        }
      }
    }

    // If more groups left - send more
    if (adapterGroups.length) {
      currentAdapterGroup = adapterGroups.shift();
      return _request(getAdapterRequest, callbackAdapterRequest, targetRequest);
    }
    // return back via callback
    callback();
  };
  _request(getAdapterRequest, callbackAdapterRequest, targetRequest);
}
