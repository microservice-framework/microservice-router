import axios from 'axios';
import debug from './debug.js';
import findAllTargets from '../findAllTargets.js';
import hookCall from '../hookCall.js';
import getMinLoadedRouter from '..getMinLoadedRouter.js';

export default async function (params, request) {
  debug.debug('Route base: %s', route);
  params.count = 0;
  params.request = request;
  let endpointTargets = findAllTargets('handler', params );
  if (endpointTargets instanceof Error) {
    debug.debug('Route %s err %O', route, endpointTargets);
    return endpointTargets;
  }
  // Assign endpoint scope and secureKey for params
  params.endpoint = {
    scope: endpointTargets[0].scope,
    secureKey: endpointTargets[0].secureKey,
  };
}
