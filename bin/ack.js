#!/usr/bin/env node

const AckServer = require('../lib/ack.js').AckServer;


const argv = require('yargs/yargs')(process.argv.slice(2))
      .default('count', 1)
      .boolean('debug')
      .boolean('kill')
      .argv;



async function main() {
    const channel = argv._[0];
    const count = argv.count;
    const debug = argv.debug;
    const kill = argv.kill;

    const config = {channel, count, debug, kill};

    const server = new AckServer(process.pid, config);
    const promise = server.start();

    process.on('SIGINT', () => {
        server.stop();
    });

    promise.catch((err) => {
        console.log(err);
        process.exit(1);
    });
}


main();
