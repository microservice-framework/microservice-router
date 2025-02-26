import debug from 'debug';

export default {
  log: debug('proxy:log'),
  debug: debug('proxy:debug'),
  debugMetric: debug('proxy:metric'),
  request: debug('proxy:request'),
  debugHook: debug('proxy:hook'),
};