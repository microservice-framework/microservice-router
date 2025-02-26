import applyAccessToken from '../applyAccessToken.js'
import proxyRequest from './proxyRequest.js'

export default async function (recordId, request) {
  applyAccessToken(request);
  if (request.url == '') {
    return {
      code: 200,
      answer: "",
      headers: {
        'Content-Type': "text/html"
      }
    }
  }
  let cutPosition = request.url.lastIndexOf('/');
  let route = request.url.substring(0, cutPosition);
  let path = request.url.substring(cutPosition + 1);
  // Token verification for secure key
  if (route == 'auth' && request.isSecure && path == process.env.SECURE_KEY) {
    let responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
      'Access-Control-Allow-Headers': 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope',
      'Access-Control-Expose-Headers': 'x-total-count',
    };
    return callback(null, {
      code: 200,
      answer: {
        expireAt: -1,
        secureKey: path,
      },
      headers: responseHeaders,
    });
  }
  return proxyRequest({
    route: route,
    path: path,
    method: 'GET',
  }, request)
}
