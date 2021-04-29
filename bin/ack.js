#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('ack');

const args = process.argv.slice(2);
const channel = args.length === 0 ? constants.appid : args[0];

ipc.config.id = process.pid;
ipc.config.retry = 1500;
ipc.config.logger = () => {};

startClientAsync(channel);


function handleSynClient(data, socket) {
  debug('client got: ' + data);
  stopClientAsync();
}

function startClientAsync(channel) {
  debug('channel: ' + channel);
  debug('connecting...');

  ipc.connectTo(channel, () => {
    ipc.of[channel].on('error', (err) => {
      debug('connecting... no server found');
      ipc.disconnect(channel);
      startServerAsync(channel);
    });

    ipc.of[channel].on('connect', () => {
      debug('connecting... done.');
    });

    ipc.of[channel].on(constants.opcodes.syn, (data, socket) => {
      handleSynClient(data,socket);
    });
  });
}

function stopClientAsync() {
  debug('stopping client...');
  setTimeout(() => {
    ipc.disconnect(channel);
    debug('stopping client... done.');
  }, 0);
}


function startServerAsync(channel) {
  ipc.config.id = channel;
  let connectedSockets = [];
  debug('starting server...');

  ipc.serve(() => {
    debug('starting server... done.');

    ipc.server.on(constants.opcodes.syn, (data, socket) => {
      handleSynServer(data, socket);
    });
  });

  ipc.server.start();
}

function handleSynServer(data, socket) {
  debug('server got: ' + data);
  debug('broadcasting: ' + data);
  ipc.server.broadcast(constants.opcodes.syn, data);
  stopServerAsync();
}

function stopServerAsync() {
  debug('stopping server...');
  setTimeout(() => {
    ipc.server.stop();
    debug('stopping server... done.');
  }, 0);
}
