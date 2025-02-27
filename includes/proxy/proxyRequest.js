import axios from 'axios';
import debug from './debug.js';
import findAllTargets from '../findAllTargets.js';
import hookCall from '../hookCall.js';
import getMinLoadedRouter from '..getMinLoadedRouter.js';
import hook from '../hook.js';

export default async function (params, request) {
  debug.debug('Route base: %s', params.route);
  params.count = 0;
  params.request = request;
  let endpointTargets = findAllTargets('handler', params);
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', route, endpointTargets);
    return endpointTargets;
  }
  if (!endpointTargets.length) {
    return false;
  }
  let router = false;
  if (endpointTargets.length == 1) {
    router = endpointTargets.pop();
  } else {
    // TODO: add diferent strategy to choose one of the routes
    router = getMinLoadedRouter(endpointTargets);
  }
  // Assign endpoint scope and secureKey for params
  params.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey,
  };
  await hook({ phase: 'before' }, params);

  debug.log('Endpoint params %O result %O', params, router);

  let headers = {};
  let i;
  let skipHeaders = ['host', 'connection', 'content-length'];
  for (i in params.request.headers) {
    if (skipHeaders.indexOf(i) != -1) {
      continue;
    }
    headers[i] = params.request.headers[i];
  }

  for (i in router.matchVariables) {
    headers['mfw-' + i] = router.matchVariables[i];
  }

  let requestOptions = {
    url: router.url + params.path,
    method: params.method,
    headers: headers,
    data: params.request._buffer,
  };
  return request(requestOptions);
}
