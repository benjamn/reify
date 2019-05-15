"use strict";

const Parser = require("acorn").Parser.extend(
  require("acorn-dynamic-import").default
);

const acornExtensions = require("./acorn-extensions");

exports.options = {
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  ecmaVersion: 9,
  sourceType: "module"
};

function parse(code) {
  const parser = new Parser(exports.options, code);
  acornExtensions.enableAll(parser);
  return parser.parse();
}

exports.parse = parse;
