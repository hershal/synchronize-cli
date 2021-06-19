#!/usr/bin/env node

const constants = require('../lib/constants.js');

const argv = require('yargs/yargs')(process.argv.slice(2))
      .default('count', 1)
      .argv;


let classObj = {
  debug: require('debug')('ack'),
  ipc: require('node-ipc'),
  channel: "",
  count: 1
};


main();


function main() {
  classObj.ipc.config.id = process.pid;
  classObj.ipc.config.retry = 1500;
  classObj.ipc.config.logger = () => {};

  classObj.channel = argv._.length === 0 ? constants.appid : argv._[0];
  classObj.count = argv.count;
  startClientAsync(classObj);
}



function handleSynClient(obj, data, socket) {
  obj.debug('client got: ' + data);
  stopClientAsync(obj);
}

function handleSynServer(obj, data, socket) {
  obj.debug('server got: ' + data);
  obj.debug('broadcasting: ' + data);
  obj.ipc.server.broadcast(constants.opcodes.syn, data);

  stopServerAsync(obj);
}



function startClientAsync(obj) {
  obj.debug('channel: ' + obj.channel);
  obj.debug('count: ' + obj.count);

  obj.debug('connecting...');

  obj.ipc.connectTo(obj.channel, () => {
    obj.ipc.of[obj.channel].on('error', (err) => {
      obj.debug('connecting... no server found');
      obj.ipc.disconnect(obj.channel);
      startServerAsync(obj);
    });

    obj.ipc.of[obj.channel].on('connect', () => {
      obj.debug('connecting... done.');
    });

    obj.ipc.of[obj.channel].on(constants.opcodes.syn, (data, socket) => {
      handleSynClient(obj, data, socket);
    });
  });
}

function stopClientAsync(obj) {
  obj.debug('stopping client...');
  obj.ipc.disconnect(obj.channel);
  obj.debug('stopping client... done.');
}


function startServerAsync(obj) {
  obj.ipc.config.id = obj.channel;
  let connectedSockets = [];
  obj.debug('starting server...');

  obj.ipc.serve(() => {
    obj.debug('starting server... done.');

    obj.ipc.server.on(constants.opcodes.syn, (data, socket) => {
      handleSynServer(obj, data, socket);
    });
  });

  obj.ipc.server.start();
}

function stopServerAsync(obj) {
  obj.debug('stopping server...');
  obj.ipc.server.stop();
  obj.debug('stopping server... done.');
}
