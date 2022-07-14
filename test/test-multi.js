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
