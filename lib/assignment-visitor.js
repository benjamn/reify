"use strict";

const utils = require("./utils.js");
const Visitor = require("./visitor.js");

module.exports = class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = options.exportedLocalNames;
    this.magicString = options.magicString;
    this.modifyAST = !! options.modifyAST;
  }

  visitAssignmentExpression(path) {
    return assignmentHelper(this, path, "left");
  }

  visitCallExpression(path) {
    this.visitChildren(path);

    const callee = path.getValue().callee;
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      wrap(this, path);
    }
  }

  visitUpdateExpression(path) {
    return assignmentHelper(this, path, "argument");
  }
};

function assignmentHelper(visitor, path, childName) {
  visitor.visitChildren(path);

  const child = path.getValue()[childName];
  const assignedNames = utils.getNamesFromPattern(child);
  const nameCount = assignedNames.length;

  // Wrap assignments to exported identifiers with `module.runModuleSetters`.
  for (let i = 0; i < nameCount; ++i) {
    if (visitor.exportedLocalNames[assignedNames[i]]) {
      wrap(visitor, path);
      break;
    }
  }
}

function wrap(visitor, path) {
  const value = path.getValue();

  if (visitor.magicString) {
    visitor.magicString.prependRight(
      value.start,
      "module.runModuleSetters("
    ).appendLeft(value.end, ")");
  }

  if (visitor.modifyAST) {
    path.replace({
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "Identifier",
          name: "module"
        },
        property: {
          type: "Identifier",
          name: "runModuleSetters"
        }
      },
      arguments: [value]
    });
  }
}
