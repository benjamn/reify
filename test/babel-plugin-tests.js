import assert from "assert";
import { relative } from "path";
import { transformFromAst } from "@babel/core";
import { files } from "./all-files.js";
import { parse } from "../lib/parsers/babel.js";
import reifyPlugin from "babel-plugin-transform-es2015-modules-reify";
import envPreset from "@babel/preset-env";

const filesToTest = Object.create(null);
const methodNameRegExp =
  /\bmodule\d*(?:\.link\b|\.export(?:Default)?\b|\["export"\])/;

Object.keys(files).forEach((absPath) => {
  const code = files[absPath];
  const relPath = relative(__dirname, absPath);

  // These files fail to transform with es2015 preset due to problems
  // unrelated to the functionality of the Reify Babel plugin.
  if (relPath === "export/extensions.js" ||
      relPath === "export/some.js"  ||
      relPath === "export-tests.js" ||
      relPath === "import/extensions.js" ||
      relPath === "import-tests.js" ||
      relPath === "setter-tests.js" ||
      relPath.startsWith("output/export-multi-namespace/")) {
    return;
  }

  // Files without import or export tokens don't need to be tested.
  if (! /\b(?:im|ex)port\b/.test(code)) {
    return;
  }

  filesToTest[relPath] = code;
});

describe("babel-plugin-transform-es2015-modules-reify", () => {
  function check(code, options) {
    const ast = parse(code);
    delete ast.tokens;
    const result = transformFromAst(ast, code, options);
    assert.ok(methodNameRegExp.test(result.code), result.code);
    return result;
  }

  Object.keys(filesToTest).forEach((relPath) => {
    const code = filesToTest[relPath];
    const presets = [envPreset];
    const plugins = [[reifyPlugin, {
      generateLetDeclarations: true
    }]];

    it(`compiles ${relPath}`, () => {
      check(code, { plugins });
    });

    it(`compiles ${relPath} with es2015`, () => {
      check(code, { plugins, presets });
    });
  });
});
