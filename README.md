# re&middot;i&middot;fy <sub>_verb, transitive_</sub> &nbsp; [![Build Status](https://travis-ci.org/benjamn/reify.svg?branch=master)](https://travis-ci.org/benjamn/reify) [![Greenkeeper badge](https://badges.greenkeeper.io/benjamn/reify.svg)](https://greenkeeper.io/)

**re&middot;i&middot;fied** <sub>past</sub> &nbsp; **re&middot;i&middot;fies** <sub>present</sub> &nbsp; **re&middot;i&middot;fy&middot;ing** <sub>participle</sub> &nbsp; **re&middot;i&middot;fi&middot;ca&middot;tion** <sub>noun</sub> &nbsp; **re&middot;i&middot;fi&middot;er** <sub>noun</sub>

  1. to make (something abstract) more concrete or real<br>
     _"these instincts are, in humans, reified as verbal constructs"_
  2. to regard or treat (an idea, concept, etc.) as if having material existence
  3. **to enable [ECMAScript 2015 modules](http://www.2ality.com/2014/09/es6-modules-final.html) in *any* version of [Node.js](https://nodejs.org)**

Usage
---

  1. Run `npm install --save reify` in your package or app directory. The
     `--save` is important because reification only applies to modules in
     packages that explicitly depend on the `reify` package.
  2. Call `require("reify")` before importing modules that contain `import`
     and `export` declarations.

You can also easily `reify` the Node REPL:

```sh
% node
> require("reify")
{}
> import { strictEqual } from "assert"
> strictEqual(2 + 2, 5)
AssertionError: 4 === 5
    at repl:1:1
    at REPLServer.defaultEval (repl.js:272:27)
  ...
```

How it works
---

Code generated by the `reify` compiler relies on a [simple runtime
API](lib/runtime.js) that can be explained through a series of
examples. While you do not have to write this API by hand, it is designed
to be easily human readable and writable, in part because that makes it
easier to explain.

I will explain the `Module.prototype.watch` method first, then the
`Module.prototype.export` method after that. Note that this `Module` is
the constructor of the CommonJS `module` object, and the `import` and
`export` methods are custom additions to `Module.prototype`.

### `module.watch(require(id), setters)`

Here we go:

```js
import a, { b, c as d } from "./module";
```

becomes

```js
// Local symbols are declared as ordinary variables.
let a, b, d;
module.watch(require("./module"), {
  // The keys of this object literal are the names of exported symbols.
  // The values are setter functions that take new values and update the
  // local variables.
  default: value => { a = value; },
  b: value => { b = value; },
  c: value => { d = value; },
});
```

All setter functions are called synchronously before `module.watch` returns,
with whatever values are immediately available. However, when there are
import cycles, some setter functions may be called again, when the exported
values change. Calling these setter functions one or more times is the key
to implementing [*live bindings*](http://www.2ality.com/2015/07/es6-module-exports.html),
as required by the ECMAScript 2015 specification.

While most setter functions only need to know the value of the exported
symbol, the name of the symbol is also provided as a second parameter
after the value. This parameter becomes important for `*` imports (and `*`
exports, but we'll get to that a bit later):

```js
import * as utils from "./utils";
```
becomes
```js
const utils = Object.create(null);
module.watch(require("./utils"), {
  "*": (value, name) => {
    utils[name] = value;
  }
});
```

The setter function for `*` imports is called once for each symbol name
exported from the `"./utils"` module. If any individual value happens to
change after the call to `module.watch`, the setter function will be
called again to update that particular value. This approach ensures that
the actual `exports` object is never exposed to the caller of
`module.watch`.

Notice that this compilation strategy works equally well no matter where
the `import` declaration appears:

```js
if (condition) {
  import { a as b } from "./c";
  console.log(b);
}
```
becomes
```js
if (condition) {
  let b;
  module.watch(require("./c"), {
    a: value => { b = value; }
  });
  console.log(b);
}
```

See [`WHY_NEST_IMPORTS.md`](WHY_NEST_IMPORTS.md) for a much more detailed
discussion of why nested `import` declarations are worthwhile.

### `module.export(getters)`

What about `export` declarations? One option would be to transform them into
CommonJS code that updates the `exports` object, since interoperability
with Node and CommonJS is certainly a goal of this approach.

However, if `Module.prototype.watch` takes a `require(id)` object and a map
of *setter* functions, then it seems natural for `Module.prototype.export`
to be method that registers *getter* functions. Given these getter functions,
whenever `module.watch(require(id), ...)` is called by a parent module, the
getters for the `id` module will run, updating its `module.exports` object, so
that the `module.watch` method has access to the latest exported values.

The `module.export` method is called with a single object literal whose
keys are exported symbol names and whose values are getter functions for
those exported symbols. So, for example,

```js
export const a = "a", b = "b", ...;
```

becomes

```js
module.export({
  a: () => a,
  b: () => b,
  ...
});
const a = "a", b = "b", ...;
```

This code registers getter functions for the variables `a`, `b`, ..., so
that `module.watch` can easily retrieve the latest values of those
variables at any time. It's important that we register getter functions
rather than storing computed values, so that other modules always can
import the newest values.

Export remapping works, too:

```js
let c = 123;
export { c as see }
```

becomes

```js
module.export({ see: () => c });
let c = 123;
```

Note that the `module.export` call is "hoisted" to the top of the block
where it appears. This is safe because the getter functions work equally
well anywhere in the scope where the exported variable is declared, and
a good idea because the hoisting ensures the getters are registered as
early as possible.

What about `export default <expression>` declarations? It would be a
mistake to defer evaluation of the `default` expression until later, so
wrapping it in a hoisted getter function is not exactly what we want.

Instead,

```js
export default computeDefault();
```

gets replaced where it is (without any hoisting) by

```js
module.exportDefault(computeDefault());
```

The `module.exportDefault` method is just a convenient
[wrapper](https://github.com/benjamn/reify/blob/d7c27163a77dac184979862f808ef4e88de91ba8/lib/runtime/index.js#L60-L67)
around `module.export`:

```js
module.exportDefault = function (value) {
  return this.export({
    default: function () {
      return value;
    }
  }, true);
};
```

That `true` argument we're passing to `module.export` is a hint that the
value returned by this getter function will never change, which enables
[some optimizations](https://github.com/benjamn/reify/issues/134) behind
the scenes.

### `module.runSetters()`

Now, suppose you change the value of an exported local variable after the
module has finished loading. Then you need to let the module system know
about the update, and that's where `module.runSetters` comes in. The
module system calls this method on your behalf whenever a module finishes
loading, but you can also call it manually, or simply let `reify` generate
code that calls `module.runSetters` for you whenever you assign to an
exported local variable.

Calling `module.runSetters()` with no arguments causes any setters that
depend on the current module to be rerun, *but only if the value a setter
would receive is different from the last value passed to the setter*.

If you pass an argument to `module.runSetters`, the value of that argument
will be returned as-is, so that you can easily wrap assignment expressions
with calls to `module.runSetters`:

```js
export let value = 0;
export function increment(by) {
  return value += by;
};
```

should become

```js
module.export({
  value: () => value,
  increment: () => increment,
});
let value = 0;
function increment(by) {
  return module.runSetters(value += by);
};
```

Note that `module.runSetters(argument)` does not actually use `argument`.
However, by having `module.runSetters(argument)` return `argument`
unmodified, we can run setters immediately after the assignment without
interfering with evaluation of the larger expression.

Because `module.runSetters` runs any setters that have new values, it's
also useful for potentially risky expressions that are difficult to
analyze statically:

```js
export let value = 0;

function runCommand(command) {
  // This picks up any new values of any exported local variables that may
  // have been modified by eval.
  return module.runSetters(eval(command));
}

runCommand("value = 1234");
```

### `export`s that are really `import`s

What about `export ... from "./module"` declarations? The key insight here
is that **`export` declarations with a `from "..."` clause are really just
`import` declarations that update the `exports` object instead of updating
local variables**:

```js
export { a, b as c } from "./module";
```
becomes
```js
module.watch(require("./module"), {
  a: value => { exports.a = value; },
  b: value => { exports.c = value; },
});
```

This strategy cleanly generalizes to `export * from "..."` declarations:

```js
export * from "./module";
```
becomes
```js
module.watch(require("./module"), {
  "*": (value, name) => {
    exports[name] = value;
  }
});
```

Exporting named namespaces ([proposal](https://github.com/leebyron/ecmascript-export-ns-from)):
```js
export * as ns from "./module";
```
becomes
```js
exports.ns = Object.create(null);
module.watch(require("./module"), {
  "*": (value, name) => {
    exports.ns[name] = value;
  }
});
```

Re-exporting default exports ([proposal](https://github.com/leebyron/ecmascript-export-default-from)):
```js
export a, { b, c as d } from "./module";
```
becomes
```js
module.watch(require("./module"), {
  default: value => { exports.a = value },
  b: value => { exports.b = value },
  c: value => { exports.d = value }
});
```

While these examples have not covered every possible syntax for `import`
and `export` declarations, I hope they provide the intuition necessary to
imagine how any declaration could be compiled.

When I have some time, I hope to implement a [live-compiling text
editor](https://github.com/benjamn/reify/issues/15) to enable
experimentation.
