#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('syn');

const args = process.argv.slice(2);
const topic = args.length === 0 ? 'default' : args[0];

ipc.config.id = 'syn';
ipc.config.retry = 1500;
ipc.config.logger = () => {};
ipc.config.stopRetrying = true;

ipc.connectTo(constants.appid, () => {
  debug('connecting...');

  ipc.of[constants.appid].on('connect', () => {
    debug('connecting... done.');
    const data = topic;
    debug('sent syn: ' + data);
    ipc.of[constants.appid].emit(constants.opcodes.syn, data);
    debug('disconnecting...');
    setTimeout(() => {
      ipc.disconnect(constants.appid);
      debug('disconnecting... done.');
    }, 0);
  });

  ipc.of[constants.appid].on('error', () => {
    debug('no server found.');
  });
});

