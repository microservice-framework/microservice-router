'use strict';
import fs from 'fs';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

var pidproxy;
var pid;

try {
  pidproxy = fs.readFileSync(process.env.PROXYPIDFILE).toString('utf8').trim();
} catch (e) {
  console.log('e', e)
}

try {
  pid = fs.readFileSync(process.env.PIDFILE).toString('utf8').trim();
} catch (e) {
  console.log('e', e)
}


console.log(
  JSON.stringify({
    'microservice-router:admin': {
      pid: parseInt(pid),
      start: 'start-admin',
      stop: 'stop-admin',
    },
    'microservice-router:proxy': {
      pid: parseInt(pidproxy),
      start: 'start-proxy',
      stop: 'stop-proxy',
    },
  })
);
