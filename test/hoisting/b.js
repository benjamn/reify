import assert from "assert";
import { a } from "./a.js";

assert.strictEqual(b(), a);
assert.strictEqual(typeof a, "function");
assert.strictEqual(a(), b);

export function b() {
  return a;
}
