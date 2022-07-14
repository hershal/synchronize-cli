#!/usr/bin/env node

const AckServer = require('../lib/ack.js').AckServer;


const argv = require('yargs/yargs')(process.argv.slice(2))
      .number('count')
      .default('count', 1)
      .describe('count', 'Number of synchronize signals to wait for')

      .boolean('debug')
      .default('debug', false)
      .describe('debug', 'Print debug output to stdout')

      .boolean('kill')
      .default('kill', false)
      .describe('kill', 'Send kill command to everyone on the channel')

      .usage('Synchronize tasks on a signal.\n'+
             'Usage: $0 [--debug] [--kill] [--count=n] [channels...]')
      .epilog('Part of synchronize-cli.')
      .argv;



async function main() {
    const channels = argv._.length == 0 ? [undefined] : argv._;
    const count = argv.count;
    const debug = argv.debug;
    const kill = argv.kill;

    const config = {count, debug, kill};

    const servers = channels.map((channel) => new AckServer(process.pid, {...config, channel}))

    const promises = servers.map((s) => {
        setTimeout(() =>  {
            s.start().catch((err) => {
                console.log(err);
                process.exit(1);
            });
        }, 0);
    });

    process.on('SIGINT', () => {
        servers.forEach((s) => s.stop());
    });
}


main();
