import assert from "assert"
import * as ns from "../export/all-multiple.js"

export function checkNoDefault() {
  assert.ok(! ("default" in ns))
}
