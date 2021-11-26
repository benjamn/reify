"use strict";module.export({value:()=>value,reset:()=>reset,add:()=>add});var value = reset();

function reset() {
  return module.runSetters(value = 0,"value");
}

function add(x) {
  module.runSetters(value += x,"value");
};
