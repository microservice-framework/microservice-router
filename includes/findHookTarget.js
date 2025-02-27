/**
 * Find all hook routes by stage.
 */
import debug from './debug.js';
import findAllTargets from './findAllTargets.js';

/*
 *
 *
 * hook {
 *   phase: before, after
 *   type: broadcast, notify
 *   group:
 * }
 * options:
 * 
 *  */
export default function (hook, options) {
  debug.debugHook('Find all hooks route: %s phase: %s type: %s group: %s', options.route, hook.phase, hook.type, hook.group);
  
  let allHookEndpoints = findAllTargets('hook', options);
  if (allHookEndpoints instanceof Error) {
    return allHookEndpoints;
  }
  let finalHookTable = [];
  for (let target of allHookEndpoints) {
    // skip hooks with no hook properties
    if (!target.hook || !target.hook.length) {
      continue;
    }
    for (let hookItem of target.hook) {
      if (hook.phase !== null && hookItem.phase !== hook.phase) {
        continue;
      }
      if (hookItem.type !== hook.type) {
        continue;
      }
      //make a copy of the target endpoint
      let targetCopy = JSON.parse(JSON.stringify(target));
      delete targetCopy.hook;
      if (hookItem.group) {
        targetCopy.group = hookItem.group;
      } else {
        targetCopy.group = '_default';
      }

      finalHookTable.push(targetCopy);
    }
  }
  // if endpoint is group based, filter to single endpoint
  if (typeof hook.group !== 'undefined') {
    finalHookTable = finalHookTable.filter(function (elem) {
      return elem.group == hook.group;
    });
  }
  // no hook endpoints, return error
  if (!finalHookTable.length) {
    debug.debug('Not found for %s', options.route);
    debug.log('Hook instance %s not found', hook.group);
    debug.debugHook('Hook instance %s not found', hook.group);
    return new Error('Hook instance not found');
  }
  return finalHookTable;
}
