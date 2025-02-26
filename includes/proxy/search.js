import applyAccessToken from '../applyAccessToken.js'
import proxyRequest from './proxyRequest.js'

export default async function (data, request) {
  applyAccessToken(request);
  let route = request.url;
  let path = '';
  if (request.url.charAt(request.url.length - 1) == '/') {
    route = request.url.substring(0, request.url.length - 1);
  }
  return proxyRequest({
    route: route,
    path: path,
    data: data,
    method: 'SEARCH',
  }, request)
}
