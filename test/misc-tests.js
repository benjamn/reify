const assert = require("assert");

describe("spec compliance", () => {
  it("should establish live binding of values", () => {
    import { value, reset, add } from "./misc/live";
    reset();
    assert.equal(value, 0);
    add(2);
    assert.equal(value, 2);
  });

  it("should execute modules in the correct order", () => {
    import { getLog } from "./misc/order-tracker";
    import "./misc/order-c";
    assert.deepEqual(getLog(), ["a", "b", "c"]);
  });

  it("should bind exports before the module executes", () => {
    import value from "./export/cycle-a";
    assert.equal(value, true);
  });

  it("should not export the default binding of namespace exports", () => {
    import * as ns from "./misc/export-all.js";
    ns.checkNoDefault();
  });

  it('... unless "*+" or module.makeNsSetter(true) is used', () => {
    import eff, * as ns from "./misc/export-all-with-default.js";
    assert.strictEqual(eff(), "eff");
    assert.strictEqual(ns.default, eff);
  });
});

describe("built-in modules", () => {
  it("should fire setters if already loaded", () => {
    // The "module" module is required in ../lib/node.js before we begin
    // compiling anything.
    import { Module as M } from "module";
    assert.ok(module instanceof M);
  });
});

describe("sealed module.exports objects", () => {
  it("should not pose any problems", () => {
    import { name, setName } from "./export/sealed.js";
    import { relative } from "path";

    assert.strictEqual(
      relative(__dirname, name),
      "export/sealed.js"
    );

    setName("oyez");
    assert.strictEqual(name, "oyez");
  });
});

describe("exceptional imports", () => {
  it("should not be triggered if unnamed", () => {
    import { safe } from "./misc/risky-exports.js";
    assert.strictEqual(safe, "safe");

    import risky from "./misc/risky-exports.js";
    assert.deepEqual(
      Object.keys(risky).sort(),
      ["safe", "unsafe"]
    );

    try {
      import * as ns from "./misc/risky-exports.js";

      assert.deepEqual(
        Object.keys(ns).sort(),
        ["default", "safe", "unsafe"]
      );

      // This assertion would fail if its arguments could be evaluated,
      // but the ns.unsafe expression throws first.
      assert.strictEqual(ns.unsafe, "moot");

    } catch (e) {
      assert.strictEqual(e.message, "unsafe");
    }
  });
});

describe("object-like module.exports", () => {
  it("should expose their properties via `export * from ...`", () => {
    import { union, forEach } from "./export/all-lodash.js";
    assert.strictEqual(typeof union, "function");
    assert.strictEqual(typeof forEach, "function");
  });
});
