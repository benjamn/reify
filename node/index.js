"use strict";

const runtime = require("../lib/runtime");
const setDefaults = require("../lib/options").setDefaults;
const Module = module.constructor;

Module.prototype.resolve = function (id) {
  return Module._resolveFilename(id, this);
};

let isDefaultsSet = false;
const parentModule = module.parent || __non_webpack_module__.parent;

module.exports = (options) => {
  if (! isDefaultsSet) {
    setDefaults(options);
    isDefaultsSet = true;
  }
};

require("./compile-hook.js");
require("./repl-hook.js");

runtime.enable(parentModule);
