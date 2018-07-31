import assert from "assert";
import { b } from "./b.js";

assert.strictEqual(a(), b);
assert.strictEqual(typeof b, "function");
assert.strictEqual(b(), a);

export function a() {
  return b;
}
