"use strict";module.export({default:()=>f,check:()=>check});var strictEqual;module.link("assert",{strictEqual(v){strictEqual=v}},0);

const obj = {};

function f() {
  return obj;
}

function check(g) {
  strictEqual(f, g);
  strictEqual(f(), obj);
  strictEqual(g(), obj);
}
