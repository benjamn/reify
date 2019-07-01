"use strict";

const assert = require("assert");
let namespace;
let ibsPropertyName = "isBlockScoped";
let types;
let cache;

function tryScopedLibDirect() {
  namespace = require("@babel/types/lib/validators/isBlockScoped");

  // If the above import succeeded, then we should replace the .default
  // property of the isBlockScoped module, instead of .isBlockScoped.
  ibsPropertyName = "default";

  types = types || require("@babel/types");
  cache = cache || require("@babel/traverse").default.cache;
}

function tryScoped() {
  namespace = require("@babel/types");
  types = types || require("@babel/types");
  cache = cache || require("@babel/traverse").default.cache;
}

function tryScopedLib() {
  namespace = require("@babel/types/lib/validators");
  types = types || require("@babel/types");
  cache = cache || require("@babel/traverse").default.cache;
}

function tryUnscoped() {
  namespace = require("babel-types/lib/validators");
  types = types || require("babel-types");
  cache = cache || require("babel-traverse").default.cache;
}

[tryScopedLibDirect,
 tryScoped,
 tryScopedLib,
 tryUnscoped
].some(function (fn) {
  try {
    fn();
  } catch (e) {
    return false;
  }

  const wrapped = namespace[ibsPropertyName];
  assert.strictEqual(typeof wrapped, "function")

  // Allow types.isBlockScoped to return true for import-related nodes.
  const wrapper = namespace[ibsPropertyName] = function (node) {
    return node &&
      types.isImportDeclaration(node) ||
      wrapped.apply(this, arguments);
  };

  // The wrapping can fail if namespace[ibsPropertyName] is a non-writable
  // property (such as a getter function).
  if (namespace[ibsPropertyName] !== wrapper) {
    throw new Error(
      "Unable to patch @babel/types isBlockScoped function"
    );
  }

  return true;
});

module.exports = function (context) {
  const compiler = require("../lib/compiler.js");
  const transformOptions = {
    parse: require("../lib/parsers/babel.js").parse
  };

  let madeChanges = false;
  function transform(node) {
    const result = compiler.transform(node, transformOptions);
    if (! result.identical) {
      madeChanges = true;
      // If the Reify compiler made any changes, invalidate all existing
      // Scope objects, so that any variable binding changes made by
      // compiler.transform will be reflected accurately.
      cache.clearScope();
    }
    return result;
  }

  return {
    visitor: {
      Program: {
        enter(path) {
          const code = path.hub.file.code;
          if (typeof code === "string") {
            transformOptions.moduleAlias =
              compiler.makeUniqueId("module", code);
          }
          transformOptions.finalCompilationPass = false;
          Object.assign(transformOptions, this.opts);
          transform(path.node);
        },

        exit(path) {
          transformOptions.finalCompilationPass = true;
          const ast = transform(path.node).ast;
          assert.strictEqual(ast.type, "Program");
        }
      }
    }
  };
};
