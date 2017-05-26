"use strict";

// This module should be compatible with PhantomJS v1, just like the other files
// in reify/lib/runtime. Node 4+ features like const/let and arrow functions are
// not acceptable here, and importing any npm packages should be contemplated
// with extreme skepticism.

var hasOwn = Object.prototype.hasOwnProperty;
var useSymbol = typeof Symbol === "function";
var esStrKey = "__esModule";
var esSymKey = useSymbol ? Symbol.for(esStrKey) : null;
var useToStringTag = useSymbol && typeof Symbol.toStringTag === "symbol";

if (typeof Object.assign !== "function") {
  Object.assign = function (target) {
    var argCount = arguments.length;
    for (var i = 0; i < argCount; ++i) {
      var source = arguments[i];
      if (utils.isObjectLike(source)) {
        Object.keys(source).forEach(function (key) {
          target[key] = source[key];
        });
      }
    }
    return target;
  };
}

exports.assign = Object.assign;

function getESModule(exported) {
  if (isObjectLike(exported)) {
    if (useSymbol && hasOwn.call(exported, esSymKey)) {
      return !! exported[esSymKey];
    }

    if (hasOwn.call(exported, esStrKey)) {
      return !! exported[esStrKey];
    }
  }

  return false;
}

exports.getESModule = getESModule;

function setESModule(exported) {
  if (isObjectLike(exported)) {
    if (useSymbol) {
      exported[esSymKey] = true;
    } else {
      Object.defineProperty(exported, esStrKey, {
        configurable: true,
        enumerable: false,
        value: true,
        writable: false
      });
    }
  }
}

exports.setESModule = setESModule;

function isObject(value) {
  return typeof value === "object" && value !== null;
}

exports.isObject = isObject;

function isObjectLike(value) {
  var type = typeof value;
  return type === "function" || (type === "object" && value !== null);
}

exports.isObjectLike = isObjectLike;

function createNamespace() {
  var namespace = Object.create(null);

  if (useToStringTag) {
    Object.defineProperty(namespace, Symbol.toStringTag, {
      value: "Module",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  return namespace;
}

exports.createNamespace = createNamespace;
