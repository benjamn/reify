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

  let scope = null;
  function inModuleScope(name) {
    if (scope === null) {
      scope = path.getScope();
    }

    return !scope || scope.find_owner(name).parent === null;
  }

  let modifiedExports = [];
  
  // Identify which exports if any are modified by the assignment.
  for (let i = 0; i < nameCount; ++i) {
    let name = assignedNames[i];
    if (
      visitor.exportedLocalNames[name] &&
      inModuleScope(name)
    ) {
      modifiedExports.push(...visitor.exportedLocalNames[name]);
    }
  }
  
  // Wrap assignments to exported identifiers with `module.runSetters`.
  if (modifiedExports.length > 0) {
    wrap(visitor, path, modifiedExports);
  }
}

function wrap(visitor, path, names) {
  const value = path.getValue();

  if (visitor.magicString !== null) {
    let end = ')';
    if (names) {
      end = `,[${names.map(n => `"${n}"`).join(',')}])`;
    }

    visitor.magicString.prependRight(
      value.start,
      visitor.moduleAlias + ".runSetters("
    ).appendLeft(value.end, end);
  }

  if (visitor.modifyAST) {
    let args = [value];
    if (names) {
      let array = {
        type: "ArrayExpression",
        elements: names.map(n => ({ type: "StringLiteral", value: n }))
      };
      args.push(array);
    }

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
      arguments: args
    });
  }
}

module.exports = AssignmentVisitor;
