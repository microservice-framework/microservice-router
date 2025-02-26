import axios from 'axios';
import debugF from 'debug';

const debug = {
  log: debugF('proxy:log'),
  debug: debugF('proxy:debug'),
  debugMetric: debugF('proxy:metric'),
  request: debugF('proxy:request'),
  debugHook: debugF('proxy:hook'),
};

export default async function (options, request) {

}