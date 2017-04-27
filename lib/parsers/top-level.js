"use strict";

const acorn = require("acorn");
const acornExtensions = require("./acorn-extensions.js");

exports.options = {
  ecmaVersion: 8,
  sourceType: "module",
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true
};

// Inspired by esmod's acorn parseBlock modification.
// Copyright Ingvar Stepanyan. Released under MIT license:
// https://github.com/RReverser/esmod/blob/master/index.js

function quickParseBlock() {
  const node = this.startNode();
  const prevPos = this.context.length - 1;

  node.body = [];

  do {
    this.next();
  } while (this.context.length > prevPos);

  this.next();
  return this.finishNode(node, "BlockStatement");
}

function topLevelParse(code) {
  const parser = new acorn.Parser(exports.options, code);
  acornExtensions.enableAll(parser);

  // Override the Parser's parseBlock method.
  parser.parseBlock = quickParseBlock;
  return parser.parse();
}

exports.parse = topLevelParse;
