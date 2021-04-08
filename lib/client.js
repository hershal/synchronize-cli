'use strict';

const debug = require('debug');
const constants = require('./constants.js');
const uuid = require('./uuid.js');

class SYClient {
  constructor(id) {
    this.ipc = require('node-ipc');
    this.id = id ? id : uuid();
    this.debug = debug(`SYClient:${this.id}`);
    this.serverId = undefined;

    this.clients = [];
    this.hooks = {};

    this.init();
  }

  init() {
    this.ipc.config.id = this.id;
    this.ipc.config.retry = 1500;
    this.ipc.config.logger = this.debug;
  }

  connect(serverId) {
    if (this.serverId != undefined) {
      this.debug(`tried to connect to ${serverId} but was already connected to ${this.serverId}`);
      return;
    }

    this.serverId = serverId;
    this.debug('starting client...');
    this.ipc.connectTo(this.serverId, () => {
      for (const [opcode,cb] of Object.entries(this.hooks)) {
        this.ipc.of[serverId].on(opcode, cb);
        this.debug(`starting client... bound ${opcode}`);
      }
    });
    this.debug('starting client... done.');
  }

  disconnect() {
    if (this.serverId === undefined) {
      this.debug('tried to disconnect but was already disconnected');
      return;
    }

    this.debug('disconnecting...');
    this.ipc.disconnect(this.serverId);
    this.serverId = undefined;
    this.debug('disconnecting... done.');
  }

  /* cb in the form of (data,socket) => {} */
  addHook(opcode, cb) {
    this.hooks[opcode] = cb;
  }
}
