'use strict'

const debug = require('debug');

const constants = require('./constants.js');


class AckServer {
    constructor(pid, channel, count, log) {
        this.log = log
        this.pid = pid;
        this.dbg = debug('ack ' + this.pid);
        this.channel = channel === undefined || channel.legnth == 0 ? constants.appid : channel;
        this.count = count;
        this.ipc = require('node-ipc');

        this.ipc.config.retry = 1000;
        this.ipc.config.stopRetrying = 10;
        this.ipc.config.logger = () => {};

        this.isServer = false;
        this.kill = false;
    }

    debug(str) {
        if (this.log) {
            console.log(`ack ` + this.pid + ' ' + str);
        } else {
            this.dbg(str);
        }
    }

    start() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.startClient();
        });
    }

    stop() {
        this.kill = true;
        if (this.isServer) {
            this.stopServer();
        } else {
            this.stopClient();
        }
        this.resolve();
    }

    startClient() {

        /* if we're supposed to die, do nothing */
        if (this.kill) { return; }

        this.isServer = false;
        let pids = [];

        this.debug('channel: ' + this.channel);
        this.debug('count: ' + this.count);

        this.debug('connecting...');

        /* Client Handlers */
        this.ipc.connectTo(this.channel, () => {

            /* Default Handlers */
            this.ipc.of[this.channel].on('error', (err) => {
                this.debug('connecting... no server found');
            });

            this.ipc.of[this.channel].on('disconnect', () => {
                /* if we're supposed to die, do nothing */
                if (this.kill) { return; }

                /* if we're the next leader, then start the server, else try to reconnect */
                const leader = Math.min(...pids);
                if (this.pid <= leader) {
                    this.debug(`client: we're the leader ${leader}, starting server...`);
                    setTimeout(() => this.startServer(), 100);
                } else {
                    this.debug(`client: leader is ${leader} starting client...`);
                    setTimeout(() => this.startClient(), 1000)
                }
            })

            this.ipc.of[this.channel].on('connect', () => {
                pids = [];
                this.debug('client: connecting... done.');
                this.debug(`client: registering pid ${this.pid} with server... `);
                this.ipc.of[this.channel].emit(constants.opcodes.register, this.pid);
            });


            /* Opcode Handlers */
            this.ipc.of[this.channel].on(constants.opcodes.syn, (data, socket) => {
                this.debug('client: got synchronize ' + data);
                this.count = this.count - data;
                if (this.count <= 0) {
                    this.stop();
                }
            });

            this.ipc.of[this.channel].on(constants.opcodes.deregister, (data, socket) => {
                /* todo: does client do anything? */
            });

            this.ipc.of[this.channel].on(constants.opcodes.register, (data, socket) => {
                /* todo: does client do anything? */
            });

            this.ipc.of[this.channel].on(constants.opcodes.pids, (data, socket) => {
                pids = data;

                let nextleader = '';
                if (this.pid == Math.min(...pids)) {
                    nextleader = ' (nextleader)'
                }
                this.debug(`client:${nextleader} got pids: ${data}`)

            });
        });
    }

    startServer() {
        this.ipc.config.id = this.channel;
        this.debug('starting server...');
        this.isServer = true;

        this.ipc.serve(() => {
            let pids = [];
            this.debug('starting server... done.');

            /* Server Handlers */

            /* Opcode Handlers */
            this.ipc.server.on(constants.opcodes.syn, (data, socket) => {
                this.debug('server: got syn: ' + data, '... broadcasting');
                this.ipc.server.broadcast(constants.opcodes.syn, data);

                this.count = this.count - data;
                if (this.count <= 0) {
                    this.debug(`server: new count: ${this.count}, exiting`);
                    this.stop();
                } else {
                    this.debug(`server: new count: ${this.count}, broadcasting pids: ${pids}`);
                    this.ipc.server.broadcast(constants.opcodes.pids, pids);
                }
            });

            this.ipc.server.on(constants.opcodes.register, (data, socket) => {
                this.debug(`server: registering ${data}`)
                pids.push(data);
                this.debug(`server: broadcasting pids: ${pids}`);
                this.ipc.server.broadcast(constants.opcodes.pids, pids);
            });

            this.ipc.server.on(constants.opcodes.deregister, (data, socket) => {
                this.debug(`server: deregistering ${data}`)
                pids = pids.filter((el) => el !== data)
                this.debug(`server: broadcasting pids: ${pids}`);
                this.ipc.server.broadcast(constants.opcodes.pids, pids);
            });

            this.ipc.server.on(constants.opcodes.pids, (data, socket) => {
                /* do nothing */
            });
        });

        this.ipc.server.start();
    }

    stopClient() {
        this.debug('stopping client...');
        this.ipc.of[this.channel].emit(constants.opcodes.deregister, this.pid);
        this.ipc.disconnect(this.channel);
        this.debug('stopping client... done.');
    }

    stopServer() {
        this.debug('server: stopping...');
        this.ipc.server.stop();
        this.debug('server: stopping... done.');
    }
}

module.exports.AckServer = AckServer;
