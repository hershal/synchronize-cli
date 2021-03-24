#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('ack');

const args = process.argv.slice(2);
const topic = args.length == 0 ? 'default' : args[0];

ipc.config.id = process.pid;
ipc.config.retry = 1500;
ipc.config.logger = () => {};

startClientAsync();


function handleSyn(data, socket, cb) {
    if (data == topic) {
        cb(data, socket);
    }
}

function advertiseListen() {
    debug('listening for ' + topic);
}


function handleSynClient(data, socket) {
    debug('client got syn: ' + data);
    stopClientAsync();
}

function startClientAsync() {
    ipc.connectTo(constants.appid, () => {
        ipc.of[constants.appid].on('error', (err) => {
            ipc.disconnect(constants.appid);
            startServerAsync();
        });

        ipc.of[constants.appid].on('connect', () => {
            debug('connected');
            advertiseListen()
        });

        ipc.of[constants.appid].on(constants.opcodes.syn, (data, socket) => {
            handleSyn(data, socket, handleSynClient);
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
        advertiseListen();

        ipc.server.on(constants.opcodes.syn, (data, socket) => {
            handleSyn(data, socket, handleSynServer);
        });
    });

    debug('starting server...');
    ipc.server.start();
}

function handleSynServer(data, socket) {
    debug('server got syn: ' + data);
    debug('broadcasting syn: ' + data);
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
