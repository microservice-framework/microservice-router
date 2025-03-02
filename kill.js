'use strict';
import fs from 'fs';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

if (process.env.PROXY && process.env.PROXYPIDFILE) {
  try {
    var pid = fs.readFileSync(process.env.PROXYPIDFILE);
    process.kill(parseInt(pid), 'SIGINT');
  } catch (e) {
  }
}

if (process.env.ADMIN && process.env.PIDFILE) {
  try {
    var pid = fs.readFileSync(process.env.PIDFILE);
    process.kill(parseInt(pid), 'SIGINT');
  } catch (e) {
    console.log('e', e)
  }
}
