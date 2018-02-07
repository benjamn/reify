"use strict";

const utils = require("./utils.js");
const FastPath = require("./fast-path.js");
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

    // Define some internal properties before the constructor returns to
    // help the JS engine understand the shape of the visitor object.
    this._beforeReset();
  }

  _beforeReset() {
    // Since this.possibleIndexes can cause the traversal to ignore entire
    // subtrees if misused, it's important to force the reset method to
    // redefine it each time the visit method is called.
    this.possibleIndexes = null;
    this._piLowerBound = 0;
    this._piUpperBound = 0;
  }

  _afterReset() {
    // Reset the bounds we are currently considering within
    // this.possibleIndexes, so that we can adjust the bounds in
    // _visitChildrenIfPossible below. This allows us to pretend we're
    // working with this.possibleIndexes.slice(this._piLowerBound,
    // this._piUpperBound) without actually modifying the array.
    if (Array.isArray(this.possibleIndexes)) {
      this._piUpperBound = this.possibleIndexes.length;
    }
  }

  visit(astOrPath) {
    const args = Array.prototype.slice.call(arguments);
    const path = args[0] = FastPath.from(astOrPath);
    this._beforeReset();
    // The user-defined reset method has a chance to (re)initialize any
    // instance variables, including this.possibleIndexes.
    this.reset.apply(this, args);
    this._afterReset();
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

    // Save the current this._pi{Lower,Upper}Bound values so that we can
    // restore them at the end of this method.
    const oldLowerBound = this._piLowerBound;
    const oldUpperBound = this._piUpperBound;

    let lowerBound = typeof oldLowerBound === "number" ? oldLowerBound : 0;
    let upperBound = typeof oldUpperBound === "number" ? oldUpperBound : array.length;

    // Find the first possible index not less than node.start. While a
    // binary search might seem more efficient here, remember that we are
    // descending a tree of nested AST nodes, with each new [node.start,
    // node.end) interval getting a little smaller at every level. This
    // while loop is responsible for closing the gap since the last time
    // we updated the lower bound, which means lowerBound should only need
    // to be incremented a small number of times, whereas a binary search
    // would take log_2(array.length - lowerBound) steps.
    while (lowerBound < upperBound &&
           array[lowerBound] < start) {
      ++lowerBound;
    }

    // Find the first possible index greater than node.end. Again, a
    // binary search would be more expensive here, since we expect to
    // decrement upperBound only a small number of times, typically.
    while (lowerBound < upperBound &&
           end < array[upperBound - 1]) {
      --upperBound;
    }

    // Now array.slice(lowerBound, upperBound) contains exactly the
    // subsequence of possible indexes that are contained by the interval
    // [node.start, node.end). If that interval is empty, then this node
    // does not contain any of the indexes we care about, and we can avoid
    // visiting its children. If the interval is non-empty, first update
    // this._pi{Lower,Upper}Bound, then visit the children, then reset
    // this._pi{Lower,Upper}Bound to the old{Upper,Lower}Bound values.
    if (lowerBound < upperBound) {
      this._piLowerBound = lowerBound;
      this._piUpperBound = upperBound;
      this.visitChildren(nodePath);
      this._piLowerBound = oldLowerBound;
      this._piUpperBound = oldUpperBound;
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
