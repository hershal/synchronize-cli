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



test.serial('basic ack/syn', async t => {
  const uid = uuid();

  const r = run(`ack.js ${uid}`);
  await settle();

  await run(`syn.js ${uid}`);
  await r.then(t.pass);
});


test.serial('multiple ack', async t => {
  const uid = uuid();
  let promises = [];

  promises.push(run(`ack.js ${uid}`));
  await settle();
  promises.push(run(`ack.js ${uid}`));
  await settle();
  promises.push(run(`ack.js ${uid}`));
  await settle();

  const r = Promise.all(promises);

  await run(`syn.js ${uid}`);
  await r.then(t.pass);
});


test.serial('basic ack/syn with keyword', async t => {
  const uid = uuid();
  const uid2 = uuid();

  const r = run(`ack.js ${uid}`);
  const f = r.then(t.fail);

  await settle();

  await run(`syn.js ${uid2}`);
  await settle();

  /* allow the process to die gracefully now */
  f.catch(() => {});

  /* r should not have finished */
  t.pass();
});


test.serial('basic multi ack/syn with keyword', async t => {
  const uid = uuid();
  const uid2 = uuid();

  const r0 = run(`ack.js ${uid}`).then(t.fail);
  const r1 = run(`ack.js ${uid2}`);

  await settle();

  await run(`syn.js ${uid2}`);

  /* allow r0 to die gracefully now */
  r0.catch(() => {});

  await r1.then(t.pass);
});


test.serial('complex multi ack/syn with keyword', async t => {
  const uid = uuid();
  const uid2 = uuid();

  const r0 = run(`ack.js ${uid}`).then(t.fail);

  /* Try to avoid race conditions */
  const r1 = run(`ack.js ${uid2}`);
  await settle();
  const r2 = run(`ack.js ${uid2}`);

  const p = Promise.all([r1, r2]).then(t.pass);

  await settle();
  await run(`syn.js ${uid2}`);

  /* allow the process to die gracefully now that we've set up the chain */
  r0.catch((e) => {});

  await p;
});


test.serial('basic ack with count', async t => {
    const uid = uuid();

    const r0 = run(`ack.js ${uid} --count 1`);
    await settle();
    const r1 = run(`ack.js ${uid} --count 2`);
    await settle();
    const r2 = run(`ack.js ${uid} --count 3`);
    await settle();

    await run(`syn.js ${uid}`);
    await settle();

    await run(`syn.js ${uid}`);
    await settle();

    r2.then(t.fail).catch(() => {});
    await Promise.all([r0, r1]).then(t.pass);
});


test.serial('basic ack with count 2', async t => {
    const uid = uuid();

    const status = [0, 0, 0];
    const count = () => status.reduce((a, b) => a + b, 0);

    const r0 = run(`ack.js ${uid} --count 2`).then(() => status[0] = 1); await settle();
    const r1 = run(`ack.js ${uid} --count 2`).then(() => status[1] = 1); await settle();
    const r2 = run(`ack.js ${uid} --count 3`).then(() => status[2] = 1); await settle();

    t.is(count(), 0);

    await run(`syn.js ${uid} --count 2`);
    await settle();

    t.is(count(), 2);

    await run(`syn.js ${uid}`);
    await settle();

    t.is(count(), 3);

    await Promise.all([r0, r1, r2]).then(t.pass);
});


test.serial('syn to kill ack servers', async t => {
    const uid = uuid();

    const promises = Array(3).fill('promise')
    const count = (p) => p.reduce((a, c) => c === 'rejected' ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid}`).catch(() => promises[0] = 'rejected'); await settle();
    const r1 = run(`ack.js ${uid}`).catch(() => promises[1] = 'rejected'); await settle();
    const r2 = run(`ack.js ${uid}`).catch(() => promises[2] = 'rejected'); await settle();

    await run(`syn.js --kill ${uid}`);
    await settleLong();

    t.is(count(promises), 3);
    t.pass();
});


test.serial('ack to kill ack servers', async t => {
    const uid = uuid();

    const promises = Array(3).fill('promise')
    const count = (p) => p.reduce((a, c) => c === 'rejected' ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid}`).catch(() => promises[0] = 'rejected'); await settle();
    const r1 = run(`ack.js ${uid}`).catch(() => promises[1] = 'rejected'); await settle();
    const r2 = run(`ack.js ${uid}`).catch(() => promises[2] = 'rejected'); await settle();

    await run(`ack.js --kill ${uid}`);
    await settleLong();

    t.is(count(promises), 3);
    t.pass();
});
