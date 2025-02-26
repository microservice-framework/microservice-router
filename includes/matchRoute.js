import debug from './debug.js';
import checkConditions from './checkConditions.js'

export default function (targetRequest, routeItem) {
  let routeItems = targetRequest.route.split('/');

  if (routeItem.type == 'metric') {
    if (routeItem.conditions) {
      if (!checkConditions(routeItem.conditions, targetRequest.request, targetRequest.jsonData)) {
        return false;
      }
    }
    return true;
  }
  if (routeItem.path && routeItem.path.length == 1 && routeItem.path[0] == '*') {
    if (routeItem.conditions) {
      if (!checkConditions(routeItem.conditions, targetRequest.request, targetRequest.jsonData)) {
        return false;
      }
    }
    return true;
  }
  // Check path and if match, set routeItem.matchVariables with values.
  let checkPath = function (paths) {
    for (let path of paths) {
      // If route qual saved path
      if (path == targetRequest.route) {
        return true;
      }

      // If routeItems.length == 1, and did not match
      if (routeItems.length == 1) {
        if (path != targetRequest.route) {
          continue;
        }
      }

      var pathItems = path.split('/');
      if (pathItems.length != routeItems.length) {
        continue;
      }
      var fullPathMatched = true;
      for (var i = 0; i < routeItems.length; i++) {
        if (pathItems[i].charAt(0) == ':') {
          routeItem.matchVariables[pathItems[i].substring(1)] = routeItems[i];
        } else {
          if (routeItems[i] != pathItems[i]) {
            fullPathMatched = false;
            break;
          }
        }
      }
      if (fullPathMatched) {
        return true;
      }
    }
  };

  if (!checkPath(routeItem.path)) {
    return false;
  }
  if (routeItem.conditions) {
    if (!checkConditions(routeItem.conditions, targetRequest.request, targetRequest.jsonData)) {
      return false;
    }
  }
  return true;
}