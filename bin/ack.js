#!/usr/bin/env node

const AckServer = require('../lib/ack.js').AckServer;


const argv = require('yargs/yargs')(process.argv.slice(2))
      .default('count', 1)
      .argv;



function main() {
    const channel = argv._[0];
    const count = argv.count;

    const server = new AckServer(process.pid, channel, count);
    server.start();
}


main();
