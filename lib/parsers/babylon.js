"use strict";

const babylon = require("babylon");

exports.options = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  plugins: [
    "*", "flow", "jsx",
    // The "*" glob no longer seems to include the following plugins:
    "asyncGenerators",
    "classProperties",
    "decorators",
    "doExpressions",
    "dynamicImport",
    "exportExtensions",
    "functionBind",
    "functionSent",
    "objectRestSpread",
    // Other experimental plugins that we could enable:
    // https://github.com/babel/babylon#plugins
  ],
  sourceType: "module",
  strictMode: false
};

function parse(code) {
  return babylon.parse(code, exports.options);
}

exports.parse = parse;
