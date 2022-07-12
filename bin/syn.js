#!/usr/bin/env node

const ipc = require('node-ipc');
const constants = require('../lib/constants.js');
const debug = require('debug')('syn');
const argv = require('yargs/yargs')(process.argv.slice(2))
      .default('count', 1)
      .argv;

const channel = argv._.length === 0 ? constants.appid : argv._[0];
const count = argv.count;

ipc.config.id = 'syn';
ipc.config.retry = 1500;
ipc.config.logger = () => {};
ipc.config.stopRetrying = count;

let pause = false;
let kill = false;
connect();

function connect() {
    ipc.connectTo(channel, () => {
        debug('channel: ' + channel);
        debug('connecting...');

        ipc.of[channel].on('connect', () => {
            if (kill == true) { return; }

            debug('connecting... done.');
            if (pause == true) {
                debug('unpausing')
                pause = false;
            } else {
                debug('initiating sendSyn');
                setTimeout(() => sendSyn(count), 0);
            }
        });

        ipc.of[channel].on('disconnect', () => {
            debug('got disconnect');
        })

        ipc.of[channel].on(constants.opcodes.stop, () => {
            if (kill == true) { return; }

            debug('got stop, disconnecting and reconnecting');
            debug('pausing')

            pause = true;

            ipc.disconnect(channel);
            setTimeout(() => connect(), 100);
        })

        ipc.of[channel].on('error', () => {
            if (kill == true) { return; }

            kill = true;
            debug('connecting... failed: no server found. Killing.');
        });
    });

}


function sendSyn(count) {
    if (kill == true) { return; }

    if (count > 0) {
        const newcount = count - 1;
        const data = 1;

        if (pause) {
            debug(`sendSyn: waiting with count: ${count}`);
            setTimeout(() => sendSyn(count), 1000);
        } else {
            debug(`sendSyn: sent: ${data}, count: ${count} -> ${newcount}`);
            ipc.of[channel].emit(constants.opcodes.syn, data);
            setTimeout(() => sendSyn(newcount), 1000);
        }
    } else {
        debug('sendSyn: disconnecting...');
        setTimeout(() => {
            ipc.disconnect(channel);
            debug('sendSyn: disconnecting... done.');
        }, 0);
    }
}
