import applyAccessToken from '../applyAccessToken.js'
import proxyRequest from './proxyRequest.js'

export default async function (data, request) {
  applyAccessToken(request);
  if (request.headers['access-control-request-method']) {
    return callback(null, {
      code: 200,
      answer: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
        'Access-Control-Allow-Headers': 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope',
        'Access-Control-Expose-Headers': 'x-total-count',
      },
    });
  }
  let route = request.url;
  let path = '';
  if (request.url.charAt(request.url.length - 1) == '/') {
    route = request.url.substring(0, request.url.length - 1);
  }
  return proxyRequest({
    route: route,
    path: path,
    data: data,
    method: 'OPTIONS',
  }, request)
}
