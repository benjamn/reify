var assert = require("assert");

// Make test timing more consistent by importing parser module eagerly.
require("../lib/parser.js");

describe("import statements", function () {
  it("should work in nested scopes", function () {
    import { name, id } from "./name";
    assert.strictEqual(name, "name.js");
    assert.strictEqual(id.split("/").pop(), "name.js");
  });

  it("should cope with dependency cycles", function () {
    import { check as aCheck } from "./cycle-a";
    aCheck();

    import { check as bCheck } from "./cycle-a";
    bCheck();
  });

  it("should support combinations of import styles", function () {
    import * as abc1 from "./abc";
    import abc2, * as abc3 from "./abc";
    import { default as abc4 } from "./abc";
    import abc5, { a as ay, b as bee, c } from "./abc";

    assert.deepEqual(abc1, {
      a: "a",
      b: "b",
      c: "c"
    });

    assert.deepEqual(abc1, abc2);
    assert.deepEqual(abc1, abc3);
    assert.deepEqual(abc1, abc4);
    assert.deepEqual(abc1, abc5);
  });

  it("should import module.exports as default, by default", function () {
    import def from "./export/common.js";
    assert.strictEqual(def, "pure CommonJS");
  });
});

describe("export statements", function () {
  it("should allow * exports", function () {
    import def, {
      a, b, c as d,
    } from "./export-all.js";

    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(d, "c");
    assert.strictEqual(def, "default");
  });

  it("should allow re-exporting import * alongside export *", function () {
    import {
      Abc, d, e, f,
    } from "./export-all-multiple.js";

    assert.strictEqual(Abc.a, "a");
    assert.strictEqual(Abc.b, "b");
    assert.strictEqual(Abc.c, "c");
    assert.strictEqual(d, "d");
    assert.strictEqual(e, "e");
    assert.strictEqual(f, "f");
  });

  it("should tolerate mutual * exports", function () {
    import { a as aa, b as ab } from "./export/all-mutual-a.js";
    import { a as ba, b as bb } from "./export/all-mutual-b.js";
    assert.strictEqual(aa, "a");
    assert.strictEqual(ab, "b");
    assert.strictEqual(ba, "a");
    assert.strictEqual(bb, "b");
  });

  it("should allow named re-exports", function test() {
    import { a, c, v, si } from "./export-some.js";
    assert.strictEqual(a, "a");
    assert.strictEqual(c(), "c");
    assert.strictEqual(v, "b");
    assert.strictEqual(si, "cee");
  });

  it("should be able to contain import statements", function () {
    import { outer } from "./nested";
    assert.deepEqual(outer(), ["a", "b", "c"]);
  });

  it("should support default declarations", function () {
    import g, { check } from "./default-function";
    check(g);
  });

  it("should support default expressions", function () {
    import count from "./default-expression";
    assert.strictEqual(count, 1);
  });

  it("should be able to invoke setters later", function (done) {
    import def, {
      val,
      exportAgain,
      exportYetAgain,
      oneLastExport
    } from "./export-later";

    assert.strictEqual(def, "default-1");
    assert.strictEqual(val, "value-1");

    exportAgain();
    assert.strictEqual(def, "default-2");
    assert.strictEqual(val, "value-2");

    exportYetAgain();
    assert.strictEqual(def, "default-3");
    assert.strictEqual(val, "value-2");

    setTimeout(function () {
      oneLastExport();
      assert.strictEqual(def, "default-3");
      assert.strictEqual(val, "value-3");
      done();
    }, 0);
  });

  import { Script } from "vm";

  var canUseClasses = false;
  var canUseLetConst = false;

  try {
    // Test if we have
    new Script("class A {}");
    canUseClasses = true;
  } catch (e) {}

  try {
    // Test if we have
    new Script("let x; const y = 1234");
    canUseLetConst = true;
  } catch (e) {}

  it("should support all default syntax", function () {
    import number from "./export/default/number";
    assert.strictEqual(number, 42);

    import object from "./export/default/object";
    assert.deepEqual(object, {
      foo: 42
    });

    import array from "./export/default/array";
    assert.deepEqual(array, [1, 2, 3]);

    import func from "./export/default/function";
    assert.strictEqual(func(), func);

    import ident from "./export/default/identifier";
    assert.strictEqual(ident, 42);

    if (! canUseClasses) {
      return;
    }

    import C from "./export/default/anon-class";
    assert.strictEqual(new C(1234).value, 1234);

    import C from "./export/default/named-class";
    assert.strictEqual(new C(56, 78).sum, 56 + 78);
  });

  it("should support basic declaration syntax", function () {
    import { a, b, c, d } from "./export/declarations/basic";

    assert.strictEqual(a, 1);
    assert.strictEqual(b(), d);
    assert.strictEqual(c, "c");
    assert.strictEqual(d(), b);
  });

  canUseLetConst &&
  it("should support block declaration syntax", function () {
    import { a, b, c } from "./export/declarations/block";

    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(c, 3);
  });

  it("should support all named export syntax", function () {
    var exp = require("./export/names");

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

  it("should support all export-from syntax", function () {
    import def, { a, b, c, ay, bee, foo } from "./export/from";

    assert.strictEqual(def, "a");
    assert.strictEqual(a, "a");
    assert.strictEqual(b, "b");
    assert.strictEqual(c, "c");
    assert.strictEqual(ay, "a");
    assert.strictEqual(bee, "b");
    assert.deepEqual(foo, {
      a: "a",
      b: "b",
      c: "c"
    });
  });

  it("should support export { default } from ... syntax", function () {
    import object from "./export/default/from";
    assert.deepEqual(object, {
      foo: 42
    });
  });
});

describe("spec compliance", function () {
  it("should establish live binding of values", function () {
    import { value, add } from "./live";
    assert.equal(value, 0);
    add(2);
    assert.equal(value, 2);
  });

  it("should execute modules in the correct order", function () {
    import { getLog } from "./order-tracker";
    import "./order-c";
    assert.deepEqual(getLog(), ["a", "b", "c"]);
  });

  it("should bind exports before the module executes", function () {
    import value from "./export-cycle-a";
    assert.equal(value, true);
  });
});

describe("built-in modules", function () {
  it("should fire setters if already loaded", function () {
    // The "module" module is required in ../lib/node.js before we begin
    // compiling anything.
    import { Module as M } from "module";
    assert.ok(module instanceof M);
  });
});

describe("compiler", function () {
  it("should not get confused by string literals", function () {
    assert.strictEqual(
      'a; import b from "c"; d',
      'a; import b ' + 'from "c"; d'
    );

    assert.strictEqual(
      'a; export {a} from "a"; b;',
      'a; export {a' + '} from "a"; b;'
    );
  });

  it("should not be enabled for nested node_modules", function () {
    var threw = true;
    try {
      import "disabled";
      threw = false;
    } catch (e) {
      assert.ok(e instanceof SyntaxError);
      assert.ok(/unexpected/i.test(e.message));
    }
    assert.strictEqual(threw, true);
  });

  it("should be enabled for packages that depend on reify", function () {
    import a from "enabled";
    assert.strictEqual(a, assert);
  });

  it("should preserve line numbers", function () {
    import check from "./lines.js";
    check();
  });
});

describe("Node REPL", function () {
  import { createContext } from "vm";
  import "../repl";

  it("should work with global context", function (done) {
    var repl = require("repl").start({
      useGlobal: true
    });

    assert.strictEqual(typeof assertStrictEqual, "undefined");

    repl.eval(
      'import { strictEqual as assertStrictEqual } from "assert"',
      null, // context
      "repl", // filename
      function (err, result) {
        // Use the globally-defined assertStrictEqual to test itself!
        assertStrictEqual(typeof assertStrictEqual, "function");
        done();
      }
    );
  });

  it("should work with non-global context", function (done) {
    var repl = require("repl").start({
      useGlobal: false
    });

    var context = createContext({
      module: module
    });

    repl.eval(
      'import { strictEqual } from "assert"',
      context,
      "repl", // filename
      function (err, result) {
        // Use context.strictEqual to test itself!
        context.strictEqual(typeof context.strictEqual, "function");
        done();
      }
    );
  });
});
