var assert = require("assert");
var namespace;
var ibsPropertyName = "isBlockScoped";
var types;
var cache;

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

  var wrapped = namespace[ibsPropertyName];
  assert.strictEqual(typeof wrapped, "function")

  // Allow types.isBlockScoped to return true for import-related nodes.
  var wrapper = namespace[ibsPropertyName] = function (node) {
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
  var compiler = require("reify/lib/compiler.js");
  var parse = require("reify/lib/parsers/babel.js").parse;

  return {
    visitor: {
      Program: function (path) {
        var transformOptions = {
          parse: parse
        };

        var code = path.hub.file.code;
        if (typeof code === "string") {
          transformOptions.moduleAlias =
            compiler.makeUniqueId("module", code);
        }

        var result = compiler.transform(
          path.node,
          Object.assign(transformOptions, this.opts)
        );

        // If the Reify compiler made any changes, invalidate all existing
        // Scope objects, so that any variable binding changes made by
        // compiler.transform will be reflected accurately.
        if (! result.identical) {
          cache.clearScope();
        }
      }
    }
  };
};
