'use strict';

const test = require('ava');
const child_process = require('child_process');
const process = require('process');

process.env['DEBUG'] = '*';


function settle(ms) {
  if (ms === undefined) { ms = 100; }
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


function run(command) {
  return new Promise((res, rej) => {
    child_process.exec(`${__dirname}/../bin/${command}`, (err, stdout, stderr) => {
      if (err) { rej(err); } else { res(); }
    });
  });
}




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
  r.then(t.fail);

  await settle();

  await run("syn.js");
  await settle();

  /* r should not have finished */
  t.pass();
});


test.serial('basic multi ack/syn with keyword', async t => {
  const r0 = run("ack.js");
  const r1 = run("ack.js asdf");
  r0.then(t.fail);

  await settle();

  await run("syn.js asdf");
  await r1.then(t.pass);
});
