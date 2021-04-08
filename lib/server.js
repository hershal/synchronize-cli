'use strict';

const debug = require('debug');
const constants = require('./constants.js');
const uuid = require('./uuid.js');

class SYServer {
  constructor(args) {
    this.ipc = require('node-ipc');
    this.id = uuid();
    this.debug = debug(`SYServer:${this.id}`);

    this.clients = [];

    this.init();
  }

  init() {
    this.ipc.config.id = this.id;
    this.ipc.config.retry = 1500;
    this.ipc.config.logger = this.debug;
  }

  start() {
    this.debug('starting server...');
    this.ipc.serve(() => {
      this.setupBindings(this.ipc);
      this.debug('starting server... setup bindings');
    });
    this.ipc.server.start();
    this.debug('starting server... done.');
  }

  stop() {
    debug('stopping server...');
    this.ipc.server.stop();
    debug('stopping server... done.');
  }

  setupBindings() {
    this.ipc.server.on(constants.opcodes.syn, (data, socket) => {
      this.handleSyn(data, socket);
    });
  }

  handleSyn(data, socket) {
    this.debug('got syn: ' + data);
    this.debug('broadcasting: ' + data);
    this.ipc.server.broadcast(constants.opcodes.syn, data);
  }

}
