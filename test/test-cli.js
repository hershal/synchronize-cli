'use strict';

const test = require('ava');
const child_process = require('child_process');
const process = require('process');
const uuid = require('../lib/uuid');

process.env['DEBUG'] = '*';


function settle(ms) {
  if (ms === undefined) { ms = 50; }
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
test.afterEach.always(t => { processes.forEach((p) => p.kill("SIGTERM")); processes = []; });



test.serial('basic ack/syn', async t => {
  const r = run("ack.js");
  await settle();

  await run("syn.js");
  await r.then(t.pass);
});


test.serial('multiple ack', async t => {
  let promises = [];

  promises.push(run("ack.js"));
  await settle();
  promises.push(run("ack.js"));
  await settle();
  promises.push(run("ack.js"));
  await settle();

  const r = Promise.all(promises);

  await run("syn.js");
  await r.then(t.pass);
});


test.serial('basic ack/syn with keyword', async t => {
  const r = run("ack.js asdf");
  const f = r.then(t.fail);

  await settle();

  await run("syn.js");
  await settle();

  /* allow the process to die gracefully now */
  f.catch(() => {});

  /* r should not have finished */
  t.pass();
});


test.serial('basic multi ack/syn with keyword', async t => {
  const r0 = run("ack.js").then(t.fail);
  const r1 = run("ack.js single");

  await settle();

  await run("syn.js single");

  /* allow r0 to die gracefully now */
  r0.catch(() => {});

  await r1.then(t.pass);
});


test.serial('complex multi ack/syn with keyword', async t => {
  const r0 = run("ack.js").then(t.fail);

  /* Try to avoid race conditions */
  const r1 = run("ack.js multi");
  await settle();
  const r2 = run("ack.js multi");

  const p = Promise.all([r1, r2]).then(t.pass);

  await settle();
  await run("syn.js multi");

  /* allow the process to die gracefully now that we've set up the chain */
  r0.catch((e) => {});

  await p;
});


test.serial('trigger race condition', async t => {
    const id = uuid();
    const r0 = run(`DEBUG=* ack.js ${id}`).catch((err) => { /* do nothing */ });

    /* grab the server */
    if (processes.length != 1) {
        t.fail();
    }
    const server = processes[0];

    const r1 = run(`ack.js ${id}`).then(t.fail);
    const r2 = run(`ack.js ${id}`).then(t.fail);
    /* const r3 = run(`ack.js ${id}`).then(t.fail); */
    /* const r4 = run(`ack.js ${id}`).then(t.fail); */
    /* const r5 = run(`ack.js ${id}`).then(t.fail); */
    /* const r6 = run(`ack.js ${id}`).then(t.fail); */
    /* const r7 = run(`ack.js ${id}`).then(t.fail); */
    /* const r8 = run(`ack.js ${id}`).then(t.fail); */
    /* const r9 = run(`ack.js ${id}`).then(t.fail); */
    await settle();

    /* server exists, one of the others becomes the server */
    server.kill();

    /* nobody should exit */
    await settleLong();
    t.pass();
})



/* test.serial('basic ack with count', async t => { */
/*   const r0 = run("ack.js --count 1"); */
/*   await settle(); */
/*   const r1 = run("ack.js --count 2"); */
/*   await settle(); */
/*   const r2 = run("ack.js --count 3"); */
/*   await settle(); */

/*   await run("syn.js"); */
/*   await settle(); */
/*   console.log([r0, r1, r2]); */

/*   await run("syn.js"); */
/*   await settle(); */
/*   console.log([r0, r1, r2]); */

/*   r2.then(t.fail).catch(() => {}); */
/*   await Promise.all([r0, r1]).then(t.pass); */
/* }); */
