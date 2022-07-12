#!/usr/bin/env node

const SynClient = require('../lib/syn.js').SynClient;

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

    const config = {count, channel, kill, debug};

    const client = new SynClient(process.pid, config);

    client.start();

    process.on('SIGINT', () => {
        client.stop();
    });
}


main();
