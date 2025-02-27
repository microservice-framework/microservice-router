/**
 * Execute hook.
 */
import debug from './debug.js';
import findHookTarget from './findHookTarget.js';
import signature from './signature.js';
import getMinLoadedRouter from './getMinLoadedRouter.js';

let getHeaders = function (router, hook, options) {
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
  headers['x-hook-phase'] = hook.phase;
  headers['x-hook-type'] = hook.type;
  headers['x-endpoint-scope'] = options.endpoint.scope;
  debug.debug('%s headers %O', options.route, headers);
  return headers;
};


export default async function (hook, options) {
  // send a broadcast message
  hook.type = 'broadcast'
  let broadcastTargets = findHookTarget(hook, options);
  if (broadcastTargets instanceof Array) {
    // if we have broadcast targets, send to each target a request
    while (broadcastTargets.length) {
      
      let router = broadcastTargets.pop();
      debug.log('Bradcast Notify route %s result %O', options.route, router);
      
      let headers = getHeaders(router, hook, options);
      headers['x-hook-signature'] = 'sha256=' + signature('sha256', options.request._buffer, router.secureKey);

      let requestOptions = {
        url: router.url + options.path,
        method: 'NOTIFY',
        headers: headers,
        data: options.request._buffer
      }
      let response = await request(requestOptions)
      debug.debug('NOTIFY', hook, options, response);
      if(response.error) {
        debug.log('broadcast failed %O', response.error);
      }
    }
  }

  //send a notify - group based
  hook.type = 'notify'
  // get groups first
  let notifyTargets = findHookTarget(hook, options);
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
    // send notification to each group instance
    while (notifyGroups.length) {
      let currentNotifyGroup = notifyGroups.shift();
      let groupHook = JSON.parse(JSON.stringify(hook))
      groupHook.group = currentNotifyGroup
      let notifyGroupTargets = findHookTarget(groupHook, options);
      debug.debug('Notify: Phase %s result: %O', phase, notifyGroupTargets);
      if (!notifyGroupTargets.length) {
        continue;
      }
      let router = false;
      if (notifyGroupTargets.length == 1) {
        router = notifyGroupTargets.pop();
      } else {
        // TODO: add diferent strategy to choose one of the routes
        router = getMinLoadedRouter(notifyGroupTargets);
        debug.log('Notify route %s result %O', options.route, router);
      }
      let headers = getHeaders(router, groupHook, options);
      headers['x-hook-group'] = currentNotifyGroup;
      headers['x-hook-signature'] = 'sha256=' + signature('sha256', options.request._buffer, router.secureKey);

      let requestOptions = {
        url: router.url + options.path,
        method: 'NOTIFY',
        headers: headers,
        data: options.request._buffer
      }
      let response = await request(requestOptions)
      debug.debug('NOTIFY', groupHook, options, response);
      if(response.error) {
        debug.log('notification failed %O', response.error);
      }
    }
  }

  // send adapter
  hook.type = 'adapter'
  // get groups first
  let adapterTargets = findHookTarget(hook, options);
  if (adapterTargets instanceof Array) {
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
    // send notification to each group instance
    while (adapterGroups.length) {
      let currentAdapterGroup = adapterGroups.shift();
      let groupHook = JSON.parse(JSON.stringify(hook))
      groupHook.group = currentAdapterGroup

      let adapterGroupTargets = findHookTarget(groupHook, options);
      debug.debug('Adapter: Phase %s result: %O', phase, adapterGroupTargets);
      if (!adapterGroupTargets.length) {
        continue;
      }
      let router = false;
      if (adapterGroupTargets.length == 1) {
        router = adapterGroupTargets.pop();
      } else {
        // TODO: add diferent strategy to choose one of the routes
        router = getMinLoadedRouter(adapterGroupTargets);
        debug.log('Adapter route %s result %O', options.route, router);
      }
      let headers = getHeaders(router, groupHook, options);
      headers['x-hook-group'] = currentAdapterGroup;
      headers['x-hook-signature'] = 'sha256=' + signature('sha256', options.request._buffer, router.secureKey);

      let requestOptions = {
        url: router.url + options.path,
        method: 'NOTIFY',
        headers: headers,
        data: options.request._buffer
      }
      let headerStatusName = 'x-hook-adapter-status-' + currentAdapterGroup + '-' + groupHook.phase;
      let response = await request(requestOptions)
      debug.debug('NOTIFY', groupHook, options, response);
      if(response.error) {
        debug.log('notification failed %O', response.error);
      }
    }
  }
}