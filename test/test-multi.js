'use strict';

const test = require('ava');
const child_process = require('child_process');
const uuid = require('../lib/uuid');


function settle(ms) {
  if (ms === undefined) { ms = 200; }
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


function settleLong(ms) {
    if (ms === undefined) { ms = 1500; }
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


var processes = [];

function run(command) {
  return new Promise((res, rej) => {
      const child = child_process.exec(`${__dirname}/../bin/${command}`, (err, stdout, stderr) => {
        /* console.log(stdout) */
        if (err) { rej(err); } else { res(); }
    });
    processes.push(child);
  });
}

/* Kill the tasks when we're done. We should get an unhandled exception error if
   something is still running and we never caught the exception. */
test.afterEach.always(t => { processes.forEach((p) => p.kill("SIGTERM")); processes = []; });



test.serial('ack listening on multiple channels', async t => {
    const uid = uuid();
    const uid2 = uuid();

    let resolved = false;
    const r = run(`ack.js ${uid} ${uid2}`).then(() => resolved = true); await settle();

    await run(`syn.js ${uid}`);
    await settle();
    t.is(resolved, false);

    await run(`syn.js ${uid2}`);
    await settle();
    t.is(resolved, true);

    r.then(t.pass);
});


test.serial('ack listening on multiple channels in reverse', async t => {
    const uid = uuid();
    const uid2 = uuid();

    let resolved = false
    const r = run(`ack.js ${uid} ${uid2}`).then(() => resolved = true); await settle();

    await run(`syn.js ${uid2}`);
    await settle();
    t.is(resolved, false);

    await run(`syn.js ${uid}`);
    await settle();
    t.is(resolved, true);

    r.then(t.pass);
});


test.serial('ack listening on multiple channels with count', async t => {
    const uid = uuid();
    const uid2 = uuid();
    const uid3 = uuid();

    let resolved = false;
    const r = run(`ack.js ${uid} ${uid2} ${uid3} --count 2`).then(() => resolved = true); await settle();

    await run(`syn.js ${uid}`);
    await settle();
    t.is(resolved, false);

    await run(`syn.js ${uid2}`);
    await settle();
    t.is(resolved, false);

    await run(`syn.js ${uid2}`);
    await settle();
    t.is(resolved, false);

    await run(`syn.js ${uid}`);
    await settle();
    t.is(resolved, false);

    await run(`syn.js ${uid3} --count 2`);
    await settle();
    t.is(resolved, true);

    r.then(t.pass);
});


test.serial('ack killing all servers on SIGINT', async t => {
    const uid = uuid();
    const uid2 = uuid();
    const uid3 = uuid();

    let resolved = false;
    /* should exit with exit code 1 on SIGINT */
    const r = run(`ack.js ${uid} ${uid2} ${uid3} --count 2`)
          .catch(() => resolved = true)
    await settle();

    t.is(resolved, false);

    processes.forEach((p) => p.kill("SIGINT"));

    await settle();

    t.is(resolved, true);

    r.then(t.pass);
});


/* TODO: what should we do on kill while ack is listening on multiple channels?

   We have a few options:
   1. Kill the entire ack command on all channels
   2. Kill just the ack server on that channel

   If (1), then we lose requests for synchronization on all channels. If (2),
   then we lose the exit code. Maybe --kill is too heavy a hammer here. Maybe
   propose an alternate, like --stop to stop just that channel. And then reserve
   --kill to kill all the acks everywhere. Still debating this...
 */
test.serial('ack killing all servers on kill signal', async t => {
    const uid = uuid();
    const uid2 = uuid();
    const uid3 = uuid();

    let resolved = false;
    /* should exit with exit code 1 */
    const r = run(`ack.js ${uid} ${uid2} ${uid3} --count 2`)
          .catch(() => resolved = true)
    await settle();
    t.is(resolved, false);

    /* NOTE: Currently any --kill will kill the entire server */
    /* await run(`syn.js --kill ${uid}`); */
    /* await settle(); */
    /* t.is(resolved, false); */

    /* await run(`syn.js --kill ${uid2}`); */
    /* await settle(); */
    /* t.is(resolved, false); */

    await run(`syn.js --kill ${uid3}`);
    await settle();
    t.is(resolved, true);

    r.then(t.pass);
});
