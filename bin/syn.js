'use strict';

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');


ipc.config.id = 'syn';
ipc.config.retry = 1500;

ipc.connectTo(constants.appid, () => {
    ipc.of[constants.appid].on('connect', (data) => {
        ipc.of[constants.appid].emit(constants.opcodes.syn, 1);
        ipc.disconnect(constants.appid);
    });
});

