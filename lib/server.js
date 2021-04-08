'use strict';

const debug = require('debug');
const constants = require('./constants.js');
const uuid = require('./uuid.js');

class SYServer {
  constructor(id) {
    this.ipc = require('node-ipc');
    this.id = id ? id : uuid();
    this.debug = debug(`SYServer:${this.id}`);

    this.clients = [];
    this.hooks = {};

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
      for (const [opcode,cb] of Object.entries(this.hooks)) {
        this.ipc.server.on(opcode, cb);
        this.debug(`starting server... bound ${opcode}`);
      }
    });
    this.ipc.server.start();
    this.debug('starting server... done.');
  }

  stop() {
    debug('stopping server...');
    this.ipc.server.stop();
    debug('stopping server... done.');
  }

  /* cb in the form of (data,socket) => {} */
  addHook(opcode, cb) {
    this.hooks[opcode] = cb;
  }
}
