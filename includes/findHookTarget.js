/**
 * Find all hook routes by stage.
 */
import debug from './debug.js';
import findAllTargets from './findAllTargets.js';

export default function (options, phase, type, group) {
  debug.debugHook('Find all hooks route: %s phase: %s type: %s group: %s', options.route, phase, type, group);
  let allHookTargets = findAllTargets(options, 'hook');
  if (allHookTargets instanceof Error) {
    return allHookTargets;
  }
  let finalHookTable = [];
  for (let target of allHookTargets) {
    // skip hooks with no hook properties
    if (!target.hook || !target.hook.length) {
      continue;
    }
    for (let hook of target.hook) {
      if (phase !== null && hook.phase !== phase) {
        continue;
      }
      if (hook.type !== type) {
        continue;
      }
      let targetCopy = JSON.parse(JSON.stringify(target));
      delete targetCopy.hook;
      if (hook.group) {
        targetCopy.group = hook.group;
      } else {
        targetCopy.group = '_default';
      }

      finalHookTable.push(targetCopy);
    }
  }
  if (typeof group !== 'undefined') {
    finalHookTable = finalHookTable.filter(function (elem) {
      return elem.group == group;
    });
  }
  if (!finalHookTable.length) {
    debug.debug('Not found for %s', options.route);
    debug.log('Hook instance %s not found', group);
    debug.debugHook('Hook instance %s not found', group);
    return new Error('Hook instance not found');
  }
  return finalHookTable;
}
