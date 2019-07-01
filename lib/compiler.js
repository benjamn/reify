"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const getOption = require("./options.js").get;

const AV = require("./assignment-visitor.js");
const FastPath = require("./fast-path.js");
const IEV = require("./import-export-visitor.js");

const assignmentVisitor = new AV;
const importExportVisitor = new IEV;

const codeOfPound = "#".charCodeAt(0);
const shebangRegExp = /^#!.*/;

const utils = require("./utils.js");

exports.compile = function (code, options) {
  options = Object.assign(Object.create(null), options);

  if (code.charCodeAt(0) === codeOfPound) {
    code = code.replace(shebangRegExp, "");
  }

  const result = {
    code,
    ast: null,
    identical: false
  };

  // Quickly scan the code to find all possible indexes of import or
  // export keywords, tolerating some false positives.
  options.possibleIndexes =
    utils.findLikelyIndexes(code, ["import", "export"]);
  const mayHaveImportsOrExports = options.possibleIndexes.length > 0;

  const parse = getOption(options, "parse");
  if (getOption(options, "ast")) {
    result.ast = parse(code);
  }

  options.moduleAlias = getOption(options, "moduleAlias");

  if (
    ! mayHaveImportsOrExports &&
    options.moduleAlias === "module" &&
    getOption(options, "sourceType") !== "module"
  ) {
    // Let the caller know the result is no different from the input.
    result.identical = true;
    return result;
  }

  const rootPath = new FastPath(result.ast || parse(code));

  importExportVisitor.visit(rootPath, code, options);

  const magicString = importExportVisitor.magicString;
  result.identical = ! importExportVisitor.madeChanges;

  if (! result.identical) {
    assignmentVisitor.visit(rootPath, {
      exportedLocalNames: importExportVisitor.exportedLocalNames,
      magicString: magicString,
      modifyAST: importExportVisitor.modifyAST,
      moduleAlias: importExportVisitor.moduleAlias
    });
  }

  // Whether or not there were any changes, finalizeHoisting does some
  // important cleanup work, and should not be computationally expensive
  // when no changes need to be made.
  importExportVisitor.finalizeHoisting();

  result.code = magicString.toString();

  return result;
};

exports.transform = function (ast, options) {
  return dynRequire("./transform.js")(ast, options);
};

function makeUniqueId(prefix, source) {
  const scanRegExp = new RegExp("\\b" + prefix + "(\\d*)\\b", "g");
  let match, max = -1;

  while ((match = scanRegExp.exec(source))) {
    max = Math.max(max, +(match[1] || 0));
  }

  if (max >= 0) {
    return prefix + (max + 1);
  }

  return prefix;
}

exports.makeUniqueId = makeUniqueId;
