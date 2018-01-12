var namespace;
var types;
var cache;

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

[tryScoped,
 tryScopedLib,
 tryUnscoped
].some(function (fn) {
  try {
    fn();
  } catch (e) {
    return false;
  }

  var ibs = namespace.isBlockScoped;

  // Allow types.isBlockScoped to return true for import-related nodes.
  namespace.isBlockScoped = function (node) {
    return node &&
      types.isImportDeclaration(node) ||
      ibs.apply(this, arguments);
  };

  return true;
});

module.exports = function (context) {
  var compiler = require("reify/lib/compiler.js");
  var parse = require("reify/lib/parsers/babylon.js").parse;

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
