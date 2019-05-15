import assert from "assert";

const canUseImportExtensions = process.env.REIFY_PARSER !== "babel";

describe("import declarations", () => {
  it("should work in nested scopes", () => {
    import { name, id } from "./import/name";
    assert.strictEqual(name, "name.js");
    assert.strictEqual(id.split("/").pop(), "name.js");
  });

  it("should cope with dependency cycles", () => {
    import { check as aCheck } from "./import/cycle-a";
    aCheck();

    import { check as bCheck } from "./import/cycle-a";
    bCheck();
  });

  it("should support combinations of import styles", () => {
    import * as abc1 from "./misc/abc";
    import abc2, * as abc3 from "./misc/abc";
    import { default as abc4 } from "./misc/abc";
    import abc5, { a as ay, b as bee, c } from "./misc/abc";

    function check(ns) {
      assert.strictEqual(ns.a, "a");
      assert.strictEqual(ns.b, "b");
      assert.strictEqual(ns.c, "c");
    }

    check(abc1);
    check(abc2);
    check(abc3);
    check(abc4);
    check(abc5);
  });

  it("should import module.exports as default, by default", () => {
    import def from "./export/common.js";
    assert.strictEqual(def, "pure CommonJS");
  });

  it("should allow same symbol as different locals", () => {
    import { a as x, a as y } from "./misc/abc";
    assert.strictEqual(x, "a");
    assert.strictEqual(y, "a");
  });

  it("should support braceless-if nested imports", () => {
    for (let i = 0; i < 3; ++i) {
      if (i === 0) import { a as xa } from "./misc/abc";
      else if (i === 1) import { b as xb } from "./misc/abc";
      else import { c as xc } from "./misc/abc";
      if (i === 0) assert.strictEqual(xa, "a");
      if (i === 1) assert.strictEqual(xb, "b");
      if (i === 2) assert.strictEqual(xc, "c");
    }
  });

  it("should support braceless-while nested imports", () => {
    var i = 0;
    while (i++ === 0) import { a as x } from "./misc/abc";
    assert.strictEqual(x, "a");
  });

  it("should support braceless-do-while nested imports", () => {
    do import { b as x } from "./misc/abc";
    while (false);
    assert.strictEqual(x, "b");
  });

  it("should support braceless-for-in nested imports", () => {
    for (var key in { a: 123 })
      import { c as x } from "./misc/abc";
    assert.strictEqual(x, "c");
  });

  it("should allow CommonJS modules to set module.exports", () => {
    import f from "./cjs/module-exports-function.js";
    assert.strictEqual(typeof f, "function");
    assert.strictEqual(f(), "ok");

    import * as fns from "./cjs/module-exports-function.js";
    assert.strictEqual(fns.default, f);

    import n from "./cjs/module-exports-null.js";
    assert.strictEqual(n, null);

    import * as nns from "./cjs/module-exports-null.js";
    assert.strictEqual(nns.default, n);

    import o, { a, b, c } from "./cjs/module-exports-object.js";
    assert.deepEqual(o, { a: 1, b: 2, c: 3 });
    assert.strictEqual(a, o.a);
    assert.strictEqual(b, o.b);
    assert.strictEqual(c, o.c);
    o.c = 4;
    module.runSetters.call({
      id: require.resolve("./cjs/module-exports-object.js"),
      exports: o
    });
    assert.strictEqual(c, 4);

    import { value, reset, add } from "./cjs/bridge.js";
    assert.strictEqual(value, 0);
    add(10);
    assert.strictEqual(value, 10);
    assert.strictEqual(reset(), 0);
    assert.strictEqual(value, 0);

    import * as ns1 from "./cjs/module-exports-esModule.js";
    import * as ns2 from "./cjs/module-exports-esModule.js";
    assert.strictEqual(typeof ns1, "object");
    assert.strictEqual(ns1, ns2);

    import def from "./cjs/export-default-property.js";
    import * as defNs from "./cjs/export-default-property.js";
    assert.strictEqual(def.default, "oyez");
    assert.strictEqual(def, defNs.default);
  });

  (canUseImportExtensions ? it : xit)(
  "should support import extensions", () => {
    import {
      def1, def2, def3, def4,
      ns1, ns2, ns3, ns4,
      a, b, c, d, e
    } from "./import/extensions";

    import def, {
      a as _a,
      b as _b,
      b as _c,
      c as _d,
      c as _e,
    } from "./misc/abc";

    assert.strictEqual(def, def1);
    assert.strictEqual(def, def2);
    assert.strictEqual(def, def3);
    assert.strictEqual(def, def4);

    function checkNS(ns) {
      assert.strictEqual(ns.a, def.a);
      assert.strictEqual(ns.b, def.b);
      assert.strictEqual(ns.c, def.c);
      assert.notStrictEqual(ns, def);
    }

    checkNS(ns1);
    checkNS(ns2);
    checkNS(ns3);
    checkNS(ns4);

    assert.strictEqual(a, _a);
    assert.strictEqual(b, _b);
    assert.strictEqual(c, _c);
    assert.strictEqual(d, _d);
    assert.strictEqual(e, _e);
  });
});
