"use strict";module.export({a:()=>a,b:()=>b,x:()=>a,switchValues:()=>switchValues});let a = 5;
let b = 6;


function switchValues() {
  module.runSetters([a, b] = [b, a],["a","x","b"]);
}
