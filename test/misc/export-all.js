import assert from "assert"
import * as ns from "../export/all-multiple.js"

export function check() {
  assert.ok(! ("default" in ns))
}
