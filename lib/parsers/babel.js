"use strict";

const babelParser = require("@babel/parser");
const babelParserVersion = require("@babel/parser/package.json").version;

exports.options = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowUndeclaredExports: true,
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

function tolerantParse(code) {
  const arrayFrom = Array.from;
  // There is only one use of Array.from in the @babel/parser@7.4.x code,
  // Array.from(this.scope.undefinedExports), which determines whether the
  // parser complains prematurely about exporting identifiers that were
  // not declared in the current module scope. By returning an empty array
  // when the source argument is a Map, we can effectively disable that
  // error behavior, until https://github.com/babel/babel/pull/9864 is
  // released in @babel/parser@7.5.0.
  Array.from = function (source) {
    return source instanceof Map ? [] :
      arrayFrom.apply(this, arguments);
  };
  try {
    return parse(code);
  } finally {
    Array.from = arrayFrom;
  }
}

exports.parse = babelParserVersion.startsWith("7.4.") ? tolerantParse : parse;
