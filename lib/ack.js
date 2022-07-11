'use strict'

const debug = require('debug');

const uuid = require('./uuid.js');
const constants = require('./constants.js');


class AckServer {
    constructor(id, channel, count) {
        this.debug = debug('ack ' + uuid());
        this.channel = channel === undefined || channel.legnth == 0 ? constants.appid : channel;
        this.count = count;
        this.ipc = require('node-ipc');

        this.ipc.config.retry = 500;
        this.ipc.config.logger = () => {};
    }

    start() {
        return this.startClientAsync();
    }

    startClientAsync() {
        this.debug('channel: ' + this.channel);
        this.debug('count: ' + this.count);

        this.debug('connecting...');

        /* Client Handlers */
        this.ipc.connectTo(this.channel, () => {
            this.ipc.of[this.channel].on('error', (err) => {
                this.debug('connecting... no server found');
                this.ipc.disconnect(this.channel);
                this.startServerAsync();
            });

            this.ipc.of[this.channel].on('connect', () => {
                this.debug('connecting... done.');
            });

            this.ipc.of[this.channel].on(constants.opcodes.syn, (data, socket) => {
                this.debug('client got: ' + data);
                this.stopClientAsync();
            });
        });
    }

    startServerAsync() {
        this.ipc.config.id = this.channel;
        let connectedSockets = [];
        this.debug('starting server...');

        this.ipc.serve(() => {
            this.debug('starting server... done.');

            /* Server Handlers */
            this.ipc.server.on(constants.opcodes.syn, (data, socket) => {
                this.debug('server got: ' + data);
                this.debug('broadcasting: ' + data);
                this.ipc.server.broadcast(constants.opcodes.syn, data);
                this.stopServerAsync();
            });
        });

        this.ipc.server.start();
    }

    stopClientAsync() {
        this.debug('stopping client...');
        this.ipc.disconnect(this.channel);
        this.debug('stopping client... done.');
    }

    stopServerAsync() {
        this.debug('stopping server...');
        this.ipc.server.stop();
        this.debug('stopping server... done.');
    }
}

module.exports.AckServer = AckServer;
