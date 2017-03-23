"use strict";

const hasOwn = Object.prototype.hasOwnProperty;
const entryMap = Object.create(null);
const utils = require("./utils.js");

function Entry(id) {
  // Same as module.id for this module.
  this.id = id;
  // The number of times this.runModuleSetters has been called.
  this.runCount = 0;
  // Setters for assigning to local variables in parent modules.
  this.setters = Object.create(null);
  // Getters for local variables exported from this module.
  this.getters = Object.create(null);
}

const Ep = Entry.prototype;

Entry.get = function (id) {
  return entryMap[id] || null;
};

Entry.getOrCreate = function (id) {
  return entryMap[id] = entryMap[id] || new Entry(id);
};

let keySalt = 0;
function makeUniqueKey() {
  return Math.random()
    .toString(36)
    // Add an incrementing salt to help track key ordering and also
    // absolutely guarantee we never return the same key twice.
    .replace("0.", ++keySalt + ":");
}

Ep.addSetters = function (parent, setters, key) {
  const entry = this;

  if (typeof key === "undefined") {
    // If no key was provided, make a new unique key that won't collide
    // with any other keys.
    key = makeUniqueKey();
  } else {
    // If a key was provided, make sure it is distinct from keys provided
    // by other parent modules.
    key = parent.id + ":" + key;
  }

  const names = Object.keys(setters);
  const nameCount = names.length;

  for (let i = 0; i < nameCount; ++i) {
    const name = names[i];
    const setter = setters[name];
    if (typeof setter === "function" &&
        // Ignore any requests for the exports.__esModule property."
        name !== "__esModule") {
      setter.parent = parent;
      (entry.setters[name] =
       entry.setters[name] || Object.create(null)
      )[key] = setter;
    }
  }
};

Ep.addGetters = function (getters) {
  const entry = this;
  const names = Object.keys(getters);
  const nameCount = names.length;

  for (let i = 0; i < nameCount; ++i) {
    const name = names[i];
    const getter = getters[name];
    if (typeof getter === "function" &&
        // Ignore any requests for the exports.__esModule property."
        name !== "__esModule") {
      // Should this throw if hasOwn.call(this.getters, name)?
      entry.getters[name] = getter;
    }
  }
};

function runModuleSetters(module) {
  const entry = entryMap[module.id];
  if (entry) {
    entry.runModuleSetters(module);
  }
}

function runModuleGetters(module) {
  const entry = entryMap[module.id];
  return entry ? entry.runModuleGetters(module) : 0;
}

Ep.runModuleGetters = function (module) {
  const entry = this;
  const names = Object.keys(entry.getters);
  const nameCount = names.length;

  for (let i = 0; i < nameCount; ++i) {
    entry.runGetter(module, names[i]);
  }
};

// Returns true iff the getter updated module.exports with a new value.
Ep.runGetter = function (module, name) {
  if (hasOwn.call(this.getters, name)) {
    try {
      // Update module.exports[name] with the current value so that CommonJS
      // require calls remain consistent with module.importSync.
      return module.exports[name] =
        this.getters[name].call(module);

    } catch (e) {
      // If the getter threw an exception, avoid updating module.exports
      // and return undefined.
    }
  }
};

// Called whenever module.exports might have changed, to trigger any
// setters associated with the newly exported values.
Ep.runModuleSetters = function (module) {
  const entry = this;
  const names = Object.keys(entry.setters);

  // Make sure module.exports is up to date before we call
  // module.getExportByName(name).
  entry.runModuleGetters(module);

  if (names.length === 0) {
    ++entry.runCount;
    return;
  }

  // Invoke the given callback once for every (setter, value, name) triple
  // that needs to be called. Note that forEachSetter does not call any
  // setters itself, only the given callback.
  function forEachSetter(callback, context) {
    names.forEach(function (name) {
      const setters = entry.setters[name];
      const keys = Object.keys(setters);
      const keyCount = keys.length;

      for (let k = 0; k < keyCount; ++k) {
        const key = keys[k];
        const value = module.getExportByName(name);

        if (name === "*") {
          const valueNames = Object.keys(value);
          const valueNameCount = valueNames.length;

          for (let v = 0; v < valueNameCount; ++v) {
            const valueName = valueNames[v];
            call(setters[key], value[valueName], valueName);
          }

        } else {
          call(setters[key], value, name);
        }
      }
    });

    function call(setter, value, name) {
      if (name === "__esModule") {
        // Ignore setters asking for module.exports.__esModule.
        return;
      }

      setter.last = setter.last || Object.create(null);

      if (! hasOwn.call(setter.last, name) ||
          setter.last[name] !== value) {
        // Only invoke the callback if we have not called this setter
        // (with a value of this name) before, or the current value is
        // different from the last value we passed to this setter.
        return callback.apply(context, arguments);
      }
    }
  }

  // Lazily-initialized object mapping parent module identifiers to parent
  // module objects whose setters we might need to run.
  let relevantParents;

  // Take snapshots of setter.parent.exports for any setters that we are
  // planning to call, so that we can later determine if calling the
  // setters modified any of those exports objects.
  forEachSetter(function (setter, value, name) {
    relevantParents = relevantParents || Object.create(null);
    relevantParents[setter.parent.id] = setter.parent;
    setter.call(module, setter.last[name] = value, name);
  });

  ++entry.runCount;

  if (! relevantParents) {
    return;
  }

  // If any of the setters updated the module.exports of a parent module,
  // or updated local variables that are exported by that parent module,
  // then we must re-run any setters registered by that parent module.

  const parentIDs = Object.keys(relevantParents);
  const parentIDCount = parentIDs.length;

  for (let i = 0; i < parentIDCount; ++i) {
    // What happens if relevantParents[parentIDs[id]] === module, or if
    // longer cycles exist in the parent chain? Thanks to our setter.last
    // bookkeeping above, the runModuleSetters broadcast will only proceed
    // as far as there are any actual changes to report.
    runModuleSetters(relevantParents[parentIDs[i]]);
  }
};

exports.Entry = Entry;
