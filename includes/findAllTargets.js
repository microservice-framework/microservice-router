/**
 * Find all routes.
 */
import debug from './debug.js';
import { getRoutes } from './Routes.js';
import matchRoute from './matchRoute.js';

export default function (type, params) {
  debug.debug('Find all routes %s', params.route);
  // get available routes
  let globalServices = getRoutes();
  var availableRoutes = [];
  for (let i in globalServices) {
    let routeItem = globalServices[i];

    if (routeItem.type && routeItem.type.toLowerCase() !== type) {
      continue;
    }
    // For easy deployment when service need to stop receiving new requests.
    if (!routeItem.online) {
      continue;
    }

    routeItem.matchVariables = {};
    if (matchRoute(params, routeItem)) {
      availableRoutes.push(routeItem);
    }
  }

  debug.debug('Available routes type: %s route: %s availableRoutes: %s', type, params.route, JSON.stringify(availableRoutes, null, 2));

  if (availableRoutes.length == 0) {
    debug.debug('Not found for %s', params.route);
    return new Error('Endpoint not found');
  }

  return availableRoutes;
}
