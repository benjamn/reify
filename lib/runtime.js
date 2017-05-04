"use strict";

var utils = require("./utils.js");

var Entry = require("./entry.js");

exports.enable = function (mod) {
  if (typeof mod.importSync !== "function" ||
      typeof mod.export !== "function") {
    mod.export = moduleExport;
    mod.importSync = moduleImport;
    mod.runModuleSetters = runModuleSetters;
    return true;
  }

  return false;
};

// If key is provided, it will be used to identify the given setters so
// that they can be replaced if module.importSync is called again with the
// same key. This avoids potential memory leaks from import declarations
// inside loops. The compiler generates these keys automatically (and
// deterministically) when compiling nested import declarations.
function moduleImport(id, setters, key) {
  utils.setESModule(this.exports);
  var exports = this.require(id);
  if (utils.isObject(setters)) {
    Entry.getOrCreate(exports).addSetters(this, setters, key);
  }
}

// Register getter functions for local variables in the scope of an export
// statement. The keys of the getters object are exported names, and the
// values are functions that return local values.
function moduleExport(getters) {
  utils.setESModule(this.exports);
  var entry = Entry.getOrCreate(this.exports);

  if (utils.isObject(getters)) {
    entry.addGetters(getters);
  }

  if (this.loaded) {
    // If the module has already been evaluated, then we need to trigger
    // another round of entry.runModuleSetters calls, which begins by
    // calling entry.runModuleGetters(module).
    entry.runSetters();
  }
}

// Platform-specific code should find a way to call this method whenever
// the module system is about to return module.exports from require. This
// might happen more than once per module, in case of dependency cycles,
// so we want Module.prototype.runModuleSetters to run each time.
function runModuleSetters(valueToPassThrough) {
  var entry = Entry.get(this.exports);
  if (entry !== null) {
    entry.runSetters();
  }

  // Assignments to exported local variables get wrapped with calls to
  // module.runModuleSetters, so module.runModuleSetters returns the
  // valueToPassThrough parameter to allow the value of the original
  // expression to pass through. For example,
  //
  //   export var a = 1;
  //   console.log(a += 3);
  //
  // becomes
  //
  //   module.export("a", () => a);
  //   var a = 1;
  //   console.log(module.runModuleSetters(a += 3));
  //
  // This ensures module.runModuleSetters runs immediately after the
  // assignment, and does not interfere with the larger computation.
  return valueToPassThrough;
}
