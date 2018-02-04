"use strict";

const utils = require("./utils.js");

const codeOfUnderscore = "_".charCodeAt(0);

// This Visitor API was inspired by a similar API provided by ast-types:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

class Visitor {
  constructor() {
    const that = this;
    const visit = this.visit;
    const visitWithoutReset = this.visitWithoutReset;
    const visitChildren = this.visitChildren;

    // Avoid slower `Function#bind` for Node < 7.
    this.visit = function () {
      visit.apply(that, arguments);
    };

    this.visitWithoutReset = function (path) {
      visitWithoutReset.call(that, path);
    };

    this.visitChildren = function (path) {
      visitChildren.call(that, path);
    };
  }

  visit(path) {
    this.reset.apply(this, arguments);
    this.visitWithoutReset(path);
  }

  visitWithoutReset(path) {
    const value = path.getValue();
    if (Array.isArray(value)) {
      path.each(this.visitWithoutReset);
    } else if (path.getNode() === value) {
      const method = this["visit" + value.type];
      if (typeof method === "function") {
        // The method must call this.visitChildren(path) to continue traversing.
        method.call(this, path);
      } else if (this._nodeContainsPossibleIndex(value)) {
        // Only continue the search if this.possibleIndexes is undefined,
        // or if [node.start, node.end) contains at least one possible
        // index of an identifier that we care about.
        this.visitChildren(path);
      }
    }
  }

  // Returns true if and only if this.possibleIndexes is defined and
  // contains any indexes that are >= node.start and < node.end.
  _nodeContainsPossibleIndex(node) {
    if (node.type === "File" ||
        node.type === "Program") {
      // Always visit File and Program AST nodes, since they're always
      // near the root of the AST, and they don't have any identifiers of
      // their own that aren't part of other nodes.
      return true;
    }

    const array = this.possibleIndexes;
    if (! array) {
      // If this.possibleIndexes is not defined, then we don't know
      // anything about where to look, so anything goes.
      return true;
    }

    const start = node.start;
    const end = node.end;

    if (typeof start !== "number" ||
        typeof end !== "number") {
      // If we don't have start/end for this node, anything goes.
      return true;
    }

    let low = 0;
    let high = array.length;

    while (low < high) {
      const pos = (low + high) >> 1;
      if (array[pos] < start) {
        low = pos + 1;
      } else {
        high = pos;
      }
    }

    // Set left to the lower bound of a binary search for node.start
    // within this.possibleIndexes.
    const left = low;

    high = array.length;

    while (low < high) {
      const pos = (low + high) >> 1;
      if (end < array[pos]) {
        high = pos;
      } else {
        low = pos + 1;
      }
    }

    // Set right to the upper of a binary search for node.end within
    // this.possibleIndexes.
    const right = high;

    // Return true if and only if there were any possible indexes that
    // were >= node.start and < node.end.
    return left < right;
  }

  visitChildren(path) {
    if (! path.valueIsNode()) {
      return;
    }

    const node = path.getValue();
    const keys = Object.keys(node);
    const keyCount = keys.length;

    for (let i = 0; i < keyCount; ++i) {
      const key = keys[i];
      const value = node[key];

      if (
          // Ignore .loc.{start,end} objects.
          key !== "loc" &&
          // Ignore "private" properties added by Babel.
          key.charCodeAt(0) !== codeOfUnderscore &&
          // Ignore properties whose values aren't objects.
          utils.isObject(value)) {
        path.call(this.visitWithoutReset, key);
      }
    }
  }
};

Object.setPrototypeOf(Visitor.prototype, null);

module.exports = Visitor;
