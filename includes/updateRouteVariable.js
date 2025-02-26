import debugF from 'debug';
const debug = {
  log: debugF('proxy:log'),
  debug: debugF('proxy:debug'),
  debugMetric: debugF('proxy:metric'),
  request: debugF('proxy:request'),
  debugHook: debugF('proxy:hook'),
};

export default async function (mongoDB) {
  let db = mongoDB.db(process.env.MONGO_DB);
  let collection = db.collection(process.env.MONGO_TABLE);
  try {
    let results = await collection.find(query, options).toArray();
    if (!results || results.length == 0) {
      debug.debug('No records found');
      return false;
    }
  } catch (err) {
    debug.debug('updateRouteVariable:find err: %O', err);
    return false;
  }

  let newServices = [];
  for (let route of results) {
    // get only changed in 60 sec.
    if (route.changed > Date.now() - 60 * 1000) {
      if (!route.type) {
        // Version 1.x compatibility.
        route.type = 'handler';
        if (route.path == 'ws') {
          route.type = 'websocket';
        }
      }
      if (typeof route.online === 'undefined') {
        // Version 1.x compatibility.
        route.online = true;
      }
      newServices.push(route);
    }
  }
  debug.debug('Updated router table %O', newServices);
  return newServices;
}
