var namespace;
var types;

function tryScoped() {
  namespace = require("@babel/types");
  types = require("@babel/types");
}

function tryScopedLib() {
  namespace = require("@babel/types/lib/validators");
  types = require("@babel/types");
}

function tryUnscoped() {
  namespace = require("babel-types/lib/validators");
  types = require("babel-types");
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
  var t = types || context.types;

  function removeLiveBindingUpdateViolations(scope) {
    Object.keys(scope.bindings).forEach(function (name) {
      var b = scope.bindings[name];
      // Ignore constant violations from inside module.import(id, {...})
      // callback functions, since they are necessary for updating
      // imported symbols to simulate live bindings. The beauty of this
      // solution is that babel-plugin-check-es2015-constants will still
      // forbid any other reassignments of imported symbols, which
      // enforces the const-ness of the live-bound variables. The
      // Array#{splice,forEach,push} idiom is similar to Array#filter,
      // except it preserves the original array object.
      b.constantViolations.splice(0).forEach(function (cv) {
        if (false && ! isPartOfImportMethodCall(cv)) {
          b.constantViolations.push(cv);
        }
      });
    });
  }

  function isPartOfImportMethodCall(path) {
    for (var path = path.scope.path;
         path && ! t.isStatement(path.node);
         path = path.parentPath) {
      if (isImportCallExpression(path.node)) {
        return true;
      }
    }
  }

  function isImportCallExpression(node) {
    return t.isCallExpression(node) &&
      t.isMemberExpression(node.callee) &&
      ! node.callee.computed &&
      t.isIdentifier(node.callee.property) &&
      // Note that we don't check if node.callee.object is the `module`
      // identifier, because we may want to remap that reference to a
      // unique temporary variable, which would make it difficult to know
      // what the variable name should be.
      ["import", "importSync", "watch"].indexOf(
        node.callee.property.name
      ) >= 0
  }

  return {
    visitor: {
      Scope: {
        enter: function (path) {
          removeLiveBindingUpdateViolations(path.scope);
        },

        exit: function (path) {
          var hasModuleBindings = Object.keys(
            path.scope.bindings
          ).some(function (name) {
            return path.scope.bindings[name].kind === "module";
          });

          if (hasModuleBindings) {
            // If the Scope previously had "module" bindings, we should
            // have removed/converted them when calling compiler.transform
            // in the Program visitor, so we need to re-crawl the Scope to
            // fix the bindings.
            path.scope.crawl();
            removeLiveBindingUpdateViolations(path.scope);
          }
        }
      },

      Program: function (path) {
        var transformOptions = {
          parse: parse
        };

        var code = path.hub.file.code;
        if (typeof code === "string") {
          transformOptions.moduleAlias =
            compiler.makeUniqueId("module", code);
        }

        compiler.transform(
          path.node,
          Object.assign(transformOptions, this.opts)
        );
      }
    }
  };
};
