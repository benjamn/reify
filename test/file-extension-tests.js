import assert from "assert";
import { join } from "path";
import {
  readFileSync,
  writeFileSync
} from "fs";

const fixturePath = join(__dirname, "file-extension");
const content = readFileSync(join(fixturePath, "a.mjs"));

describe("file extension", () => {
  function check(modulePath) {
    let exported;

    try {
      exported = require(modulePath).default;
    } catch (e) {}

    assert.strictEqual(exported, "a");
  }

  [".mjs"].forEach((ext) => {
    it(`compiles ${ext} files`, () => {
      check(join(fixturePath, "a" + ext));
    });
  });
});
