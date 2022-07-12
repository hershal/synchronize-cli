'use strict';

const test = require('ava');
const child_process = require('child_process');
const process = require('../lib/process.js');
const uuid = require('../lib/uuid.js');


function settle(ms) {
    if (ms === undefined) { ms = 250; }
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
            if (err) { rej(err); } else { res(); }
        });
        processes.push(child);
    });
}


/* Kill the tasks when we're done. We should get an unhandled exception error if
   something is still running and we never caught the exception. */
test.afterEach.always(t => { processes.forEach((p) => p.kill("SIGINT")); processes = []; });


test.serial('trigger race condition', async t => {
    t.timeout(10000)
    const uid = uuid();
    const r0 = run(`ack.js ${uid}`).catch((err) => { /* do nothing */ });
    await settle();

    /* grab the server */
    if (processes.length != 1) {
        t.fail();
    }
    const server = processes[0];

    const r1 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r2 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r3 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r4 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r5 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r6 = run(`ack.js ${uid}`).then(t.fail); await settle();

    /* server exists, one of the others becomes the server */
    server.kill('SIGINT');

    /* nobody should exit */
    await settleLong();

    r1.catch(() => {});
    r2.catch(() => {});
    r3.catch(() => {});
    r4.catch(() => {});
    r5.catch(() => {});
    r6.catch(() => {});
    t.pass();
});


test.serial('test multiple acks', async t => {
    t.timeout(20000);
    const uid = uuid();
    const promises = Array(6).fill(true);
    const count = (p) => p.reduce((a, c) => c == true ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid} --count=6`).then(() => promises[0] = false); await settle();
    const r1 = run(`ack.js ${uid} --count=5`).then(() => promises[1] = false); await settle();
    const r2 = run(`ack.js ${uid} --count=4`).then(() => promises[2] = false); await settle();
    const r3 = run(`ack.js ${uid} --count=3`).then(() => promises[3] = false); await settle();
    const r4 = run(`ack.js ${uid} --count=2`).then(() => promises[4] = false); await settle();
    const r5 = run(`ack.js ${uid} --count=1`).then(() => promises[5] = false); await settle();

    t.is(count(promises), 6);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 5);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 4);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 3);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 2);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 1);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 0);

    t.pass();
});


test.serial('test multiple acks with server handoff', async t => {
    t.timeout(20000);
    const uid = uuid();
    const promises = Array(6).fill(true);
    const count = (p) => p.reduce((a, c) => c == true ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid} --count=1`).then(() => promises[0] = false); await settle();
    const r1 = run(`ack.js ${uid} --count=2`).then(() => promises[1] = false); await settle();
    const r2 = run(`ack.js ${uid} --count=3`).then(() => promises[2] = false); await settle();
    const r3 = run(`ack.js ${uid} --count=4`).then(() => promises[3] = false); await settle();
    const r4 = run(`ack.js ${uid} --count=5`).then(() => promises[4] = false); await settle();
    const r5 = run(`ack.js ${uid} --count=6`).then(() => promises[5] = false); await settle();

    t.is(count(promises), 6);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 5);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 4);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 3);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 2);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 1);

    await run(`syn.js ${uid}`); await settle();
    t.is(count(promises), 0);

    t.pass();
});


test.serial('test syn with count', async t => {
    t.timeout(20000);
    const uid = uuid();
    const promises = Array(6).fill(true);
    const count = (p) => p.reduce((a, c) => c == true ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid} --count=6`).then(() => promises[0] = false); await settle();
    const r1 = run(`ack.js ${uid} --count=5`).then(() => promises[1] = false); await settle();
    const r2 = run(`ack.js ${uid} --count=4`).then(() => promises[2] = false); await settle();
    const r3 = run(`ack.js ${uid} --count=3`).then(() => promises[3] = false); await settle();
    const r4 = run(`ack.js ${uid} --count=2`).then(() => promises[4] = false); await settle();
    const r5 = run(`ack.js ${uid} --count=1`).then(() => promises[5] = false); await settle();

    t.is(count(promises), 6);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 4);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 2);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 0);

    t.pass();
});


test.serial('test syn with count with server handoff', async t => {
    t.timeout(20000);
    const uid = uuid();
    const promises = Array(6).fill(true);
    const count = (p) => p.reduce((a, c) => c == true ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid} --count=1`).then(() => promises[0] = false); await settle();
    const r1 = run(`ack.js ${uid} --count=2`).then(() => promises[1] = false); await settle();
    const r2 = run(`ack.js ${uid} --count=3`).then(() => promises[2] = false); await settle();
    const r3 = run(`ack.js ${uid} --count=4`).then(() => promises[3] = false); await settle();
    const r4 = run(`ack.js ${uid} --count=5`).then(() => promises[4] = false); await settle();
    const r5 = run(`ack.js ${uid} --count=6`).then(() => promises[5] = false); await settle();

    t.is(count(promises), 6);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 4);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 2);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 0);

    t.pass();
});


test.serial('test syn with count with server handoff 2', async t => {
    t.timeout(20000);
    const uid = uuid();
    const promises = Array(6).fill(true);
    const count = (p) => p.reduce((a, c) => c == true ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid} --count=1`).then(() => promises[0] = false); await settle();
    const r1 = run(`ack.js ${uid} --count=2`).then(() => promises[1] = false); await settle();
    const r2 = run(`ack.js ${uid} --count=3`).then(() => promises[2] = false); await settle();
    const r3 = run(`ack.js ${uid} --count=4`).then(() => promises[3] = false); await settle();
    const r4 = run(`ack.js ${uid} --count=5`).then(() => promises[4] = false); await settle();
    const r5 = run(`ack.js ${uid} --count=6`).then(() => promises[5] = false); await settle();

    t.is(count(promises), 6);

    await run(`syn.js ${uid} --count=5`); await settle();
    t.is(count(promises), 1);

    await run(`syn.js ${uid} --count=2`); await settle();
    t.is(count(promises), 0);

    t.pass();
});


test.serial('test syn with count with server handoff 3', async t => {
    t.timeout(20000);
    const uid = uuid();
    const promises = Array(6).fill(true);
    const count = (p) => p.reduce((a, c) => c == true ? a+1 : a, 0);

    const r0 = run(`ack.js ${uid} --count=1`).then(() => promises[0] = false); await settle();
    const r1 = run(`ack.js ${uid} --count=2`).then(() => promises[1] = false); await settle();
    const r2 = run(`ack.js ${uid} --count=3`).then(() => promises[2] = false); await settle();
    const r3 = run(`ack.js ${uid} --count=4`).then(() => promises[3] = false); await settle();
    const r4 = run(`ack.js ${uid} --count=5`).then(() => promises[4] = false); await settle();
    const r5 = run(`ack.js ${uid} --count=6`).then(() => promises[5] = false); await settle();

    t.is(count(promises), 6);

    await run(`syn.js ${uid} --count=10`); await settle();
    t.is(count(promises), 0);

    t.pass();
});
