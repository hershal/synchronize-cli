#!/usr/bin/env node

const SynClient = require('../lib/syn.js').SynClient;

const argv = require('yargs/yargs')(process.argv.slice(2))
      .number('count')
      .default('count', 1)
      .describe('count', 'Number of synchronize signals to send')

      .boolean('debug')
      .default('debug', false)
      .describe('debug', 'Print debug output to stdout')

      .boolean('kill')
      .default('kill', false)
      .describe('kill', 'Send kill command to everyone on the channel')

      .string('_')
      .describe('_', 'Channel to send signals on')

      .usage('$0 [--debug] [--kill] [--count=n] [channel]',
             'Synchronize tasks on a signal. Part of synchronize-cli.')
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
