#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('syn');

const args = process.argv.slice(2);
const channel = args.length === 0 ? constants.appid : args[0];

ipc.config.id = 'syn';
ipc.config.retry = 1500;
ipc.config.logger = () => {};
ipc.config.stopRetrying = true;

ipc.connectTo(channel, () => {
  debug('channel: ' + channel);
  debug('connecting...');

  ipc.of[channel].on('connect', () => {
    debug('connecting... done.');
    const data = 'synchronize';
    debug('sent: ' + data);
    ipc.of[channel].emit(constants.opcodes.syn, data);
    debug('disconnecting...');
    setTimeout(() => {
      ipc.disconnect(channel);
      debug('disconnecting... done.');
    }, 0);
  });

  ipc.of[channel].on('error', () => {
    debug('no server found.');
  });
});

