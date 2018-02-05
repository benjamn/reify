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

    const pis = this.possibleIndexes;
    if (Array.isArray(pis)) {
      // Just in case a previous visit left this.possibleIndexes in a bad
      // state, reset our left/right bookkeeping properties. See how these
      // properties are used in _visitChildrenIfPossible below.
      pis.left = 0;
      pis.right = pis.length;
    }

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
      } else {
        // Only continue the search if this.possibleIndexes is undefined,
        // or if [node.start, node.end) contains at least one possible
        // index of an identifier that we care about.
        this._visitChildrenIfPossible(path);
      }
    }
  }

  // Calls this.visitChildren(nodePath) unless this.possibleIndexes is
  // defined and we can determine that the current [node.start, node.end)
  // interval does not contain any of the possible indexes we care about.
  _visitChildrenIfPossible(nodePath) {
    const array = this.possibleIndexes;
    if (! array) {
      // If this.possibleIndexes is not defined, then we don't know
      // anything about where (not) to look, so err on the side of
      // visiting the children.
      return this.visitChildren(nodePath);
    }

    const node = nodePath.getValue();

    if (node.type === "File" ||
        node.type === "Program") {
      // Always visit children of File and Program AST nodes, since
      // they're always near the root of the AST, and they don't have any
      // identifiers of their own that aren't part of other nodes, so it
      // might be awkward to use this.possibleIndexes to include them.
      return this.visitChildren(nodePath);
    }

    const start = node.start;
    const end = node.end;

    if (typeof start !== "number" ||
        typeof end !== "number") {
      // If we don't have start/end for this node, err on the side of
      // visiting the children.
      return this.visitChildren(nodePath);
    }

    // Save the current array.{left,right} values so that we can restore
    // them at the end of this method.
    const oldLeft = array.left;
    const oldRight = array.right;

    let left = typeof oldLeft === "number" ? oldLeft : 0;
    let right = typeof oldRight === "number" ? oldRight : array.length;

    // Find the first possible index not less than node.start. While a
    // binary search might seem more efficient here, remember that we are
    // descending a tree of nested AST nodes, with each new [node.start,
    // node.end) interval getting a little smaller at every level. This
    // while loop is responsible for closing the gap since the last time
    // we updated array.left, which means left will usually only need to
    // be incremented a small number of times, whereas a binary search for
    // this lower bound would take log_2(array.length - left) steps.
    while (left < right &&
           array[left] < start) {
      ++left;
    }

    // Find the first possible index greater than node.end. Again, a
    // binary search would be more expensive here, since we expect to
    // decrement right only a small number of times, typically.
    while (left < right &&
           end < array[right - 1]) {
      --right;
    }

    // Now array.slice(left, right) contains exactly the subsequence of
    // possible indexes that are in the interval [node.start, node.end).
    // If that interval is empty, then this node does not contain any of
    // the indexes we care about, and we can avoid visiting its children.
    // If the interval is non-empty, we update array.{left,right}, visit
    // children, then reset array.{left,right} to old{Left,Right}.
    if (left < right) {
      array.left = left;
      array.right = right;

      this.visitChildren(nodePath);

      array.left = oldLeft;
      array.right = oldRight;
    }
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

      // Ignore .loc.{start,end} objects.
      if (key === "loc") {
        continue;
      }

      // Ignore "private" properties added by Babel.
      if (key.charCodeAt(0) === codeOfUnderscore) {
        continue;
      }

      const value = node[key];

      // Ignore properties whose values aren't objects.
      if (! utils.isObject(value)) {
        continue;
      }

      path.call(this.visitWithoutReset, key);
    }
  }
};

Object.setPrototypeOf(Visitor.prototype, null);

module.exports = Visitor;
