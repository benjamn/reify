"use strict";

const utils = require("./utils.js");
const Visitor = require("./visitor.js");

class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = options.exportedLocalNames;
    this.magicString = options.magicString;
    this.modifyAST = !! options.modifyAST;
    this.moduleAlias = options.moduleAlias;

    if (this.exportedLocalNames === void 0) {
      this.exportedLocalNames = Object.create(null);
    }

    if (this.magicString === void 0) {
      this.magicString = null;
    }

    if (this.magicString) {
      const identifiers = Object.keys(this.exportedLocalNames);

      // In addition to any exported local identifiers, this visitor needs
      // to visit `eval(...)` expressions, so it's important to search for
      // any possible indexes of the `eval` identifier, too.
      identifiers.push("eval");

      // When this.possibleIndexes is defined, the AST traversal can
      // abandon any subtrees that do not contain any possible indexes.
      this.possibleIndexes = utils.findLikelyIndexes(
        this.magicString.original,
        identifiers
      );
    }
  }

  visitAssignmentExpression(path) {
    return assignmentHelper(this, path, "left");
  }

  visitCallExpression(path) {
    const callee = path.getValue().callee;

    if (callee.type === "MemberExpression" &&
        isId(callee.object, this.moduleAlias) &&
        isId(callee.property, "runSetters")) {
      // If we've already wrapped this subtree, abandon it.
      return false;
    }

    this.visitChildren(path);

    if (isId(callee, "eval")) {
      wrap(this, path);
    }
  }

  visitUpdateExpression(path) {
    return assignmentHelper(this, path, "argument");
  }
};

function isId(node, name) {
  if (!node || node.type !== "Identifier") {
    return false;
  }

  if (name) {
    return node.name === name;
  }

  return true;
}

function assignmentHelper(visitor, path, childName) {
  visitor.visitChildren(path);

  const child = path.getValue()[childName];
  const assignedNames = utils.getNamesFromPattern(child);
  const nameCount = assignedNames.length;

  // Wrap assignments to exported identifiers with `module.runSetters`.
  for (let i = 0; i < nameCount; ++i) {
    if (visitor.exportedLocalNames[assignedNames[i]] === true) {
      wrap(visitor, path);
      break;
    }
  }
}

function wrap(visitor, path) {
  const value = path.getValue();

  if (visitor.magicString !== null) {
    visitor.magicString.prependRight(
      value.start,
      visitor.moduleAlias + ".runSetters("
    ).appendLeft(value.end, ")");
  }

  if (visitor.modifyAST) {
    path.replace({
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "Identifier",
          name: visitor.moduleAlias,
        },
        property: {
          type: "Identifier",
          name: "runSetters"
        }
      },
      arguments: [value]
    });
  }
}

module.exports = AssignmentVisitor;
