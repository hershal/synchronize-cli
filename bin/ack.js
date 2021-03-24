#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');


ipc.config.id = process.pid;
ipc.config.retry = 1500;
ipc.config.logger = () => {};

startClientAsync();


function startClientAsync() {
    ipc.connectTo(constants.appid, () => {
        ipc.of[constants.appid].on('error', (err) => {
            console.log('no server found.');
            ipc.disconnect(constants.appid);
            startServerAsync();
        });

        ipc.of[constants.appid].on('connect', () => {
            console.log('connected to server.');
        });

        ipc.of[constants.appid].on(constants.opcodes.syn, (data, socket) => {
            console.log('client got syn: ' + data);
            stopClientAsync();
        });
    });
}

function stopClientAsync() {
    console.log('stopping client...');
    setTimeout(() => {
        ipc.disconnect(constants.appid);
        console.log('stopping client... done.');
    }, 0);
}


function startServerAsync() {
    ipc.config.id = constants.appid;
    let connectedSockets = [];

    ipc.serve(() => {
        console.log('starting server... done.');

        ipc.server.on(constants.opcodes.syn, (data, socket) => {
            console.log('server got syn: ' + data);
            console.log('broadcasting syn...');
            ipc.server.broadcast(constants.opcodes.syn, 1);
            console.log('broadcasting syn... done.');
            stopServerAsync();
        });
    });

    console.log('starting server...');
    ipc.server.start();
}

function stopServerAsync() {
    console.log('stopping server...');
    setTimeout(() => {
        ipc.server.stop();
        console.log('stopping server... done.');
    }, 0);
}
