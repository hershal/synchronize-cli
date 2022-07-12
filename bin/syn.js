#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('syn');
const argv = require('yargs/yargs')(process.argv.slice(2))
      .default('count', 1)
      .argv;

const channel = argv._.length === 0 ? constants.appid : argv._[0];
const count = argv.count;

ipc.config.id = 'syn';
ipc.config.retry = 1500;
ipc.config.logger = () => {};
ipc.config.stopRetrying = true;

ipc.connectTo(channel, () => {
  debug('channel: ' + channel);
  debug('connecting...');

  ipc.of[channel].on('connect', () => {
    debug('connecting... done.');
    const data = count;
    debug('sent: ' + data);
    ipc.of[channel].emit(constants.opcodes.syn, data);
    debug('disconnecting...');
    setTimeout(() => {
      ipc.disconnect(channel);
      debug('disconnecting... done.');
    }, 0);
  });

  ipc.of[channel].on('error', () => {
    debug('connecting... failed: no server found.');
  });
});

