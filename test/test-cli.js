'use strict';

const test = require('ava');
const child_process = require('child_process');
const process = require('process');

process.env['DEBUG'] = '*';


function wait(ms) {
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
  await wait();

  await run("syn.js");
  await r.then(t.pass);
});


test.serial('multiple ack', async t => {
  let promises = [];

  promises.push(run("ack.js"));
  await wait();
  promises.push(run("ack.js"));
  await wait();
  promises.push(run("ack.js"));
  await wait();

  const r = Promise.all(promises);

  await run("syn.js");
  await r.then(t.pass);
});
