import applyAccessToken from '../applyAccessToken.js'
import proxyRequest from './proxyRequest.js'

export default async function (recordId, request) {
  applyAccessToken(request);
  let cutPosition = request.url.lastIndexOf('/');
  let route = request.url.substring(0, cutPosition);
  let path = request.url.substring(cutPosition + 1);
  return proxyRequest({
    route: route,
    path: path,
    method: 'DELETE',
  }, request)
}
