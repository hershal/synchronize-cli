#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('ack');

ipc.config.id = process.pid;
ipc.config.retry = 1500;
ipc.config.logger = () => {};

startClientAsync();


function startClientAsync() {
    ipc.connectTo(constants.appid, () => {
        ipc.of[constants.appid].on('error', (err) => {
            ipc.disconnect(constants.appid);
            startServerAsync();
        });

        ipc.of[constants.appid].on('connect', () => {
            debug('connected');
        });

        ipc.of[constants.appid].on(constants.opcodes.syn, (data, socket) => {
            debug('client got syn: ' + data);
            stopClientAsync();
        });
    });
}

function stopClientAsync() {
    debug('stopping client...');
    setTimeout(() => {
        ipc.disconnect(constants.appid);
        debug('stopping client... done.');
    }, 0);
}


function startServerAsync() {
    ipc.config.id = constants.appid;
    let connectedSockets = [];

    ipc.serve(() => {
        debug('starting server... done.');

        ipc.server.on(constants.opcodes.syn, (data, socket) => {
            debug('server got syn: ' + data);
            debug('broadcasting syn: ' + data);
            ipc.server.broadcast(constants.opcodes.syn, data);
            stopServerAsync();
        });
    });

    debug('starting server...');
    ipc.server.start();
}

function stopServerAsync() {
    debug('stopping server...');
    setTimeout(() => {
        ipc.server.stop();
        debug('stopping server... done.');
    }, 0);
}
