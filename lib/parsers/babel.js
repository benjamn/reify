"use strict";

// Prefer the new @babel/parser package, but fall back to babylon if
// that's what's available.
const babelParser = function () {
  try {
    return require("@babel/parser");
  } catch (e) {
    return require("babylon");
  }
}();

exports.options = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: [
    "*", "flow", "jsx",
    // The "*" glob no longer seems to include the following plugins:
    "asyncGenerators",
    "bigInt",
    "classPrivateMethods",
    "classPrivateProperties",
    "classProperties",
    // Since the "decorators" plugin cannot be used together with the
    // "decorators-legacy" plugin, and one of them must be used if the
    // @babel/plugin-proposal-decorators Babel plugin is used, it's not
    // safe to blindly include the "decorators" plugin here.
    // "decorators",
    "doExpressions",
    "dynamicImport",
    "exportDefaultFrom",
    "exportExtensions",
    "exportNamespaceFrom",
    "functionBind",
    "functionSent",
    "importMeta",
    "nullishCoalescingOperator",
    "numericSeparator",
    "objectRestSpread",
    "optionalCatchBinding",
    "optionalChaining",
    // https://github.com/babel/babel/pull/8196
    ["pipelineOperator", {
      proposal: "minimal"
    }],
    "throwExpressions",
    // Other experimental plugins that we could enable:
    // https://babeljs.io/docs/en/next/babel-parser.html#plugins
  ],
  sourceType: "module",
  strictMode: false
};

function parse(code) {
  return babelParser.parse(code, exports.options);
}

exports.parse = parse;
