import axios from 'axios';
import debug from './debug.js';
import findAllTargets from '../findAllTargets.js';
import hookCall from '../hookCall.js';
import getMinLoadedRouter from '..getMinLoadedRouter.js';

export default async function (options, request) {
  debug.debug('Route base: %s', route);
  options.count = 0;
  options.request = request;
  let endpointTargets = findAllTargets(options, 'handler');
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', route, endpointTargets);
    return endpointTargets;
  }
  // Assign endpoint scope and secureKey for options
  options.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey,
  };
}
