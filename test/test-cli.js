'use strict';

const test = require('ava');
const child_process = require('child_process');
const process = require('process');


process.env['DEBUG'] = '*';


function settle(ms) {
  if (ms === undefined) { ms = 50; }
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
test.after(t => { processes.forEach((p) => p.kill("SIGINT")); });



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
  const r0 = run("ack.js").then(t.fail);;
  const r1 = run("ack.js asdf");

  await settle();

  await run("syn.js asdf");

  /* allow r0 to die gracefully now */
  r0.catch(() => {});

  await r1.then(t.pass);
});


test.serial('complex multi ack/syn with keyword', async t => {
  const r0 = run("ack.js").then(t.fail);
  const r1 = run("ack.js asdf");

  /* avoid the race condition for r1 and r2 */
  const r2 = await settle().then(run("ack.js asdf"));

  await settle();

  await run("syn.js asdf");

  /* allow the process to die gracefully now that we've set up the chain */
  r0.catch((e) => {});

  await Promise.all([r1, r2]).then(t.pass);
});
