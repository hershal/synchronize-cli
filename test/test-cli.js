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


let processes = [];
let processes_exited = [];

function run(command) {
    return new Promise((res, rej) => {
        const idx = processes_exited.length;
        const child = child_process.exec(`${__dirname}/../bin/${command}`, (err, stdout, stderr) => {
            /* console.log(stdout) */
            if (err) {
                processes_exited[idx] = true;
                rej(err);
            } else {
                processes_exited[idx] = true;
                res();
            }
        });
        processes.push(child);
        processes_exited.push(false);
    });
}

/* Kill the tasks when we're done. We should get an unhandled exception error if
   something is still running and we never caught the exception. */
test.after(t => {
    const all_exited = processes_exited.every((el) => el === true);
    processes.forEach((p) => p.kill("SIGTERM"));
    t.is(all_exited, true);
});



test('basic ack/syn', async t => {
  const uid = uuid();

  const r = run(`ack.js ${uid}`);
  await settle();

  await run(`syn.js ${uid}`);
  await r.then(t.pass);
});


test('multiple ack', async t => {
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


test('basic ack/syn with keyword', async t => {
    const uid = uuid();
    const uid2 = uuid();

    let exited = false;
    const r = run(`ack.js ${uid}`).then(() => exited = true);
    await settle();
    t.is(exited, false);

    await run(`syn.js ${uid2}`);
    await settle();
    t.is(exited, false);

    await run(`syn.js ${uid}`);
    await settle();
    t.is(exited, true);

    r.then(() => t.pass);
});


test('basic multi ack/syn with keyword', async t => {
    const uid = uuid();
    const uid2 = uuid();

    const exited = [false, false];
    const r0 = run(`ack.js ${uid}`).then(() => exited[0] = true);
    const r1 = run(`ack.js ${uid2}`).then(() => exited[1] = true);

    await settle();

    await run(`syn.js ${uid2}`);
    t.deepEqual(exited, [false, true])

    await run(`syn.js ${uid}`);
    t.deepEqual(exited, [true, true])

    Promise.all([r0, r1]).then(t.pass);
});


test('complex multi ack/syn with keyword', async t => {
    const uid = uuid();
    const uid2 = uuid();

    const exited = [false, false, false];
    const r0 = run(`ack.js ${uid}`).then(() => exited[0] = true);

    /* Try to avoid race conditions */
    const r1 = run(`ack.js ${uid2}`).then(() => exited[1] = true);
    await settle();
    const r2 = run(`ack.js ${uid2}`).then(() => exited[2] = true);

    await settle();
    await run(`syn.js ${uid2}`);
    t.deepEqual(exited, [false, true, true]);

    await run(`syn.js ${uid}`);
    t.deepEqual(exited, [true, true, true]);

    Promise.all([r0, r1, r2]).then(t.pass);
});


test('basic ack with count', async t => {
    const uid = uuid();

    const exited = [false, false, false];
    const r0 = run(`ack.js ${uid} --count 1`).then(() => exited[0] = true);
    await settle();
    const r1 = run(`ack.js ${uid} --count 2`).then(() => exited[1] = true);
    await settle();
    const r2 = run(`ack.js ${uid} --count 3`).then(() => exited[2] = true);
    await settle();

    await run(`syn.js ${uid}`);
    await settle();
    t.deepEqual(exited, [true, false, false]);

    await run(`syn.js ${uid}`);
    await settle();
    t.deepEqual(exited, [true, true, false]);

    await run(`syn.js ${uid}`);
    await settle();
    t.deepEqual(exited, [true, true, true]);

    Promise.all([r0, r1, r2]).then(t.pass);
});


test('basic ack with count 2', async t => {
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


test('syn to kill ack servers', async t => {
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


test('ack to kill ack servers', async t => {
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
