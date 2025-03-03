import applyAccessToken from '../applyAccessToken.js';
import proxyRequest from './proxyRequest.js';

export default async function (data, request) {
  applyAccessToken(request);
  if (request.headers['access-control-request-method']) {
    return {
      code: 200,
      answer: {},
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
        'access-control-allow-headers': 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope',
        'access-control-expose-headers': 'x-total-count',
      },
    };
  }
  let route = request.url;
  let path = '';
  if (request.url.charAt(request.url.length - 1) == '/') {
    route = request.url.substring(0, request.url.length - 1);
  }
  return proxyRequest(
    {
      route: route,
      path: path,
      data: data,
      method: 'OPTIONS',
    },
    request
  );
}
