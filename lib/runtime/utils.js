"use strict";

// This module should be compatible with PhantomJS v1, just like the other files
// in reify/lib/runtime. Node 4+ features like const/let and arrow functions are
// not acceptable here, and importing any npm packages should be contemplated
// with extreme skepticism.

var useSetPrototypeOf = typeof Object.setPrototypeOf === "function";
var useSymbol = typeof Symbol === "function";

var esStrKey = "__esModule";
var esSymKey = useSymbol ? Symbol.for(esStrKey) : null;
var useToStringTag = useSymbol && typeof Symbol.toStringTag === "symbol";
var useGetOwnPropDesc =
  typeof Object.getOwnPropertyDescriptor === "function";
var hasOwn = Object.prototype.hasOwnProperty;

exports.assign = function (target) {
  var argCount = arguments.length;
  var sourcesByKey = Object.create(null);

  for (var i = 0; i < argCount; ++i) {
    var source = arguments[i];
    if (isObjectLike(source)) {
      Object.keys(source).forEach(function (key) {
        sourcesByKey[key] = source;
      });
    }
  }

  Object.keys(sourcesByKey).forEach(function (key) {
    copyKey(key, target, sourcesByKey[key]);
  });

  return target;
};

function copyKey(key, target, source) {
  if (useGetOwnPropDesc) {
    var desc = Object.getOwnPropertyDescriptor(source, key);
    if (hasOwn.call(desc, "value")) {
      // If entry.exports[key] is a simple property, simply copy its value
      // over to entry.namespace[key] as a data property.
      target[key] = desc.value;
    } else {
      // Avoid triggering getters until necessary.
      desc.configurable = true;
      Object.defineProperty(target, key, desc);
    }
  } else {
    target[key] = source[key];
  }
}

exports.copyKey = copyKey;

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

function setPrototypeOf(object, proto) {
  if (useSetPrototypeOf) {
    Object.setPrototypeOf(object, proto);
  } else {
    object.__proto__ = proto;
  }
  return object;
}

exports.setPrototypeOf = setPrototypeOf;
