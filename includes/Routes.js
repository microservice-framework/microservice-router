import debugF from 'debug';
import { MongoClient } from 'mongodb';
const debug = {
  log: debugF('proxy:log'),
  debug: debugF('proxy:debug'),
  debugMetric: debugF('proxy:metric'),
  request: debugF('proxy:request'),
  debugHook: debugF('proxy:hook'),
};

var globalServices = [];

const updateRouteTable = async function () {
  let client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  let db = client.db(process.env.MONGO_DB);
  let collection = db.collection(process.env.MONGO_TABLE);
  try {
    let query = {}
    let options = {}
    let results = await collection.find(query, options).toArray();
    if (!results || results.length == 0) {
      debug.debug('No records found');
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
    globalServices = newServices
  } catch (err) {
    debug.debug('updateRouteVariable:find err: %O', err);
    return false;
  } finally {
    if (client) {
      await client.close(); // Ensure DB connection is closed
    }
  }
  return true
}

const getRoutes = function(){
  return globalServices;
}

export {
  updateRouteTable,
  getRoutes,
}
