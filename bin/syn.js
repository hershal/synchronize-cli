#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('syn');


ipc.config.id = 'syn';
ipc.config.retry = 1500;
/* ipc.config.logger = () => {}; */
ipc.config.stopRetrying = true;

ipc.connectTo(constants.appid, () => {
    debug('connecting...');
    ipc.of[constants.appid].on('connect', () => {
        debug('connecting... done.');
        const data = 1;
        debug('sent syn: ' + data);
        ipc.of[constants.appid].emit(constants.opcodes.syn, data);
        debug('disconnecting...');
        setTimeout(() => {
            ipc.disconnect(constants.appid);
            debug('disconnecting... done.');
        }, 0);
    });
});

