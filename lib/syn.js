'use strict'

const debug = require('debug');
const constants = require('./constants.js');


class SynClient {
    constructor(pid, config) {
        this.pid = pid;
        this.log = config.debug;
        this.dbg = debug(`syn ${this.pid}`);

        this.channel = config.channel === undefined || config.channel.legnth == 0 ? constants.appid : config.channel;
        this.count = config.count;

        this.config = config;

        this.ipc = require('node-ipc');

        this.ipc.config.id = 'syn';
        this.ipc.config.retry = 1500;
        this.ipc.config.logger = () => {};
        this.ipc.config.stopRetrying = this.count;
    }

    debug(str) {
        if (this.log) {
            console.log(`syn ` + ' ' + str);
        } else {
            this.dbg(str);
        }
    }

    start() {
        this.debug(`starting... channel: ${this.channel} count: ${this.count}`)
        this.pause = false;
        this.kill = false;

        this.connect();
        this.debug(`starting... done.`);
    }

    stop() {
        this.debug(`stopping...`);
        this.kill = true;
        this.disconnect();
        this.debug(`stopping... done.`);
    }

    connect() {
        this.ipc.connectTo(this.channel, () => {
            this.debug('connecting...');

            /* Default Handlers */
            this.ipc.of[this.channel].on('connect', () => {
                if (this.kill == true) { return; }

                this.debug('connecting... done.');
                if (this.pause == true) {
                    this.debug('unpausing')
                    this.pause = false;
                } else {
                    if (this.config.kill) {
                        this.debug('initiating sendKill');
                        setTimeout(() => this.sendKill(), 0);
                    } else {
                        this.debug('initiating sendSyn');
                        setTimeout(() => this.sendSyn(this.count), 0);
                    }
                }
            });

            this.ipc.of[this.channel].on('disconnect', () => {
                this.debug('got disconnect');
            });

            this.ipc.of[this.channel].on('error', () => {
                if (this.kill == true) { return; }

                this.kill = true;
                this.debug('connecting... failed: no server found. Killing.');
            });


            /* Opcode Handlers */
            this.ipc.of[this.channel].on(constants.opcodes.syn, () => {
                /* do nothing */
            });

            this.ipc.of[this.channel].on(constants.opcodes.register, () => {
                /* do nothing */
            });

            this.ipc.of[this.channel].on(constants.opcodes.deregister, () => {
                /* do nothing */
            });

            this.ipc.of[this.channel].on(constants.opcodes.pids, () => {
                /* do nothing */
            });

            this.ipc.of[this.channel].on(constants.opcodes.stop, () => {
                if (this.kill == true) { return; }

                this.debug('got stop, disconnecting and reconnecting');
                this.debug('pausing')

                /* reconnect */
                this.pause = true;
                this.ipc.disconnect(this.channel);
                setTimeout(() => this.connect(), 100);
            });
        });
    }

    disconnect() {
        this.debug('disconnect() called');
        this.debug('disconnecting...');
        this.ipc.disconnect(this.channel);
        this.debug('disconnecting... done.');
    }

    sendSyn(count) {
        if (this.kill == true) { return; }

        if (count > 0) {
            const newcount = count - 1;
            const data = 1;

            if (this.pause) {
                this.debug(`sendSyn: waiting with count: ${count}`);
                setTimeout(() => this.sendSyn(count), 1000);
            } else {
                this.debug(`sendSyn: sent: ${data}, count: ${count} -> ${newcount}`);
                this.ipc.of[this.channel].emit(constants.opcodes.syn, data);
                setTimeout(() => this.sendSyn(newcount), 1000);
            }
        } else {
            this.disconnect();
        }
    }

    sendKill() {
        if (this.kill == true) { return; }
        this.ipc.of[this.channel].emit(constants.opcodes.kill, this.pid);
        this.disconnect();
    }
}


module.exports.SynClient = SynClient;
