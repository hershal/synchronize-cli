'use strict';

const test = require('ava');
const uuid = require('../lib/uuid.js');

test('basic uuid', (t) => {
  const id = uuid();
  const str = /[a-zA-Z0-9]/;
  t.assert(str.test(id));
  t.is(id.length, 5);
});
