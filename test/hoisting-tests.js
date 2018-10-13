import assert from "assert";

describe("hoisted function declarations", () => {
  it("should be accessible before evaluation finishes", () => {
    import { a } from "./hoisting/a.js";
    import { b } from "./hoisting/b.js";
    assert.strictEqual(a(), b);
    assert.strictEqual(b(), a);
  });
});
