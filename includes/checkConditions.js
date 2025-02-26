import debug from './debug.js';

/**
 * Source: https://gist.github.com/jasonrhodes/2321581
 * A function to take a string written in dot notation style, and use it to
 * find a nested object property inside of an object.
 *
 * Useful in a plugin or module that accepts a JSON array of objects, but
 * you want to let the user specify where to find various bits of data
 * inside of each custom object instead of forcing a standardized
 * property list.
 *
 * @param String nested A dot notation style parameter reference (ie "urls.small")
 * @param Object object (optional) The object to search
 *
 * @return the value of the property in question
 */
function getProperty(propertyName, object) {
  let parts = propertyName.split('.'),
    length = parts.length,
    i,
    property = object;
  for (i = 0; i < length; i++) {
    if (property[parts[i]] === undefined) {
      return new Error('Property Does not exists');
    }
    property = property[parts[i]];
  }
  return property;
}

export default async function (conditions, options) {
  debug.debug('checkConditions %O options: %O json: %O', conditions, options);
  if (conditions.headers && conditions.headers.length) {
    for (let header of conditions.headers) {
      if (!options.request.headers[header.name]) {
        return false;
      }
      let receivedHeaderValue = options.request.headers[header.name];
      if (header.isRegex) {
        let pattern = new RegExp(header.value, 'i');
        if (!pattern.test(receivedHeaderValue)) {
          return false;
        }
      } else {
        if (receivedHeaderValue !== header.value) {
          return false;
        }
      }
    }
  }
  // check methods
  if (conditions.methods && conditions.methods.length) {
    if (conditions.methods.indexOf(options.method) == -1) {
      return false;
    }
  }
  // check payload
  if (conditions.payload && conditions.payload.length && options.data) {
    if (typeof options.data != 'object') {
      return false;
    }
    for (let payload of conditions.payload) {
      debug.debug('Checking for condition %O', payload);
      let receivedPayloadValue = getProperty(payload.name, options.data);
      debug.debug('receivedPayloadValue %O', receivedPayloadValue);
      if (receivedPayloadValue instanceof Error) {
        return false;
      }
      if (payload.isRegex) {
        let pattern = new RegExp(payload.value, 'i');
        debug.debug('pattern.test %O', pattern.test(receivedPayloadValue));
        if (!pattern.test(receivedPayloadValue)) {
          return false;
        }
      } else {
        if (receivedPayloadValue !== payload.value) {
          return false;
        }
      }
    }
  }
  return true;
}
