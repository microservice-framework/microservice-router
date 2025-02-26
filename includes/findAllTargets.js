/**
 * Find all routes.
 */
import debug from './debug.js';
import { getRoutes } from './Routes.js';
import matchRoute from './matchRoute.js';

export default function (options, type) {
  debug.debug('Find all routes %s', options.route);
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
    if (matchRoute(options, routeItem)) {
      availableRoutes.push(routeItem);
    }
  }

  debug.debug('Available routes type: %s route: %s availableRoutes: %s', type, options.route, JSON.stringify(availableRoutes, null, 2));

  if (availableRoutes.length == 0) {
    debug.debug('Not found for %s', options.route);
    return new Error('Endpoint not found');
  }

  return availableRoutes;
}
