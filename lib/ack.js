'use strict'

const debug = require('debug');

const constants = require('./constants.js');


class AckServer {
    constructor(pid, config) {
        this.pid = pid;
        this.dbg = debug('ack ' + this.pid);

        this.channel = config.channel === undefined || config.channel.legnth == 0 ? constants.appid : config.channel;
        this.count = config.count;

        this.config = config;

        this.ipc = require('node-ipc');

        this.ipc.config.retry = 1000;
        this.ipc.config.stopRetrying = 10;
        this.ipc.config.logger = () => {};

        this.isServer = false;
        this.kill = false;

        this.pids = [];
    }

    debug(str) {
        if (this.config.debug) {
            console.log(`ack ` + this.pid + ' ' + str);
        } else {
            this.dbg(str);
        }
    }

    start() {
        return new Promise((resolve, reject) => {
            this.debug(`app: starting... channel: ${this.channel}, count: ${this.count}`);
            this.kill = false;
            this.resolve = resolve;
            this.reject = reject;
            this.startClient();
            this.debug(`app: starting... done.`);
        });
    }

    stop() {
        this.debug('app: stopping... ');
        this.kill = true;
        if (this.isServer) {
            this.stopServer();
        } else {
            this.stopClient();
        }
        this.debug('app: stopping... done.');
        this.resolve();
    }

    stop_kill() {
        this.debug('app: killing...');
        this.kill = true;
        if (this.isServer) {
            this.stopServer();
        } else {
            this.stopClient();
        }
        this.debug('app: killing... done.');
        this.reject('app: Got kill request');
    }

    startClient() {
        if (this.kill) { return; }

        this.isServer = false;
        this.pids = [this.pid];

        this.debug('client: connecting...');

        /* Client Handlers */
        this.ipc.connectTo(this.channel, () => {

            /* Default Handlers */
            this.ipc.of[this.channel].on('error', (err) => {
                this.debug('client: connecting... error: no server found');
            });

            this.ipc.of[this.channel].on('disconnect', () => {
                if (this.kill) { return; }

                this.debug(`client: got disconnect signal from server`);

                /* if we're the next leader, then start the server, else try to reconnect */
                const leader = Math.min(...this.pids);
                if (this.pid <= leader) {
                    this.debug(`client: we're the leader ${leader}`);
                    setTimeout(() => this.startServer(), 0);
                } else {
                    this.debug(`client: leader is ${leader}`);
                    setTimeout(() => this.startClient(), 100);
                }
            });

            this.ipc.of[this.channel].on('connect', () => {
                if (this.kill) { return; }

                this.pids = [];
                this.debug('client: connecting... done.');
                this.ipc.of[this.channel].emit(constants.opcodes.register, this.pid);
                this.debug(`client: registered pid ${this.pid} with server`);

                if (this.config.kill) {
                    this.ipc.of[this.channel].emit(constants.opcodes.kill, this.pid);
                    this.debug(`client: sending kill signal, pid: ${this.pid}`);
                    this.stop();
                }
            });


            /* Opcode Handlers */
            this.ipc.of[this.channel].on(constants.opcodes.syn, (data, socket) => {
                if (this.kill) { return; }

                this.count = this.count - data;
                this.debug(`client: got synchronize ${data}. New count: ${this.count}`);
                if (this.count <= 0) {
                    this.stop();
                }
            });

            this.ipc.of[this.channel].on(constants.opcodes.register, (data, socket) => {
                /* do nothing */
            });

            this.ipc.of[this.channel].on(constants.opcodes.deregister, (data, socket) => {
                /* do nothing */
            });

            this.ipc.of[this.channel].on(constants.opcodes.pids, (data, socket) => {
                if (this.kill) { return; }

                this.pids = data;
                this.debug(`client: got pids: ${data}`)

                if (this.pid == Math.min(...this.pids)) {
                    this.debug(`client: we're the next leader`);
                }
            });

            this.ipc.of[this.channel].on(constants.opcodes.stop, (data, socket) => {
                if (this.kill) { return; }

                this.debug(`client: got stop signal from server`);
                this.ipc.disconnect(this.channel);
            });

            this.ipc.of[this.channel].on(constants.opcodes.kill, (data, socket) => {
                if (this.kill) { return; }

                this.debug(`client: got kill signal from server, origin: ${data}`);
                this.stop_kill();
            });
        });
    }

    broadcastSyn(count) {
        if (count <= 0) { return; }
        if (this.kill) { return; }

        this.ipc.server.broadcast(constants.opcodes.syn, 1);
        this.count = this.count - 1;
        if (this.count == 0) {
            this.debug(`server: new count: ${this.count}, exiting`);
            this.stop();
        } else {
            this.debug(`server: new count: ${this.count}, broadcasting pids: ${this.pids}`);
            this.ipc.server.broadcast(constants.opcodes.pids, this.pids);
            setTimeout(() => this.broadcastSyn(count-1));
        }
    }

    startServer() {
        this.ipc.config.id = this.channel;
        this.debug(`app: starting server... `);
        this.isServer = true;
        this.pids = [];

        this.ipc.serve(() => {
            this.debug('app: starting server... done.');

            /* Default Handlers */
            this.ipc.server.on('connect', (data, socket) => {
                /* do nothing */
            });

            this.ipc.server.on('disconnect', (data, socket) => {
                /* do nothing */
            });


            /* Opcode Handlers */
            this.ipc.server.on(constants.opcodes.syn, (data, socket) => {
                if (this.kill) { return; }

                this.debug('server: got syn: ' + data, '... broadcasting');
                this.broadcastSyn(data);
            });

            this.ipc.server.on(constants.opcodes.register, (data, socket) => {
                if (this.kill) { return; }

                this.debug(`server: registering ${data}`)
                this.pids.push(data);
                this.debug(`server: broadcasting pids: ${this.pids}`);
                this.ipc.server.broadcast(constants.opcodes.pids, this.pids);
            });

            this.ipc.server.on(constants.opcodes.deregister, (data, socket) => {
                if (this.kill) { return; }

                this.debug(`server: deregistering ${data}`)
                this.pids = this.pids.filter((el) => el !== data)
                this.debug(`server: broadcasting pids: ${this.pids}`);
                this.ipc.server.broadcast(constants.opcodes.pids, this.pids);
            });

            this.ipc.server.on(constants.opcodes.pids, (data, socket) => {
                /* do nothing */
            });

            this.ipc.server.on(constants.opcodes.stop, (data, socket) => {
                /* do nothing */
            });

            this.ipc.server.on(constants.opcodes.kill, (data, socket) => {
                if (this.kill) { return; }

                this.debug(`server: got kill signal from pid: ${data}`);
                this.debug(`server: broadcasting kill`);

                this.ipc.server.broadcast(constants.opcodes.kill, data);

                this.stop_kill();
            });
        });

        this.ipc.server.start();
    }

    stopClient() {
        this.debug('client: stopping...');
        this.ipc.of[this.channel].emit(constants.opcodes.deregister, this.pid);
        this.ipc.disconnect(this.channel);
        this.debug('client: stopping... done.');
    }

    stopServer() {
        this.debug('server: stopping...');
        this.debug(`server: broadcasting stop`);
        this.ipc.server.broadcast(constants.opcodes.stop);
        this.ipc.server.stop();
        this.debug('server: stopping... done.');
    }
}

module.exports.AckServer = AckServer;
