import assert from "assert";
import { Script } from "vm";

let canUseClasses = false;
let canUseDestructuring = false;
let canUseLetConst = false;
const canUseExportExtensions = process.env.REIFY_PARSER !== "babel";

try {
  // Test if Node supports class syntax.
  new Script("class A {}");
  canUseClasses = true;
} catch (e) {}

try {
  // Test if Node supports destructuring declarations.
  new Script("const { x, y } = {}");
  canUseDestructuring = true;
} catch (e) {}

try {
  // Test if Node supports block declaration syntax.
  new Script("let x; const y = 1");
  canUseLetConst = true;
} catch (e) {}

describe("export declarations", () => {
  it("should allow * exports", () => {
    import def, {
      a, b, c as d,
    } from "./export/all.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(d, "c");
    assert.strictEqual(def, "default");
  });

  it("should allow re-exporting import * alongside export *", () => {
    import {
      Abc, d, e, f,
    } from "./export/all-multiple.js";

    assert.strictEqual(Abc.a, "a");
    assert.strictEqual(Abc.b, "b");
    assert.strictEqual(Abc.c, "c");
    assert.strictEqual(d, "d");
    assert.strictEqual(e, "e");
    assert.strictEqual(f, "f");
  });

  it("should tolerate mutual * exports", () => {
    import { a as aa, b as ab } from "./export/all-mutual-a.js";
    import { a as ba, b as bb } from "./export/all-mutual-b.js";

    assert.strictEqual(aa, "a");
    assert.strictEqual(ab, "b");
    assert.strictEqual(ba, "a");
    assert.strictEqual(bb, "b");
  });

  it("should allow specifiers that shadow Object.prototype", () => {
    import {
      constructor,
      hasOwnProperty,
      toString,
      valueOf
    } from "./export/shadowed.js";

    assert.strictEqual(constructor, "a");
    assert.strictEqual(hasOwnProperty, "b");
    assert.strictEqual(toString, "c");
    assert.strictEqual(valueOf, "d");
  });

  it("should allow named re-exports", () => {
    import { a, c, v, si } from "./export/some.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(c(), "c");
    assert.strictEqual(v, "b");
    assert.strictEqual(si, "c");
  });

  it("should be able to contain import declarations", () => {
    import { outer } from "./export/nested";
    assert.deepEqual(outer(), ["a", "b", "c"]);
  });

  it("should support default declarations", () => {
    import g, { check } from "./export/default-function";
    check(g);
  });

  it("should support default expressions", () => {
    import count from "./export/default-expression";
    assert.strictEqual(count, 1);
  });

  it("should be able to invoke setters later", (done) => {
    import def, {
      val,
      exportAgain,
      exportYetAgain,
      oneLastExport
    } from "./export/later";

    assert.strictEqual(def, "default-1");
    assert.strictEqual(val, "value-1");

    exportAgain();
    assert.strictEqual(def, "default-1");
    assert.strictEqual(val, "value-2");

    setImmediate(() => {
      oneLastExport();
      assert.strictEqual(def, "default-1");
      assert.strictEqual(val, "value-3");
      done();
    });
  });

  it("should support all default syntax", () => {
    import number from "./export/default/number";
    assert.strictEqual(number, 42);

    import object from "./export/default/object";
    assert.deepEqual(object, { foo: 42 });

    import array from "./export/default/array";
    assert.deepEqual(array, [1, 2, 3]);

    import func from "./export/default/function";
    assert.strictEqual(func(), func);

    import anonFunc from "./export/default/anon-function";
    assert.strictEqual(anonFunc(3), 4);

    import ident from "./export/default/identifier";
    assert.strictEqual(ident, 42);

    if (canUseClasses) {
      import Anon from "./export/default/anon-class";
      assert.strictEqual(new Anon(1234).value, 1234);

      import Named from "./export/default/named-class";
      assert.strictEqual(new Named(56, 78).sum, 56 + 78);
    }
  });

  it("should support basic declaration syntax", () => {
    import { a, b, c, d } from "./export/declarations/basic";

    assert.strictEqual(a, 1);
    assert.strictEqual(b(), d);
    assert.strictEqual(c, "c");
    assert.strictEqual(d(), b);
  });

  (canUseLetConst ? it : xit)(
    "should support block declaration syntax", () => {
    import { a, b, c } from "./export/declarations/block";

    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(c, 3);
  });

  it("should support all named export syntax", () => {
    const exp = require("./export/names");

    assert.strictEqual(exp.foo, "foo");
    assert.strictEqual(exp.bar, "bar");
    assert.strictEqual(exp.baz, "baz");
    assert.strictEqual(exp.foo2, "foo");
    assert.strictEqual(exp.foo3, "foo");
    assert.strictEqual(exp.baz2, "baz");
    assert.strictEqual(exp.default, "foo");

    import foo from "./export/names";
    assert.strictEqual(foo, "foo");
  });

  it("should tolerate one-to-many renamed exports", () => {
    import { x, y, append } from "./export/renamed";

    assert.strictEqual(x, y);
    assert.strictEqual(x, "a");

    assert.strictEqual(append("b"), "ab");

    assert.strictEqual(x, y);
    assert.strictEqual(x, "ab");

    assert.strictEqual(append("c"), "abc");

    assert.strictEqual(x, y);
    assert.strictEqual(x, "abc");
  });

  it("should support all export-from syntax", () => {
    import def, { a, b, c, ay, bee, foo } from "./export/from";

    assert.strictEqual(def, "a");
    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(c, "c");
    assert.strictEqual(ay, "a");
    assert.strictEqual(bee, "b");
    assert.deepEqual(foo, { a: "a", b: "b", c: "c" });
  });

  it("should support export { default } from ... syntax", () => {
    import object from "./export/default/from";
    assert.deepEqual(object, { foo: 42 });
  });

  it("should support switch-case nested imports", () => {
    for (let i = 0; i < 2; ++i) {
      switch (i) {
      case 0:
        import { a as xa } from "./misc/abc";
        assert.strictEqual(xa, "a");
        break;
      case 1:
        import { b as xb } from "./misc/abc";
        assert.strictEqual(xb, "b");
        break;
      }
    }
  });

  (canUseDestructuring ? it : xit)(
    "should support destructuring declarations", () => {
    import { a, c as b, d, x, y, rest } from "./export/destructuring.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(d, 1234);
    assert.strictEqual(x, 1);
    assert.strictEqual(y, 2);
    assert.deepEqual(rest, [a, b, d]);
  });

  (canUseDestructuring ? it : xit)(
  "should invoke destructuring setters later", () => {
    import { x, y, swap } from "./export/swap-later.js";

    assert.strictEqual(x, 1);
    assert.strictEqual(y, 2);
    swap();
    assert.strictEqual(x, 2);
    assert.strictEqual(y, 1);
  });

  (canUseDestructuring ? it : xit)(
  "should not crash on array patterns with holes", () => {
    import { a, b, update } from "./export/array-pattern-holes.js";

    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(update(3, 4, 5), 8);
    assert.strictEqual(a, 3);
    assert.strictEqual(b, 5);
  });

  (canUseExportExtensions ? it : xit)(
  "should support export extensions", () => {
    import {
      def1, def2, def3, def4,
      ns1, ns2, ns3, ns4,
      a, b, c, d, e
    } from "./export/extensions";

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

  it("does not reorder export...from imports", () => {
    import { aName, bName, cName } from "./export/from-ordering.js";
    assert.strictEqual(aName, "from-ordering-a.js");
    assert.strictEqual(bName, "from-ordering-b.js");
    assert.strictEqual(cName, "from-ordering-c.js");

    import { names } from "./export/from-ordering-common.js";
    assert.deepEqual(names, [
      "from-ordering-a.js",
      "from-ordering-b.js",
      "from-ordering-c.js",
    ]);
  });
});
