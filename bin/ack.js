'use strict';

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');


ipc.config.id = constants.appid;
ipc.config.retry = 1500;

ipc.serve(() => {
    ipc.server.on(constants.opcodes.syn, (data, socket) => {
        console.log('got syn: ' + data);
        ipc.server.stop();
    });
});

ipc.server.start();
