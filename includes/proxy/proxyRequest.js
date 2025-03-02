import debug from '../debug.js';
import findAllTargets from '../findAllTargets.js';
import getMinLoadedRouter from '../getMinLoadedRouter.js';
import hook from '../hook.js';
import getHeaders from '../getHeaders.js';
import AxiosRequest from '../request.js';

export default async function (params, request) {
  debug.debug('Route base: %s', params.route);
  params.count = 0;
  params.request = request;
  let endpointTargets = findAllTargets('handler', params);
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', params.route, endpointTargets);
    return {
      code: 404,
      answer: endpointTargets,
      error: endpointTargets,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
        'Access-Control-Allow-Headers': 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope',
        'Access-Control-Expose-Headers': 'x-total-count',
      },
    };
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
  console.log('router', router);
  // Assign endpoint scope and secureKey for params
  params.endpoint = {
    scope: router.scope,
    secureKey: router.secureKey,
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
  let startTime = Date.now();
  let answer = await AxiosRequest(requestOptions);

  if (!answer.headers) {
    answer.headers = {};
  }
  // CORS headers
  answer.headers['Access-Control-Allow-Origin'] = '*';
  answer.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS, DELETE, PUT, SEARCH';
  answer.headers['Access-Control-Allow-Headers'] = 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope';
  answer.headers['Access-Control-Expose-Headers'] = 'x-total-count';

  let endTime = Date.now();
  // metric send
  let metricTargets = findAllTargets('metric', params);
  if (metricTargets instanceof Array) {
    // if we have broadcast targets, send to each target a request
    while (metricTargets.length) {
      let router = metricTargets.pop();
      debug.log('Metric Notify route %s result %O', params.route, router);

      let code = 0;
      if (answer.code) {
        code = answer.code;
      }

      let metricJSON = {
        startTime: startTime,
        endTime: endTime,
        code: answer.code,
        method: requestOptions.method,
        headers: requestOptions.headers,
        uri: requestOptions.uri,
        route: params.route,
      };

      if (answer.answer && answer.answer.length) {
        metricJSON.responseLength = answer.answer.length;
      }

      if (!router.meta) {
        metricJSON.request = params.request._buffer;
        metricJSON.response = answer.answer;
      }
      let metricBody = JSON.stringify(metricJSON);
      let headers = getHeaders(router, 'metric');
      headers['x-hook-signature'] = 'sha256=' + signature('sha256', metricBody, router.secureKey);

      let requestOptions = {
        url: router.url + params.path,
        method: 'NOTIFY',
        headers: headers,
        data: metricBody,
        timeout: 300, // For metrics we limit to 300 ms.
      };
      let response = await AxiosRequest(requestOptions);
      debug.debug('METRIC', params, response, metricBody);
      if (response.error) {
        debug.log('METRIC failed %O', response.error);
      }
    }
  }
  return answer;
}
