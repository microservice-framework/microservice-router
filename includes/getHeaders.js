import debug from './debug';

export default function (router, hook, options) {
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
}
