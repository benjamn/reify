import assert from "assert";
import { compile } from "../lib/compiler.js";
import { files } from "./all-files.js";
import {
  basename,
  relative,
  sep,
} from "path";

const filesToTest = Object.create(null);

Object.keys(files).forEach((absPath) => {
  const code = files[absPath];
  const relPath = relative(__dirname, absPath);
  const relParts = relPath.split(sep);

  if (relParts[0]  === "output") {
    const testName = relParts[1];
    const testType = basename(relParts[2], ".js");

    if (!filesToTest[testName]) {
      filesToTest[testName] = Object.create(null);
    }
    filesToTest[testName][testType] = code;
  }
});

describe("output", () => {
  function check(data) {
    const code = compile(data.actual).code;
    // Trim blank lines and trailing whitespace.
    const actual = code.replace(/^ +$/gm, "").trimRight();
    const expected = data.expected.trimRight();

    assert.strictEqual(actual, expected);
  }

  Object.keys(filesToTest).forEach((key) => {
    const data = filesToTest[key];
    const testName = key.split("-").join(" ");

    it("compiles " + testName + " example as expected", () => {
      check(data);
    });
  });
});
