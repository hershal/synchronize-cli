'use strict';

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const fs = require('fs');

ipc.config.id = process.pid;
ipc.config.retry = 1500;
ipc.config.logger = () => {};
ipc.config.unlink = false;

ipc.connectTo(constants.appid, () => {
    ipc.of[constants.appid].on('error', (err) => {
        console.log('no server found.');
        ipc.disconnect(constants.appid);
        unlinkServer();
        startServer();
    });

    ipc.of[constants.appid].on('connect', () => {
        console.log('server found');
        ipc.disconnect(constants.appid);
        startServer();
    });

    ipc.of[constants.appid].on(constants.opcodes.syn, (data, socket) => {
        console.log('client got syn: ' + data);
        console.log('exiting');
        ipc.disconnect(constants.appid);
    });
});


function unlinkServer() {
    if (fs.existsSync(constants.socketpath)) {
        fs.unlinkSync(constants.socketpath);
    }
}


function startServer() {
    ipc.config.id = constants.appid;
    let connectedSockets = [];

    ipc.serve(constants.socketpath, () => {
        console.log('starting server... done.');

        ipc.server.on(constants.opcodes.syn, (data, socket) => {
            console.log('server got syn: ' + data);
            ipc.server.emit(socket, constants.opcodes.syn, 1);
        });
    });

    console.log('starting server...');
    ipc.server.start();
}

function stopServer() {
    console.log('stopping server...');
    setTimeout(() => {
        ipc.server.stop();
        console.log('stopping server... done.');
    }, 0);
}
