'use strict';

module.exports.appid = 'com.hershal.announce-cli';
module.exports.socketpath = '/tmp/com.hershal.announce.socket';
module.exports.opcodes = {
    syn: 'syn',
    register: 'register',
    deregister: 'deregister',
    pids: 'pids',
    stop: 'stop',
    kill: 'kill'
};
