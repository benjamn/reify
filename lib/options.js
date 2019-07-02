"use strict";

const hasOwn = Object.prototype.hasOwnProperty;
const defaultParser = require("./parsers/default.js");
const defaultOptions = {
  ast: false,
  // If not false, "use strict" will be added to any modules with at least
  // one import or export declaration.
  enforceStrictMode: true,
  generateLetDeclarations: false,
  avoidModernSyntax: false,
  sourceType: "unambiguous",
  moduleAlias: "module",
  dynamicImport: false,
  // Controls whether finalizeHoisting performs one-time-only transforms like
  // wrapping the module body in a function.
  finalCompilationPass: true,
  parse(code) {
    return defaultParser.parse(code);
  }
};

function get(options, name) {
  const result = hasOwn.call(options, name) ? options[name] : void 0;
  return result === void 0 ? defaultOptions[name] : result;
}

exports.get = get;

function setDefaults(options) {
  Object.assign(defaultOptions, options);
}

exports.setDefaults = setDefaults;
