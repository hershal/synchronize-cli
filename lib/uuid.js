'use strict';

module.exports = function (count) {
  if (count === undefined) { count = 5; }

  var _sym = 'abcdefghijklmnopqrstuvwxyz1234567890';
  var str = '';

  for(var i = 0; i < count; i++) {
    str += _sym[parseInt(Math.random() * (_sym.length))];
  }

  return str;
};
